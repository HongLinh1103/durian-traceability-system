import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));

        const response = await fetch("https://int.daquang.workers.dev/api/search", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "TriVietDurian/1.0",
                Accept: "application/json",
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`China Port Search API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Error searching China Port:", error);
        return NextResponse.json(
            {
                code: 500,
                message: error.message || "Không thể kết nối đến hệ thống China Port",
                data: { total: 0, rows: [] },
            },
            { status: 500 }
        );
    }
}
