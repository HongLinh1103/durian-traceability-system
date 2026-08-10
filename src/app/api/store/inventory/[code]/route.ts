import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOwnedStore, requireRole } from "@/lib/store-marketplace";

export async function GET(_request: Request, { params }: { params: { code: string } }) {
    const session = await requireRole(["STORE_OWNER"]);
    if (!session) return NextResponse.json({ success: false, message: "Không có quyền truy cập." }, { status: 403 });
    const store = await getOwnedStore(session.user.id);
    if (!store) return NextResponse.json({ success: false, message: "Không tìm thấy cửa hàng." }, { status: 404 });
    const document = await prisma.inventoryDocument.findFirst({
        where: { code: decodeURIComponent(params.code), storeId: store.id },
        include: {
            movements: { include: { product: { select: { name: true, unit: true, type: true } } }, orderBy: { createdAt: "asc" } },
            order: { select: { id: true, orderCode: true, recipientName: true, status: true } },
        },
    });
    return document ? NextResponse.json({ success: true, document }) : NextResponse.json({ success: false, message: "Không tìm thấy chứng từ." }, { status: 404 });
}
