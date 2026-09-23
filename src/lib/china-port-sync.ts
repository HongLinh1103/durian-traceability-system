import { prisma } from "@/lib/prisma";
import { sendChinaPortEventEmail, ChinaPortRecordEmailItem, getEmailConfigurationStatus } from "@/lib/email-service";
import type { ChinaPortFieldChange, ChinaPortNotificationPayload } from "@/lib/china-port-notification-templates";

export interface SyncOptions {
    sendEmail?: boolean;
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

const TRACKED_FIELDS: Array<[keyof ChinaPortRecordEmailItem, string]> = [
    ["corpNameEn", "Tên doanh nghiệp"], ["corpNameMo", "Tên địa phương"],
    ["overseasOfficialRegNo", "Mã đăng ký nước ngoài"], ["validFrom", "Hiệu lực từ"],
    ["validTo", "Hiệu lực đến"], ["prodNameEn", "Sản phẩm"], ["corpTypeNameEn", "Loại hình doanh nghiệp"],
];

/**
 * Thực hiện đồng bộ dữ liệu từ China Port (GACC) cho Quốc gia/Vùng: Việt Nam (Mã: 704 / VNM).
 * So sánh dữ liệu và gửi các sự kiện theo cấu hình đã lưu của admin.
 */
export async function syncChinaPortVietnamData(options: SyncOptions = {}): Promise<SyncResult> {
    return prisma.$transaction(async transaction => {
        const [lock] = await transaction.$queryRaw<Array<{ locked: boolean }>>`SELECT pg_try_advisory_xact_lock(7042109) AS locked`;
        if (!lock.locked) return {
            success: true, totalFetched: 0, newCount: 0, updatedCount: 0,
            emailSent: false, emailRecipients: [], newRecords: [],
            message: "Một lượt đồng bộ China Port đang chạy.", syncedAt: new Date().toISOString(),
        };
        return performSync(options);
    }, { timeout: 300000, maxWait: 10000 });
}

async function performSync(options: SyncOptions): Promise<SyncResult> {
    const {
        sendEmail = true,
        prodName,
        pageSize = 1000,
        pageNum = 1,
    } = options;

    const syncedAt = new Date().toISOString();

    try {
        const approvedAdmins = await prisma.user.findMany({ where: { role: "ADMIN", isApproved: true, deletedAt: null }, select: { id: true } });
        const settings = await prisma.chinaPortNotificationSetting.findMany({
            where: { userId: { in: approvedAdmins.map(user => user.id) }, countryCode: "704", emailEnabled: true },
        });
        if (sendEmail && settings.length && !getEmailConfigurationStatus().configured) {
            throw new Error("Chưa cấu hình dịch vụ gửi email SMTP. Chưa cập nhật mốc dữ liệu để có thể gửi lại sau khi cấu hình.");
        }
        // 1. Gọi API GACC lấy danh sách doanh nghiệp & vùng trồng kiểm dịch của Việt Nam
        const payload: Record<string, any> = {
            countryCode: "704", // Viet Nam
            pageNum,
            pageSize,
        };
        if (prodName) {
            payload.prodName = prodName;
        }

        const rows: any[] = [];
        for (let currentPage = pageNum; ; currentPage++) {
        payload.pageNum = currentPage;
        const response = await fetch("https://int.daquang.workers.dev/api/search", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "TriVietDurian/1.0",
                Accept: "application/json",
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(30000),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`China Port API error: ${response.status} - ${errorText}`);
        }

        const json = await response.json();
        if (!Array.isArray(json.data?.rows)) throw new Error("China Port trả dữ liệu không hợp lệ.");
        const pageRows: any[] = json.data.rows;
        rows.push(...pageRows);
        const total = Number(json.data.total);
        if (!pageRows.length || (Number.isFinite(total) && total > 0 && currentPage * pageSize >= total) || pageRows.length < pageSize) break;
        if (currentPage >= 100) throw new Error("Vượt giới hạn số trang China Port; chưa cập nhật dữ liệu.");
        }
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

        // Đọc snapshot đã lưu; dừng khi DB lỗi để tránh nhận nhầm dữ liệu mới.
        let existingCodes = new Set<string>();
        const existingByCode = new Map<string, ChinaPortRecordEmailItem>();
        let dbAvailable = false;

        try {
            const existingInDb = await prisma.chinaPortRecord.findMany({
                where: { countryCode: "704" },
            });
            existingInDb.forEach((r) => {
                existingCodes.add(r.chinaRegNo);
                existingByCode.set(r.chinaRegNo, r as ChinaPortRecordEmailItem);
            });
            dbAvailable = true;
        } catch (dbErr) {
            throw new Error("Không thể đọc dữ liệu China Port từ cơ sở dữ liệu; đã dừng đồng bộ để tránh gửi trùng.");
        }

        // 3. Phân loại bản ghi mới vs bản ghi đã biết
        const newRecords: ChinaPortRecordEmailItem[] = [];
        const changedNotifications: ChinaPortNotificationPayload[] = [];
        const recordsToSave: any[] = [];

        for (const r of rows) {
            if (clean(r.countryCode) && clean(r.countryCode) !== "704") continue;
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
            } else {
                const previous = existingByCode.get(chinaRegNo);
                if (previous && clean(previous.regState) !== clean(recordItem.regState)) {
                    changedNotifications.push({ event: "STATUS_CHANGED", record: recordItem, previousStatus: clean(previous.regState) });
                }
                if (previous) {
                    const changes: ChinaPortFieldChange[] = TRACKED_FIELDS.flatMap(([key, label]) => {
                        const before = clean(previous[key]);
                        const after = clean(recordItem[key]);
                        return before !== after ? [{ label, before, after }] : [];
                    });
                    if (changes.length) changedNotifications.push({ event: "DATA_CHANGED", record: recordItem, changes });
                }
            }

            recordsToSave.push(recordItem);
        }

        // Gửi theo sự kiện và danh sách người nhận đã lưu trước khi cập nhật snapshot.
        let emailSent = false;
        let emailSimulated = false;
        let emailRecipients: string[] = [];

        if (sendEmail && (newRecords.length > 0 || changedNotifications.length > 0)) {
            const notifications: ChinaPortNotificationPayload[] = [
                ...newRecords.map((record) => ({ event: "NEW_RECORD" as const, record })),
                ...changedNotifications,
            ];
            const emailResults = [];
            const recipientSet = new Set<string>();
            for (const payload of notifications) {
                const recipients = [...new Set(settings.filter(setting => setting.events.includes(payload.event)).flatMap(setting => setting.emails))];
                if (!recipients.length) continue;
                recipients.forEach(email => recipientSet.add(email));
                emailResults.push(await sendChinaPortEventEmail(payload, recipients));
            }
            emailRecipients = [...recipientSet];
            emailSent = emailResults.length > 0 && emailResults.every((result) => result.success);
            emailSimulated = emailResults.some((result) => !!result.simulated);
            const failed = emailResults.find(result => !result.success || result.simulated);
            if (failed) throw new Error(failed.error || "Gửi email thất bại. Dữ liệu chưa được đánh dấu đã đồng bộ; hệ thống sẽ thử lại ở lần tiếp theo.");

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

        // Chỉ cập nhật snapshot sau khi các email cần gửi đã được SMTP chấp nhận.
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
                throw err;
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
