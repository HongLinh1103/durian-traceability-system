import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const createTransactionSchema = z.object({
    supplyId: z.string().min(1, "Vui lòng chọn vật tư"),
    type: z.enum(["IN", "OUT", "ADJUSTMENT"]),
    quantity: z.coerce.number().positive("Số lượng phải lớn hơn 0"),
    farmId: z.string().optional().nullable(),
    cropSeasonId: z.string().optional().nullable(),
    stage: z.string().optional().nullable(),
    activityType: z.string().optional().nullable(),
    purpose: z.string().trim().max(300).optional().nullable(),
    actionDate: z.string().optional().nullable(),
    notes: z.string().trim().max(1000).optional().nullable(),
});

async function resolveFarmerId(session: any): Promise<string | null> {
    if (session?.user?.id) {
        const u = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { id: true },
        });
        if (u) return u.id;
    }
    if (session?.user?.phone) {
        const u = await prisma.user.findUnique({
            where: { phone: session.user.phone },
            select: { id: true },
        });
        if (u) return u.id;
    }
    if (session?.user?.email) {
        const u = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true },
        });
        if (u) return u.id;
    }
    return null;
}

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const farmerId = await resolveFarmerId(session);
        if (!farmerId) {
            return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
        }

        const { searchParams } = new URL(request.url);
        const supplyId = searchParams.get("supplyId");
        const farmId = searchParams.get("farmId");
        const cropSeasonId = searchParams.get("cropSeasonId");
        const type = searchParams.get("type");

        const whereClause: any = {
            farmerId,
        };

        if (supplyId) whereClause.supplyId = supplyId;
        if (farmId) whereClause.farmId = farmId;
        if (cropSeasonId) whereClause.cropSeasonId = cropSeasonId;
        if (type && ["IN", "OUT", "ADJUSTMENT"].includes(type)) {
            whereClause.type = type;
        }

        const transactions = await prisma.farmerSupplyTransaction.findMany({
            where: whereClause,
            include: {
                supply: { select: { name: true, type: true, unit: true, brand: true } },
                farm: { select: { farmName: true, farmCode: true } },
                cropSeason: { select: { name: true, year: true } },
            },
            orderBy: [{ actionDate: "desc" }, { createdAt: "desc" }],
        });

        return NextResponse.json({ success: true, data: transactions });
    } catch (error: any) {
        console.error("Error in GET /api/farmer/supplies/transactions:", error);
        return NextResponse.json({ success: false, message: error?.message || "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const farmerId = await resolveFarmerId(session);
        if (!farmerId) {
            return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
        }

        const json = await request.json().catch(() => null);
        const parsed = createTransactionSchema.safeParse(json);
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, message: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" },
                { status: 400 },
            );
        }

        const { supplyId, type, quantity, farmId, cropSeasonId, stage, activityType, purpose, actionDate, notes } =
            parsed.data;

        // Tìm vật tư trong kho
        const supply = await prisma.farmerSupply.findFirst({
            where: { id: supplyId, farmerId },
        });

        if (!supply) {
            return NextResponse.json(
                { success: false, message: "Không tìm thấy vật tư trong kho" },
                { status: 404 },
            );
        }

        // Nếu là xuất kho (OUT), kiểm tra tồn kho
        if (type === "OUT" && supply.quantity < quantity) {
            return NextResponse.json(
                {
                    success: false,
                    message: `Số lượng tồn kho không đủ (Hiện có: ${supply.quantity} ${supply.unit}, cần xuất: ${quantity} ${supply.unit})`,
                },
                { status: 400 },
            );
        }

        const totalAmount = Number(supply.unitPrice) * quantity;
        const txDate = actionDate ? new Date(actionDate) : new Date();

        const result = await prisma.$transaction(async (tx) => {
            // Cập nhật tồn kho
            let newQty = supply.quantity;
            if (type === "IN") newQty += quantity;
            else if (type === "OUT") newQty -= quantity;
            else if (type === "ADJUSTMENT") newQty = quantity;

            await tx.farmerSupply.update({
                where: { id: supply.id },
                data: { quantity: Math.max(0, newQty) },
            });

            // Ghi nhận giao dịch
            const transaction = await tx.farmerSupplyTransaction.create({
                data: {
                    supplyId: supply.id,
                    farmerId,
                    farmId: farmId || null,
                    cropSeasonId: cropSeasonId || null,
                    type,
                    quantity,
                    unitPrice: supply.unitPrice,
                    totalAmount,
                    stage: stage as any || null,
                    activityType: activityType as any || null,
                    purpose: purpose || (type === "OUT" ? "Xuất kho sử dụng" : "Nhập kho vật tư"),
                    actionDate: txDate,
                    notes,
                },
            });

            return transaction;
        });

        return NextResponse.json({ success: true, data: result }, { status: 201 });
    } catch (error: any) {
        console.error("Error in POST /api/farmer/supplies/transactions:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Internal server error" },
            { status: 500 },
        );
    }
}
