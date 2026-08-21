import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const createExpenseSchema = z.object({
    farmId: z.string().min(1, "Vui lòng chọn vườn"),
    cropSeasonId: z.string().min(1, "Vui lòng chọn vụ mùa"),
    category: z.enum([
        "LABOR",
        "ELECTRICITY_WATER",
        "MACHINERY",
        "TRANSPORT",
        "HARVESTING",
        "TESTING",
        "OTHER",
    ]),
    title: z.string().trim().min(2, "Tên khoản chi quá ngắn").max(200),
    amount: z.coerce.number().positive("Số tiền chi phải lớn hơn 0"),
    expenseDate: z.string().optional().nullable(),
    stage: z.string().optional().nullable(),
    notes: z.string().trim().max(1000).optional().nullable(),
});

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "FARMER") {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const farmId = searchParams.get("farmId");
    const cropSeasonId = searchParams.get("cropSeasonId");
    const category = searchParams.get("category");

    const whereClause: any = {
        farmerId: session.user.id,
    };

    if (farmId) whereClause.farmId = farmId;
    if (cropSeasonId) whereClause.cropSeasonId = cropSeasonId;
    if (category) whereClause.category = category;

    const expenses = await prisma.farmerExpense.findMany({
        where: whereClause,
        include: {
            farm: { select: { farmName: true, farmCode: true } },
            cropSeason: { select: { name: true, year: true } },
        },
        orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ success: true, data: expenses });
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "FARMER") {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const json = await request.json().catch(() => null);
    const parsed = createExpenseSchema.safeParse(json);
    if (!parsed.success) {
        return NextResponse.json(
            { success: false, message: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" },
            { status: 400 },
        );
    }

    const { farmId, cropSeasonId, category, title, amount, expenseDate, stage, notes } =
        parsed.data;

    // Xác nhận vườn thuộc về nông dân
    const farm = await prisma.farm.findFirst({
        where: { id: farmId, farmerId: session.user.id },
    });
    if (!farm) {
        return NextResponse.json({ success: false, message: "Vườn không hợp lệ" }, { status: 404 });
    }

    const dateToUse = expenseDate ? new Date(expenseDate) : new Date();

    const expense = await prisma.farmerExpense.create({
        data: {
            farmerId: session.user.id,
            farmId,
            cropSeasonId,
            category,
            title,
            amount,
            expenseDate: dateToUse,
            stage: (stage as any) || null,
            notes,
        },
        include: {
            farm: true,
            cropSeason: true,
        },
    });

    return NextResponse.json({ success: true, data: expense }, { status: 201 });
}

export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "FARMER") {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
        return NextResponse.json({ success: false, message: "Thiếu mã khoản chi" }, { status: 400 });
    }

    const expense = await prisma.farmerExpense.findFirst({
        where: { id, farmerId: session.user.id },
    });
    if (!expense) {
        return NextResponse.json({ success: false, message: "Không tìm thấy khoản chi" }, { status: 404 });
    }

    await prisma.farmerExpense.delete({ where: { id: expense.id } });
    return NextResponse.json({ success: true, message: "Đã xóa khoản chi thành công" });
}
