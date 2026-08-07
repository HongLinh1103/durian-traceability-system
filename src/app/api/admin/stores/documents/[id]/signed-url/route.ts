import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, signStoreDocument } from "@/lib/store-marketplace";
export async function POST(_request: Request, { params }: { params: { id: string } }) {
    if (!(await requireRole(["ADMIN"]))) return NextResponse.json({ success: false }, { status: 403 });
    const doc = await prisma.storeDocument.findFirst({ where: { id: params.id, deletedAt: null }, select: { id: true } }); if (!doc) return NextResponse.json({ success: false }, { status: 404 });
    const expires = Date.now() + 5 * 60_000; const sig = signStoreDocument(doc.id, expires);
    return NextResponse.json({ success: true, url: `/api/store-documents/${doc.id}/download?expires=${expires}&signature=${sig}` });
}
