import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
    const body = (await request.json()) as {
        province?: string;
        district?: string;
        ward?: string;
        durianVarieties?: string[];
    };
    if (!body.province?.trim()) {
        return NextResponse.json({ success: true, data: [] });
    }

    const regions = await prisma.growingRegion.findMany({
        where: {
            isActive: true,
            province: { equals: body.province.trim(), mode: "insensitive" },
            OR: [
                { district: null },
                { district: { equals: body.district?.trim(), mode: "insensitive" } },
            ],
            AND: [{ OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }] }],
        },
        orderBy: [{ district: "desc" }, { ward: "desc" }, { name: "asc" }],
        take: 10,
        select: {
            id: true,
            code: true,
            name: true,
            province: true,
            district: true,
            ward: true,
            cropVarieties: true,
        },
    });

    const varieties = new Set(body.durianVarieties ?? []);
    const data = regions
        .filter(
            (region) =>
                !region.cropVarieties.length ||
                region.cropVarieties.some((item) => varieties.has(item)),
        )
        .sort((a, b) => {
            const ward = body.ward?.trim().toLowerCase();
            return Number(b.ward?.toLowerCase() === ward) - Number(a.ward?.toLowerCase() === ward);
        });

    return NextResponse.json({ success: true, data });
}
