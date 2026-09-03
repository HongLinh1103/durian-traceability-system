import { NextResponse } from "next/server";
import { savePreviewTrace, PreviewTraceData } from "@/lib/trace-preview";

export async function POST(request: Request) {
    try {
        const body = (await request.json().catch(() => null)) as PreviewTraceData;
        if (!body || !body.shipmentCode) {
            return NextResponse.json({ success: false, message: "Thiếu thông tin mã lô." }, { status: 400 });
        }

        savePreviewTrace({
            ...body,
            updatedAt: Date.now(),
        });

        return NextResponse.json({ success: true, message: "Đã lưu bản xem trước QR." });
    } catch {
        return NextResponse.json({ success: false, message: "Không thể lưu xem trước." }, { status: 500 });
    }
}
