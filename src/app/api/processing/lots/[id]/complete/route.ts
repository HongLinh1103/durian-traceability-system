import { NextResponse } from "next/server";
import { PATCH as patchBatch } from "../../../batches/[id]/route";

export const dynamic = "force-dynamic";

/**
 * POST /api/processing/lots/[id]/complete
 * Standardized action endpoint (Ưu tiên 6, 9, 16):
 * Hoàn tất lô chế biến, tính hao hụt, tỷ lệ thu hồi và tạo Lô thành phẩm (FinishedProductLot).
 */
export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json().catch(() => ({}));
        const patchRequest = new Request(request.url, {
            method: "PATCH",
            headers: request.headers,
            body: JSON.stringify({
                action: "COMPLETE",
                ...body,
            }),
        });
        return await patchBatch(patchRequest, { params });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, message: error?.message || "Lỗi khi hoàn tất lô chế biến." },
            { status: 500 }
        );
    }
}
