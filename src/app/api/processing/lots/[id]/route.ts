import { GET as getBatch, PATCH as patchBatch } from "../../batches/[id]/route";

export const dynamic = "force-dynamic";

/**
 * Standardized Resource Route: /api/processing/lots/[id]
 * Lấy chi tiết hoặc cập nhật Lô chế biến (Ưu tiên 6).
 */
export async function GET(request: Request, context: { params: { id: string } }) {
    return getBatch(request, context);
}

export async function PATCH(request: Request, context: { params: { id: string } }) {
    return patchBatch(request, context);
}
