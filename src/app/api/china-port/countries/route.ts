import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 3600; // Cache 1 hour

export async function GET() {
    try {
        const response = await fetch("https://int.daquang.workers.dev/api/countries", {
            headers: {
                "User-Agent": "TriVietDurian/1.0",
                Accept: "application/json",
            },
            next: { revalidate: 3600 },
        });

        if (!response.ok) {
            throw new Error(`China Port API returned ${response.status}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Error fetching China Port countries:", error);
        // Fallback default list if worker is unreachable
        return NextResponse.json({
            code: 200,
            message: "fallback",
            data: [
                { countryIso: "VNM", countryCode: "704", countryNameEn: "Viet Nam", countryNameCn: "越南" },
                { countryIso: "THA", countryCode: "764", countryNameEn: "Thailand", countryNameCn: "泰国" },
                { countryIso: "MYS", countryCode: "458", countryNameEn: "Malaysia", countryNameCn: "马来西亚" },
                { countryIso: "CHN", countryCode: "156", countryNameEn: "China", countryNameCn: "中国" },
                { countryIso: "USA", countryCode: "840", countryNameEn: "United States", countryNameCn: "美国" },
                { countryIso: "JPN", countryCode: "392", countryNameEn: "Japan", countryNameCn: "日本" },
                { countryIso: "KOR", countryCode: "410", countryNameEn: "Korea", countryNameCn: "韩国" },
                { countryIso: "AUS", countryCode: "036", countryNameEn: "Australia", countryNameCn: "澳大利亚" },
            ],
        });
    }
}
