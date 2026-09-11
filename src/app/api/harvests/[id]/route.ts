import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { HarvestStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const transitions: Record<string, Record<string, string[]>> = {
    COLLECTOR: { CONFIRM: ["WAITING_CONFIRMATION"], REJECT: ["WAITING_CONFIRMATION"], RECEIVE: ["DELIVERY_CONFIRMED", "HARVESTED"] },
    PROCESSING_FACILITY: { CONFIRM: ["WAITING_CONFIRMATION"], REJECT: ["WAITING_CONFIRMATION"], RECEIVE: ["DELIVERY_CONFIRMED", "HARVESTED", "CONFIRMED", "COMPLETED"] },
    FARMER: { START: ["CONFIRMED", "DRAFT"], FINISH: ["CONFIRMED", "HARVESTING", "DRAFT"], DELIVER: ["HARVESTED"] },
};
const targets: Record<string, HarvestStatus> = { CONFIRM: "CONFIRMED", REJECT: "REJECTED", START: "HARVESTING", FINISH: "HARVESTED", DELIVER: "DELIVERY_CONFIRMED", RECEIVE: "COMPLETED" };

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ success: false, message: "Chưa đăng nhập." }, { status: 401 });
    const body = await request.json();
    const action = String(body.action || "");
    const record = await prisma.harvestRecord.findFirst({
        where: { OR: [{ id: params.id }, { code: params.id }] },
        include: { farm: true, harvestLot: true, buyerFacility: true },
    });
    if (!record) return NextResponse.json({ success: false, message: "Không tìm thấy phiếu thu hoạch." }, { status: 404 });
    const owns = session.user.role === "FARMER"
        ? record.farmerId === session.user.id
        : (record.buyerUserId === session.user.id || !record.buyerUserId || record.buyerFacility?.ownerId === session.user.id);
    if (!owns) return NextResponse.json({ success: false, message: "Bạn không có quyền xử lý phiếu này." }, { status: 403 });
    if (!transitions[session.user.role]?.[action]?.includes(record.status)) {
        return NextResponse.json({ success: false, message: `Không thể thực hiện '${action}' khi phiếu ở trạng thái '${record.status}'.` }, { status: 400 });
    }

    const actualWeight = body.actualWeight === undefined ? undefined : Number(body.actualWeight);
    const deliveredWeight = body.deliveredWeight === undefined ? Number(record.deliveredWeight ?? record.actualWeight ?? record.expectedWeight ?? 0) : Number(body.deliveredWeight);
    const receivedWeight = body.receivedWeight === undefined ? undefined : Number(body.receivedWeight);
    const rejectedWeight = body.rejectedWeight === undefined ? 0 : Number(body.rejectedWeight);
    if (action === "FINISH" && (!actualWeight || actualWeight <= 0)) return NextResponse.json({ success: false, message: "Nhập khối lượng thu hoạch thực tế." }, { status: 400 });
    if (action === "DELIVER" && deliveredWeight <= 0) return NextResponse.json({ success: false, message: "Khối lượng giao phải lớn hơn 0." }, { status: 400 });
    if (action === "RECEIVE" && (receivedWeight === undefined || receivedWeight <= 0 || rejectedWeight < 0)) return NextResponse.json({ success: false, message: "Khối lượng thực nhận không hợp lệ (phải lớn hơn 0)." }, { status: 400 });
    const dispatched = Number(record.deliveredWeight ?? record.actualWeight ?? record.expectedWeight ?? 0);
    const receivedAt = body.receivedAt ? new Date(body.receivedAt) : new Date();
    if (Number.isNaN(receivedAt.getTime())) return NextResponse.json({ success: false, message: "Ngày nhận không hợp lệ." }, { status: 400 });

    const target = targets[action];
    const updated = await prisma.$transaction(async (tx) => {
        const item = await tx.harvestRecord.update({ where: { id: record.id }, data: {
            status: target, rejectionReason: action === "REJECT" ? String(body.reason || "") : undefined,
            actualStartedAt: action === "START" ? new Date() : (record.actualStartedAt ?? (action === "FINISH" ? new Date() : undefined)), actualHarvestedAt: action === "FINISH" ? new Date() : undefined,
            actualTreeCount: body.actualTreeCount ? Number(body.actualTreeCount) : undefined,
            actualFruitCount: body.actualFruitCount !== undefined ? Number(body.actualFruitCount) : (body.fruitCount !== undefined ? Number(body.fruitCount) : undefined),
            actualWeight, actualNote: body.note, farmerDeliveredAt: action === "DELIVER" ? new Date() : undefined,
            deliveredWeight: action === "DELIVER" ? deliveredWeight : undefined, buyerReceivedAt: action === "RECEIVE" ? receivedAt : undefined,
            receivedWeight: action === "RECEIVE" ? receivedWeight : undefined, weightDifferenceReason: action === "RECEIVE" ? String(body.weightDifferenceReason || "") : undefined,
            completedAt: action === "RECEIVE" ? receivedAt : undefined,
            buyerUserId: action === "CONFIRM" || action === "RECEIVE" ? session.user.id : undefined,
        } });
        await tx.harvestStatusHistory.create({ data: { harvestId: record.id, actorId: session.user.id, fromStatus: record.status, toStatus: target, note: body.reason || body.note } });

        let harvestLot = record.harvestLot;
        if (["FINISH", "DELIVER", "RECEIVE"].includes(action)) {
            let seasonId = record.cropSeasonId;
            if (!seasonId) {
                const season = await tx.cropSeason.findFirst({ where: { farmId: record.farmId }, orderBy: { createdAt: "desc" } })
                    ?? await tx.cropSeason.findFirst({ orderBy: { createdAt: "desc" } });
                seasonId = season?.id || null;
                if (seasonId) {
                    await tx.harvestRecord.update({ where: { id: record.id }, data: { cropSeasonId: seasonId } });
                }
            }
            const lotWeight = action === "FINISH" ? actualWeight! : Number(record.actualWeight ?? record.deliveredWeight ?? record.expectedWeight ?? receivedWeight ?? 0);
            if (seasonId) {
                harvestLot = await tx.harvestLot.upsert({ where: { harvestRecordId: record.id }, update: {
                    weight: lotWeight, remainingWeight: action === "RECEIVE" ? Math.max(0, lotWeight - receivedWeight! - rejectedWeight) : lotWeight,
                    status: action === "FINISH" ? "FINALIZED" : action === "DELIVER" ? "DISPATCHED" : "USED", finalizedAt: action === "FINISH" ? new Date() : undefined,
                }, create: {
                    lotCode: `HL-${record.code}`, harvestRecordId: record.id, farmId: record.farmId, cropSeasonId: seasonId,
                    harvestedAt: record.actualHarvestedAt ?? new Date(), weight: lotWeight,
                    remainingWeight: action === "RECEIVE" ? Math.max(0, lotWeight - receivedWeight! - rejectedWeight) : lotWeight,
                    complianceStatus: "WARNING", complianceDetails: { pendingComplianceReview: true },
                    status: action === "FINISH" ? "FINALIZED" : action === "DELIVER" ? "DISPATCHED" : "USED", finalizedAt: new Date(),
                } });
            }
        }

        if (action === "RECEIVE" && session.user.role === "PROCESSING_FACILITY") {
            const acceptedWeight = receivedWeight!;
            let facility = await tx.partnerFacility.findFirst({ where: { ownerId: session.user.id, deletedAt: null } });
            if (!facility) {
                const user = await tx.user.findUnique({ where: { id: session.user.id } });
                facility = await tx.partnerFacility.create({
                    data: {
                        ownerId: session.user.id,
                        type: "PROCESSING_FACILITY",
                        representativeName: user?.fullName || "Cơ sở chế biến",
                        representativePhone: user?.phone || "0900000000",
                        identityNumber: "000000000000",
                        name: user?.fullName || "Cơ sở chế biến",
                        organizationType: "COMPANY",
                        phone: user?.phone || "0900000000",
                        address: "Việt Nam",
                        province: "Đắk Lắk",
                        status: "APPROVED",
                    }
                });
            }
            const note = [
                `Nông dân giao: ${dispatched} kg`,
                `Thực nhận: ${receivedWeight} kg`,
                body.fruitCount ? `Số lượng trái thực nhận: ${body.fruitCount} trái` : "",
                `Từ chối: ${rejectedWeight} kg`,
                body.receiverName ? `Người nhận: ${String(body.receiverName)}` : "",
                body.weightDifferenceReason ? `Lý do chênh lệch: ${String(body.weightDifferenceReason)}` : "",
                body.note ? `Ghi chú: ${String(body.note)}` : ""
            ].filter(Boolean).join("\n");
            const receipt = await tx.rawMaterialReceipt.upsert({ where: { receiptCode: `RMR-${record.code}` }, update: {
                dispatchedWeight: dispatched, receivedWeight: acceptedWeight, receivedAt, receivedById: session.user.id, status: "QC_PENDING", note,
            }, create: {
                receiptCode: `RMR-${record.code}`, sourceType: "HARVEST_LOT", sourceHarvestLotId: harvestLot?.id || null, facilityId: facility.id,
                dispatchedWeight: dispatched, receivedWeight: acceptedWeight, receivedAt, receivedById: session.user.id, status: "QC_PENDING", note,
            } });
            const rawLot = await tx.rawMaterialLot.upsert({ where: { rawMaterialReceiptId: receipt.id }, update: {
                acceptedWeight, currentWeight: acceptedWeight, warehouseLocation: body.warehouseLocation || undefined, status: "PENDING_QC",
            }, create: {
                lotCode: `RM-${record.code}`, facilityId: facility.id, rawMaterialReceiptId: receipt.id, acceptedWeight, currentWeight: acceptedWeight, warehouseLocation: body.warehouseLocation || null, status: "PENDING_QC",
            } });

            await tx.traceEvent.create({
                data: {
                    entityType: "RAW_MATERIAL_LOT",
                    entityId: rawLot.id,
                    eventType: "RAW_MATERIAL_RECEIVED",
                    eventTime: receivedAt,
                    actorId: session.user.id,
                    actorRole: "PROCESSING_FACILITY",
                    organizationType: "PROCESSING_FACILITY",
                    organizationId: facility.id,
                    title: "Tiếp nhận nguyên liệu",
                    description: `Đã tiếp nhận nguyên liệu từ ${record.farm?.farmName || "Nông hộ"}. Thực nhận: ${receivedWeight} kg | Từ chối: ${rejectedWeight} kg | Chờ kiểm tra chất lượng (QC).`,
                    isPublic: true,
                },
            }).catch(() => undefined);
        }

        if (action === "RECEIVE" && !await tx.farmingLog.findUnique({ where: { harvestRecordId: record.id } })) await tx.farmingLog.create({ data: {
            farmId: record.farmId, cropSeasonId: record.cropSeasonId, stage: "HARVEST", activityType: "HARVEST", actionDate: record.actualHarvestedAt || new Date(),
            notes: `Khối lượng: ${receivedWeight || record.deliveredWeight || record.actualWeight || record.expectedWeight} kg\nPhiếu: ${record.code}`, harvestRecordId: record.id,
        } });
        return item;
    });

    const notifyId = session.user.role === "FARMER" ? record.buyerUserId : record.farmerId;
    if (notifyId) await prisma.notification.create({ data: { userId: notifyId, type: "HARVEST_STATUS", title: `Phiếu ${record.code} đã cập nhật`, message: `Trạng thái mới: ${target}` } }).catch(() => undefined);
    return NextResponse.json({ success: true, data: updated });
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ success: false, message: "Chưa đăng nhập." }, { status: 401 });

    const record = await prisma.harvestRecord.findFirst({
        where: { OR: [{ id: params.id }, { code: params.id }] },
        include: {
            cropSeason: true,
            farm: true,
            buyerFacility: true,
            varietyItems: true,
        },
    });
    if (!record) return NextResponse.json({ success: false, message: "Không tìm thấy hồ sơ thu hoạch." }, { status: 404 });
    return NextResponse.json({ success: true, data: record });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ success: false, message: "Chưa đăng nhập." }, { status: 401 });

        const record = await prisma.harvestRecord.findFirst({
            where: { OR: [{ id: params.id }, { code: params.id }] },
            include: { farm: true },
        });
        if (!record) return NextResponse.json({ success: false, message: "Không tìm thấy hồ sơ thu hoạch." }, { status: 404 });
        if (record.farmerId !== session.user.id && session.user.role !== "ADMIN") {
            return NextResponse.json({ success: false, message: "Bạn không có quyền chỉnh sửa hồ sơ này." }, { status: 403 });
        }

        const body = await request.json();
        const { cropSeasonId, actualWeight, buyerName, buyerFacilityId, pricePerKg } = body;

        const weight = Number(actualWeight);
        if (isNaN(weight) || weight <= 0) {
            return NextResponse.json({ success: false, message: "Tổng sản lượng phải lớn hơn 0." }, { status: 400 });
        }
        const price = Number(pricePerKg);
        if (isNaN(price) || price <= 0) {
            return NextResponse.json({ success: false, message: "Giá bán phải lớn hơn 0." }, { status: 400 });
        }
        if (!cropSeasonId) {
            return NextResponse.json({ success: false, message: "Vui lòng chọn niên vụ." }, { status: 400 });
        }

        const season = await prisma.cropSeason.findFirst({
            where: { id: cropSeasonId },
            include: { farm: true },
        });
        if (!season || (season.farm.farmerId !== session.user.id && session.user.role !== "ADMIN")) {
            return NextResponse.json({ success: false, message: "Niên vụ được chọn không hợp lệ." }, { status: 404 });
        }

        let facility = null;
        if (buyerFacilityId) {
            facility = await prisma.partnerFacility.findFirst({
                where: { id: buyerFacilityId, deletedAt: null },
            });
        }

        const safeBuyerType = facility ? facility.type : "UNDETERMINED";
        const buyerUserId = facility ? facility.ownerId : null;
        const finalBuyerName = (facility ? facility.name : buyerName || "").trim();

        const updated = await prisma.$transaction(async (tx) => {
            await tx.harvestVarietyItem.deleteMany({ where: { harvestId: record.id } });
            await tx.harvestVarietyItem.create({
                data: {
                    harvestId: record.id,
                    durianVariety: season.farm.durianVariety || "Ri6",
                    expectedWeight: weight,
                    expectedPricePerKg: price,
                },
            });

            return await tx.harvestRecord.update({
                where: { id: record.id },
                data: {
                    cropSeasonId: season.id,
                    farmId: season.farmId,
                    actualWeight: weight,
                    expectedWeight: weight,
                    deliveredWeight: weight,
                    receivedWeight: weight,
                    expectedSaleWeight: weight,
                    expectedPricePerKg: price,
                    buyerFacilityId: facility?.id || null,
                    buyerUserId,
                    buyerType: safeBuyerType,
                    transactionNote: finalBuyerName || record.transactionNote,
                },
                include: {
                    cropSeason: true,
                    farm: true,
                    buyerFacility: true,
                },
            });
        });

        return NextResponse.json({
            success: true,
            data: updated,
            message: "Đã cập nhật hồ sơ thu hoạch thành công.",
        });
    } catch (error) {
        console.error("PUT /api/harvests/[id] error:", error);
        return NextResponse.json({
            success: false,
            message: error instanceof Error ? error.message : "Đã có lỗi xảy ra khi cập nhật hồ sơ.",
        }, { status: 500 });
    }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ success: false, message: "Chưa đăng nhập." }, { status: 401 });

        const record = await prisma.harvestRecord.findFirst({
            where: { OR: [{ id: params.id }, { code: params.id }] },
            include: {
                harvestLot: {
                    include: {
                        procurementOrders: { select: { id: true } },
                        collectionItems: { select: { id: true } },
                        rawReceipts: { select: { id: true } },
                        commercialLots: { select: { id: true } },
                    },
                },
            },
        });
        if (!record) return NextResponse.json({ success: false, message: "Không tìm thấy hồ sơ thu hoạch." }, { status: 404 });
        if (record.farmerId !== session.user.id && session.user.role !== "ADMIN") {
            return NextResponse.json({ success: false, message: "Bạn không có quyền xóa hồ sơ này." }, { status: 403 });
        }

        // Check if downstream supply chain entities rely on this harvest record
        if (record.harvestLot) {
            const hasDownstream =
                record.harvestLot.procurementOrders.length > 0 ||
                record.harvestLot.collectionItems.length > 0 ||
                record.harvestLot.rawReceipts.length > 0 ||
                record.harvestLot.commercialLots.length > 0;
            if (hasDownstream) {
                return NextResponse.json({
                    success: false,
                    message: "Hồ sơ thu hoạch này đã phát sinh giao dịch trong chuỗi cung ứng nên không thể xóa.",
                }, { status: 409 });
            }
        }

        const relatedExpenseCount = await prisma.partnerExpense.count({
            where: { relatedHarvestRecordId: record.id },
        });
        if (relatedExpenseCount > 0) {
            return NextResponse.json({
                success: false,
                message: "Hồ sơ này đang liên kết với phiếu chi của cơ sở đối tác nên không thể xóa.",
            }, { status: 409 });
        }

        await prisma.$transaction(async (tx) => {
            await tx.harvestStatusHistory.deleteMany({ where: { harvestId: record.id } });
            await tx.harvestVarietyItem.deleteMany({ where: { harvestId: record.id } });
            await tx.farmingLog.deleteMany({ where: { harvestRecordId: record.id } });
            if (record.harvestLot) {
                await tx.harvestTraceSnapshot.deleteMany({ where: { harvestLotId: record.harvestLot.id } });
                await tx.harvestLot.delete({ where: { id: record.harvestLot.id } });
            }
            await tx.harvestRecord.delete({ where: { id: record.id } });
        });

        return NextResponse.json({
            success: true,
            message: "Đã xóa hồ sơ thu hoạch thành công.",
        });
    } catch (error) {
        console.error("DELETE /api/harvests/[id] error:", error);
        return NextResponse.json({
            success: false,
            message: error instanceof Error ? error.message : "Đã có lỗi xảy ra khi xóa hồ sơ.",
        }, { status: 500 });
    }
}
