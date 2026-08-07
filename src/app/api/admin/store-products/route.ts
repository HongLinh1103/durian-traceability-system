import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/store-marketplace";
export async function GET() { if (!(await requireRole(["ADMIN"]))) return NextResponse.json({ success: false }, { status: 403 }); return NextResponse.json({ success: true, data: await prisma.storeProduct.findMany({ where: { deletedAt: null }, include: { store: { select: { name: true, status: true } } }, orderBy: { createdAt: "desc" } }) }); }
export async function PATCH(request: Request) { if (!(await requireRole(["ADMIN"]))) return NextResponse.json({ success: false }, { status: 403 }); const parsed = z.object({ id: z.string(), status: z.enum(["APPROVED", "REJECTED", "HIDDEN"]), reason: z.string().trim().max(1000).optional() }).safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ success: false }, { status: 400 }); const data = await prisma.storeProduct.update({ where: { id: parsed.data.id }, data: { status: parsed.data.status, reviewReason: parsed.data.reason || null } }); return NextResponse.json({ success: true, data }); }
