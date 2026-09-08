import { NextResponse } from "next/server";
import { POST as postFreshPackaging } from "@/app/api/processing/fresh-packaging/route";

export const dynamic = "force-dynamic";

/**
 * POST /api/finished-product-lots/[id]/package
 * Standardized packaging action (Ưu tiên 7, 9, 16):
 * Thực hiện đóng gói lô thành phẩm hoặc xuất kho đóng gói.
 */
export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json().catch(() => ({}));
        const reqWithLotId = new Request(request.url, {
            method: "POST",
            headers: request.headers,
            body: JSON.stringify({
                lotId: params.id,
                ...body,
            }),
        });
        return await postFreshPackaging(reqWithLotId);
    } catch (error: any) {
        return NextResponse.json(
            { success: false, message: error?.message || "Lỗi khi đóng gói lô thành phẩm." },
            { status: 500 }
        );
    }
}
