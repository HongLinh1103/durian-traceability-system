import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseTraceCode } from "@/lib/trace-scanner-utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const rawCode = searchParams.get("code") || "";
        const cleanCode = parseTraceCode(rawCode);

        if (!cleanCode) {
            return NextResponse.json({ success: false, message: "Vui lòng cung cấp mã truy xuất." }, { status: 400 });
        }

        const trace = await prisma.traceabilityCode.findFirst({
            where: {
                OR: [
                    { publicToken: { equals: cleanCode, mode: "insensitive" } },
                    { code: { equals: cleanCode, mode: "insensitive" } },
                    { commercialLot: { lotCode: { equals: cleanCode, mode: "insensitive" } } },
                ],
            },
            include: {
                commercialLot: {
                    select: {
                        lotCode: true,
                        productName: true,
                        quantity: true,
                        unit: true,
                        owner: { select: { name: true } },
                        farmerOwner: { select: { fullName: true } },
                    },
                },
            },
        });

        if (!trace) {
            return NextResponse.json({
                success: false,
                exists: false,
                message: "Không tìm thấy thông tin cho mã này trong hệ thống TriViet.",
            }, { status: 404 });
        }

        const issuerName = trace.commercialLot?.owner?.name || trace.commercialLot?.farmerOwner?.fullName || "Đơn vị phát hành";

        return NextResponse.json({
            success: true,
            exists: true,
            data: {
                publicToken: trace.publicToken,
                code: trace.code,
                lotCode: trace.commercialLot?.lotCode,
                productName: trace.commercialLot?.productName,
                issuerName,
                status: trace.status,
                redirectUrl: `/trace/${encodeURIComponent(trace.publicToken)}`,
            },
        });
    } catch (error) {
        console.error("Error in /api/trace/lookup:", error);
        return NextResponse.json({ success: false, message: "Lỗi hệ thống khi tra cứu mã." }, { status: 500 });
    }
}
