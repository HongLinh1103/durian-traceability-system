import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEmailConfigurationStatus } from "@/lib/email-service";

const schema = z.object({
    countryCode: z.literal("704"),
    events: z.array(z.enum(["NEW_RECORD", "STATUS_CHANGED", "DATA_CHANGED"])).min(1).max(3),
    emailEnabled: z.boolean(),
    smsEnabled: z.literal(false),
    emails: z.array(z.string().trim().email().max(254)).max(10),
    phones: z.array(z.string().trim().max(30)).max(10),
}).refine(value => !value.emailEnabled || value.emails.length > 0);

export async function GET() {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") return NextResponse.json({ message: "Không có quyền." }, { status: 403 });
    try {
        const data = await prisma.chinaPortNotificationSetting.findUnique({ where: { userId: session.user.id } });
        return NextResponse.json({ data, emailService: getEmailConfigurationStatus() });
    } catch {
        return NextResponse.json({ message: "Không thể tải cấu hình từ cơ sở dữ liệu. Kiểm tra kết nối và migration." }, { status: 503 });
    }
}

export async function PUT(request: Request) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") return NextResponse.json({ message: "Không có quyền." }, { status: 403 });
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ message: "Chọn Việt Nam, ít nhất một sự kiện và tối đa 10 email hợp lệ. SMS chưa được tích hợp." }, { status: 400 });
    try {
        const settings = { ...parsed.data, emails: [...new Set(parsed.data.emails)], events: [...new Set(parsed.data.events)] };
        const data = await prisma.chinaPortNotificationSetting.upsert({
            where: { userId: session.user.id },
            create: { userId: session.user.id, ...settings },
            update: settings,
        });
        return NextResponse.json({ data, emailService: getEmailConfigurationStatus() });
    } catch {
        return NextResponse.json({ message: "Chưa lưu được cấu hình vào cơ sở dữ liệu. Vui lòng thử lại." }, { status: 503 });
    }
}
