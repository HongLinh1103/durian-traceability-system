import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/master-data/fertilizers
 * Public API - chỉ trả về danh sách phân bón đang hoạt động
 * Dùng cho dropdown trong form nhật ký bón phân
 */
export async function GET() {
    try {
        const data = await prisma.fertilizer.findMany({
            where: { isActive: true, deletedAt: null },
            orderBy: { name: "asc" },
            select: {
                id: true,
                code: true,
                name: true,
                fertilizerType: true,
                brand: true,
                nutrientComposition: true,
                recommendedDosage: true,
            },
        });

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("GET /api/master-data/fertilizers error:", error);
        return NextResponse.json({ success: false, message: "Không thể tải danh sách phân bón." }, { status: 500 });
    }
}

