import { GET as getBatches, POST as postBatch } from "../batches/route";

export const dynamic = "force-dynamic";

/**
 * Standardized Resource Route: /api/processing/lots
 * Thay thế / bổ sung cho /api/processing/batches theo kiến trúc chuẩn hóa (Ưu tiên 6).
 */
export async function GET(request: Request) {
    return getBatches(request);
}

export async function POST(request: Request) {
    return postBatch(request);
}
