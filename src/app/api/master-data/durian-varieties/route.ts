import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/master-data/durian-varieties
 * Public API - chỉ trả về danh sách giống sầu riêng đang hoạt động (isActive = true, deletedAt = null)
 * Dùng cho dropdown trong form đăng ký, nhật ký canh tác, ...
 */
export async function GET() {
    try {
        const data = await prisma.durianVariety.findMany({
            where: { isActive: true, deletedAt: null },
            orderBy: { name: "asc" },
            select: {
                id: true,
                code: true,
                name: true,
                scientificName: true,
                origin: true,
                averageHarvestDays: true,
            },
        });

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("GET /api/master-data/durian-varieties error:", error);
        return NextResponse.json({ success: false, message: "Không thể tải danh sách giống sầu riêng." }, { status: 500 });
    }
}

