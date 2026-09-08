import { POST as issueShipmentQr } from "@/app/api/processing/shipments/[id]/qr/issue/route";

export const dynamic = "force-dynamic";

/**
 * Standardized Shared Action: POST /api/shipments/[id]/qr/issue
 */
export async function POST(request: Request, context: { params: { id: string } }) {
    return issueShipmentQr(request, context);
}
