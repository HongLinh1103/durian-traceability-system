import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ success: false }, { status: 401 });
    const type = new URL(request.url).searchParams.get("type");
    const data = await prisma.partnerFacility.findMany({ where: { status: "APPROVED", deletedAt: null, ...(type === "COLLECTOR" || type === "PROCESSING_FACILITY" ? { type } : {}) }, select: { id: true, ownerId: true, type: true, name: true, province: true, ward: true, phone: true }, orderBy: { name: "asc" } });
    return NextResponse.json({ success: true, data });
}
