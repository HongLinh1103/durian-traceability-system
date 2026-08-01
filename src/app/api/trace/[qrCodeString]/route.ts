import { NextResponse } from "next/server";
import { incrementTraceScan } from "@/lib/trace-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: { qrCodeString: string } }) {
    const qrCodeString = decodeURIComponent(params.qrCodeString);
    const record = incrementTraceScan(qrCodeString);

    return NextResponse.json({ ok: true, data: record });
}
