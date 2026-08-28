import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

export interface ChinaPortRecordEmailItem {
    countryCode?: string;
    countryNameEn?: string;
    countryNameCn?: string;
    prodTypeNameEn?: string;
    prodCategoryNameEn?: string;
    prodNameEn?: string;
    prodNameCn?: string;
    prodNameLa?: string;
    overseasOfficialRegNo?: string;
    chinaRegNo: string;
    corpNameEn?: string;
    corpNameMo?: string;
    corpTypeNameEn?: string;
    corpTypeNameCn?: string;
    validFrom?: string;
    validTo?: string;
    regState?: string;
    [key: string]: any;
}

export interface EmailSendResult {
    success: boolean;
    simulated?: boolean;
    messageId?: string;
    error?: string;
    recipients: string[];
}

/**
 * Lấy danh sách email của quản trị viên (Admin) từ cơ sở dữ liệu và biến môi trường
 */
export async function getAdminEmailRecipients(): Promise<string[]> {
    const recipients = new Set<string>();

    // 1. Lấy từ biến môi trường nếu có cấu hình
    const envAdminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL;
    if (envAdminEmail) {
        envAdminEmail.split(",").map(e => e.trim()).filter(Boolean).forEach(e => recipients.add(e));
    }

    // 2. Lấy từ bảng User role ADMIN trong cơ sở dữ liệu
    try {
        const adminUsers = await prisma.user.findMany({
            where: {
                role: "ADMIN",
                email: { not: null },
                isApproved: true,
                deletedAt: null,
            },
            select: { email: true },
        });

        for (const u of adminUsers) {
            if (u.email && u.email.trim()) {
                recipients.add(u.email.trim());
            }
        }
    } catch (err) {
        console.warn("[EmailService] Không thể tải danh sách Admin từ DB, sử dụng email mặc định:", err);
    }

    // 3. Fallback mặc định nếu chưa có email nào
    if (recipients.size === 0) {
        recipients.add("admin@trivietdurian.com");
    }

    return Array.from(recipients);
}

/**
 * Khởi tạo SMTP Transporter từ biến môi trường
 */
function createTransporter() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure = process.env.SMTP_SECURE === "true" || port === 465;

    if (!host || !user || !pass) {
        return null;
    }

    return nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
    });
}

const clean = (value: any) => String(value ?? "").replace(/\n+$/g, "").trim();
const fmtDate = (value: any) => clean(value).slice(0, 10) || "—";
const statusLabel = (value: any) => (value === "1" ? "Còn hiệu lực" : value === "2" ? "Tạm dừng" : clean(value) || "—");

/**
 * Tạo nội dung HTML bảng dữ liệu cho email thông báo China Port
 */
export function generateChinaPortEmailHtml(records: ChinaPortRecordEmailItem[], baseUrl: string = "https://trivietdurian.com"): string {
    const tableRows = records
        .map((r, index) => {
            const country = `${clean(r.countryNameEn || "Viet Nam")} / ${clean(r.countryNameCn || "越南")}`;
            const product = `${clean(r.prodCategoryNameEn || r.prodTypeNameEn || "Fresh fruits")}<br><strong style="color: #065f46;">${clean(r.prodNameEn || r.prodNameCn || "Durian")}</strong>`;
            const overseasCode = clean(r.overseasOfficialRegNo) || "—";
            const chinaCode = clean(r.chinaRegNo) || "—";
            const corpName = clean(r.corpNameEn) || clean(r.corpNameMo) || "—";
            const corpType = clean(r.corpTypeNameEn || r.corpTypeNameCn) || "—";
            const validFrom = fmtDate(r.validFrom);
            const validTo = fmtDate(r.validTo);
            const isActive = r.regState === "1";
            const statusText = statusLabel(r.regState);

            const rowBg = index % 2 === 0 ? "#ffffff" : "#f8fafc";

            return `
                <tr style="background-color: ${rowBg}; border-bottom: 1px solid #e2e8f0; font-size: 12px;">
                    <td style="padding: 10px 12px; vertical-align: middle; color: #334155;">${country}</td>
                    <td style="padding: 10px 12px; vertical-align: middle; color: #1e293b;">${product}</td>
                    <td style="padding: 10px 12px; vertical-align: middle; font-family: monospace; font-weight: bold; color: #047857; white-space: nowrap;">${overseasCode}</td>
                    <td style="padding: 10px 12px; vertical-align: middle; font-family: monospace; font-weight: bold; color: #1e1b4b; white-space: nowrap;">${chinaCode}</td>
                    <td style="padding: 10px 12px; vertical-align: middle; font-weight: 600; color: #0f172a;">${corpName}</td>
                    <td style="padding: 10px 12px; vertical-align: middle; color: #475569;">${corpType}</td>
                    <td style="padding: 10px 12px; vertical-align: middle; font-family: monospace; color: #334155; text-align: center; white-space: nowrap; width: 100px;">${validFrom}</td>
                    <td style="padding: 10px 12px; vertical-align: middle; font-family: monospace; color: #334155; text-align: center; white-space: nowrap; width: 100px;">${validTo}</td>
                    <td style="padding: 10px 12px; vertical-align: middle; text-align: center; white-space: nowrap;">
                        <span style="display: inline-block; padding: 3px 8px; border-radius: 9999px; font-size: 11px; font-weight: bold; ${
                            isActive
                                ? "background-color: #d1fae5; color: #065f46; border: 1px solid #a7f3d0;"
                                : "background-color: #ffe4e6; color: #9f1239; border: 1px solid #fecdd3;"
                        }">
                            ${statusText}
                        </span>
                    </td>
                </tr>
            `;
        })
        .join("");

    return `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>[China Port] Có dữ liệu mới thuộc Việt Nam</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
    <div style="max-width: 1080px; margin: 24px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0;">
        
        <!-- Header Banner -->
        <div style="background: linear-gradient(135deg, #064e3b 0%, #065f46 50%, #0f766e 100%); padding: 28px 32px; color: #ffffff;">
            <div style="display: inline-block; padding: 4px 12px; background-color: rgba(255, 255, 255, 0.15); border-radius: 9999px; font-size: 11px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 8px; border: 1px solid rgba(255, 255, 255, 0.25);">
                CHINA PORT · HỆ THỐNG GACC ĐỒNG BỘ
            </div>
            <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 800; line-height: 1.3; color: #ffffff;">
                [China Port] Phát hiện dữ liệu mới thuộc Quốc gia / Vùng: Việt Nam
            </h1>
            <p style="margin: 0; font-size: 13px; color: #ccfbf1; opacity: 0.95;">
                Hệ thống truy xuất nguồn gốc nông nghiệp Trí Việt vừa hoàn tất chu kỳ đối soát và đồng bộ tự động từ Tổng cục Hải quan Trung Quốc (GACC).
            </p>
        </div>

        <!-- Alert Notification Box -->
        <div style="padding: 24px 32px 16px 32px;">
            <div style="background-color: #ecfdf5; border-left: 4px solid #059669; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 15px; font-weight: 700; color: #065f46;">
                    🔔 Hệ thống vừa phát hiện <span style="background-color: #047857; color: #ffffff; padding: 2px 8px; border-radius: 6px; font-size: 16px;">${records.length}</span> bản ghi mới thuộc Quốc gia/Vùng: Việt Nam.
                </p>
                <p style="margin: 6px 0 0 0; font-size: 13px; color: #047857;">
                    Thời gian đối soát: <strong>${new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</strong> · Tất cả các bản ghi mới đã được gom chung trong báo cáo này.
                </p>
            </div>

            <h2 style="font-size: 15px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #0f172a; margin: 0 0 12px 0;">
                Danh sách chi tiết các bản ghi mới phát hiện:
            </h2>

            <!-- Data Table -->
            <div style="overflow-x: auto; border: 1px solid #cbd5e1; border-radius: 10px; margin-bottom: 24px;">
                <table style="width: 100%; border-collapse: collapse; text-align: left;">
                    <thead>
                        <tr style="background-color: #0f172a; color: #f8fafc; font-size: 11px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase;">
                            <th style="padding: 12px; border-bottom: 2px solid #334155; white-space: nowrap;">QUỐC GIA</th>
                            <th style="padding: 12px; border-bottom: 2px solid #334155; white-space: nowrap;">SẢN PHẨM</th>
                            <th style="padding: 12px; border-bottom: 2px solid #334155; white-space: nowrap;">MÃ NƯỚC NGOÀI</th>
                            <th style="padding: 12px; border-bottom: 2px solid #334155; white-space: nowrap;">MÃ TRUNG QUỐC</th>
                            <th style="padding: 12px; border-bottom: 2px solid #334155; white-space: nowrap;">DOANH NGHIỆP</th>
                            <th style="padding: 12px; border-bottom: 2px solid #334155; white-space: nowrap;">LOẠI DN</th>
                            <th style="padding: 12px; border-bottom: 2px solid #334155; text-align: center; white-space: nowrap; width: 100px;">HIỆU LỰC TỪ</th>
                            <th style="padding: 12px; border-bottom: 2px solid #334155; text-align: center; white-space: nowrap; width: 100px;">HIỆU LỰC ĐẾN</th>
                            <th style="padding: 12px; border-bottom: 2px solid #334155; text-align: center; white-space: nowrap;">TRẠNG THÁI</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>

            <!-- Action button -->
            <div style="text-align: center; padding: 12px 0 24px 0;">
                <a href="${baseUrl}/china-port" target="_blank" style="display: inline-block; background-color: #047857; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; box-shadow: 0 2px 4px rgba(4, 120, 87, 0.3);">
                    Truy cập trang China Port trên Hệ thống →
                </a>
            </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; font-size: 12px; color: #64748b; text-align: center;">
            <p style="margin: 0 0 4px 0;">
                Email thông báo tự động từ Hệ thống Quản lý & Truy xuất Nguồn gốc Sầu riêng Trí Việt.
            </p>
            <p style="margin: 0;">
                Nguồn đối soát chính thức: Tổng cục Hải quan Trung Quốc (GACC - scintl.chinaport.gov.cn)
            </p>
        </div>
    </div>
</body>
</html>
    `;
}

/**
 * Gửi email thông báo khi phát hiện các bản ghi mới từ China Port cho Việt Nam.
 * Gộp tất cả bản ghi mới vào một email duy nhất (không gửi lẻ từng email).
 */
export async function sendChinaPortNewRecordsEmail(
    records: ChinaPortRecordEmailItem[],
    customRecipients?: string[]
): Promise<EmailSendResult> {
    if (!records || records.length === 0) {
        return { success: true, recipients: [], simulated: true, error: "Không có bản ghi mới để gửi" };
    }

    const recipients = customRecipients && customRecipients.length > 0
        ? customRecipients
        : await getAdminEmailRecipients();

    if (recipients.length === 0) {
        return { success: false, recipients: [], error: "Không tìm thấy địa chỉ email người nhận (Admin)" };
    }

    const subject = `[China Port] Có dữ liệu mới thuộc Việt Nam (${records.length} bản ghi)`;
    const html = generateChinaPortEmailHtml(records, process.env.NEXTAUTH_URL || "https://trivietdurian.com");
    const text = `Hệ thống vừa phát hiện ${records.length} bản ghi mới thuộc Quốc gia/Vùng: Việt Nam từ cổng China Port (GACC).\nVui lòng truy cập hệ thống để xem chi tiết: ${process.env.NEXTAUTH_URL || "https://trivietdurian.com"}/china-port`;

    const transporter = createTransporter();

    if (!transporter) {
        console.log("=====================================================================");
        console.log(`[EmailService] 📢 [Mô phỏng gửi Email Admin - Chưa cấu hình SMTP]`);
        console.log(`Tiêu đề: ${subject}`);
        console.log(`Người nhận: ${recipients.join(", ")}`);
        console.log(`Số bản ghi mới: ${records.length}`);
        console.log(`Nội dung: Hệ thống vừa phát hiện ${records.length} bản ghi mới thuộc Quốc gia/Vùng: Việt Nam.`);
        console.log("=====================================================================");
        return {
            success: true,
            simulated: true,
            messageId: `simulated-${Date.now()}`,
            recipients,
        };
    }

    try {
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || `"Hệ Thống Trí Việt (China Port)" <no-reply@trivietdurian.com>`,
            to: recipients,
            subject,
            text,
            html,
        });

        console.log(`[EmailService] ✅ Đã gửi email thông báo thành công tới: ${recipients.join(", ")}, MessageId: ${info.messageId}`);
        return {
            success: true,
            simulated: false,
            messageId: info.messageId,
            recipients,
        };
    } catch (error: any) {
        console.error("[EmailService] ❌ Lỗi khi gửi email:", error);
        return {
            success: false,
            recipients,
            error: error.message || "Lỗi gửi email",
        };
    }
}
