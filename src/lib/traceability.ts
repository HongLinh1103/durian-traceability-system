import { randomBytes } from "node:crypto";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type TraceValidation = {
    traceCompleteness: number;
    canIssueQr: boolean;
    missingRequirements: string[];
    warnings: string[];
};

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
    cropSeason: true,
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
                    sourceFinishedProductLot: { select: { manufacturedAt: true, productName: true } },
                },
            },
        },
    });
    if (!trace) return null;
    const sources = await collectPublicHarvestSources(trace.commercialLotId);
    const timeline = await prisma.traceEvent.findMany({ where: { commercialLotId: trace.commercialLotId, isPublic: true }, orderBy: [{ eventTime: "desc" }, { createdAt: "desc" }] });
    const shipment = trace.commercialLot.shipmentItems[0]?.shipment ?? null;
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
        farms: sources.map((source) => ({ lotCode: source.lotCode, farmName: source.farm.farmName, farmCode: source.farm.farmCode, region: source.farm.region ? { code: source.farm.region.code, name: source.farm.region.name } : null, variety: source.farm.durianVariety, harvestedAt: source.harvestedAt, contributedWeight: Number(source.weight), unit: "kg", complianceStatus: source.complianceStatus, season: source.cropSeason.name, cultivationSummary: source.snapshot?.cultivationSummarySnapshot ?? null })),
        timeline: timeline.map((event) => ({ eventType: event.eventType, eventTime: event.eventTime, title: event.title, description: event.description, locationText: event.locationText, metadata: event.metadata })),
    };
}
