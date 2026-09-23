import { NextResponse } from "next/server";
import { syncChinaPortVietnamData } from "@/lib/china-port-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
    const secret = process.env.CRON_SECRET;
    if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
        return NextResponse.json({ message: "Không có quyền." }, { status: 401 });
    }
    const result = await syncChinaPortVietnamData();
    return NextResponse.json(result, { status: result.success ? 200 : 502 });
}
