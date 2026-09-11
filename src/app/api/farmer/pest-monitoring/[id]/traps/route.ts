import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const trapSchema = z.object({
    id: z.string().optional(),
    trapCode: z.string().trim().min(1, "Mã bẫy không được để trống").max(50),
    trapType: z.string().trim().min(1, "Loại bẫy không được để trống").max(100),
    attractant: z.string().trim().max(200).optional().nullable(),
    locationName: z.string().trim().min(1, "Vị trí đặt không được để trống").max(200),
    latitude: z.coerce.number().optional().nullable(),
    longitude: z.coerce.number().optional().nullable(),
    installedDate: z.string().optional().nullable(),
    status: z.enum(["ACTIVE", "INACTIVE", "DAMAGED"]).default("ACTIVE"),
    notes: z.string().trim().max(500).optional().nullable(),
});

async function resolveFarmerId(session: any): Promise<string | null> {
    if (session?.user?.id) {
        const u = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { id: true },
        });
        if (u) return u.id;
    }
    if (session?.user?.phone) {
        const u = await prisma.user.findUnique({
            where: { phone: session.user.phone },
            select: { id: true },
        });
        if (u) return u.id;
    }
    if (session?.user?.email) {
        const u = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true },
        });
        if (u) return u.id;
    }
    return null;
}

export async function POST(
    request: Request,
    { params }: { params: { id: string } },
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const farmerId = await resolveFarmerId(session);
        if (!farmerId) {
            return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
        }

        const book = await prisma.pestMonitoringBook.findFirst({
            where: { id: params.id, farmerId },
        });
        if (!book) {
            return NextResponse.json({ success: false, message: "Không tìm thấy sổ theo dõi." }, { status: 404 });
        }

        const json = await request.json().catch(() => null);
        const parsed = trapSchema.safeParse(json);
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, message: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" },
                { status: 400 },
            );
        }

        const { trapCode, trapType, attractant, locationName, latitude, longitude, installedDate, status, notes } =
            parsed.data;

        const trap = await prisma.pestTrap.create({
            data: {
                monitoringBookId: book.id,
                trapCode,
                trapType,
                attractant: attractant || null,
                locationName,
                latitude: latitude || null,
                longitude: longitude || null,
                installedDate: installedDate ? new Date(installedDate) : new Date(),
                status,
                notes: notes || null,
            },
        });

        return NextResponse.json({ success: true, data: trap, message: "Đã thêm bẫy mới thành công." }, { status: 201 });
    } catch (error: any) {
        console.error("Error in POST /api/farmer/pest-monitoring/[id]/traps:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Internal server error" },
            { status: 500 },
        );
    }
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } },
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const farmerId = await resolveFarmerId(session);
        if (!farmerId) {
            return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
        }

        const book = await prisma.pestMonitoringBook.findFirst({
            where: { id: params.id, farmerId },
        });
        if (!book) {
            return NextResponse.json({ success: false, message: "Không tìm thấy sổ theo dõi." }, { status: 404 });
        }

        const json = await request.json().catch(() => null);
        const parsed = trapSchema.safeParse(json);
        if (!parsed.success || !parsed.data.id) {
            return NextResponse.json(
                { success: false, message: parsed.error?.issues[0]?.message || "Thiếu ID bẫy cần cập nhật" },
                { status: 400 },
            );
        }

        const { id: trapId, trapCode, trapType, attractant, locationName, latitude, longitude, installedDate, status, notes } =
            parsed.data;

        const updatedTrap = await prisma.pestTrap.update({
            where: { id: trapId, monitoringBookId: book.id },
            data: {
                trapCode,
                trapType,
                attractant: attractant || null,
                locationName,
                latitude: latitude || null,
                longitude: longitude || null,
                installedDate: installedDate ? new Date(installedDate) : undefined,
                status,
                notes: notes || null,
            },
        });

        return NextResponse.json({ success: true, data: updatedTrap, message: "Đã cập nhật bẫy thành công." });
    } catch (error: any) {
        console.error("Error in PUT /api/farmer/pest-monitoring/[id]/traps:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Internal server error" },
            { status: 500 },
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } },
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const farmerId = await resolveFarmerId(session);
        if (!farmerId) {
            return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
        }

        const book = await prisma.pestMonitoringBook.findFirst({
            where: { id: params.id, farmerId },
        });
        if (!book) {
            return NextResponse.json({ success: false, message: "Không tìm thấy sổ theo dõi." }, { status: 404 });
        }

        const { searchParams } = new URL(request.url);
        let trapId = searchParams.get("trapId");
        if (!trapId) {
            const body = await request.json().catch(() => ({}));
            trapId = body.trapId;
        }

        if (!trapId) {
            return NextResponse.json({ success: false, message: "Vui lòng chỉ định bẫy cần xóa." }, { status: 400 });
        }

        await prisma.pestTrap.delete({
            where: { id: trapId, monitoringBookId: book.id },
        });

        return NextResponse.json({ success: true, message: "Đã xóa bẫy thành công." });
    } catch (error: any) {
        console.error("Error in DELETE /api/farmer/pest-monitoring/[id]/traps:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Internal server error" },
            { status: 500 },
        );
    }
}
