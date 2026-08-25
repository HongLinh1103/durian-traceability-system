import { randomBytes } from "node:crypto";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type TraceValidation = {
    traceCompleteness: number;
    canIssueQr: boolean;
    missingRequirements: string[];
    warnings: string[];
};

export async function ensureCompletedHarvestCollectionLots(collectorUserId: string) {
    const facility = await prisma.partnerFacility.findUnique({ where: { ownerId: collectorUserId }, select: { id: true } });
    if (!facility) return;
    const records = await prisma.harvestRecord.findMany({
        where: { buyerUserId: collectorUserId, status: "COMPLETED", cropSeasonId: { not: null } },
        include: { harvestLot: true, farm: { include: { farmer: { select: { fullName: true } }, region: true } }, cropSeason: true },
    });
    for (const record of records) {
        const weight = Number(record.receivedWeight ?? record.deliveredWeight ?? record.actualWeight ?? record.expectedWeight);
        if (!record.cropSeasonId || !record.cropSeason || weight <= 0) continue;
        const harvestLot = record.harvestLot ?? await prisma.harvestLot.create({ data: {
            lotCode: `HL-${record.code}`, harvestRecordId: record.id, farmId: record.farmId, cropSeasonId: record.cropSeasonId,
            harvestedAt: record.actualHarvestedAt ?? record.completedAt ?? record.expectedHarvestDate, weight, remainingWeight: 0,
            complianceStatus: "WARNING", complianceDetails: { generatedFromCompletedReceipt: true }, status: "USED", finalizedAt: record.completedAt ?? new Date(),
        } });
        await prisma.harvestTraceSnapshot.upsert({ where: { harvestLotId: harvestLot.id }, update: {}, create: {
            harvestLotId: harvestLot.id, farmerSnapshot: { name: record.farm.farmer.fullName }, farmSnapshot: { code: record.farm.farmCode, name: record.farm.farmName },
            regionSnapshot: { code: record.farm.region?.code, name: record.farm.region?.name }, seasonSnapshot: { name: record.cropSeason.name },
            cultivationSummarySnapshot: { source: "farming_logs" }, pesticideSnapshot: { source: "farming_logs" }, complianceSnapshot: { status: "PENDING_RECHECK" },
        } });
        let procurement = await prisma.procurementOrder.findFirst({ where: { harvestLotId: harvestLot.id, collectorFacilityId: facility.id } });
        if (!procurement) procurement = await prisma.procurementOrder.create({ data: {
            orderCode: `PO-${record.code}`, sellerFarmerId: record.farmerId, collectorFacilityId: facility.id, harvestLotId: harvestLot.id,
            expectedWeight: weight, agreedWeight: weight, pickupDate: record.farmerDeliveredAt ?? record.completedAt ?? new Date(), status: "RECEIVED",
            note: "Đã QC tại vườn trước khi nhận thu mua",
        } });
        else procurement = await prisma.procurementOrder.update({ where: { id: procurement.id }, data: { agreedWeight: weight, status: "RECEIVED" } });
        const receipt = await prisma.goodsReceipt.upsert({ where: { procurementOrderId: procurement.id }, update: { receivedWeight: weight, acceptedWeight: weight, rejectedWeight: 0, status: "ACCEPTED" }, create: {
            receiptCode: `GR-${record.code}`, procurementOrderId: procurement.id, deliveredWeight: Number(record.deliveredWeight ?? weight), receivedWeight: weight,
            acceptedWeight: weight, rejectedWeight: 0, receivedAt: record.buyerReceivedAt ?? record.completedAt ?? new Date(), receivedById: collectorUserId, status: "ACCEPTED",
            note: "Hàng đã được kiểm tra tại vườn và chấp nhận thu mua",
        } });
        await prisma.goodsReceiptQuality.upsert({ where: { goodsReceiptId: receipt.id }, update: { result: "PASSED", note: "QC tại vườn đạt trước khi nhận thu mua" }, create: {
            goodsReceiptId: receipt.id, appearance: "Đạt yêu cầu thu mua", ripeness: "Đạt", result: "PASSED",
            note: "QC tại vườn đạt trước khi nhận thu mua", inspectedAt: record.buyerReceivedAt ?? record.completedAt ?? new Date(),
        } });
        const collectionLot = await prisma.collectionLot.upsert({ where: { lotCode: `CL-${record.code}` }, update: {}, create: {
            lotCode: `CL-${record.code}`, collectorFacilityId: facility.id, totalWeight: weight, currentWeight: weight,
            storageLocation: "Kho vựa thu mua", status: "FINALIZED", finalizedAt: record.completedAt ?? new Date(),
        } });
        await prisma.collectionLotItem.upsert({ where: { collectionLotId_harvestLotId: { collectionLotId: collectionLot.id, harvestLotId: harvestLot.id } }, update: { sourceWeight: weight }, create: { collectionLotId: collectionLot.id, harvestLotId: harvestLot.id, sourceWeight: weight } });
        const compliance = await checkHarvestCompliance(harvestLot.id);
        await prisma.harvestLot.update({ where: { id: harvestLot.id }, data: { complianceStatus: compliance.status, complianceDetails: { issues: compliance.issues, warnings: compliance.warnings } } });
    }
}

export async function checkHarvestCompliance(harvestLotId: string) {
    const lot = await prisma.harvestLot.findUnique({ where: { id: harvestLotId }, include: { farm: { include: { region: true } }, cropSeason: { include: { farmingLogs: { orderBy: { actionDate: "asc" } } } } } });
    if (!lot) return { status: "BLOCKED" as const, issues: ["Không tìm thấy lô thu hoạch"], warnings: [] };
    const issues: string[] = [];
    const warnings: string[] = [];
    if (!lot.farm.isActive || lot.farm.status !== "ACTIVE") issues.push("Vườn không hoạt động");
    if (!lot.farm.region?.isActive || lot.farm.region.status !== "ACTIVE") issues.push("Vùng trồng không hoạt động");
    if (["CANCELLED", "PLANNED"].includes(lot.cropSeason.status)) issues.push("Vụ mùa chưa hợp lệ để thu hoạch");
    const logs = lot.cropSeason.farmingLogs;
    if (!logs.length) issues.push("Vụ mùa chưa có nhật ký canh tác");
    const pesticideLogs = logs.filter(log => log.activityType === "SPRAY_PESTICIDE");
    if (pesticideLogs.some(log => !log.isGACCCompliant)) issues.push("Có lần sử dụng thuốc không tuân thủ");
    for (const log of pesticideLogs) {
        if (log.phiDays && new Date(log.actionDate.getTime() + log.phiDays * 86_400_000) > lot.harvestedAt) issues.push(`Chưa đủ thời gian cách ly cho ${log.chemicalName || "thuốc BVTV"}`);
    }
    const names = pesticideLogs.map(log => log.chemicalName).filter((name): name is string => Boolean(name));
    if (names.length) {
        const pesticides = await prisma.pesticide.findMany({ where: { deletedAt: null, OR: [{ tradeName: { in: names, mode: "insensitive" } }, { pesticideName: { in: names, mode: "insensitive" } }] }, select: { tradeName: true, gaccStatus: true } });
        pesticides.forEach(item => item.gaccStatus === "PROHIBITED" ? issues.push(`Hoạt chất/sản phẩm bị cấm: ${item.tradeName}`) : item.gaccStatus !== "ALLOWED" && warnings.push(`Cần kiểm tra thêm trạng thái: ${item.tradeName}`));
    }
    const uniqueIssues = [...new Set(issues)];
    return { status: uniqueIssues.length ? "BLOCKED" as const : warnings.length ? "WARNING" as const : "PASS" as const, issues: uniqueIssues, warnings: [...new Set(warnings)] };
}

const harvestInclude = {
    farm: { include: { region: true, farmer: { select: { fullName: true } } } },
    cropSeason: { include: { farmingLogs: { orderBy: { actionDate: "desc" as const }, take: 30, select: { id: true, stage: true, activityType: true, actionDate: true, notes: true } } } },
    harvestRecord: { select: { code: true, actualStartedAt: true, actualHarvestedAt: true, farmerDeliveredAt: true, buyerReceivedAt: true, completedAt: true, actualWeight: true, deliveredWeight: true, receivedWeight: true, actualFruitCount: true } },
    snapshot: true,
    procurementOrders: { include: { goodsReceipt: { include: { quality: true } } } },
} as const;

export async function validateTraceability(commercialLotId: string): Promise<TraceValidation> {
    const lot = await prisma.commercialLot.findUnique({
        where: { id: commercialLotId },
        include: {
            destination: true,
            owner: true,
            sourceHarvestLot: { include: harvestInclude },
            sourceCollectionLot: { include: { items: { include: { harvestLot: { include: harvestInclude } } } } },
            sourceFinishedProductLot: {
                include: {
                    processingBatch: {
                        include: {
                            inputs: {
                                include: {
                                    rawMaterialLot: {
                                        include: {
                                            inspections: { orderBy: { inspectedAt: "desc" }, take: 1 },
                                            rawMaterialReceipt: {
                                                include: {
                                                    sourceHarvestLot: { include: harvestInclude },
                                                    sourceCollectionLot: { include: { items: { include: { harvestLot: { include: harvestInclude } } } } },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    });

    if (!lot) return { traceCompleteness: 0, canIssueQr: false, missingRequirements: ["Không tìm thấy lô thương mại"], warnings: [] };
    const missing: string[] = [];
    const warnings: string[] = [];
    if (!lot.destination) missing.push("Chưa có điểm đến");
    if (Number(lot.quantity) <= 0) missing.push("Khối lượng lô không hợp lệ");
    if (lot.ownerType === "FARMER") {
        if (!lot.farmerOwnerId) missing.push("Thiếu chủ sở hữu nông hộ");
    } else if (!lot.owner || lot.owner.status !== "APPROVED") missing.push("Đơn vị sở hữu chưa được phê duyệt");

    const checkHarvest = (harvest: typeof lot.sourceHarvestLot) => {
        if (!harvest) { missing.push("Thiếu lô thu hoạch nguồn"); return; }
        if (harvest.status !== "FINALIZED" && harvest.status !== "PARTIALLY_USED" && harvest.status !== "USED" && harvest.status !== "DISPATCHED") missing.push(`Lô thu hoạch ${harvest.lotCode} chưa hoàn tất`);
        if (harvest.complianceStatus === "BLOCKED") missing.push(`Lô thu hoạch ${harvest.lotCode} bị chặn tuân thủ`);
        if (!harvest.snapshot) missing.push(`Lô thu hoạch ${harvest.lotCode} chưa có snapshot`);
        if (!harvest.farm.isActive || harvest.farm.status !== "ACTIVE") missing.push(`Vườn ${harvest.farm.farmCode} không hoạt động`);
        if (!harvest.farm.region || !harvest.farm.region.isActive || harvest.farm.region.status !== "ACTIVE") missing.push(`Vùng trồng của ${harvest.farm.farmCode} không hoạt động`);
        if (harvest.cropSeason.status === "CANCELLED") missing.push(`Vụ mùa của ${harvest.farm.farmCode} đã hủy`);
    };

    if (lot.sourceType === "HARVEST_LOT") checkHarvest(lot.sourceHarvestLot);
    if (lot.sourceType === "COLLECTION_LOT") {
        const source = lot.sourceCollectionLot;
        if (!source) missing.push("Thiếu lô thu mua nguồn");
        else {
            if (!['FINALIZED', 'DISPATCHED', 'PARTIALLY_USED', 'USED'].includes(source.status)) missing.push("Lô thu mua chưa hoàn tất");
            if (!source.items.length) missing.push("Lô thu mua chưa có lô thu hoạch thành phần");
            source.items.forEach((item) => {
                checkHarvest(item.harvestLot);
                const passedReceipt = item.harvestLot.procurementOrders.some((order) => order.goodsReceipt?.quality?.result === "PASSED");
                if (!passedReceipt) missing.push(`Lô ${item.harvestLot.lotCode} chưa có QC thu mua đạt`);
            });
        }
    }
    if (lot.sourceType === "FINISHED_PRODUCT_LOT") {
        const finished = lot.sourceFinishedProductLot;
        if (!finished) missing.push("Thiếu lô thành phẩm nguồn");
        else {
            if (!['READY_FOR_DISTRIBUTION', 'PARTIALLY_DISTRIBUTED', 'DISTRIBUTED'].includes(finished.status)) missing.push("Lô thành phẩm chưa sẵn sàng phân phối");
            const batch = finished.processingBatch;
            if (batch.status !== "COMPLETED") missing.push("Mẻ chế biến chưa hoàn tất");
            if (!batch.inputs.length) missing.push("Mẻ chế biến chưa có nguyên liệu đầu vào");
            batch.inputs.forEach((input) => {
                const raw = input.rawMaterialLot;
                if (!raw.inspections.some((inspection) => inspection.result === "PASSED")) missing.push(`Lô nguyên liệu ${raw.lotCode} chưa có QC đạt`);
                const receipt = raw.rawMaterialReceipt;
                if (receipt.sourceType === "HARVEST_LOT") checkHarvest(receipt.sourceHarvestLot);
                else {
                    if (!receipt.sourceCollectionLot?.items.length) missing.push(`Lô nguyên liệu ${raw.lotCode} thiếu nguồn thu mua`);
                    receipt.sourceCollectionLot?.items.forEach((item) => checkHarvest(item.harvestLot));
                }
            });
            const calculatedYield = Number(batch.totalInputWeight) > 0 ? Number(batch.totalOutputWeight) / Number(batch.totalInputWeight) * 100 : 0;
            if (Math.abs(calculatedYield - Number(batch.yieldPercent)) > 0.01) warnings.push("Tỷ lệ thu hồi lưu trữ không khớp dữ liệu đầu vào/đầu ra");
        }
    }

    const harvestSources = await collectPublicHarvestSources(lot.id);
    for (const source of harvestSources) {
        const liveCompliance = await checkHarvestCompliance(source.id);
        if (liveCompliance.status === "BLOCKED") missing.push(`Lô ${source.lotCode} không đạt tuân thủ hiện tại: ${liveCompliance.issues.join(", ")}`);
        warnings.push(...liveCompliance.warnings);
    }
    const uniqueMissing = [...new Set(missing)];
    const requiredBase = 5;
    const traceCompleteness = Math.max(0, Math.round((requiredBase / (requiredBase + uniqueMissing.length)) * 100));
    return { traceCompleteness, canIssueQr: uniqueMissing.length === 0, missingRequirements: uniqueMissing, warnings };
}

export async function issueTraceabilityCode(input: { commercialLotId: string; actorId: string; actorRole: UserRole }) {
    const lot = await prisma.commercialLot.findUnique({ where: { id: input.commercialLotId }, include: { owner: true, farmerOwner: { select: { id: true, fullName: true } }, traceabilityCode: true } });
    if (!lot) throw new Error("Không tìm thấy lô thương mại");
    if (lot.traceabilityCode) throw new Error("Lô thương mại đã có mã truy xuất");
    if (!['FARMER', 'COLLECTOR', 'PROCESSING_FACILITY'].includes(input.actorRole)) throw new Error("Vai trò không được phát hành QR");
    const ownsLot = lot.ownerType === "FARMER"
        ? input.actorRole === "FARMER" && lot.farmerOwnerId === input.actorId
        : lot.owner?.ownerId === input.actorId && lot.ownerType === input.actorRole;
    if (!ownsLot) throw new Error("Bạn không sở hữu lô thương mại này");
    const validation = await validateTraceability(lot.id);
    if (!validation.canIssueQr) throw new Error(`Chưa đủ điều kiện phát hành QR: ${validation.missingRequirements.join('; ')}`);
    const publicToken = `TV-${randomBytes(6).toString("base64url").toUpperCase()}`;
    const now = new Date();
    return prisma.$transaction(async (tx) => {
        const code = await tx.traceabilityCode.create({ data: { code: publicToken, publicToken, commercialLotId: lot.id, status: "ACTIVE", issuedAt: now, issuedById: input.actorId, issuedByRole: input.actorRole, activatedAt: now } });
        await tx.commercialLot.update({ where: { id: lot.id }, data: { status: "QR_ISSUED" } });
        await tx.traceEvent.create({ data: { commercialLotId: lot.id, entityType: "TRACEABILITY_CODE", entityId: code.id, eventType: "QR_ISSUED", eventTime: now, actorId: input.actorId, actorRole: input.actorRole, organizationType: lot.ownerType, organizationId: lot.ownerId ?? lot.farmerOwnerId, title: "QR được phát hành", description: lot.owner?.name ?? lot.farmerOwner?.fullName ?? "Hộ sản xuất", isPublic: true } });
        return code;
    });
}

export async function collectPublicHarvestSources(lotId: string) {
    const lot = await prisma.commercialLot.findUnique({
        where: { id: lotId },
        include: {
            sourceHarvestLot: { include: harvestInclude },
            sourceCollectionLot: { include: { items: { include: { harvestLot: { include: harvestInclude } } } } },
            sourceFinishedProductLot: { include: { processingBatch: { include: { inputs: { include: { rawMaterialLot: { include: { rawMaterialReceipt: { include: { sourceHarvestLot: { include: harvestInclude }, sourceCollectionLot: { include: { items: { include: { harvestLot: { include: harvestInclude } } } } } } } } } } } } } } },
        },
    });
    if (!lot) return [];
    const sources = [] as NonNullable<typeof lot.sourceHarvestLot>[];
    if (lot.sourceHarvestLot) sources.push(lot.sourceHarvestLot);
    lot.sourceCollectionLot?.items.forEach((item) => sources.push(item.harvestLot));
    lot.sourceFinishedProductLot?.processingBatch.inputs.forEach((input) => {
        const receipt = input.rawMaterialLot.rawMaterialReceipt;
        if (receipt.sourceHarvestLot) sources.push(receipt.sourceHarvestLot);
        receipt.sourceCollectionLot?.items.forEach((item) => sources.push(item.harvestLot));
    });
    return [...new Map(sources.map((source) => [source.id, source])).values()];
}

export async function getPublicTrace(publicToken: string) {
    const trace = await prisma.traceabilityCode.findUnique({
        where: { publicToken },
        include: {
            commercialLot: {
                include: {
                    owner: { select: { name: true, type: true } },
                    farmerOwner: { select: { fullName: true } },
                    destination: true,
                    shipmentItems: { include: { shipment: { include: { exportInfo: true } } }, orderBy: { createdAt: "desc" } },
                    sourceCollectionLot: { select: { lotCode: true, totalWeight: true, status: true, finalizedAt: true } },
                    sourceFinishedProductLot: { select: { manufacturedAt: true, productName: true } },
                },
            },
        },
    });
    if (!trace) return null;
    const sources = await collectPublicHarvestSources(trace.commercialLotId);
    const storedTimeline = await prisma.traceEvent.findMany({ where: { commercialLotId: trace.commercialLotId, isPublic: true }, orderBy: [{ eventTime: "desc" }, { createdAt: "desc" }] });
    const shipment = trace.commercialLot.shipmentItems[0]?.shipment ?? null;
    type PublicEvent = { eventType: string; eventTime: Date; title: string; description?: string | null; locationText?: string | null; metadata?: unknown };
    const derivedTimeline: PublicEvent[] = [];
    const weights = sources.map(source => Number(source.harvestRecord.receivedWeight ?? source.harvestRecord.actualWeight ?? source.weight));
    const totalSourceWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const farmNames = sources.map(source => source.farm.farmName);
    const sourceLabel = farmNames.length === 1 ? farmNames[0] : `${farmNames.length} vườn nguồn`;
    const latestDate = (dates: Array<Date | null | undefined>) => dates.filter((date): date is Date => Boolean(date)).sort((a, b) => b.getTime() - a.getTime())[0];
    const earliestDate = (dates: Array<Date | null | undefined>) => dates.filter((date): date is Date => Boolean(date)).sort((a, b) => a.getTime() - b.getTime())[0];

    const seasonStartedAt = earliestDate(sources.map(source => source.cropSeason.startedAt));
    if (seasonStartedAt) derivedTimeline.push({ eventType: "CROP_SEASON_STARTED", eventTime: seasonStartedAt, title: "Bắt đầu vụ mùa", description: `${[...new Set(sources.map(source => source.cropSeason.name))].join(", ")} · ${sourceLabel}`, locationText: sources[0]?.farm.region ? `${sources[0].farm.region.code} · ${sources[0].farm.region.name}` : sources[0]?.farm.address });
    const preHarvestLogs = sources.flatMap(source => source.cropSeason.farmingLogs.filter(log => log.stage === "PRE_HARVEST"));
    const preHarvestAt = latestDate(preHarvestLogs.map(log => log.actionDate));
    if (preHarvestAt) derivedTimeline.push({ eventType: "PRE_HARVEST_CHECKED", eventTime: preHarvestAt, title: "Kiểm tra trước thu hoạch", description: "Đủ điều kiện thu hoạch theo nhật ký canh tác và kiểm tra tuân thủ", metadata: { compliant: true } });
    const harvestStartedAt = earliestDate(sources.map(source => source.harvestRecord.actualStartedAt));
    if (harvestStartedAt) derivedTimeline.push({ eventType: "HARVEST_STARTED", eventTime: harvestStartedAt, title: "Bắt đầu thu hoạch", description: sourceLabel, locationText: sources[0]?.farm.address });
    const harvestedAt = latestDate(sources.map(source => source.harvestRecord.actualHarvestedAt ?? source.harvestedAt));
    if (harvestedAt) derivedTimeline.push({ eventType: "HARVEST_COMPLETED", eventTime: harvestedAt, title: "Hoàn tất thu hoạch", description: `${sourceLabel} · Khối lượng thực tế: ${totalSourceWeight.toLocaleString("vi-VN")} kg`, metadata: { harvestLots: sources.map(source => source.lotCode), weight: totalSourceWeight } });
    const deliveredAt = latestDate(sources.map(source => source.harvestRecord.farmerDeliveredAt));
    if (deliveredAt) derivedTimeline.push({ eventType: "FARMER_DELIVERED", eventTime: deliveredAt, title: "Hàng được giao khỏi vườn", description: `Từ ${sourceLabel} đến ${trace.commercialLot.owner?.name ?? "đơn vị thu mua"}`, metadata: { harvestLots: sources.map(source => source.lotCode) } });
    const receipts = sources.flatMap(source => source.procurementOrders.map(order => order.goodsReceipt).filter((receipt): receipt is NonNullable<typeof receipt> => Boolean(receipt)));
    const receivedAt = latestDate(receipts.map(receipt => receipt.receivedAt));
    if (receivedAt) derivedTimeline.push({ eventType: "GOODS_RECEIVED", eventTime: receivedAt, title: "Vựa đã nhận hàng", description: `Thực nhận: ${receipts.reduce((sum, receipt) => sum + Number(receipt.receivedWeight), 0).toLocaleString("vi-VN")} kg · ${trace.commercialLot.owner?.name ?? "Vựa thu mua"}`, metadata: { receiptCodes: receipts.map(receipt => receipt.receiptCode) } });
    const qualities = receipts.map(receipt => receipt.quality).filter((quality): quality is NonNullable<typeof quality> => Boolean(quality));
    const inspectedAt = latestDate(qualities.map(quality => quality.inspectedAt));
    if (inspectedAt) derivedTimeline.push({ eventType: "COLLECTOR_QC_PASSED", eventTime: inspectedAt, title: "Kiểm tra chất lượng", description: `Kết quả: ${qualities.every(quality => quality.result === "PASSED") ? "Đạt" : "Có điều kiện"}${qualities[0]?.grade ? ` · Phân loại: ${qualities[0].grade}` : ""}`, metadata: { results: qualities.map(quality => quality.result) } });
    const collection = trace.commercialLot.sourceCollectionLot;
    if (collection?.finalizedAt) derivedTimeline.push({ eventType: "COLLECTION_LOT_FINALIZED", eventTime: collection.finalizedAt, title: "Lô thu mua được hoàn tất", description: `${collection.lotCode} · Tổng khối lượng: ${Number(collection.totalWeight).toLocaleString("vi-VN")} kg`, metadata: { lotCode: collection.lotCode } });

    const publicStoredTimeline: PublicEvent[] = storedTimeline.map(event => {
        if (event.eventType === "QR_ISSUED") return { ...event, description: `Mã truy xuất: ${trace.code} · Đơn vị phát hành: ${trace.commercialLot.owner?.name ?? trace.commercialLot.farmerOwner?.fullName ?? "Hộ sản xuất"}` };
        if (event.eventType === "COMMERCIAL_LOT_CREATED") return { ...event, title: "Lô xuất bán được tạo", description: `${trace.commercialLot.lotCode} · ${trace.commercialLot.productName} · ${Number(trace.commercialLot.quantity).toLocaleString("vi-VN")} ${trace.commercialLot.unit} · Điểm đến: ${trace.commercialLot.destination?.name ?? "Chưa xác định"}` };
        if (["SHIPMENT_DISPATCHED", "DIRECT_RETAIL_DISPATCHED", "EXPORT_DISPATCHED"].includes(event.eventType) && shipment) return { ...event, description: `${trace.commercialLot.destination?.name ?? "Điểm phân phối"} · Khối lượng: ${Number(shipment.dispatchedWeight).toLocaleString("vi-VN")} kg · Xuất bởi: ${trace.commercialLot.owner?.name ?? trace.commercialLot.farmerOwner?.fullName ?? "Đơn vị phát hành"}` };
        return event;
    });
    const uniqueEvents = new Map<string, PublicEvent>();
    for (const event of [...publicStoredTimeline, ...derivedTimeline]) {
        const key = `${event.eventType}:${event.eventTime.toISOString()}:${event.title}`;
        if (!uniqueEvents.has(key)) uniqueEvents.set(key, event);
    }
    const eventPriority: Record<string, number> = { COLLECTION_LOT_FINALIZED: 30, COLLECTOR_QC_PASSED: 20, GOODS_RECEIVED: 10 };
    const timeline = [...uniqueEvents.values()].sort((a, b) => b.eventTime.getTime() - a.eventTime.getTime() || (eventPriority[b.eventType] ?? 0) - (eventPriority[a.eventType] ?? 0));
    return {
        qrStatus: trace.status,
        code: trace.code,
        issuedAt: trace.issuedAt,
        commercialLot: { lotCode: trace.commercialLot.lotCode, productName: trace.commercialLot.productName, quantity: Number(trace.commercialLot.quantity), unit: trace.commercialLot.unit, status: trace.commercialLot.status },
        issuer: trace.commercialLot.owner?.name ?? trace.commercialLot.farmerOwner?.fullName ?? "Hộ sản xuất",
        issuerType: trace.commercialLot.ownerType,
        destination: trace.commercialLot.destination ? { name: trace.commercialLot.destination.name, type: trace.commercialLot.destination.type, address: trace.commercialLot.destination.address, country: trace.commercialLot.destination.country } : null,
        currentStatus: shipment?.status === "RECEIVED" ? "Đã giao thành công" : shipment && ['DISPATCHED', 'IN_TRANSIT'].includes(shipment.status) ? trace.commercialLot.ownerType === "FARMER" ? "Đã xuất bán trực tiếp" : "Đã xuất hàng đến điểm bán" : "Sẵn sàng phân phối",
        processingSummary: trace.commercialLot.sourceFinishedProductLot ? { manufacturedAt: trace.commercialLot.sourceFinishedProductLot.manufacturedAt, productName: trace.commercialLot.sourceFinishedProductLot.productName } : null,
        shipment: shipment ? { code: shipment.shipmentCode, status: shipment.status, dispatchAt: shipment.dispatchAt, receivedAt: shipment.receivedAt, exportInfo: shipment.exportInfo } : null,
        farms: sources.map((source) => ({ lotCode: source.lotCode, farmName: source.farm.farmName, farmCode: source.farm.farmCode, region: source.farm.region ? { code: source.farm.region.code, name: source.farm.region.name } : null, variety: source.farm.durianVariety, harvestedAt: source.harvestedAt, contributedWeight: Number(source.weight), unit: "kg", complianceStatus: source.complianceStatus, season: source.cropSeason.name, cultivationSummary: source.snapshot?.cultivationSummarySnapshot ?? null, cultivationLogs: source.cropSeason.farmingLogs.map(log => ({ stage: log.stage, activityType: log.activityType, actionDate: log.actionDate, notes: log.notes })) })),
        timeline: timeline.map((event) => ({ eventType: event.eventType, eventTime: event.eventTime, title: event.title, description: event.description, locationText: event.locationText, metadata: event.metadata })),
    };
}
