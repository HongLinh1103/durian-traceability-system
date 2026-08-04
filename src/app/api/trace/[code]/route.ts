import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { code: string } }) {
    const rateLimit = checkRateLimit(`trace:${getClientIp(request)}`, 60, 60_000);
    if (!rateLimit.allowed) {
        return NextResponse.json(
            { success: false, status: "RATE_LIMITED", message: "Bạn tra cứu quá nhanh. Vui lòng thử lại sau." },
            { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds), "Cache-Control": "no-store" } },
        );
    }
    const code = decodeURIComponent(params.code).trim();
    if (!code || code.length > 200) {
        return NextResponse.json({ success: false, status: "INVALID", message: "Mã QR không hợp lệ hoặc không thuộc hệ thống." }, { status: 400 });
    }

    const farm = await prisma.farm.findFirst({
        where: { farmCode: { equals: code, mode: "insensitive" } },
        select: {
            farmCode: true,
            farmName: true,
            areaSize: true,
            areaUnit: true,
            totalTrees: true,
            durianVariety: true,
            address: true,
            province: true,
            district: true,
            ward: true,
            latitude: true,
            longitude: true,
            isActive: true,
            farmer: { select: { accountStatus: true, isApproved: true, deletedAt: true } },
            region: { select: { code: true, name: true, province: true, district: true, ward: true, isActive: true, validUntil: true } },
            farmingLogs: {
                orderBy: [{ actionDate: "desc" }, { createdAt: "desc" }],
                take: 20,
                select: { id: true, actionDate: true, stage: true, activityType: true, chemicalName: true, dosage: true, phiDays: true, isGACCCompliant: true, notes: true },
            },
        },
    });

    if (!farm) {
        return NextResponse.json({ success: false, status: "NOT_FOUND", message: "Không tìm thấy thông tin truy xuất cho mã này." }, { status: 404 });
    }

    const isRegionExpired = Boolean(farm.region?.validUntil && farm.region.validUntil < new Date());
    const isValid = farm.isActive
        && farm.farmer.accountStatus === "APPROVED"
        && farm.farmer.isApproved
        && !farm.farmer.deletedAt
        && Boolean(farm.region?.isActive)
        && !isRegionExpired;

    if (!isValid) {
        return NextResponse.json({ success: false, status: "EXPIRED", message: "Mã truy xuất đã hết hiệu lực hoặc đã bị thu hồi." }, { status: 410 });
    }

    return NextResponse.json({
        success: true,
        status: "VALID",
        data: {
            code: farm.farmCode,
            farmName: farm.farmName,
            areaSize: farm.areaSize,
            areaUnit: farm.areaUnit,
            totalTrees: farm.totalTrees,
            durianVariety: farm.durianVariety,
            address: [farm.address, farm.ward, farm.district, farm.province].filter(Boolean).join(", "),
            latitude: farm.latitude,
            longitude: farm.longitude,
            region: farm.region,
            farmingLogs: farm.farmingLogs,
        },
    }, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300", "X-RateLimit-Remaining": String(rateLimit.remaining) } });
}
