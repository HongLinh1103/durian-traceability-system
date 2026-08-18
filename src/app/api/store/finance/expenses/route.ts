import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const expenseSchema = z.object({
    category: z.enum([
        "IMPORT_GOODS",
        "SHIPPING",
        "LABOR",
        "WAREHOUSE",
        "UTILITIES",
        "PACKAGING",
        "DELIVERY",
        "MARKETING",
        "MAINTENANCE",
        "OTHER",
    ]),
    expenseDate: z.string().min(1, "Vui lòng chọn ngày chi phí."),
    amount: z.coerce.number().positive("Số tiền phải lớn hơn 0."),
    title: z.string().trim().min(2, "Vui lòng nhập nội dung chi phí.").max(200),
    note: z.string().trim().optional(),
    recipient: z.string().trim().optional(),
    paymentMethod: z.string().default("CASH"),
    status: z.enum(["PAID", "UNPAID", "PARTIAL"]).default("PAID"),
    paidAmount: z.coerce.number().optional(),
});

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id || session.user.role !== "STORE_OWNER") {
            return NextResponse.json({ success: false, message: "Không có quyền truy cập." }, { status: 403 });
        }

        const store = await prisma.store.findFirst({
            where: { ownerId: session.user.id, deletedAt: null },
        });

        if (!store) {
            return NextResponse.json({ success: false, message: "Không tìm thấy cửa hàng." }, { status: 404 });
        }

        const body = await request.json().catch(() => null);
        const parsed = expenseSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { success: false, message: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ." },
                { status: 400 },
            );
        }

        const { category, expenseDate, amount, title, note, recipient, paymentMethod, status, paidAmount } = parsed.data;

        const date = new Date(expenseDate);
        if (isNaN(date.getTime())) {
            return NextResponse.json({ success: false, message: "Ngày không hợp lệ." }, { status: 400 });
        }

        const created = await prisma.storeExpense.create({
            data: {
                storeId: store.id,
                category,
                expenseDate: date,
                amount,
                title,
                note: note || null,
                recipient: recipient || null,
                paymentMethod: paymentMethod || "CASH",
                status,
                paidAmount: status === "PAID" ? amount : (paidAmount || 0),
                createdById: session.user.id,
            },
        });

        return NextResponse.json({
            success: true,
            message: "Đã ghi nhận chi phí thành công.",
            data: created,
        });
    } catch (error) {
        console.error("POST /api/store/finance/expenses error:", error);
        return NextResponse.json({ success: false, message: "Không thể lưu chi phí." }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id || session.user.role !== "STORE_OWNER") {
            return NextResponse.json({ success: false, message: "Không có quyền truy cập." }, { status: 403 });
        }

        const store = await prisma.store.findFirst({
            where: { ownerId: session.user.id, deletedAt: null },
        });

        if (!store) {
            return NextResponse.json({ success: false, message: "Không tìm thấy cửa hàng." }, { status: 404 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ success: false, message: "Thiếu mã chi phí." }, { status: 400 });
        }

        const expense = await prisma.storeExpense.findFirst({
            where: { id, storeId: store.id },
        });

        if (!expense) {
            return NextResponse.json({ success: false, message: "Không tìm thấy khoản chi phí." }, { status: 404 });
        }

        await prisma.storeExpense.delete({
            where: { id },
        });

        return NextResponse.json({
            success: true,
            message: "Đã xóa khoản chi phí.",
        });
    } catch (error) {
        console.error("DELETE /api/store/finance/expenses error:", error);
        return NextResponse.json({ success: false, message: "Không thể xóa chi phí." }, { status: 500 });
    }
}
