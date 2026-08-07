import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/master-data/pesticides
 * Public API - trả về tên thuốc/hoạt chất trong danh mục cấm đang hoạt động.
 * Dùng để cảnh báo khi nông dân nhập tự do tên thuốc trong nhật ký.
 */
export async function GET() {
    try {
        const data = await prisma.pesticide.findMany({
            where: {
                isActive: true,
                deletedAt: null,
                gaccStatus: "PROHIBITED",
            },
            orderBy: { tradeName: "asc" },
            select: {
                id: true,
                pesticideName: true,
                tradeName: true,
                activeIngredient: true,
            },
        });

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("GET /api/master-data/pesticides error:", error);
        return NextResponse.json({ success: false, message: "Không thể tải danh sách thuốc BVTV." }, { status: 500 });
    }
}

