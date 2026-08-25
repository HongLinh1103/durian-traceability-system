import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PROCESSING_FACILITY") return NextResponse.json({ success: false }, { status: 403 });
    const facility = await prisma.partnerFacility.findFirst({ where: { ownerId: session.user.id, type: "PROCESSING_FACILITY", deletedAt: null }, select: { id: true } });
    const [harvestCount, qcCount] = await Promise.all([
        prisma.harvestRecord.count({ where: { buyerUserId: session.user.id, buyerType: "PROCESSING_FACILITY", status: { in: ["WAITING_CONFIRMATION", "DELIVERY_CONFIRMED"] } } }),
        facility ? prisma.rawMaterialLot.count({ where: { facilityId: facility.id, status: "PENDING_QC" } }) : 0,
    ]);
    return NextResponse.json({ success: true, actionRequiredCount: harvestCount + qcCount });
}
