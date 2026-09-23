import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { sendChinaPortEventEmail } from "@/lib/email-service";
import type { ChinaPortNotificationPayload } from "@/lib/china-port-notification-templates";

export const runtime = "nodejs";

const schema = z.object({
    emails: z.array(z.string().trim().email().max(254)).min(1).max(10),
    event: z.enum(["NEW_RECORD", "STATUS_CHANGED", "DATA_CHANGED"]),
});

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
        return NextResponse.json({ message: "Chỉ quản trị viên được gửi email thử." }, { status: 403 });
    }
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
        return NextResponse.json({ message: "Chọn loại thông báo và nhập từ 1 đến 10 email hợp lệ." }, { status: 400 });
    }
    const payload: ChinaPortNotificationPayload = {
        event: parsed.data.event,
        detectedAt: new Date(),
        record: {
            countryCode: "704", countryNameEn: "Viet Nam", countryNameCn: "越南",
            overseasOfficialRegNo: "VN-TEST-001", chinaRegNo: "GACC-TEST-001",
            corpNameEn: "DOANH NGHIỆP MẪU — EMAIL KIỂM THỬ",
            prodCategoryNameEn: "Fresh fruits", prodNameEn: "Durian (Sầu riêng)",
            corpTypeNameEn: "Packing house (Cơ sở đóng gói)",
            validFrom: "2026-01-01", validTo: "2029-12-31",
            regState: parsed.data.event === "STATUS_CHANGED" ? "2" : "1",
        },
        previousStatus: "1",
        changes: [{ label: "Hiệu lực đến", before: "31/12/2028", after: "31/12/2029" }],
    };
    try {
        const result = await sendChinaPortEventEmail(payload, [...new Set(parsed.data.emails)], { test: true });
        if (!result.success || result.simulated) {
            return NextResponse.json({ message: result.error || "Email chưa được gửi thật." }, { status: 502 });
        }
        return NextResponse.json({ message: `Máy chủ email đã chấp nhận email thử gửi tới ${result.recipients.join(", ")}. Hãy kiểm tra hộp thư và Spam.`, success: true });
    } catch {
        return NextResponse.json({ message: "Không thể gửi email thử. Vui lòng kiểm tra cấu hình SMTP trên server." }, { status: 500 });
    }
}
