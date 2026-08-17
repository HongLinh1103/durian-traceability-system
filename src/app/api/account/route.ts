import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const profileSchema = z.object({
    action: z.literal("profile"),
    fullName: z.string().trim().min(2, "Họ tên phải có ít nhất 2 ký tự.").max(120),
    phone: z.string().trim().regex(/^0\d{9}$/, "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0."),
    email: z.string().trim().email("Email không hợp lệ."),
    birthDate: z.string().trim().optional(),
    gender: z.enum(["FEMALE", "MALE", "OTHER", ""]).optional(),
    avatar: z.string().max(1_500_000, "Ảnh đại diện quá lớn.").nullable().optional(),
});

const passwordSchema = z.object({
    action: z.literal("password"),
    currentPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại."),
    newPassword: z.string().min(8, "Mật khẩu mới phải có ít nhất 8 ký tự.").max(100),
    confirmPassword: z.string(),
}).refine((value) => value.newPassword === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Mật khẩu xác nhận không khớp.",
});

export async function PATCH(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ success: false, message: "Chưa đăng nhập." }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const action = body?.action;

    try {
        if (action === "profile") {
            const parsed = profileSchema.safeParse(body);
            if (!parsed.success) {
                return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message || "Thông tin không hợp lệ." }, { status: 400 });
            }
            const data = parsed.data;
            const user = await prisma.user.update({
                where: { id: session.user.id },
                data: {
                    fullName: data.fullName,
                    phone: data.phone,
                    email: data.email.toLowerCase(),
                    birthDate: data.birthDate ? new Date(`${data.birthDate}T00:00:00.000Z`) : null,
                    gender: data.gender || null,
                    ...(data.avatar !== undefined ? { avatar: data.avatar } : {}),
                },
                select: { fullName: true, phone: true, email: true, avatar: true, birthDate: true, gender: true, updatedAt: true },
            });
            return NextResponse.json({ success: true, message: "Đã cập nhật thông tin cá nhân.", data: user });
        }

        if (action === "password") {
            const parsed = passwordSchema.safeParse(body);
            if (!parsed.success) {
                return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message || "Thông tin không hợp lệ." }, { status: 400 });
            }
            const current = await prisma.user.findUnique({ where: { id: session.user.id }, select: { password: true } });
            if (!current || !(await verifyPassword(parsed.data.currentPassword, current.password))) {
                return NextResponse.json({ success: false, message: "Mật khẩu hiện tại không đúng." }, { status: 400 });
            }
            await prisma.user.update({
                where: { id: session.user.id },
                data: { password: await hashPassword(parsed.data.newPassword), passwordUpdatedAt: new Date() },
            });
            return NextResponse.json({ success: true, message: "Đổi mật khẩu thành công." });
        }

        return NextResponse.json({ success: false, message: "Thao tác không hợp lệ." }, { status: 400 });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return NextResponse.json({ success: false, message: "Email hoặc số điện thoại đã được sử dụng." }, { status: 409 });
        }
        console.error("PATCH /api/account failed", error);
        return NextResponse.json({ success: false, message: "Không thể cập nhật tài khoản." }, { status: 500 });
    }
}
