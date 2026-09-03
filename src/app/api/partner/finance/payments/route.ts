import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const paymentSchema = z.object({
    type: z.enum(["RECEIPT", "PAYMENT"]),
    commercialLotId: z.string().optional(),
    expenseId: z.string().optional(),
    harvestRecordId: z.string().optional(),
    amount: z.coerce.number().positive(),
    paymentDate: z.coerce.date().default(() => new Date()),
    paymentMethod: z.string().trim().default("Chuyển khoản"),
    payerName: z.string().trim().optional(),
    receiverName: z.string().trim().optional(),
    referenceCode: z.string().trim().optional(),
    note: z.string().trim().max(500).optional(),
}).refine((data) => {
    if (data.type === "RECEIPT" && !data.commercialLotId) return false;
    if (data.type === "PAYMENT" && !data.expenseId && !data.harvestRecordId) return false;
    return true;
}, { message: "Phải chọn mã phiếu xuất bán, khoản chi hoặc phiếu thu mua tương ứng" });

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !["COLLECTOR", "PROCESSING_FACILITY"].includes(session.user.role)) {
        return NextResponse.json({ success: false, error: "Không có quyền truy cập" }, { status: 403 });
    }

    let facility = await prisma.partnerFacility.findFirst({
        where: {
            OR: [
                { ownerId: session.user.id },
                { phone: session.user.phone ?? undefined },
                { representativePhone: session.user.phone ?? undefined },
            ],
            deletedAt: null,
        },
    });

    if (!facility) {
        facility = await prisma.partnerFacility.findFirst({
            where: {
                type: session.user.role as any,
                deletedAt: null,
            },
            orderBy: { createdAt: "asc" },
        });
    }

    if (!facility) {
        return NextResponse.json({ success: false, error: "Không tìm thấy thông tin đơn vị" }, { status: 404 });
    }

    const parsed = paymentSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
        return NextResponse.json(
            { success: false, error: "Dữ liệu thanh toán không hợp lệ", details: parsed.error.flatten() },
            { status: 400 }
        );
    }

    const value = parsed.data;

    try {
        const result = await prisma.$transaction(async (tx) => {
            // 1. THU TIỀN BÁN HÀNG (RECEIPT)
            if (value.type === "RECEIPT" && value.commercialLotId) {
                const lot = await tx.commercialLot.findUnique({
                    where: { id: value.commercialLotId },
                });
                if (!lot || lot.ownerId !== facility.id) {
                    throw new Error("Không tìm thấy phiếu xuất bán hoặc không thuộc đơn vị");
                }

                const currentPaid = Number(lot.paidAmount || 0);
                const newPaid = currentPaid + value.amount;
                const total = lot.totalAmount
                    ? Number(lot.totalAmount)
                    : (lot.unitPrice ? Number(lot.unitPrice) * Number(lot.quantity) - Number(lot.discount || 0) : 0);
                const newDebt = Math.max(0, total - newPaid);
                const paymentStatus = newDebt === 0 ? "PAID" : "PARTIAL";

                const payment = await tx.partnerPaymentRecord.create({
                    data: {
                        facilityId: facility.id,
                        commercialLotId: lot.id,
                        type: "RECEIPT",
                        amount: value.amount,
                        paymentDate: value.paymentDate,
                        paymentMethod: value.paymentMethod,
                        payerName: value.payerName || lot.buyerName || "Khách hàng",
                        referenceCode: value.referenceCode,
                        note: value.note || `Thu tiền công nợ xuất bán ${lot.lotCode}`,
                    },
                });

                await tx.commercialLot.update({
                    where: { id: lot.id },
                    data: {
                        paidAmount: newPaid,
                        debtAmount: newDebt,
                        paymentStatus,
                    },
                });

                return payment;
            }

            // 2. THANH TOÁN TIỀN MUA NGUYÊN LIỆU NHÀ VƯỜN (PAYMENT cho HarvestRecord)
            if (value.type === "PAYMENT" && value.harvestRecordId) {
                const harvest = await tx.harvestRecord.findFirst({
                    where: {
                        OR: [
                            { id: value.harvestRecordId },
                            { code: value.harvestRecordId },
                        ],
                    },
                    include: {
                        farm: { include: { farmer: true } },
                    },
                });

                if (!harvest) {
                    throw new Error("Không tìm thấy phiếu thu mua sầu riêng từ nhà vườn");
                }

                const weight = Number(harvest.receivedWeight ?? harvest.actualWeight ?? harvest.expectedWeight ?? 0);
                const price = Number(harvest.expectedPricePerKg ?? 0);
                const totalCost = weight * price;

                // Tìm hoặc tạo PartnerExpense tương ứng
                let expense = await tx.partnerExpense.findFirst({
                    where: {
                        facilityId: facility.id,
                        OR: [
                            { relatedHarvestRecordId: harvest.id },
                            { title: { contains: harvest.code } },
                        ],
                    },
                });

                if (!expense) {
                    expense = await tx.partnerExpense.create({
                        data: {
                            facilityId: facility.id,
                            category: "RAW_MATERIAL",
                            relatedHarvestRecordId: harvest.id,
                            title: `Mua nguyên liệu sầu riêng - ${harvest.code}`,
                            amount: totalCost,
                            paidAmount: 0,
                            status: "UNPAID",
                            recipient: value.receiverName || harvest.farm?.farmer?.fullName || harvest.farm?.farmName || "Nhà vườn",
                            paymentMethod: value.paymentMethod,
                            expenseDate: harvest.completedAt || harvest.buyerReceivedAt || new Date(),
                            note: `Thu mua ${weight.toLocaleString("vi-VN")} kg giống ${harvest.durianVariety} từ ${harvest.farm?.farmName}`,
                        },
                    });
                }

                const currentPaid = Number(expense.paidAmount || 0);
                const newPaid = currentPaid + value.amount;
                const total = Number(expense.amount);
                const status = newPaid >= total ? "PAID" : "PARTIAL";

                const payment = await tx.partnerPaymentRecord.create({
                    data: {
                        facilityId: facility.id,
                        expenseId: expense.id,
                        type: "PAYMENT",
                        amount: value.amount,
                        paymentDate: value.paymentDate,
                        paymentMethod: value.paymentMethod,
                        receiverName: value.receiverName || expense.recipient || "Nhà vườn",
                        referenceCode: value.referenceCode,
                        note: value.note || `Thanh toán tiền mua nguyên liệu: ${harvest.code}`,
                    },
                });

                await tx.partnerExpense.update({
                    where: { id: expense.id },
                    data: {
                        paidAmount: newPaid,
                        status,
                    },
                });

                return payment;
            }

            // 3. THANH TOÁN CHI PHÍ VẬN HÀNH XƯỞNG (PAYMENT cho ExpenseId)
            if (value.type === "PAYMENT" && value.expenseId) {
                const expense = await tx.partnerExpense.findUnique({
                    where: { id: value.expenseId },
                });
                if (!expense || expense.facilityId !== facility.id) {
                    throw new Error("Không tìm thấy khoản chi hoặc không thuộc đơn vị");
                }

                const currentPaid = Number(expense.paidAmount || 0);
                const newPaid = currentPaid + value.amount;
                const total = Number(expense.amount);
                const status = newPaid >= total ? "PAID" : "PARTIAL";

                const payment = await tx.partnerPaymentRecord.create({
                    data: {
                        facilityId: facility.id,
                        expenseId: expense.id,
                        type: "PAYMENT",
                        amount: value.amount,
                        paymentDate: value.paymentDate,
                        paymentMethod: value.paymentMethod,
                        receiverName: value.receiverName || expense.recipient || "Người nhận",
                        referenceCode: value.referenceCode,
                        note: value.note || `Thanh toán chi phí: ${expense.title}`,
                    },
                });

                await tx.partnerExpense.update({
                    where: { id: expense.id },
                    data: {
                        paidAmount: newPaid,
                        status,
                    },
                });

                return payment;
            }

            throw new Error("Yêu cầu thanh toán không hợp lệ");
        });

        return NextResponse.json({ success: true, data: result }, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Không thể ghi nhận thanh toán" },
            { status: 400 }
        );
    }
}
