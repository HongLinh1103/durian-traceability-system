import path from "path";
import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyStoreDocumentSignature } from "@/lib/store-marketplace";
export async function GET(request: Request, { params }: { params: { id: string } }) {
    const url = new URL(request.url); const expires = Number(url.searchParams.get("expires")); const signature = url.searchParams.get("signature") || "";
    if (!verifyStoreDocumentSignature(params.id, expires, signature)) return NextResponse.json({ success: false, message: "Liên kết không hợp lệ hoặc đã hết hạn." }, { status: 403 });
    const doc = await prisma.storeDocument.findFirst({ where: { id: params.id, deletedAt: null } }); if (!doc) return NextResponse.json({ success: false }, { status: 404 });
    const data = await readFile(path.join(process.cwd(), ".storage", "store-documents", path.basename(doc.storageKey)));
    return new NextResponse(data, { headers: { "content-type": doc.mimeType, "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(doc.name)}`, "cache-control": "private, no-store" } });
}
