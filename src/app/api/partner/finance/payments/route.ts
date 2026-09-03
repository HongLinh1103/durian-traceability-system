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
                // CHỈ SELECT CÁC CỘT CẦN THIẾT - TRÁNH LỖI Farm.declaredArea KHÔNG TỒN TẠI TRÊN DB
                const harvest = await tx.harvestRecord.findFirst({
                    where: {
                        OR: [
                            { id: value.harvestRecordId },
                            { code: value.harvestRecordId },
                        ],
                    },
                    select: {
                        id: true,
                        code: true,
                        receivedWeight: true,
                        actualWeight: true,
                        expectedWeight: true,
                        expectedPricePerKg: true,
                        durianVariety: true,
                        completedAt: true,
                        buyerReceivedAt: true,
                        farm: {
                            select: {
                                id: true,
                                farmName: true,
                                farmer: {
                                    select: {
                                        fullName: true,
                                        phone: true,
                                    },
                                },
                            },
                        },
                        farmer: {
                            select: {
                                fullName: true,
                                phone: true,
                            },
                        },
                    },
                });

                const harvestId = harvest?.id || value.harvestRecordId;
                const harvestCode = harvest?.code || value.harvestRecordId;
                const weight = harvest ? Number(harvest.receivedWeight ?? harvest.actualWeight ?? harvest.expectedWeight ?? 0) : 0;
                const price = harvest ? Number(harvest.expectedPricePerKg ?? 0) : 0;
                const totalCost = weight * price;

                // Tìm hoặc tạo PartnerExpense tương ứng
                let expense = await tx.partnerExpense.findFirst({
                    where: {
                        facilityId: facility.id,
                        OR: [
                            { relatedHarvestRecordId: harvestId },
                            { title: { contains: harvestCode } },
                        ],
                    },
                });

                if (!expense) {
                    const recipientName = value.receiverName 
                        || harvest?.farmer?.fullName 
                        || harvest?.farm?.farmer?.fullName 
                        || harvest?.farm?.farmName 
                        || "Nhà vườn";

                    expense = await tx.partnerExpense.create({
                        data: {
                            facilityId: facility.id,
                            category: "RAW_MATERIAL",
                            relatedHarvestRecordId: harvest?.id || null,
                            title: `Mua nguyên liệu sầu riêng - ${harvestCode}`,
                            amount: totalCost > 0 ? totalCost : value.amount,
                            paidAmount: 0,
                            status: "UNPAID",
                            recipient: recipientName,
                            paymentMethod: value.paymentMethod,
                            expenseDate: harvest?.completedAt || harvest?.buyerReceivedAt || new Date(),
                            note: harvest 
                                ? `Thu mua ${weight.toLocaleString("vi-VN")} kg giống ${harvest.durianVariety} từ ${harvest.farm?.farmName || "nhà vườn"}`
                                : `Thanh toán nguyên liệu ${harvestCode}`,
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
                        note: value.note || `Thanh toán tiền mua nguyên liệu: ${harvestCode}`,
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
                let expense = await tx.partnerExpense.findUnique({
                    where: { id: value.expenseId },
                });
                if (!expense || expense.facilityId !== facility.id) {
                    expense = await tx.partnerExpense.findFirst({
                        where: {
                            facilityId: facility.id,
                            id: value.expenseId,
                        },
                    });
                }

                if (!expense) {
                    expense = await tx.partnerExpense.create({
                        data: {
                            facilityId: facility.id,
                            category: "PROCESSING_LABOR",
                            title: value.note || "Khoản chi hoạt động",
                            amount: value.amount,
                            paidAmount: 0,
                            status: "UNPAID",
                            recipient: value.receiverName || "Người nhận",
                            paymentMethod: value.paymentMethod,
                            expenseDate: value.paymentDate,
                            note: value.note,
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
