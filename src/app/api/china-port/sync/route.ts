import { NextResponse } from "next/server";
import { syncChinaPortVietnamData } from "@/lib/china-port-sync";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

// POST /api/china-port/sync - Kích hoạt đồng bộ dữ liệu Việt Nam & phát hiện bản ghi mới
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") return NextResponse.json({ message: "Không có quyền." }, { status: 403 });
    try {
        const body = await request.json().catch(() => ({}));
        const parsed = z.object({ sendEmail: z.boolean().default(true), prodName: z.string().max(100).optional(), pageSize: z.number().int().min(1).max(1000).default(1000) }).safeParse(body);
        if (!parsed.success) return NextResponse.json({ message: "Tham số đồng bộ không hợp lệ." }, { status: 400 });
        const { sendEmail, prodName, pageSize } = parsed.data;

        const result = await syncChinaPortVietnamData({
            sendEmail,
            prodName,
            pageSize,
        });

        return NextResponse.json({
            code: result.success ? 200 : 500,
            message: result.message,
            data: result,
        });
    } catch (error: any) {
        console.error("Error in China Port Sync API:", error);
        return NextResponse.json(
            {
                code: 500,
                message: error.message || "Lỗi máy chủ khi đồng bộ China Port",
                data: null,
            },
            { status: 500 }
        );
    }
}

// GET /api/china-port/sync - Lấy trạng thái và lịch sử đồng bộ gần nhất
export async function GET() {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") return NextResponse.json({ message: "Không có quyền." }, { status: 403 });
    try {
        let lastLogs: any[] = [];
        let totalStored = 0;

        try {
            lastLogs = await prisma.chinaPortSyncLog.findMany({
                where: { countryCode: "704" },
                orderBy: { syncedAt: "desc" },
                take: 5,
            });

            totalStored = await prisma.chinaPortRecord.count({
                where: { countryCode: "704" },
            });
        } catch (dbErr) {
            console.warn("DB offline in sync status GET:", dbErr);
        }

        return NextResponse.json({
            code: 200,
            data: {
                totalStored,
                lastLogs,
                country: "704 (Viet Nam)",
                status: "READY",
            },
        });
    } catch (error: any) {
        return NextResponse.json(
            { code: 500, message: error.message || "Lỗi khi lấy thông tin đồng bộ" },
            { status: 500 }
        );
    }
}
