import { lockFarmerStock, rebuildMaterialFifo } from "@/lib/farmer-material-fifo";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const updateTransactionSchema = z.object({
    supplyId: z.string().optional(),
    name: z.string().trim().min(1).optional(),
    type: z.enum(["FERTILIZER", "PESTICIDE", "EQUIPMENT", "OTHER"]).optional(),
    unit: z.string().trim().min(1).optional(),
    packaging: z.string().trim().max(150).optional().nullable(),
    quantity: z.coerce.number().finite().positive("Số lượng phải lớn hơn 0"),
    unitPrice: z.coerce.number().finite().nonnegative("Đơn giá không hợp lệ"),
    actionDate: z.string().min(1, "Ngày nhập không được để trống"),
    expiryDate: z.string().optional().nullable(),
    notes: z.string().trim().max(1000).optional().nullable(),
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

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
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

        const transaction = await prisma.farmerSupplyTransaction.findFirst({
            where: { id: params.id, farmerId },
            include: {
                supply: { select: { id: true, name: true, type: true, unit: true, packaging: true } },
            },
        });

        if (!transaction) {
            return NextResponse.json({ success: false, message: "Không tìm thấy giao dịch" }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: transaction });
    } catch (error: any) {
        console.error("Error in GET /api/farmer/supplies/transactions/[id]:", error);
        return NextResponse.json({ success: false, message: error?.message || "Internal server error" }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
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

        const existingTx = await prisma.farmerSupplyTransaction.findFirst({
            where: { id: params.id, farmerId },
            include: { supply: true },
        });

        if (!existingTx) {
            return NextResponse.json({ success: false, message: "Không tìm thấy đợt nhập kho" }, { status: 404 });
        }

        if (existingTx.type !== "IN") {
            return NextResponse.json({ success: false, message: "Chỉ được chỉnh sửa đợt nhập kho" }, { status: 400 });
        }

        const json = await request.json().catch(() => null);
        const parsed = updateTransactionSchema.safeParse(json);
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, message: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" },
                { status: 400 }
            );
        }

        const { supplyId, quantity, unitPrice, actionDate, expiryDate, packaging, notes, name, type, unit } = parsed.data;

        let targetSupplyId = existingTx.supplyId;
        if (supplyId && supplyId !== existingTx.supplyId) {
            const foundSupply = await prisma.farmerSupply.findFirst({
                where: { id: supplyId, farmerId },
                select: { id: true },
            });
            if (!foundSupply) {
                return NextResponse.json({ success: false, message: "Vật tư không hợp lệ" }, { status: 400 });
            }
            targetSupplyId = foundSupply.id;
        }

        const txDate = new Date(actionDate);
        if (isNaN(txDate.getTime())) {
            return NextResponse.json({ success: false, message: "Ngày nhập kho không hợp lệ" }, { status: 400 });
        }

        const expDate = expiryDate ? new Date(expiryDate) : null;
        if (expDate && isNaN(expDate.getTime())) {
            return NextResponse.json({ success: false, message: "Ngày hết hạn không hợp lệ" }, { status: 400 });
        }

        const totalAmount = quantity * unitPrice;

        const updatedTx = await prisma.$transaction(async (tx) => {
            await lockFarmerStock(tx, farmerId);

            // Cập nhật thông tin quy cách đóng gói hoặc thông tin vật tư nếu có
            const supplyUpdateData: Record<string, any> = {};
            if (packaging !== undefined) {
                supplyUpdateData.packaging = packaging?.trim() || null;
            }
            if (name?.trim()) {
                supplyUpdateData.name = name.trim();
            }
            if (type) {
                supplyUpdateData.type = type;
            }
            if (unit?.trim()) {
                supplyUpdateData.unit = unit.trim();
            }

            if (Object.keys(supplyUpdateData).length > 0) {
                await tx.farmerSupply.update({
                    where: { id: targetSupplyId },
                    data: supplyUpdateData,
                });
            }

            const updated = await tx.farmerSupplyTransaction.update({
                where: { id: existingTx.id },
                data: {
                    supplyId: targetSupplyId,
                    quantity,
                    unitPrice,
                    totalAmount,
                    actionDate: txDate,
                    expiryDate: expDate,
                    notes: notes ? notes.trim() : null,
                },
            });

            // Tính toán lại tồn kho và định giá FIFO
            await rebuildMaterialFifo(tx, farmerId);

            return updated;
        }, { timeout: 30000 });

        return NextResponse.json({ success: true, data: updatedTx });
    } catch (error: any) {
        console.error("Error in PUT /api/farmer/supplies/transactions/[id]:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Không thể cập nhật đợt nhập vật tư." },
            { status: 400 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
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

        const existingTx = await prisma.farmerSupplyTransaction.findFirst({
            where: { id: params.id, farmerId },
            include: { supply: true },
        });

        if (!existingTx) {
            return NextResponse.json({ success: false, message: "Không tìm thấy đợt nhập kho" }, { status: 404 });
        }

        if (existingTx.type !== "IN") {
            return NextResponse.json({ success: false, message: "Chỉ được xóa đợt nhập kho" }, { status: 400 });
        }

        await prisma.$transaction(async (tx) => {
            await lockFarmerStock(tx, farmerId);

            await tx.farmerSupplyTransaction.delete({
                where: { id: existingTx.id },
            });

            // Tính toán lại tồn kho và định giá FIFO
            await rebuildMaterialFifo(tx, farmerId);
        }, { timeout: 30000 });

        return NextResponse.json({
            success: true,
            message: "Đã xóa đợt nhập vật tư thành công.",
        });
    } catch (error: any) {
        console.error("Error in DELETE /api/farmer/supplies/transactions/[id]:", error);
        const msg = error?.message || "";
        const userMsg = msg.includes("vượt quá") || msg.includes("FIFO")
            ? "Không thể xóa đợt nhập này vì số lượng vật tư đã được xuất kho sử dụng trong các hoạt động khác."
            : msg || "Không thể xóa đợt nhập vật tư.";
        return NextResponse.json(
            { success: false, message: userMsg },
            { status: 400 }
        );
    }
}
