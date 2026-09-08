import { GET as getFinishedProducts } from "@/app/api/processing/finished-products/route";

export const dynamic = "force-dynamic";

/**
 * Standardized Resource Route: /api/finished-product-lots
 * Quản lý danh sách Lô thành phẩm (Ưu tiên 6, 7).
 */
export async function GET(request: Request) {
    return getFinishedProducts();
}
