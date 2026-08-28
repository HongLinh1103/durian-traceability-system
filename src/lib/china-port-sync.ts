import { prisma } from "@/lib/prisma";
import { sendChinaPortNewRecordsEmail, ChinaPortRecordEmailItem, getAdminEmailRecipients } from "@/lib/email-service";

export interface SyncOptions {
    sendEmail?: boolean;
    forceEmailRecipient?: string;
    prodName?: string;
    pageSize?: number;
    pageNum?: number;
}

export interface SyncResult {
    success: boolean;
    totalFetched: number;
    newCount: number;
    updatedCount: number;
    emailSent: boolean;
    emailRecipients: string[];
    emailSimulated?: boolean;
    newRecords: ChinaPortRecordEmailItem[];
    message: string;
    syncedAt: string;
}

const clean = (value: any) => String(value ?? "").replace(/\n+$/g, "").trim();

// Fallback in-memory set in case database is offline during development
const memoryKnownRecords = new Set<string>();

/**
 * Thực hiện đồng bộ dữ liệu từ China Port (GACC) cho Quốc gia/Vùng: Việt Nam (Mã: 704 / VNM).
 * Phát hiện bản ghi mới, lưu trữ vào cơ sở dữ liệu và gửi 1 email tổng hợp đến Admin.
 */
export async function syncChinaPortVietnamData(options: SyncOptions = {}): Promise<SyncResult> {
    const {
        sendEmail = true,
        forceEmailRecipient,
        prodName,
        pageSize = 1000,
        pageNum = 1,
    } = options;

    const syncedAt = new Date().toISOString();

    try {
        // 1. Gọi API GACC lấy danh sách doanh nghiệp & vùng trồng kiểm dịch của Việt Nam
        const payload: Record<string, any> = {
            countryCode: "704", // Viet Nam
            pageNum,
            pageSize,
        };
        if (prodName) {
            payload.prodName = prodName;
        }

        const response = await fetch("https://int.daquang.workers.dev/api/search", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "TriVietDurian/1.0",
                Accept: "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`China Port API error: ${response.status} - ${errorText}`);
        }

        const json = await response.json();
        const rows: any[] = json.data?.rows || [];
        const totalFetched = rows.length;

        if (totalFetched === 0) {
            return {
                success: true,
                totalFetched: 0,
                newCount: 0,
                updatedCount: 0,
                emailSent: false,
                emailRecipients: [],
                newRecords: [],
                message: "Không có dữ liệu trả về từ China Port",
                syncedAt,
            };
        }

        // 2. Kiểm tra bản ghi đã tồn tại trong DB (hoặc memory cache)
        let existingCodes = new Set<string>();
        let dbAvailable = false;

        try {
            const existingInDb = await prisma.chinaPortRecord.findMany({
                where: { countryCode: "704" },
                select: { chinaRegNo: true },
            });
            existingInDb.forEach((r) => existingCodes.add(r.chinaRegNo));
            dbAvailable = true;
        } catch (dbErr) {
            console.warn("[ChinaPortSync] Database offline or unreachable, using in-memory store for sync:", dbErr);
            existingCodes = memoryKnownRecords;
        }

        // 3. Phân loại bản ghi mới vs bản ghi đã biết
        const newRecords: ChinaPortRecordEmailItem[] = [];
        const recordsToSave: any[] = [];

        for (const r of rows) {
            const chinaRegNo = clean(r.chinaRegNo);
            if (!chinaRegNo) continue;

            const isNew = !existingCodes.has(chinaRegNo);

            const recordItem: ChinaPortRecordEmailItem = {
                countryCode: clean(r.countryCode) || "704",
                countryIso: clean(r.countryIso) || "VNM",
                countryNameEn: clean(r.countryNameEn) || "Viet Nam",
                countryNameCn: clean(r.countryNameCn) || "越南",
                provinceCode: clean(r.provinceCode),
                provinceNameEn: clean(r.provinceNameEn),
                provinceNameCn: clean(r.provinceNameCn),
                prodTypeCode: clean(r.prodTypeCode),
                prodTypeNameEn: clean(r.prodTypeNameEn),
                prodTypeNameCn: clean(r.prodTypeNameCn),
                prodCategoryCode: clean(r.prodCategoryCode),
                prodCategoryNameEn: clean(r.prodCategoryNameEn),
                prodCategoryNameCn: clean(r.prodCategoryNameCn),
                corpTypeCode: clean(r.corpTypeCode),
                corpTypeNameCn: clean(r.corpTypeNameCn),
                corpTypeNameEn: clean(r.corpTypeNameEn),
                prodNameEn: clean(r.prodNameEn),
                prodNameCn: clean(r.prodNameCn),
                prodNameLa: clean(r.prodNameLa),
                chinaRegNo,
                overseasOfficialRegNo: clean(r.overseasOfficialRegNo),
                corpNameEn: clean(r.corpNameEn),
                corpNameMo: clean(r.corpNameMo),
                corpAddrNameEn: clean(r.corpAddrNameEn),
                corpAddrNameMo: clean(r.corpAddrNameMo),
                validFrom: clean(r.validFrom),
                validTo: clean(r.validTo),
                regState: clean(r.regState),
            };

            if (isNew) {
                newRecords.push(recordItem);
                existingCodes.add(chinaRegNo);
                memoryKnownRecords.add(chinaRegNo);
            }

            recordsToSave.push(recordItem);
        }

        // 4. Lưu / Cập nhật vào cơ sở dữ liệu nếu DB khả dụng
        let updatedCount = 0;
        if (dbAvailable) {
            try {
                // Upsert từng bản ghi (hoặc theo batch)
                for (const item of recordsToSave) {
                    await prisma.chinaPortRecord.upsert({
                        where: { chinaRegNo: item.chinaRegNo },
                        update: {
                            ...item,
                            lastSyncedAt: new Date(),
                        },
                        create: {
                            ...item,
                            firstSyncedAt: new Date(),
                            lastSyncedAt: new Date(),
                        },
                    });
                }
                updatedCount = recordsToSave.length;
            } catch (err) {
                console.error("[ChinaPortSync] Lỗi khi lưu bản ghi vào DB:", err);
            }
        }

        // 5. Gửi Email thông báo Admin khi có bản ghi mới (Gộp thành 1 email duy nhất)
        let emailSent = false;
        let emailSimulated = false;
        let emailRecipients: string[] = [];

        if (sendEmail && newRecords.length > 0) {
            const customRecipients = forceEmailRecipient
                ? [forceEmailRecipient]
                : await getAdminEmailRecipients();

            emailRecipients = customRecipients;

            const emailResult = await sendChinaPortNewRecordsEmail(newRecords, customRecipients);
            emailSent = emailResult.success;
            emailSimulated = !!emailResult.simulated;

            // Tạo thông báo nội bộ (In-app Notification) cho Admin nếu DB khả dụng
            if (dbAvailable) {
                try {
                    const adminUsers = await prisma.user.findMany({
                        where: { role: "ADMIN", isApproved: true, deletedAt: null },
                        select: { id: true },
                    });

                    if (adminUsers.length > 0) {
                        await prisma.notification.createMany({
                            data: adminUsers.map((admin) => ({
                                userId: admin.id,
                                title: "[China Port] Dữ liệu mới thuộc Việt Nam",
                                message: `Hệ thống vừa phát hiện ${newRecords.length} bản ghi mới thuộc Quốc gia/Vùng: Việt Nam từ cổng GACC.`,
                                type: "CHINA_PORT_NEW_RECORDS",
                            })),
                        });
                    }
                } catch (notifErr) {
                    console.warn("[ChinaPortSync] Không thể tạo in-app notification:", notifErr);
                }
            }
        }

        // 6. Ghi log đồng bộ nếu DB khả dụng
        if (dbAvailable) {
            try {
                await prisma.chinaPortSyncLog.create({
                    data: {
                        countryCode: "704",
                        totalFetched,
                        newRecordsCount: newRecords.length,
                        updatedCount,
                        status: "SUCCESS",
                        emailSent,
                        emailRecipient: emailRecipients.join(", "),
                    },
                });
            } catch (logErr) {
                console.warn("[ChinaPortSync] Không thể lưu sync log vào DB:", logErr);
            }
        }

        const message = newRecords.length > 0
            ? `Đã đồng bộ ${totalFetched} dòng từ GACC · Phát hiện ${newRecords.length} bản ghi mới và đã ${emailSent ? "gửi email thông báo Admin" : "chuẩn bị thông báo"}.`
            : `Đã đồng bộ ${totalFetched} dòng từ GACC · Tất cả bản ghi đã được cập nhật, không có bản ghi mới.`;

        return {
            success: true,
            totalFetched,
            newCount: newRecords.length,
            updatedCount: recordsToSave.length,
            emailSent,
            emailRecipients,
            emailSimulated,
            newRecords,
            message,
            syncedAt,
        };
    } catch (error: any) {
        console.error("[ChinaPortSync] Sync Error:", error);

        return {
            success: false,
            totalFetched: 0,
            newCount: 0,
            updatedCount: 0,
            emailSent: false,
            emailRecipients: [],
            newRecords: [],
            message: error.message || "Lỗi khi đồng bộ dữ liệu China Port",
            syncedAt,
        };
    }
}
