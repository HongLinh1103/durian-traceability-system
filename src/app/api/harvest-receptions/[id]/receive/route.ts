import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/harvest-receptions/[id]/receive
 * Ý NGHĨA NGHIỆP VỤ (ƯU TIÊN 2 & 3 & 5):
 * - HÀNG THỰC TẾ ĐÃ ĐẾN VỰA HOẶC XƯỞNG CHẾ BIẾN!
 * - Cân khối lượng thực nhận, ghi nhận ngày giờ, người nhận, biển số xe, tình trạng quả, kho tạm.
 * - Chuyển trạng thái phiếu sang COMPLETED.
 * - MỚI CHÍNH THỨC SINH DỮ LIỆU NGUYÊN LIỆU THỰC TẾ:
 *   + Nếu Cơ sở chế biến: Sinh RawMaterialReceipt (QC_PENDING) + RawMaterialLot (PENDING_QC).
 *   + Nếu Vựa thu mua: Sinh ProcurementOrder + GoodsReceipt + CollectionLot.
 * - Ghi nhận giao dịch bán hoàn tất cho Nông dân (phục vụ Doanh thu & Thống kê).
 */
export async function POST(
    request: Request,
    { params }: { params: { id: string } },
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, message: "Chưa đăng nhập." }, { status: 401 });
        }

        const allowedRoles = ["COLLECTOR", "PROCESSING_FACILITY", "ADMIN", "AREA_MANAGER"];
        if (!allowedRoles.includes(session.user.role)) {
            return NextResponse.json(
                { success: false, message: "Chỉ đơn vị thu mua / cơ sở chế biến mới có quyền xác nhận nhận hàng." },
                { status: 403 },
            );
        }

        const body = await request.json().catch(() => ({}));

        const receivedWeight = Number(body.receivedWeight);
        const rejectedWeight = Number(body.rejectedWeight || 0);

        if (!receivedWeight || receivedWeight <= 0 || isNaN(receivedWeight)) {
            return NextResponse.json(
                { success: false, message: "Khối lượng thực nhận không hợp lệ (phải lớn hơn 0 kg)." },
                { status: 400 },
            );
        }

        const receivedAt = body.receivedAt ? new Date(body.receivedAt) : new Date();
        if (isNaN(receivedAt.getTime())) {
            return NextResponse.json({ success: false, message: "Ngày giờ nhận hàng không hợp lệ." }, { status: 400 });
        }

        const record = await prisma.harvestRecord.findFirst({
            where: { OR: [{ id: params.id }, { code: params.id }] },
            include: { farm: true, buyerFacility: true, harvestLot: true },
        });

        if (!record) {
            return NextResponse.json({ success: false, message: "Không tìm thấy phiếu thu hoạch." }, { status: 404 });
        }

        // Kiểm tra quyền xử lý
        const owns =
            session.user.role === "ADMIN" ||
            session.user.role === "AREA_MANAGER" ||
            record.buyerUserId === session.user.id ||
            !record.buyerUserId ||
            record.buyerFacility?.ownerId === session.user.id;

        if (!owns) {
            return NextResponse.json({ success: false, message: "Bạn không có quyền xử lý phiếu này." }, { status: 403 });
        }

        const validPreStatuses = ["DELIVERY_CONFIRMED", "HARVESTED", "CONFIRMED", "HARVESTING", "COMPLETED"];
        if (!validPreStatuses.includes(record.status)) {
            return NextResponse.json(
                { success: false, message: `Không thể nhận hàng khi phiếu đang ở trạng thái '${record.status}'.` },
                { status: 400 },
            );
        }

        // Tìm facility của session user
        let facility = record.buyerFacility;
        if (!facility) {
            facility = await prisma.partnerFacility.findFirst({
                where: { ownerId: session.user.id, deletedAt: null },
            });
        }
        if (!facility) {
            const roleType = session.user.role === "COLLECTOR" ? "COLLECTOR" : "PROCESSING_FACILITY";
            facility = await prisma.partnerFacility.findFirst({
                where: { type: roleType, deletedAt: null },
            });
        }
        if (!facility) {
            const user = await prisma.user.findUnique({ where: { id: session.user.id } });
            facility = await prisma.partnerFacility.create({
                data: {
                    ownerId: session.user.id,
                    type: session.user.role === "COLLECTOR" ? "COLLECTOR" : "PROCESSING_FACILITY",
                    representativeName: user?.fullName || "Người đại diện cơ sở",
                    representativePhone: user?.phone || "0900000000",
                    identityNumber: "000000000000",
                    name: user?.fullName || (session.user.role === "COLLECTOR" ? "Vựa thu mua sầu riêng" : "Cơ sở chế biến sầu riêng"),
                    organizationType: "COMPANY",
                    phone: user?.phone || "0900000000",
                    address: "Đồng Nai, Việt Nam",
                    province: "Đồng Nai",
                    status: "APPROVED",
                },
            });
        }

        const dispatched = Number(record.deliveredWeight ?? record.actualWeight ?? record.expectedWeight ?? receivedWeight);
        const receiverName = String(body.receiverName || session.user.fullName || session.user.phone || "Bộ phận tiếp nhận");
        const vehiclePlate = String(body.vehiclePlate || body.licensePlate || "");
        const fruitCondition = String(body.fruitCondition || "");
        const weightDifferenceReason = String(body.weightDifferenceReason || "");
        const warehouseLocation = String(body.warehouseLocation || "Kho tạm chờ kiểm định");
        const note = String(body.note || "");

        const detailNote = [
            `Người nhận: ${receiverName}`,
            vehiclePlate ? `Biển số xe: ${vehiclePlate}` : "",
            `Nông dân giao: ${dispatched} kg`,
            `Thực nhận: ${receivedWeight} kg`,
            rejectedWeight > 0 ? `Từ chối / Loại bỏ: ${rejectedWeight} kg` : "",
            fruitCondition ? `Tình trạng quả: ${fruitCondition}` : "",
            weightDifferenceReason ? `Lý do chênh lệch: ${weightDifferenceReason}` : "",
            note ? `Ghi chú: ${note}` : "",
        ]
            .filter(Boolean)
            .join(" | ");

        // Thực hiện transaction cập nhật toàn diện
        const result = await prisma.$transaction(async (tx) => {
            // 1. Cập nhật HarvestRecord sang COMPLETED
            const updatedHarvest = await tx.harvestRecord.update({
                where: { id: record.id },
                data: {
                    status: "COMPLETED",
                    receivedWeight,
                    deliveredWeight: dispatched,
                    actualWeight: record.actualWeight || receivedWeight,
                    buyerReceivedAt: receivedAt,
                    completedAt: receivedAt,
                    weightDifferenceReason: weightDifferenceReason || undefined,
                    buyerUserId: session.user.id,
                    buyerFacilityId: facility!.id,
                },
            });

            // 2. Lịch sử trạng thái
            await tx.harvestStatusHistory.create({
                data: {
                    harvestId: record.id,
                    actorId: session.user.id,
                    fromStatus: record.status,
                    toStatus: "COMPLETED",
                    note: `Xác nhận nhận hàng vật lý. Thực nhận: ${receivedWeight} kg. ${detailNote}`,
                },
            });

            // 3. HarvestLot của Nông dân
            let seasonId = record.cropSeasonId;
            if (!seasonId) {
                const season = await tx.cropSeason.findFirst({
                    where: { farmId: record.farmId },
                    orderBy: { createdAt: "desc" },
                });
                seasonId = season?.id || null;
            }

            let harvestLot = record.harvestLot;
            if (seasonId) {
                harvestLot = await tx.harvestLot.upsert({
                    where: { harvestRecordId: record.id },
                    update: {
                        weight: receivedWeight,
                        remainingWeight: Math.max(0, receivedWeight - rejectedWeight),
                        status: "USED",
                    },
                    create: {
                        lotCode: `HL-${record.code}`,
                        harvestRecordId: record.id,
                        farmId: record.farmId,
                        cropSeasonId: seasonId,
                        harvestedAt: record.actualHarvestedAt || receivedAt,
                        weight: receivedWeight,
                        remainingWeight: Math.max(0, receivedWeight - rejectedWeight),
                        complianceStatus: "WARNING",
                        status: "USED",
                        finalizedAt: receivedAt,
                    },
                });
            }

            // 4. PHÂN NHÁNH: Cơ sở chế biến vs Vựa thu mua
            let createdRawLot = null;
            let createdGoodsReceipt = null;

            if (session.user.role === "PROCESSING_FACILITY" || facility!.type === "PROCESSING_FACILITY") {
                // A. PROCESSING FACILITY: Sinh RawMaterialReceipt + RawMaterialLot (PENDING_QC)
                const receipt = await tx.rawMaterialReceipt.upsert({
                    where: { receiptCode: `RMR-${record.code}` },
                    update: {
                        dispatchedWeight: dispatched,
                        receivedWeight,
                        receivedAt,
                        receivedById: session.user.id,
                        status: "QC_PENDING",
                        note: detailNote,
                    },
                    create: {
                        receiptCode: `RMR-${record.code}`,
                        sourceType: "HARVEST_LOT",
                        sourceHarvestLotId: harvestLot?.id || null,
                        facilityId: facility!.id,
                        dispatchedWeight: dispatched,
                        receivedWeight,
                        receivedAt,
                        receivedById: session.user.id,
                        status: "QC_PENDING",
                        note: detailNote,
                    },
                });

                createdRawLot = await tx.rawMaterialLot.upsert({
                    where: { rawMaterialReceiptId: receipt.id },
                    update: {
                        acceptedWeight: receivedWeight,
                        currentWeight: receivedWeight,
                        warehouseLocation,
                        status: "PENDING_QC",
                    },
                    create: {
                        lotCode: `RM-${record.code}`,
                        facilityId: facility!.id,
                        rawMaterialReceiptId: receipt.id,
                        acceptedWeight: receivedWeight,
                        currentWeight: receivedWeight,
                        warehouseLocation,
                        status: "PENDING_QC",
                    },
                });

                // Ghi nhận TraceEvent
                await tx.traceEvent.create({
                    data: {
                        entityType: "RAW_MATERIAL_LOT",
                        entityId: createdRawLot.id,
                        eventType: "RAW_MATERIAL_RECEIVED",
                        eventTime: receivedAt,
                        actorId: session.user.id,
                        actorRole: "PROCESSING_FACILITY",
                        organizationType: "PROCESSING_FACILITY",
                        organizationId: facility!.id,
                        title: "Tiếp nhận nguyên liệu nhập xưởng",
                        description: `Đã tiếp nhận ${receivedWeight.toLocaleString("vi-VN")} kg sầu riêng từ vườn ${record.farm.farmName}. Biển số xe: ${vehiclePlate || "—"}. Chuyển sang chờ kiểm tra chất lượng (QC).`,
                        isPublic: true,
                    },
                }).catch(() => undefined);
            } else {
                // B. COLLECTOR (VỰA THU MUA): Sinh ProcurementOrder + GoodsReceipt + CollectionLot
                if (harvestLot) {
                    const procOrder = await tx.procurementOrder.upsert({
                        where: { orderCode: `PO-${record.code}` },
                        update: {
                            agreedWeight: receivedWeight,
                            agreedPrice: record.expectedPricePerKg,
                            status: "RECEIVED",
                            note: detailNote,
                        },
                        create: {
                            orderCode: `PO-${record.code}`,
                            sellerFarmerId: record.farmerId,
                            collectorFacilityId: facility!.id,
                            harvestLotId: harvestLot.id,
                            expectedWeight: record.expectedWeight,
                            agreedWeight: receivedWeight,
                            agreedPrice: record.expectedPricePerKg,
                            pickupDate: receivedAt,
                            status: "RECEIVED",
                            note: detailNote,
                        },
                    });

                    createdGoodsReceipt = await tx.goodsReceipt.upsert({
                        where: { procurementOrderId: procOrder.id },
                        update: {
                            deliveredWeight: dispatched,
                            receivedWeight,
                            acceptedWeight: receivedWeight,
                            rejectedWeight,
                            receivedAt,
                            receivedById: session.user.id,
                            status: "RECEIVED",
                            note: detailNote,
                        },
                        create: {
                            receiptCode: `GR-${record.code}`,
                            procurementOrderId: procOrder.id,
                            deliveredWeight: dispatched,
                            receivedWeight,
                            acceptedWeight: receivedWeight,
                            rejectedWeight,
                            receivedAt,
                            receivedById: session.user.id,
                            status: "RECEIVED",
                            note: detailNote,
                        },
                    });

                    // Lô thu gom (CollectionLot) của Vựa
                    await tx.collectionLot.upsert({
                        where: { lotCode: `CL-${record.code}` },
                        update: {
                            totalWeight: receivedWeight,
                            currentWeight: receivedWeight,
                            storageLocation: warehouseLocation,
                            status: "OPEN",
                        },
                        create: {
                            lotCode: `CL-${record.code}`,
                            collectorFacilityId: facility!.id,
                            totalWeight: receivedWeight,
                            currentWeight: receivedWeight,
                            storageLocation: warehouseLocation,
                            status: "OPEN",
                        },
                    });

                    // TraceEvent
                    await tx.traceEvent.create({
                        data: {
                            entityType: "COMMERCIAL_LOT",
                            entityId: procOrder.id,
                            eventType: "COLLECTOR_RECEIVED",
                            eventTime: receivedAt,
                            actorId: session.user.id,
                            actorRole: "COLLECTOR",
                            organizationType: "COLLECTOR",
                            organizationId: facility!.id,
                            title: "Vựa hoàn tất nhập hàng thu mua",
                            description: `Vựa ${facility!.name} đã cân nhận ${receivedWeight.toLocaleString("vi-VN")} kg từ nông hộ ${record.farm.farmName}.`,
                            isPublic: true,
                        },
                    }).catch(() => undefined);
                }
            }

            // 5. Ghi nhật ký canh tác hoàn tất cho nông dân nếu chưa có
            const existingLog = await tx.farmingLog.findUnique({ where: { harvestRecordId: record.id } });
            if (!existingLog && record.cropSeasonId) {
                await tx.farmingLog.create({
                    data: {
                        farmId: record.farmId,
                        cropSeasonId: record.cropSeasonId,
                        stage: "HARVEST",
                        activityType: "HARVEST",
                        actionDate: record.actualHarvestedAt || receivedAt,
                        notes: `Đã giao thành công cho ${facility!.name}.\nKhối lượng thực nhận: ${receivedWeight} kg.\nPhiếu: ${record.code}`,
                        harvestRecordId: record.id,
                    },
                }).catch(() => undefined);
            }

            return {
                harvest: updatedHarvest,
                rawLot: createdRawLot,
                goodsReceipt: createdGoodsReceipt,
            };
        });

        // Gửi thông báo hoàn tất đến Nông dân
        await prisma.notification.create({
            data: {
                userId: record.farmerId,
                type: "HARVEST_STATUS",
                title: `Giao nhận thành công phiếu ${record.code}`,
                message: `${facility.name} đã xác nhận nhận hàng thực tế: ${receivedWeight.toLocaleString("vi-VN")} kg. Giao dịch mua bán đã hoàn tất.`,
            },
        }).catch(() => undefined);

        return NextResponse.json({
            success: true,
            message: `Xác nhận nhận hàng thành công (${receivedWeight.toLocaleString("vi-VN")} kg).`,
            data: {
                harvest: result.harvest,
                rawLot: result.rawLot,
                goodsReceipt: result.goodsReceipt,
            },
        });
    } catch (error: any) {
        console.error("POST /api/harvest-receptions/[id]/receive error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Lỗi máy chủ khi xác nhận nhận hàng." },
            { status: 500 },
        );
    }
}
