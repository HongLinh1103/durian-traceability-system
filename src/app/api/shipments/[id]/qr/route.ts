import { GET as getShipmentQr } from "@/app/api/processing/shipments/[id]/qr/route";

export const dynamic = "force-dynamic";

/**
 * Standardized Shared Resource: /api/shipments/[id]/qr
 */
export async function GET(request: Request, context: { params: { id: string } }) {
    return getShipmentQr(request, context);
}
