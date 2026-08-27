import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const level = searchParams.get("level") || "corp";

    try {
        const response = await fetch(`https://int.daquang.workers.dev/api/params?level=${encodeURIComponent(level)}`, {
            headers: {
                "User-Agent": "TriVietDurian/1.0",
                Accept: "application/json",
            },
            next: { revalidate: 3600 },
        });

        if (!response.ok) {
            throw new Error(`China Port Params API returned ${response.status}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Error fetching China Port params:", error);
        // Fallback default corp types
        return NextResponse.json({
            code: 200,
            message: "fallback",
            data: [
                { corpTypeCode: "01", corpTypeNameEn: "Production", corpTypeNameCn: "生产型", corpDescriptionEn: "Orchards, farms, growing areas", corpDescriptionCn: "果园、果场、种植区" },
                { corpTypeCode: "02", corpTypeNameEn: "Packaging and processing", corpTypeNameCn: "包装加工型", corpDescriptionEn: "Fruit packing houses and processing establishments", corpDescriptionCn: "水果包装厂、加工厂" },
                { corpTypeCode: "03", corpTypeNameEn: "Temporary storage", corpTypeNameCn: "储存暂养型", corpDescriptionEn: "Cold storage warehouses", corpDescriptionCn: "冷藏库、储存库" },
                { corpTypeCode: "04", corpTypeNameEn: "Disinfestation treatment", corpTypeNameCn: "除害处理", corpDescriptionEn: "Cold treatment & quarantine enterprises", corpDescriptionCn: "冷处理、检疫处理企业" },
                { corpTypeCode: "05", corpTypeNameEn: "Trade", corpTypeNameCn: "贸易型", corpDescriptionEn: "Trading companies", corpDescriptionCn: "贸易公司" },
                { corpTypeCode: "06", corpTypeNameEn: "Others", corpTypeNameCn: "其他", corpDescriptionEn: "Other facilities", corpDescriptionCn: "其他设施" },
            ],
        });
    }
}
