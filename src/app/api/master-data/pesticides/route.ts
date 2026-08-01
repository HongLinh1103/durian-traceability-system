import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/master-data/pesticides
 * Public API - chỉ trả về danh sách thuốc BVTV đang hoạt động và không bị cấm
 * Dùng cho dropdown trong form nhật ký phun thuốc
 */
export async function GET() {
    try {
        const data = await prisma.pesticide.findMany({
            where: {
                isActive: true,
                deletedAt: null,
                gaccStatus: { not: "PROHIBITED" },
            },
            orderBy: { tradeName: "asc" },
            select: {
                id: true,
                code: true,
                tradeName: true,
                activeIngredient: true,
                category: true,
                gaccStatus: true,
                phiDays: true,
                recommendedDosage: true,
            },
        });

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("GET /api/master-data/pesticides error:", error);
        return NextResponse.json({ success: false, message: "Không thể tải danh sách thuốc BVTV." }, { status: 500 });
    }
}

