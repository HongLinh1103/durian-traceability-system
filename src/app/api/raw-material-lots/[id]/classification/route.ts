import { POST as postClassify } from "@/app/api/processing/raw-materials/[id]/classify/route";

export const dynamic = "force-dynamic";

/**
 * POST /api/raw-material-lots/[id]/classification
 * Standardized Classification Endpoint (Ưu tiên 4, 6):
 * Phân loại lô nguyên liệu thành Trái tươi xuất khẩu, Chế biến và Loại bỏ.
 */
export async function POST(request: Request, context: { params: { id: string } }) {
    return postClassify(request, context);
}
