import type { ChinaPortRecordEmailItem } from "@/lib/email-service";

export type ChinaPortNotificationEvent = "NEW_RECORD" | "STATUS_CHANGED" | "DATA_CHANGED";
export type ChinaPortFieldChange = { label: string; before: string; after: string };

export type ChinaPortNotificationPayload = {
    event: ChinaPortNotificationEvent;
    record: ChinaPortRecordEmailItem;
    previousStatus?: string;
    changes?: ChinaPortFieldChange[];
    detectedAt?: Date;
};

const clean = (value: unknown) => String(value ?? "").replace(/\n+$/g, "").trim();
const escapeHtml = (value: unknown) => clean(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char] || char);
const formatDate = (value: unknown) => {
    const raw = clean(value).slice(0, 10);
    if (!raw) return "—";
    const [year, month, day] = raw.split("-");
    return year && month && day ? `${day}/${month}/${year}` : raw;
};
export const chinaPortStatusLabel = (value: unknown) => value === "1" ? "Còn hiệu lực" : value === "2" ? "Tạm dừng" : value === "3" ? "Hết hiệu lực" : clean(value) || "—";

export function chinaPortNotificationSubject(payload: ChinaPortNotificationPayload) {
    const country = clean(payload.record.countryNameEn) || "Viet Nam";
    const code = clean(payload.record.overseasOfficialRegNo) || clean(payload.record.chinaRegNo);
    if (payload.event === "NEW_RECORD") return `[TriViet - China Port] Phát hiện dữ liệu đăng ký mới - ${country}`;
    if (payload.event === "STATUS_CHANGED") return `[TriViet - China Port] Cảnh báo thay đổi trạng thái - ${code}`;
    return `[TriViet - China Port] Thông tin đăng ký đã thay đổi - ${code}`;
}

export function generateChinaPortSms(payload: ChinaPortNotificationPayload) {
    const record = payload.record;
    const country = clean(record.countryNameEn) || "Viet Nam";
    const code = clean(record.overseasOfficialRegNo) || clean(record.chinaRegNo);
    if (payload.event === "NEW_RECORD") return `TriViet China Port: Phát hiện đăng ký mới tại ${country}. Mã: ${code}. DN: ${clean(record.corpNameEn || record.corpNameMo)}. Vui lòng truy cập TriViet để xem chi tiết.`;
    if (payload.event === "STATUS_CHANGED") return `TriViet China Port: ${code} đã thay đổi trạng thái: ${chinaPortStatusLabel(payload.previousStatus)} → ${chinaPortStatusLabel(record.regState)}. Vui lòng truy cập TriViet để kiểm tra chi tiết.`;
    return `TriViet China Port: Thông tin đăng ký ${code} tại ${country} vừa được cập nhật. Vui lòng truy cập TriViet để xem nội dung thay đổi.`;
}

export function generateChinaPortNotificationHtml(payload: ChinaPortNotificationPayload, baseUrl = "https://trivietdurian.com") {
    const record = payload.record;
    const eventText = payload.event === "NEW_RECORD" ? "dữ liệu đăng ký mới" : payload.event === "STATUS_CHANGED" ? "trạng thái đăng ký đã thay đổi" : "thông tin đăng ký đã được cập nhật";
    const detected = (payload.detectedAt || new Date()).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
    const product = [clean(record.prodCategoryNameEn || record.prodTypeNameEn), clean(record.prodNameEn || record.prodNameCn)].filter(Boolean).join(" - ");
    const rows = [
        ["Quốc gia/Vùng", clean(record.countryNameEn) || "Viet Nam"],
        ["Doanh nghiệp", clean(record.corpNameEn || record.corpNameMo) || "—"],
        ["Mã đăng ký nước ngoài", clean(record.overseasOfficialRegNo) || "—"],
        ["Mã đăng ký Trung Quốc (GACC)", clean(record.chinaRegNo) || "—"],
        ...(payload.event === "NEW_RECORD" ? [
            ["Sản phẩm", product || "—"], ["Loại hình doanh nghiệp", clean(record.corpTypeNameEn || record.corpTypeNameCn) || "—"],
            ["Trạng thái", chinaPortStatusLabel(record.regState)], ["Hiệu lực từ", formatDate(record.validFrom)], ["Hiệu lực đến", formatDate(record.validTo)],
        ] : []),
    ];
    const detailRows = rows.map(([label, value]) => `<tr><td style="padding:7px 12px;color:#64748b;width:42%">${escapeHtml(label)}</td><td style="padding:7px 12px;font-weight:600;color:#0f172a">${escapeHtml(value)}</td></tr>`).join("");
    const changeBlock = payload.event === "STATUS_CHANGED"
        ? `<h3 style="margin:24px 0 8px">Thay đổi phát hiện</h3><p>Trạng thái trước: <strong>${escapeHtml(chinaPortStatusLabel(payload.previousStatus))}</strong><br>Trạng thái hiện tại: <strong>${escapeHtml(chinaPortStatusLabel(record.regState))}</strong></p>`
        : payload.event === "DATA_CHANGED"
          ? `<h3 style="margin:24px 0 8px">Nội dung thay đổi</h3><table style="width:100%;border-collapse:collapse"><thead><tr style="background:#f1f5f9"><th style="padding:8px;text-align:left">Thông tin</th><th style="padding:8px;text-align:left">Trước thay đổi</th><th style="padding:8px;text-align:left">Sau thay đổi</th></tr></thead><tbody>${(payload.changes || []).map((change) => `<tr><td style="padding:8px;border-top:1px solid #e2e8f0">${escapeHtml(change.label)}</td><td style="padding:8px;border-top:1px solid #e2e8f0">${escapeHtml(change.before || "—")}</td><td style="padding:8px;border-top:1px solid #e2e8f0;font-weight:600">${escapeHtml(change.after || "—")}</td></tr>`).join("")}</tbody></table>`
          : "";
    return `<!doctype html><html lang="vi"><body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#1e293b"><div style="max-width:720px;margin:24px auto;background:white;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden"><div style="padding:24px 28px;background:#065f46;color:white"><h1 style="margin:0;font-size:21px">${escapeHtml(chinaPortNotificationSubject(payload))}</h1></div><div style="padding:28px"><p>Xin chào Quản trị viên,</p><p>TriViet phát hiện <strong>${escapeHtml(eventText)}</strong> trên China Port.</p><h3>Thông tin đăng ký</h3><table style="width:100%;border-collapse:collapse;background:#f8fafc">${detailRows}</table>${changeBlock}<p style="margin-top:24px">Thời gian phát hiện: <strong>${escapeHtml(detected)}</strong></p><p style="text-align:center;margin:28px 0"><a href="${escapeHtml(baseUrl)}/china-port" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#047857;color:white;text-decoration:none;font-weight:700">Xem chi tiết trên China Port</a></p>${payload.event === "STATUS_CHANGED" ? "<p>Vui lòng kiểm tra thông tin trên hệ thống trước khi thực hiện các nghiệp vụ liên quan.</p>" : ""}<p style="font-size:12px;color:#64748b">Đây là thông báo tự động từ hệ thống TriViet.</p></div></div></body></html>`;
}
