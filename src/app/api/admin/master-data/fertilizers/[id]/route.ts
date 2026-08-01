/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fertilizerUpdateSchema } from "@/lib/validations/master-data";

export const runtime = "nodejs";

async function checkAdmin() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Chưa đăng nhập.", status: 401 } as const;
    if (session.user.role !== "ADMIN") return { error: "Không có quyền truy cập.", status: 403 } as const;
    return null;
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
    const authError = await checkAdmin();
    if (authError) {
        return NextResponse.json({ success: false, message: authError.error }, { status: authError.status });
    }

    try {
        const item = await prisma.fertilizer.findFirst({ where: { id: params.id, deletedAt: null } });
        if (!item) {
            return NextResponse.json({ success: false, message: "Không tìm thấy phân bón." }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: item });
    } catch (error) {
        console.error("GET fertilizer error:", error);
        return NextResponse.json({ success: false, message: "Không thể tải thông tin phân bón." }, { status: 500 });
    }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    const authError = await checkAdmin();
    if (authError) {
        return NextResponse.json({ success: false, message: authError.error }, { status: authError.status });
    }

    try {
        const existing = await prisma.fertilizer.findFirst({ where: { id: params.id, deletedAt: null } });
        if (!existing) {
            return NextResponse.json({ success: false, message: "Không tìm thấy phân bón." }, { status: 404 });
        }

        const body = await request.json();
        const parsed = fertilizerUpdateSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { success: false, message: "Dữ liệu không hợp lệ", errors: parsed.error.flatten().fieldErrors },
                { status: 400 },
            );
        }

        const updated = await prisma.fertilizer.update({ where: { id: params.id }, data: parsed.data });

        return NextResponse.json({ success: true, data: updated });
    } catch (error: any) {
        if (error?.code === "P2002") {
            return NextResponse.json(
                { success: false, message: "Mã phân bón đã tồn tại" },
                { status: 409 },
            );
        }
        console.error("PATCH fertilizer error:", error);
        return NextResponse.json({ success: false, message: "Không thể cập nhật phân bón." }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    const authError = await checkAdmin();
    if (authError) {
        return NextResponse.json({ success: false, message: authError.error }, { status: authError.status });
    }

    try {
        const existing = await prisma.fertilizer.findFirst({ where: { id: params.id, deletedAt: null } });
        if (!existing) {
            return NextResponse.json({ success: false, message: "Không tìm thấy phân bón." }, { status: 404 });
        }

        const url = new URL(request.url);
        const action = url.searchParams.get("action");

        if (action === "restore") {
            const updated = await prisma.fertilizer.update({
                where: { id: params.id },
                data: { deletedAt: null, isActive: true },
            });
            return NextResponse.json({ success: true, data: updated, message: "Đã khôi phục phân bón." });
        }

        if (action === "toggle-active") {
            const updated = await prisma.fertilizer.update({
                where: { id: params.id },
                data: { isActive: !existing.isActive },
            });
            return NextResponse.json({
                success: true,
                data: updated,
                message: updated.isActive ? "Đã kích hoạt phân bón." : "Đã ngừng sử dụng phân bón.",
            });
        }

        // Soft delete
        const updated = await prisma.fertilizer.update({
            where: { id: params.id },
            data: { deletedAt: new Date(), isActive: false },
        });

        return NextResponse.json({ success: true, data: updated, message: "Đã xóa phân bón." });
    } catch (error) {
        console.error("DELETE fertilizer error:", error);
        return NextResponse.json({ success: false, message: "Không thể xóa phân bón." }, { status: 500 });
    }
}

