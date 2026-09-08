import { PATCH as patchQc } from "@/app/api/processing/raw-materials/[id]/qc/route";

export const dynamic = "force-dynamic";

/**
 * Standardized QC Endpoint: /api/raw-material-lots/[id]/qc (Ưu tiên 4, 6):
 * Kiểm tra chất lượng (QC) cho lô nguyên liệu thực nhận.
 */
export async function PATCH(request: Request, context: { params: { id: string } }) {
    return patchQc(request, context);
}

export async function POST(request: Request, context: { params: { id: string } }) {
    return patchQc(request, context);
}
