import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
    const startedAt = Date.now();
    try {
        await prisma.$queryRaw`SELECT 1`;
        return NextResponse.json({
            status: "ok",
            database: "reachable",
            responseTimeMs: Date.now() - startedAt,
            timestamp: new Date().toISOString(),
        }, { headers: { "Cache-Control": "no-store" } });
    } catch {
        return NextResponse.json({
            status: "unhealthy",
            database: "unreachable",
            timestamp: new Date().toISOString(),
        }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
}
