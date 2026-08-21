import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const createSupplySchema = z.object({
    name: z.string().trim().min(2, "Tên vật tư quá ngắn").max(200),
    type: z.enum(["FERTILIZER", "PESTICIDE", "EQUIPMENT", "OTHER"]),
    brand: z.string().trim().max(150).optional().nullable(),
    unit: z.string().trim().min(1, "Đơn vị tính không được trống").max(50),
    quantity: z.coerce.number().min(0, "Số lượng không hợp lệ"),
    unitPrice: z.coerce.number().min(0, "Đơn giá không hợp lệ"),
    phiDays: z.coerce.number().int().min(0).optional().nullable(),
    activeIngredients: z.string().trim().max(500).optional().nullable(),
    notes: z.string().trim().max(1000).optional().nullable(),
});

const DEFAULT_SUPPLIES = [
    {
        name: "Phân bón NPK Đầu Trâu 16-16-8+TE",
        type: "FERTILIZER" as const,
        brand: "Đầu Trâu",
        unit: "bao 50kg",
        quantity: 15,
        unitPrice: 650000,
        notes: "Dùng bón thúc giai đoạn nuôi trái và làm đọt",
    },
    {
        name: "Phân hữu cơ vi sinh Humic King",
        type: "FERTILIZER" as const,
        brand: "Humic King",
        unit: "bao 25kg",
        quantity: 20,
        unitPrice: 380000,
        notes: "Bón phục hồi sau thu hoạch và kích rễ",
    },
    {
        name: "Phân bón lá Canxi Bo Sữa",
        type: "FERTILIZER" as const,
        brand: "EuroChem",
        unit: "chai 1L",
        quantity: 12,
        unitPrice: 160000,
        notes: "Phun giai đoạn ra hoa, chống rụng trái non",
    },
    {
        name: "Thuốc trừ nấm bệnh Champion 77WP",
        type: "PESTICIDE" as const,
        brand: "Nufarm",
        unit: "gói 500g",
        quantity: 18,
        unitPrice: 145000,
        phiDays: 7,
        activeIngredients: "Copper Hydroxide 77% w/w",
        notes: "Phòng trừ nấm Phytophthora gây xì mủ, thối rễ",
    },
    {
        name: "Thuốc trừ bệnh Tilt Super 300EC",
        type: "PESTICIDE" as const,
        brand: "Syngenta",
        unit: "chai 250ml",
        quantity: 10,
        unitPrice: 220000,
        phiDays: 14,
        activeIngredients: "Difenoconazole 150g/l + Propiconazole 150g/l",
        notes: "Trừ đốm lá, thán thư giai đoạn đọt non",
    },
    {
        name: "Thuốc trừ sâu rầy Radiant 60SC",
        type: "PESTICIDE" as const,
        brand: "Dow AgroSciences",
        unit: "gói 15ml",
        quantity: 30,
        unitPrice: 38000,
        phiDays: 3,
        activeIngredients: "Spinetoram 60g/L",
        notes: "Đặc trị bọ trĩ, sâu đục trái sầu riêng",
    },
    {
        name: "Bình xịt điện 20L Oshima",
        type: "EQUIPMENT" as const,
        brand: "Oshima",
        unit: "cái",
        quantity: 2,
        unitPrice: 1250000,
        notes: "Bình phun thuốc và phân bón lá",
    },
];

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
        const type = searchParams.get("type");
        const search = searchParams.get("q")?.trim();

        // Kiểm tra xem nông dân đã có vật tư trong kho chưa, nếu chưa có thì tự động khởi tạo 7 mặt hàng
        const existingCount = await prisma.farmerSupply.count({
            where: { farmerId },
        });

        if (existingCount === 0) {
            for (const item of DEFAULT_SUPPLIES) {
                const sp = await prisma.farmerSupply.create({
                    data: {
                        farmerId,
                        name: item.name,
                        type: item.type,
                        brand: item.brand,
                        unit: item.unit,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        phiDays: (item as any).phiDays ?? null,
                        activeIngredients: (item as any).activeIngredients ?? null,
                        notes: item.notes,
                    },
                });

                await prisma.farmerSupplyTransaction.create({
                    data: {
                        supplyId: sp.id,
                        farmerId,
                        type: "IN",
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        totalAmount: Number(item.unitPrice) * item.quantity,
                        purpose: "Nhập kho ban đầu",
                        actionDate: new Date(),
                    },
                });
            }
        }

        const whereClause: any = { farmerId };

        if (type && ["FERTILIZER", "PESTICIDE", "EQUIPMENT", "OTHER"].includes(type)) {
            whereClause.type = type;
        }

        if (search) {
            whereClause.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { brand: { contains: search, mode: "insensitive" } },
                { activeIngredients: { contains: search, mode: "insensitive" } },
            ];
        }

        const supplies = await prisma.farmerSupply.findMany({
            where: whereClause,
            orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
        });

        const summary = {
            totalItems: supplies.length,
            totalStockValue: supplies.reduce(
                (sum, item) => sum + Number(item.unitPrice) * item.quantity,
                0,
            ),
            fertilizerCount: supplies.filter((s) => s.type === "FERTILIZER").length,
            pesticideCount: supplies.filter((s) => s.type === "PESTICIDE").length,
            equipmentCount: supplies.filter((s) => s.type === "EQUIPMENT").length,
        };

        return NextResponse.json({ success: true, data: supplies, summary });
    } catch (error: any) {
        console.error("Error in GET /api/farmer/supplies:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Internal server error" },
            { status: 500 },
        );
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
        const parsed = createSupplySchema.safeParse(json);
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, message: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" },
                { status: 400 },
            );
        }

        const { name, type, brand, unit, quantity, unitPrice, phiDays, activeIngredients, notes } =
            parsed.data;

        const result = await prisma.$transaction(async (tx) => {
            let supply = await tx.farmerSupply.findFirst({
                where: {
                    farmerId,
                    name: { equals: name, mode: "insensitive" },
                    unit: { equals: unit, mode: "insensitive" },
                },
            });

            if (supply) {
                const newQty = supply.quantity + quantity;
                supply = await tx.farmerSupply.update({
                    where: { id: supply.id },
                    data: {
                        quantity: newQty,
                        unitPrice,
                        brand: brand || supply.brand,
                        phiDays: phiDays !== undefined ? phiDays : supply.phiDays,
                        activeIngredients: activeIngredients || supply.activeIngredients,
                        notes: notes || supply.notes,
                    },
                });
            } else {
                supply = await tx.farmerSupply.create({
                    data: {
                        farmerId,
                        name,
                        type,
                        brand,
                        unit,
                        quantity,
                        unitPrice,
                        phiDays,
                        activeIngredients,
                        notes,
                    },
                });
            }

            if (quantity > 0) {
                await tx.farmerSupplyTransaction.create({
                    data: {
                        supplyId: supply.id,
                        farmerId,
                        type: "IN",
                        quantity,
                        unitPrice,
                        totalAmount: Number(unitPrice) * quantity,
                        purpose: "Nhập kho vật tư",
                        notes: notes || "Nhập kho thủ công",
                        actionDate: new Date(),
                    },
                });
            }

            return supply;
        });

        return NextResponse.json({ success: true, data: result }, { status: 201 });
    } catch (error: any) {
        console.error("Error in POST /api/farmer/supplies:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Internal server error" },
            { status: 500 },
        );
    }
}
