import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/store-marketplace";
export async function GET() {
    if (!(await requireRole(["ADMIN"]))) return NextResponse.json({ success: false }, { status: 403 });
    const data = await prisma.store.findMany({ where: { deletedAt: null }, include: { owner: { select: { id: true, fullName: true, phone: true, email: true, isApproved: true } }, documents: { where: { deletedAt: null } }, auditLogs: { orderBy: { createdAt: "desc" }, take: 20 } }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ success: true, data });
}
