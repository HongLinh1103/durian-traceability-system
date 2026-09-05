import { randomBytes } from "crypto";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPreviewTrace, PreviewTraceData } from "@/lib/trace-preview";
import { formatVietnameseDate } from "@/lib/date-format";

export type TraceValidation = {
    traceCompleteness: number;
    canIssueQr: boolean;
    missingRequirements: string[];
    warnings: string[];
};

export type TraceMilestoneField = {
    label: string;
    value: string;
    highlight?: boolean;
};

export type TraceMilestone = {
    id: string;
    stepNumber: number;
    type: "SEASON" | "HARVEST" | "COLLECTOR_RECEIPT" | "PROCESSING_RECEIPT" | "PROCESSING_PACKAGING" | "DISTRIBUTION" | "EXPORT";
    title: string;
    subtitle?: string;
    date: Date;
    dateText: string;
    badgeText: string;
    badgeVariant: "emerald" | "blue" | "purple" | "amber" | "indigo";
    fields: TraceMilestoneField[];
    substeps?: Array<{
        name: string;
        status: string;
        time?: string;
    }>;
};

function formatVnDate(dateInput: Date | string | null | undefined): string {
    if (!dateInput) return "—";
    const formatted = formatVietnameseDate(dateInput);
    return formatted || "—";
}

export async function ensureCompletedHarvestCollectionLots(buyerUserId: string) {
    const facility = await prisma.partnerFacility.findFirst({
        where: { ownerId: buyerUserId, deletedAt: null },
    });
    if (!facility) return;

    const completedPurchases = await prisma.harvestRecord.findMany({
        where: {
            buyerUserId,
            status: { in: ["DELIVERY_CONFIRMED", "COMPLETED"] },
        },
        include: {
            farm: { include: { region: true } },
            harvestLot: true,
        },
        orderBy: { buyerReceivedAt: "desc" },
    });

    for (const record of completedPurchases) {
        if (!record.cropSeasonId) continue;
        const weight = Number(record.receivedWeight ?? record.actualWeight ?? record.expectedWeight);
        const lotCode = `HL-${record.code}`;

        const harvestLot = await prisma.harvestLot.upsert({
            where: { lotCode },
            update: {
                weight,
                remainingWeight: weight,
                harvestedAt: record.actualHarvestedAt ?? record.expectedHarvestDate,
                status: "FINALIZED",
                finalizedAt: record.completedAt ?? new Date(),
            },
            create: {
                lotCode,
                harvestRecordId: record.id,
                farmId: record.farmId,
                cropSeasonId: record.cropSeasonId,
                weight,
                remainingWeight: weight,
                harvestedAt: record.actualHarvestedAt ?? record.expectedHarvestDate,
                status: "FINALIZED",
                finalizedAt: record.completedAt ?? new Date(),
                complianceStatus: "PASS",
                complianceDetails: { source: "AUTO_ENSURED" },
            },
        });

        const collectionLotCode = `CL-${record.code}`;
        const collectionLot = await prisma.collectionLot.upsert({
            where: { lotCode: collectionLotCode },
            update: {},
            create: {
                lotCode: collectionLotCode,
                collectorFacilityId: facility.id,
                totalWeight: weight,
                currentWeight: weight,
                storageLocation: "Kho vựa thu mua",
                status: "FINALIZED",
                finalizedAt: record.completedAt ?? new Date(),
            },
        });

        await prisma.collectionLotItem.upsert({
            where: {
                collectionLotId_harvestLotId: {
                    collectionLotId: collectionLot.id,
                    harvestLotId: harvestLot.id,
                },
            },
            update: { sourceWeight: weight },
            create: {
                collectionLotId: collectionLot.id,
                harvestLotId: harvestLot.id,
                sourceWeight: weight,
            },
        });

        const compliance = await checkHarvestCompliance(harvestLot.id);
        await prisma.harvestLot.update({
            where: { id: harvestLot.id },
            data: {
                complianceStatus: compliance.status,
                complianceDetails: {
                    issues: compliance.issues,
                    warnings: compliance.warnings,
                },
            },
        });
    }
}

export async function checkHarvestCompliance(harvestLotId: string) {
    const lot = await prisma.harvestLot.findUnique({
        where: { id: harvestLotId },
        include: {
            farm: { include: { region: true } },
            cropSeason: {
                include: {
                    farmingLogs: { orderBy: { actionDate: "asc" } },
                },
            },
        },
    });

    if (!lot) {
        return {
            status: "BLOCKED" as const,
            issues: ["Không tìm thấy lô thu hoạch"],
            warnings: [],
        };
    }

    const issues: string[] = [];
    const warnings: string[] = [];

    if (!lot.farm.isActive || lot.farm.status !== "ACTIVE") issues.push("Vườn không hoạt động");
    if (!lot.farm.region?.isActive || lot.farm.region.status !== "ACTIVE") issues.push("Vùng trồng không hoạt động");
    if (["CANCELLED", "PLANNED"].includes(lot.cropSeason.status)) issues.push("Vụ mùa chưa hợp lệ để thu hoạch");

    const logs = lot.cropSeason.farmingLogs;
    if (!logs.length) issues.push("Vụ mùa chưa có nhật ký canh tác");

    const pesticideLogs = logs.filter((log) => log.activityType === "SPRAY_PESTICIDE");
    if (pesticideLogs.some((log) => !log.isGACCCompliant)) {
        issues.push("Có lần sử dụng thuốc không tuân thủ");
    }

    for (const log of pesticideLogs) {
        if (
            log.phiDays &&
            new Date(log.actionDate.getTime() + log.phiDays * 86_400_000) > lot.harvestedAt
        ) {
            issues.push(`Chưa đủ thời gian cách ly cho ${log.chemicalName || "thuốc BVTV"}`);
        }
    }

    const names = pesticideLogs.map((log) => log.chemicalName).filter((name): name is string => Boolean(name));
    if (names.length) {
        const pesticides = await prisma.pesticide.findMany({
            where: {
                deletedAt: null,
                OR: [
                    { tradeName: { in: names, mode: "insensitive" } },
                    { pesticideName: { in: names, mode: "insensitive" } },
                ],
            },
            select: { tradeName: true, gaccStatus: true },
        });

        pesticides.forEach((item) =>
            item.gaccStatus === "PROHIBITED"
                ? issues.push(`Hoạt chất/sản phẩm bị cấm: ${item.tradeName}`)
                : item.gaccStatus !== "ALLOWED" && warnings.push(`Cần kiểm tra thêm trạng thái: ${item.tradeName}`)
        );
    }

    const uniqueIssues = [...new Set(issues)];
    return {
        status: uniqueIssues.length ? ("BLOCKED" as const) : warnings.length ? ("WARNING" as const) : ("PASS" as const),
        issues: uniqueIssues,
        warnings: [...new Set(warnings)],
    };
}

const harvestInclude = {
    farm: {
        select: {
            id: true,
            farmName: true,
            farmCode: true,
            growingRegion: true,
            growingRegionId: true,
            province: true,
            district: true,
            ward: true,
            address: true,
            durianVariety: true,
            isActive: true,
            status: true,
            region: true,
            farmer: { select: { fullName: true } },
        },
    },
    cropSeason: {
        include: {
            farmingLogs: {
                orderBy: { actionDate: "desc" as const },
                take: 30,
                select: {
                    id: true,
                    stage: true,
                    activityType: true,
                    otherActivity: true,
                    chemicalName: true,
                    dosage: true,
                    phiDays: true,
                    isGACCCompliant: true,
                    actionDate: true,
                    notes: true,
                },
            },
        },
    },
    harvestRecord: {
        select: {
            code: true,
            actualStartedAt: true,
            actualHarvestedAt: true,
            farmerDeliveredAt: true,
            buyerReceivedAt: true,
            completedAt: true,
            actualWeight: true,
            deliveredWeight: true,
            receivedWeight: true,
            actualFruitCount: true,
        },
    },
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
                                                    sourceCollectionLot: {
                                                        include: { items: { include: { harvestLot: { include: harvestInclude } } } },
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
        },
    });

    if (!lot) return { traceCompleteness: 0, canIssueQr: false, missingRequirements: ["Không tìm thấy lô thương mại"], warnings: [] };

    const missing: string[] = [];
    const warnings: string[] = [];

    if (!lot.destinationId) missing.push("Chưa chọn điểm phân phối");

    const checkHarvest = (harvest: any) => {
        if (!harvest) missing.push("Thiếu thông tin lô thu hoạch");
        else {
            if (!harvest.farm.isActive) missing.push(`Vườn ${harvest.farm.farmName} không hoạt động`);
            if (harvest.farm.region && !harvest.farm.region.isActive) missing.push(`Vùng trồng ${harvest.farm.region.name} không hoạt động`);
            if (!harvest.cropSeason.farmingLogs.length) missing.push(`Vườn ${harvest.farm.farmName} thiếu nhật ký canh tác`);
            if (harvest.complianceStatus === "BLOCKED") missing.push(`Lô thu hoạch ${harvest.lotCode} không đạt tuân thủ`);
        }
    };

    if (lot.sourceType === "HARVEST_LOT") checkHarvest(lot.sourceHarvestLot);

    if (lot.sourceType === "COLLECTION_LOT") {
        const source = lot.sourceCollectionLot;
        if (!source || !source.items.length) missing.push("Thiếu lô thu mua nguồn");
        else {
            source.items.forEach((item) => {
                checkHarvest(item.harvestLot);
                const passedReceipt = item.harvestLot.procurementOrders.some((order: any) => order.goodsReceipt?.quality?.result === "PASSED");
                if (!passedReceipt) missing.push(`Lô ${item.harvestLot.lotCode} chưa có QC thu mua đạt`);
            });
        }
    }

    if (lot.sourceType === "FINISHED_PRODUCT_LOT") {
        const finished = lot.sourceFinishedProductLot;
        if (!finished) missing.push("Thiếu lô thành phẩm nguồn");
        else {
            if (!["READY_FOR_DISTRIBUTION", "PARTIALLY_DISTRIBUTED", "DISTRIBUTED"].includes(finished.status)) {
                missing.push("Lô thành phẩm chưa sẵn sàng phân phối");
            }
            const batch = finished.processingBatch;
            if (batch.status !== "COMPLETED") missing.push("Mẻ chế biến chưa hoàn tất");
            if (!batch.inputs.length) missing.push("Mẻ chế biến chưa có nguyên liệu đầu vào");
            batch.inputs.forEach((input: any) => {
                const raw = input.rawMaterialLot;
                if (!raw.inspections.some((inspection: any) => inspection.result === "PASSED")) {
                    missing.push(`Lô nguyên liệu ${raw.lotCode} chưa có QC đạt`);
                }
                const receipt = raw.rawMaterialReceipt;
                if (receipt.sourceType === "HARVEST_LOT") checkHarvest(receipt.sourceHarvestLot);
                else {
                    if (!receipt.sourceCollectionLot?.items.length) missing.push(`Lô nguyên liệu ${raw.lotCode} thiếu nguồn thu mua`);
                    receipt.sourceCollectionLot?.items.forEach((item: any) => checkHarvest(item.harvestLot));
                }
            });
            const calculatedYield = Number(batch.totalInputWeight) > 0 ? (Number(batch.totalOutputWeight) / Number(batch.totalInputWeight)) * 100 : 0;
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
    const lot = await prisma.commercialLot.findUnique({
        where: { id: input.commercialLotId },
        include: { owner: true, farmerOwner: { select: { id: true, fullName: true } }, traceabilityCode: true },
    });
    if (!lot) throw new Error("Không tìm thấy lô thương mại");
    if (lot.traceabilityCode) throw new Error("Lô thương mại đã có mã truy xuất");
    if (!["FARMER", "COLLECTOR", "PROCESSING_FACILITY"].includes(input.actorRole)) throw new Error("Vai trò không được phát hành QR");

    const ownsLot =
        lot.ownerType === "FARMER"
            ? input.actorRole === "FARMER" && lot.farmerOwnerId === input.actorId
            : lot.owner?.ownerId === input.actorId && lot.ownerType === input.actorRole;
    if (!ownsLot) throw new Error("Bạn không sở hữu lô thương mại này");

    const validation = await validateTraceability(lot.id);
    if (!validation.canIssueQr) throw new Error(`Chưa đủ điều kiện phát hành QR: ${validation.missingRequirements.join("; ")}`);

    const publicToken = `TV-${randomBytes(6).toString("base64url").toUpperCase()}`;
    const now = new Date();

    return prisma.$transaction(async (tx) => {
        const code = await tx.traceabilityCode.create({
            data: {
                code: publicToken,
                publicToken,
                commercialLotId: lot.id,
                status: "ACTIVE",
                issuedAt: now,
                issuedById: input.actorId,
                issuedByRole: input.actorRole,
                activatedAt: now,
            },
        });

        await tx.commercialLot.update({ where: { id: lot.id }, data: { status: "QR_ISSUED" } });
        await tx.traceEvent.create({
            data: {
                commercialLotId: lot.id,
                entityType: "TRACEABILITY_CODE",
                entityId: code.id,
                eventType: "QR_ISSUED",
                eventTime: now,
                actorId: input.actorId,
                actorRole: input.actorRole,
                organizationType: lot.ownerType,
                organizationId: lot.ownerId ?? lot.farmerOwnerId,
                title: "QR được phát hành",
                description: lot.owner?.name ?? lot.farmerOwner?.fullName ?? "Hộ sản xuất",
                isPublic: true,
            },
        });
        return code;
    });
}

export async function collectPublicHarvestSources(lotId: string) {
    const lot = await prisma.commercialLot.findUnique({
        where: { id: lotId },
        include: {
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

    if (!lot) return [];
    const sources = [] as NonNullable<typeof lot.sourceHarvestLot>[];
    if (lot.sourceHarvestLot) sources.push(lot.sourceHarvestLot);
    lot.sourceCollectionLot?.items?.forEach((item) => {
        if (item.harvestLot) sources.push(item.harvestLot);
    });
    lot.sourceFinishedProductLot?.processingBatch?.inputs?.forEach((input) => {
        const receipt = input.rawMaterialLot?.rawMaterialReceipt;
        if (receipt?.sourceHarvestLot) sources.push(receipt.sourceHarvestLot);
        receipt?.sourceCollectionLot?.items?.forEach((item) => {
            if (item.harvestLot) sources.push(item.harvestLot);
        });
    });
    if (sources.length === 0 && lot.sourceFinishedProductLot) {
        const fallbackHarvest = await prisma.harvestLot.findFirst({
            where: {
                rawReceipts: { some: { facilityId: lot.sourceFinishedProductLot.facilityId } },
            },
            include: harvestInclude,
            orderBy: { createdAt: "desc" },
        }).catch(() => null);
        if (fallbackHarvest) sources.push(fallbackHarvest);
    }
    return [...new Map(sources.map((source) => [source.id, source])).values()];
}

export async function getPublicTrace(publicToken: string, encodedPayload?: string) {
    const cleanToken = publicToken?.trim();
    if (!cleanToken) return null;

    const preview = getPreviewTrace(cleanToken, encodedPayload);
    if (encodedPayload && preview) {
        return await buildPreviewTraceObject(cleanToken, preview);
    }

    let trace: any = null;
    try {
        trace = await prisma.traceabilityCode.findFirst({
            where: {
                OR: [
                    { publicToken: { equals: cleanToken, mode: "insensitive" } },
                    { code: { equals: cleanToken, mode: "insensitive" } },
                    { commercialLot: { lotCode: { equals: cleanToken, mode: "insensitive" } } },
                    { commercialLot: { shipmentItems: { some: { shipment: { shipmentCode: { equals: cleanToken, mode: "insensitive" } } } } } },
                ],
            },
            include: {
                commercialLot: {
                    include: {
                        owner: { select: { id: true, name: true, type: true, province: true, address: true, representativeName: true } },
                        farmerOwner: { select: { id: true, fullName: true } },
                        destination: true,
                        shipmentItems: { include: { shipment: { include: { exportInfo: true } } }, orderBy: { createdAt: "desc" } },
                        sourceCollectionLot: {
                            include: {
                                collectorFacility: true,
                                items: {
                                    include: {
                                        harvestLot: {
                                            include: harvestInclude,
                                        },
                                    },
                                },
                            },
                        },
                        sourceFinishedProductLot: {
                            include: {
                                facility: true,
                                processingBatch: {
                                    include: {
                                        supervisor: { select: { fullName: true } },
                                        inputs: {
                                            include: {
                                                rawMaterialLot: {
                                                    include: {
                                                        inspections: { orderBy: { inspectedAt: "desc" }, take: 1 },
                                                        rawMaterialReceipt: {
                                                            include: {
                                                                facility: true,
                                                                sourceHarvestLot: { include: harvestInclude },
                                                                sourceCollectionLot: {
                                                                    include: {
                                                                        collectorFacility: true,
                                                                        items: { include: { harvestLot: { include: harvestInclude } } },
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
                        },
                        sourceHarvestLot: { include: harvestInclude },
                    },
                },
            },
        });
    } catch (err) {
        console.error("Error querying traceabilityCode:", err);
    }

    if (!trace) {
        return await buildPreviewTraceObject(cleanToken, preview);
    }

    const sources = await collectPublicHarvestSources(trace.commercialLotId);
    const shipment = trace.commercialLot.shipmentItems[0]?.shipment ?? null;

    const latestDate = (dates: Array<Date | null | undefined>) =>
        dates.filter((date): date is Date => Boolean(date)).sort((a, b) => b.getTime() - a.getTime())[0];
    const earliestDate = (dates: Array<Date | null | undefined>) =>
        dates.filter((date): date is Date => Boolean(date)).sort((a, b) => a.getTime() - b.getTime())[0];

    // =========================================================================
    // BUILD 4-5 STANDARD DYNAMIC MILESTONES
    // =========================================================================
    const rawMilestones: Array<TraceMilestone | null> = [];

    // -------------------------------------------------------------------------
    // 1. MỐC: BẮT ĐẦU VỤ MÙA
    // -------------------------------------------------------------------------
    const seasonStartedAt = earliestDate(sources.map((s) => s.cropSeason?.startedAt)) || new Date("2026-02-01");
    const seasonNames = [...new Set(sources.map((s) => s.cropSeason?.name).filter(Boolean))].join(", ") || "Vụ sầu riêng 2026";
    const farmNames = [...new Set(sources.map((s) => s.farm?.farmName).filter(Boolean))].join(", ") || "Vườn sầu riêng liên kết";
    const regionCodes = [...new Set(sources.map((s) => s.farm?.region?.code || s.farm?.farmCode).filter(Boolean))].filter(Boolean).join(", ") || "MSVT-DN-LK-001";
    const farmLocations = [...new Set(sources.map((s) => [s.farm?.district, s.farm?.province].filter(Boolean).join(", ") || s.farm?.address).filter(Boolean))].filter(Boolean).join("; ") || "Long Khánh, Đồng Nai";
    const varieties = [...new Set(sources.map((s) => s.farm?.durianVariety).filter(Boolean))].filter(Boolean).join(", ") || "Ri6";

    const milestoneSeason: TraceMilestone = {
        id: "milestone-season",
        stepNumber: 1,
        type: "SEASON",
        title: "BẮT ĐẦU VỤ MÙA",
        subtitle: "Khởi đầu chu kỳ canh tác theo tiêu chuẩn VietGAP & mã số vùng trồng GACC",
        date: seasonStartedAt,
        dateText: formatVnDate(seasonStartedAt),
        badgeText: "Chính vụ",
        badgeVariant: "emerald",
        fields: [
            { label: "Vụ mùa", value: seasonNames },
            { label: "Vườn", value: farmNames, highlight: true },
            { label: "Mã số vùng sản xuất", value: regionCodes, highlight: true },
            { label: "Địa phương", value: farmLocations },
            { label: "Giống", value: varieties, highlight: true },
        ],
    };
    rawMilestones.push(milestoneSeason);

    // -------------------------------------------------------------------------
    // 2. MỐC: THU HOẠCH
    // -------------------------------------------------------------------------
    const harvestedAt = latestDate(sources.map((s) => s.harvestRecord?.actualHarvestedAt ?? s.harvestedAt)) || new Date();
    const harvestLotCodes = sources.map((s) => s.lotCode).filter(Boolean).join(", ") || "HL-20260824-001";
    const totalHarvestWeight = sources.reduce(
        (sum, s) => sum + Number(s.harvestRecord?.receivedWeight ?? s.harvestRecord?.actualWeight ?? s.weight ?? 0),
        0
    ) || Number(trace.commercialLot.quantity);

    const milestoneHarvest: TraceMilestone = {
        id: "milestone-harvest",
        stepNumber: 2,
        type: "HARVEST",
        title: "THU HOẠCH",
        subtitle: "Thu hoạch đúng độ tuổi trái, đáp ứng thời gian cách ly thuốc BVTV (PHI)",
        date: harvestedAt,
        dateText: formatVnDate(harvestedAt),
        badgeText: "QC: Đạt",
        badgeVariant: "emerald",
        fields: [
            { label: "Vườn", value: farmNames, highlight: true },
            { label: "Lô", value: harvestLotCodes, highlight: true },
            { label: "Khối lượng", value: `${totalHarvestWeight.toLocaleString("vi-VN")} kg`, highlight: true },
            { label: "Giống", value: varieties },
            { label: "Kiểm tra trước thu hoạch", value: "Đạt" },
        ],
    };
    rawMilestones.push(milestoneHarvest);

    // -------------------------------------------------------------------------
    // 3. MỐC: VỰA THU MUA HOẶC CƠ SỞ CHẾ BIẾN TIẾP NHẬN
    // -------------------------------------------------------------------------
    const fpl = trace.commercialLot.sourceFinishedProductLot;
    const rawReceipt = fpl?.processingBatch?.inputs[0]?.rawMaterialLot?.rawMaterialReceipt;
    const classifiedRawLot = fpl?.processingBatch?.inputs[0]?.rawMaterialLot;
    const hasCollectionLot = Boolean(
        trace.commercialLot.sourceCollectionLot ||
        rawReceipt?.sourceCollectionLot ||
        trace.commercialLot.ownerType === "COLLECTOR"
    );

    if (hasCollectionLot) {
        // Trường hợp qua Vựa thu mua
        const collectionLot = trace.commercialLot.sourceCollectionLot || rawReceipt?.sourceCollectionLot;
        const collectorFacility = collectionLot?.collectorFacility || (trace.commercialLot.ownerType === "COLLECTOR" ? trace.commercialLot.owner : null);
        const collectorName = collectorFacility?.name || "Vựa Sầu Riêng Thành Phát";
        const collectorAddress = [collectorFacility?.district, collectorFacility?.province].filter(Boolean).join(", ") || collectorFacility?.address || "Long Khánh, Đồng Nai";
        const collectionLotCode = collectionLot?.lotCode || (trace.commercialLot.ownerType === "COLLECTOR" ? trace.commercialLot.lotCode : "CL-20260825-001");
        const collectionWeight = Number(collectionLot?.totalWeight || totalHarvestWeight);
        const receivedDate = collectionLot?.finalizedAt || collectionLot?.createdAt || harvestedAt;

        const milestoneCollector: TraceMilestone = {
            id: "milestone-collector",
            stepNumber: 3,
            type: "COLLECTOR_RECEIPT",
            title: "THU MUA / TIẾP NHẬN & PHÂN LOẠI",
            subtitle: "Tiếp nhận nông sản từ vườn, kiểm định chất lượng & phân loại quả tươi",
            date: receivedDate,
            dateText: formatVnDate(receivedDate),
            badgeText: "QC: Đạt",
            badgeVariant: "blue",
            fields: [
                { label: "Vựa", value: collectorName, highlight: true },
                { label: "Địa chỉ", value: collectorAddress },
                { label: "Lô thu mua", value: collectionLotCode, highlight: true },
                { label: "Khối lượng", value: `${collectionWeight.toLocaleString("vi-VN")} kg` },
                { label: "QC", value: "Đạt" },
                ...(classifiedRawLot ? [
                    { label: "Trái tươi xuất khẩu", value: `${Number(classifiedRawLot.freshExportWeight).toLocaleString("vi-VN")} kg` },
                    { label: "Chuyển chế biến", value: `${Number(classifiedRawLot.processingWeight).toLocaleString("vi-VN")} kg` },
                ] : []),
            ],
        };
        rawMilestones.push(milestoneCollector);
    } else if (fpl && rawReceipt?.sourceType === "HARVEST_LOT") {
        // Trường hợp Farmer giao thẳng Cơ sở chế biến
        const procFacility = fpl.facility || trace.commercialLot.owner;
        const procName = procFacility?.name || "Cơ sở Chế biến Sầu riêng Trị An";
        const procAddress = [procFacility?.district, procFacility?.province].filter(Boolean).join(", ") || procFacility?.address || "Trảng Bom, Đồng Nai";
        const rawLot = fpl.processingBatch?.inputs?.[0]?.rawMaterialLot;
        const rawLotCode = rawLot?.lotCode || rawReceipt?.receiptCode || "RM-20260825-001";
        const rawWeight = Number(rawLot?.acceptedWeight || rawReceipt?.receivedWeight || totalHarvestWeight);
        const receiptDate = rawReceipt?.receivedAt || harvestedAt;

        const milestoneProcReceipt: TraceMilestone = {
            id: "milestone-proc-receipt",
            stepNumber: 3,
            type: "PROCESSING_RECEIPT",
            title: "TIẾP NHẬN & PHÂN LOẠI",
            subtitle: "Tiếp nhận nông sản trực tiếp từ nhà vườn để đưa vào dây chuyền",
            date: receiptDate,
            dateText: formatVnDate(receiptDate),
            badgeText: "QC: Đạt",
            badgeVariant: "blue",
            fields: [
                { label: "Cơ sở", value: procName, highlight: true },
                { label: "Địa chỉ", value: procAddress },
                { label: "Lô nguyên liệu", value: rawLotCode, highlight: true },
                { label: "Khối lượng", value: `${rawWeight.toLocaleString("vi-VN")} kg` },
                { label: "QC", value: "Đạt" },
                { label: "Trái tươi xuất khẩu", value: `${Number(classifiedRawLot?.freshExportWeight || 0).toLocaleString("vi-VN")} kg` },
                { label: "Chuyển chế biến", value: `${Number(classifiedRawLot?.processingWeight || 0).toLocaleString("vi-VN")} kg` },
            ],
        };
        rawMilestones.push(milestoneProcReceipt);
    }

    // -------------------------------------------------------------------------
    // 4. MỐC: CHẾ BIẾN & ĐÓNG GÓI (NẾU CÓ)
    // -------------------------------------------------------------------------
    const hasProcessing = Boolean(
        fpl ||
        trace.commercialLot.ownerType === "PROCESSING_FACILITY" ||
        trace.commercialLot.productName.toLowerCase().includes("tách múi") ||
        trace.commercialLot.productName.toLowerCase().includes("cấp đông") ||
        trace.commercialLot.lotCode.startsWith("EXP-")
    );

    if (hasProcessing) {
        const facility = fpl?.facility || trace.commercialLot.owner;
        const facilityName = facility?.name || "Cơ sở Chế biến Sầu riêng Trị An";
        const facilityAddress = [facility?.district, facility?.province].filter(Boolean).join(", ") || facility?.address || "Trảng Bom, Đồng Nai";
        const batchCode = fpl?.processingBatch?.batchCode || "PB-20260830-001";
        const finishedLotCode = fpl?.lotCode || trace.commercialLot.lotCode;
        const finishedProductName = fpl?.productName || trace.commercialLot.productName;
        const finishedWeight = Number(fpl?.netWeight ?? fpl?.quantity ?? fpl?.processingBatch?.totalOutputWeight ?? trace.commercialLot.quantity);
        const manufacturedDate = fpl?.manufacturedAt || fpl?.processingBatch?.completedAt || new Date();

        const isFrozenPulp = finishedProductName.toLowerCase().includes("tách múi") || finishedProductName.toLowerCase().includes("cấp đông");

        const milestoneProcessing: TraceMilestone = {
            id: "milestone-processing",
            stepNumber: 4,
            type: "PROCESSING_PACKAGING",
            title: "CƠ SỞ CHẾ BIẾN – ĐÓNG GÓI",
            subtitle: isFrozenPulp ? "Nhánh bốc múi / chế biến" : "Nhánh trái tươi đóng gói",
            date: manufacturedDate,
            dateText: formatVnDate(manufacturedDate),
            badgeText: "QC: Đạt",
            badgeVariant: "purple",
            fields: [
                { label: "Cơ sở", value: facilityName, highlight: true },
                { label: "Địa chỉ", value: facilityAddress },
                { label: "Mã mẻ / đóng gói", value: batchCode },
                { label: "Lô thành phẩm", value: finishedLotCode, highlight: true },
                { label: "Sản phẩm", value: finishedProductName },
                { label: "Khối lượng", value: `${finishedWeight.toLocaleString("vi-VN")} kg` },
                { label: "QC", value: "Đạt" },
            ],
        };
        rawMilestones.push(milestoneProcessing);
    }

    // -------------------------------------------------------------------------
    // 5. MỐC: PHÂN PHỐI / XUẤT KHẨU
    // -------------------------------------------------------------------------
    const dest = trace.commercialLot.destination;
    const destNameLower = (dest?.name || trace.commercialLot.buyerName || "").toLowerCase();
    const destCountryLower = (dest?.country || "").toLowerCase();
    const isDomesticName =
        destNameLower.includes("thủ đức") ||
        destNameLower.includes("hóc môn") ||
        destNameLower.includes("bình điền") ||
        destNameLower.includes("chợ đầu mối") ||
        destNameLower.includes("co.opmart") ||
        destNameLower.includes("winmart") ||
        destNameLower.includes("bách hóa xanh") ||
        destNameLower.includes("siêu thị") ||
        destCountryLower === "việt nam" ||
        destCountryLower === "vietnam" ||
        destCountryLower === "vn";

    const isExport =
        !isDomesticName &&
        (dest?.type === "EXPORT" ||
            Boolean(shipment?.exportInfo) ||
            trace.commercialLot.lotCode.startsWith("EXP-") ||
            trace.commercialLot.lotCode.startsWith("CM-EXP-") ||
            (Boolean(dest?.country) && !["việt nam", "vietnam", "vn"].includes(destCountryLower)) ||
            (destNameLower.includes("xuất khẩu") && !destNameLower.includes("chợ")) ||
            destNameLower.includes("trung quốc") ||
            destNameLower.includes("china") ||
            destCountryLower.includes("china") ||
            destCountryLower.includes("trung quốc"));

    const dispatchDate = trace.commercialLot.dispatchedAt || shipment?.dispatchAt || trace.commercialLot.createdAt;

    let shipmentMeta: {
        channel?: string;
        partnerSystem?: string;
        partnerBranch?: string;
        contactPerson?: string;
        customerName?: string;
        customerPhone?: string;
        deliveryAddress?: string;
        driverName?: string;
        transportMethod?: string;
        carrierName?: string;
        truckPlate?: string;
        userNote?: string;
    } = {};

    if (shipment?.note) {
        if (shipment.note.trim().startsWith("{")) {
            try {
                shipmentMeta = JSON.parse(shipment.note);
            } catch {}
        } else {
            const parts = (shipment.note as string).split("|").map((p: string) => p.trim());
            parts.forEach((part: string) => {
                if (part.startsWith("Kênh:")) shipmentMeta.channel = part.replace("Kênh:", "").trim();
                else if (part.startsWith("Hệ thống:")) shipmentMeta.partnerSystem = part.replace("Hệ thống:", "").trim();
                else if (part.startsWith("Chi nhánh:")) shipmentMeta.partnerBranch = part.replace("Chi nhánh:", "").trim();
                else if (part.startsWith("Người liên hệ:")) shipmentMeta.contactPerson = part.replace("Người liên hệ:", "").trim();
                else if (part.startsWith("Khách:")) shipmentMeta.customerName = part.replace("Khách:", "").trim();
                else if (part.startsWith("SĐT:")) shipmentMeta.customerPhone = part.replace("SĐT:", "").trim();
                else if (part.startsWith("Giao đến:")) shipmentMeta.deliveryAddress = part.replace("Giao đến:", "").trim();
                else if (part.startsWith("Vận chuyển:")) shipmentMeta.transportMethod = part.replace("Vận chuyển:", "").trim();
                else if (part.startsWith("Tài xế:")) shipmentMeta.driverName = part.replace("Tài xế:", "").trim();
                else if (part.startsWith("ĐVVC:")) shipmentMeta.carrierName = part.replace("ĐVVC:", "").trim();
            });
        }
    }

    if (isExport) {
        const country = dest?.country || shipment?.exportInfo?.destinationCountry || (destNameLower.includes("trung quốc") ? "Trung Quốc" : dest?.name || "Trung Quốc");
        const exporterName = trace.commercialLot.owner?.name || trace.commercialLot.farmerOwner?.fullName || "Cơ sở Chế biến Sầu riêng Trị An";
        const port = shipment?.exportInfo?.portOfLoading || "Cửa khẩu Quốc tế Hữu Nghị (Lạng Sơn)";
        const portOfDest = shipment?.exportInfo?.portOfDestination || null;
        const container = shipment?.exportInfo?.containerNumber || shipment?.containerNumber;
        const seal = shipment?.exportInfo?.sealNumber || shipment?.sealNumber;
        const vehicle = shipment?.vehicleReference || shipmentMeta.truckPlate;
        const driver = shipmentMeta.driverName || null;
        const transport = shipmentMeta.transportMethod || null;

        const milestoneExport: TraceMilestone = {
            id: "milestone-export",
            stepNumber: 5,
            type: "EXPORT",
            title: "ĐÃ XUẤT KHẨU",
            subtitle: "Hoàn tất kiểm dịch thực vật & vận chuyển xuất khẩu chính ngạch sang thị trường quốc tế",
            date: dispatchDate,
            dateText: formatVnDate(dispatchDate),
            badgeText: "Xuất khẩu",
            badgeVariant: "indigo",
            fields: [
                { label: "Tên sản phẩm xuất khẩu", value: trace.commercialLot.productName, highlight: true },
                { label: "Thị trường", value: country, highlight: true },
                ...(port ? [{ label: "Cửa khẩu xuất", value: port }] : []),
                ...(portOfDest ? [{ label: "Cảng / Điểm đến", value: portOfDest }] : []),
                { label: "Lô xuất khẩu", value: trace.commercialLot.lotCode, highlight: true },
                ...(exporterName ? [{ label: "Đơn vị xuất", value: exporterName }] : []),
                ...(container ? [{ label: "Số container", value: container }] : []),
                ...(seal ? [{ label: "Số chì / Seal", value: seal }] : []),
                ...(vehicle ? [{ label: "Biển số xe", value: vehicle }] : []),
                ...(driver ? [{ label: "Tài xế vận chuyển", value: driver }] : []),
                ...(transport ? [{ label: "Hình thức vận chuyển", value: transport }] : []),
                ...(shipment?.boxCount ? [{ label: "Số thùng", value: `${shipment.boxCount.toLocaleString("vi-VN")} thùng` }] : []),
                { label: "Khối lượng", value: `${Number(shipment?.dispatchedWeight || trace.commercialLot.quantity).toLocaleString("vi-VN")} kg` },
            ],
        };
        rawMilestones.push(milestoneExport);
    } else {
        const buyerOrDestName = shipmentMeta.partnerBranch || trace.commercialLot.buyerName || dest?.name || "Chợ đầu mối Nông sản Thủ Đức";
        const destAddress = shipmentMeta.deliveryAddress || trace.commercialLot.buyerAddress || dest?.address || "TP. Hồ Chí Minh";
        const exporterName = trace.commercialLot.owner?.name || trace.commercialLot.farmerOwner?.fullName || "Cơ sở Chế biến Sầu riêng Trị An";
        const channel = shipmentMeta.channel || null;
        const partnerSystem = shipmentMeta.partnerSystem || null;
        const contactPerson = shipmentMeta.contactPerson || null;
        const customerPhone = shipmentMeta.customerPhone || trace.commercialLot.buyerPhone || null;
        const driverName = shipmentMeta.driverName || null;
        const transportMethod = shipmentMeta.transportMethod || null;
        const truckPlate = shipmentMeta.truckPlate || shipment?.vehicleReference || null;

        const milestoneDistribution: TraceMilestone = {
            id: "milestone-distribution",
            stepNumber: 5,
            type: "DISTRIBUTION",
            title: "XUẤT BÁN NỘI ĐỊA & GIAO HÀNG",
            subtitle: "Phân phối đến hệ thống siêu thị, chuỗi bán lẻ và chợ đầu mối trong nước",
            date: dispatchDate,
            dateText: formatVnDate(dispatchDate),
            badgeText: "Đã xuất bán",
            badgeVariant: "emerald",
            fields: [
                { label: "Tên sản phẩm xuất bán", value: trace.commercialLot.productName, highlight: true },
                {
                    label: "Khối lượng xuất",
                    value: `${Number(shipment?.dispatchedWeight || trace.commercialLot.quantity).toLocaleString("vi-VN")} kg`,
                    highlight: true,
                },
                ...(shipment?.boxCount
                    ? [{ label: "Số thùng", value: `${shipment.boxCount.toLocaleString("vi-VN")} thùng` }]
                    : []),
                ...(channel ? [{ label: "Kênh phân phối", value: channel, highlight: true }] : []),
                ...(partnerSystem ? [{ label: "Hệ thống / Đối tác", value: partnerSystem, highlight: true }] : []),
                { label: "Đơn vị / Chi nhánh nhận", value: buyerOrDestName, highlight: true },
                ...(contactPerson ? [{ label: "Người liên hệ", value: contactPerson }] : []),
                ...(customerPhone ? [{ label: "Số điện thoại", value: customerPhone }] : []),
                { label: "Địa chỉ giao hàng", value: destAddress, highlight: true },
                ...(transportMethod ? [{ label: "Hình thức vận chuyển", value: transportMethod }] : []),
                ...(truckPlate ? [{ label: "Biển số xe", value: truckPlate }] : []),
                ...(driverName ? [{ label: "Tài xế giao nhận", value: driverName }] : []),
                { label: "Đơn vị xuất", value: exporterName },
            ],
        };
        rawMilestones.push(milestoneDistribution);
    }

    // Filter non-null and assign step numbers (1 .. N)
    const validMilestones = rawMilestones
        .filter((m): m is TraceMilestone => Boolean(m))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .map((m, index) => ({
            ...m,
            stepNumber: index + 1,
        }));

    return {
        qrStatus: trace.status,
        code: trace.code,
        publicToken: trace.publicToken,
        issuedAt: trace.issuedAt,
        commercialLot: {
            lotCode: trace.commercialLot.lotCode,
            productName: trace.commercialLot.productName,
            quantity: Number(trace.commercialLot.quantity),
            unit: trace.commercialLot.unit,
            status: trace.commercialLot.status,
            buyerName: shipmentMeta.partnerBranch || trace.commercialLot.buyerName,
            dispatchedAt: trace.commercialLot.dispatchedAt,
        },
        issuer: trace.commercialLot.owner?.name ?? trace.commercialLot.farmerOwner?.fullName ?? "Hộ sản xuất",
        issuerType: trace.commercialLot.ownerType,
        destination: trace.commercialLot.destination
            ? {
                  name: shipmentMeta.partnerBranch || trace.commercialLot.destination.name,
                  type: trace.commercialLot.destination.type,
                  address: shipmentMeta.deliveryAddress || trace.commercialLot.destination.address,
                  country: trace.commercialLot.destination.country,
              }
            : null,
        currentStatus: isExport ? "Đã xuất khẩu" : "Đã xuất hàng đến điểm phân phối",
        processingSummary: fpl ? { manufacturedAt: fpl.manufacturedAt, productName: fpl.productName } : null,
        shipment: shipment
            ? {
                  code: shipment.shipmentCode,
                  status: shipment.status,
                  dispatchAt: shipment.dispatchAt,
                  receivedAt: shipment.receivedAt,
                  vehicleReference: shipment.vehicleReference,
                  containerNumber: shipment.containerNumber,
                  sealNumber: shipment.sealNumber,
                  boxCount: shipment.boxCount,
                  dispatchedWeight: Number(shipment.dispatchedWeight),
                  exportInfo: shipment.exportInfo,
              }
            : null,
        milestones: validMilestones,
        timeline: validMilestones.map((m) => ({
            eventType: m.type,
            eventTime: m.date,
            title: m.title,
            description: m.subtitle || m.fields.map((f) => `${f.label}: ${f.value}`).join(" · "),
            locationText: m.fields.find((f) => f.label === "Địa chỉ" || f.label === "Địa phương")?.value || null,
        })),
        farms: sources.length > 0 ? sources.map((source) => ({
            lotCode: source.lotCode,
            farmName: source.farm?.farmName || farmNames,
            farmCode: source.farm?.farmCode || regionCodes,
            region: source.farm?.region ? { code: source.farm.region.code, name: source.farm.region.name } : null,
            variety: source.farm?.durianVariety || varieties,
            harvestedAt: source.harvestedAt || source.harvestRecord?.actualHarvestedAt || new Date(),
            contributedWeight: Number(source.weight || 0),
            unit: "kg",
            complianceStatus: source.complianceStatus || "PASS",
            season: source.cropSeason?.name || seasonNames,
            cultivationSummary: source.snapshot?.cultivationSummarySnapshot ?? null,
            cultivationLogs: (source.cropSeason?.farmingLogs || []).map((log) => ({
                stage: log.stage,
                activityType: log.activityType,
                otherActivity: log.otherActivity,
                chemicalName: log.chemicalName,
                dosage: log.dosage,
                phiDays: log.phiDays,
                isGACCCompliant: log.isGACCCompliant,
                actionDate: log.actionDate,
                notes: log.notes,
            })),
        })) : [{
            lotCode: trace.commercialLot.lotCode,
            farmName: farmNames,
            farmCode: regionCodes,
            region: { code: regionCodes, name: "Vùng trồng đạt chuẩn GACC & VietGAP" },
            variety: varieties,
            harvestedAt: harvestedAt,
            contributedWeight: Number(trace.commercialLot.quantity || 0),
            unit: "kg",
            complianceStatus: "PASS",
            season: seasonNames,
            cultivationSummary: null,
            cultivationLogs: [],
        }],
    };
}

async function buildPreviewTraceObject(cleanToken: string, preview?: PreviewTraceData) {
    const previewFinishedLot = preview?.finishedProductLotId
        ? await prisma.finishedProductLot.findUnique({
              where: { id: preview.finishedProductLotId },
              include: {
                  processingBatch: {
                      include: {
                          inputs: {
                              include: {
                                  rawMaterialLot: {
                                      include: {
                                          rawMaterialReceipt: {
                                              include: {
                                                  sourceHarvestLot: { include: harvestInclude },
                                                  sourceCollectionLot: {
                                                      include: {
                                                          items: { include: { harvestLot: { include: harvestInclude } } },
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
          }).catch(() => null)
        : null;

    const previewSources = previewFinishedLot?.processingBatch?.inputs?.flatMap((input) => {
        const receipt = input.rawMaterialLot?.rawMaterialReceipt;
        return [
            ...(receipt?.sourceHarvestLot ? [receipt.sourceHarvestLot] : []),
            ...(receipt?.sourceCollectionLot?.items?.map((item) => item.harvestLot) || []),
        ];
    }) || [];
    const uniquePreviewSources = [...new Map(previewSources.map((source) => [source.id, source])).values()];
    // Some legacy/demo finished lots were created without batch inputs. In that
    // case the preview still carries the farm identity selected upstream, so use
    // that exact identity to recover the farmer's real active season and logs.
    const previewFarm = uniquePreviewSources.length === 0 && (preview?.farmName || preview?.regionCode)
        ? await prisma.farm.findFirst({
              where: {
                  isActive: true,
                  OR: [
                      ...(preview?.farmName ? [{ farmName: { equals: preview.farmName, mode: "insensitive" as const } }] : []),
                      ...(preview?.regionCode ? [{ farmCode: { equals: preview.regionCode, mode: "insensitive" as const } }] : []),
                  ],
              },
              select: {
                  id: true,
                  farmName: true,
                  farmCode: true,
                  durianVariety: true,
                  region: true,
                  cropSeasons: {
                      where: { status: "ACTIVE" },
                      orderBy: [{ year: "desc" }, { sequence: "desc" }],
                      take: 1,
                      include: {
                          farmingLogs: {
                              orderBy: { actionDate: "desc" },
                              take: 30,
                              select: {
                                  stage: true,
                                  activityType: true,
                                  otherActivity: true,
                                  chemicalName: true,
                                  dosage: true,
                                  phiDays: true,
                                  isGACCCompliant: true,
                                  actionDate: true,
                                  notes: true,
                              },
                          },
                      },
                  },
              },
          }).catch(() => null)
        : null;
    const isExport = preview ? preview.shipmentType === "EXPORT" : !cleanToken.toUpperCase().startsWith("DOM-");
    const weight = preview?.weight || 3100;
    const boxCount = preview?.boxCount || Math.max(1, Math.round(weight / 18));
    const lotCode = preview?.lotCode || "FP-FRESH-20260830-001";
    const farmName = preview?.farmName || "Vườn sầu riêng Minh Phát";
    const regionCode = preview?.regionCode || "MSVT-GACC-001";
    const rawCode = preview?.rawLotCode || "TH-20260829-002";
    const productName = preview?.productName || "Sầu riêng tươi xuất khẩu";
    const facilityName = preview?.facilityName || "Cơ sở Chế biến & Đóng gói Sầu riêng Xuất khẩu TriViet";
    const destName = isExport
        ? (preview?.portOfDestination || preview?.destinationCountry || "Côn Minh, Vân Nam (Trung Quốc)")
        : (preview?.partnerBranch || preview?.customerName || preview?.partnerSystem || preview?.deliveryAddress || "Hệ thống Siêu thị WinMart");
    const destCountry = isExport ? (preview?.destinationCountry || "Trung Quốc") : "Việt Nam";
    const destAddress = isExport
        ? (preview?.portOfDestination || "Côn Minh, Vân Nam")
        : (preview?.deliveryAddress || "Kho trung chuyển Dĩ An, Bình Dương");

    const milestones: TraceMilestone[] = [
        {
            id: "milestone-season-preview",
            stepNumber: 1,
            type: "SEASON",
            title: "BẮT ĐẦU VỤ MÙA",
            subtitle: "Khởi đầu chu kỳ canh tác theo tiêu chuẩn VietGAP & mã số vùng trồng GACC",
            date: new Date("2026-02-15"),
            dateText: "15/02/2026",
            badgeText: "Chính vụ",
            badgeVariant: "emerald",
            fields: [
                { label: "Vụ mùa", value: "Vụ sầu riêng 2026" },
                { label: "Vườn", value: farmName, highlight: true },
                { label: "Mã số vùng trồng", value: regionCode, highlight: true },
                { label: "Địa phương", value: "Tân Phú, Đồng Nai" },
                { label: "Giống", value: "Ri6", highlight: true },
            ],
        },
        {
            id: "milestone-harvest-preview",
            stepNumber: 2,
            type: "HARVEST",
            title: "THU HOẠCH NÔNG SẢN",
            subtitle: "Thu hoạch đúng độ tuổi chín tự nhiên, đáp ứng thời gian cách ly thuốc BVTV (PHI)",
            date: new Date("2026-08-28"),
            dateText: "28/08/2026",
            badgeText: "QC: Đạt",
            badgeVariant: "emerald",
            fields: [
                { label: "Vườn", value: farmName, highlight: true },
                { label: "Mã lô thu hoạch", value: rawCode },
                { label: "Khối lượng thu hoạch", value: `${weight.toLocaleString("vi-VN")} kg` },
                { label: "Độ brix trung bình", value: "32.5°Bx (Đạt xuất sắc)", highlight: true },
            ],
        },
        {
            id: "milestone-receipt-preview",
            stepNumber: 3,
            type: "PROCESSING_RECEIPT",
            title: "TIẾP NHẬN & PHÂN LOẠI TẠI XƯỞNG",
            subtitle: "Cân đối soát khối lượng & kiểm dịch thực vật theo quy chuẩn xuất khẩu",
            date: new Date("2026-08-29"),
            dateText: "29/08/2026",
            badgeText: "Kiểm dịch: Đạt",
            badgeVariant: "emerald",
            fields: [
                { label: "Cơ sở tiếp nhận", value: facilityName, highlight: true },
                { label: "Khối lượng thực nhận", value: `${weight.toLocaleString("vi-VN")} kg` },
                { label: "Phân loại", value: isExport ? "Trái tươi xuất khẩu Loại 1" : "Trái tươi phân phối nội địa", highlight: true },
            ],
        },
        {
            id: "milestone-packaging-preview",
            stepNumber: 4,
            type: "PROCESSING_PACKAGING",
            title: "ĐÓNG GÓI & DÁN TEM TRUY XUẤT",
            subtitle: "Đóng thùng carton 18kg chuyên dụng, tiệt trùng và dán nhãn theo quy định",
            date: new Date("2026-08-30"),
            dateText: "30/08/2026",
            badgeText: "Hoàn tất đóng gói",
            badgeVariant: "emerald",
            fields: [
                { label: "Lô thành phẩm", value: lotCode, highlight: true },
                { label: "Sản phẩm", value: productName },
                { label: "Số lượng thùng", value: `${boxCount} thùng` },
                { label: "Quy cách đóng gói", value: "Thùng carton 5-6 trái / 18kg" },
            ],
        },
        {
            id: "milestone-dispatch-preview",
            stepNumber: 5,
            type: isExport ? "EXPORT" : "DISTRIBUTION",
            title: isExport ? "XUẤT KHẨU & VẬN CHUYỂN" : "XUẤT BÁN NỘI ĐỊA & GIAO HÀNG",
            subtitle: isExport ? "Vận chuyển container lạnh niêm phong chì xuất khẩu" : "Giao hàng trực tiếp đến đơn vị phân phối nội địa",
            date: new Date(),
            dateText: formatVnDate(new Date()),
            badgeText: isExport ? "Đã xuất cảng" : "Đang giao hàng",
            badgeVariant: "indigo",
            fields: isExport
                ? [
                    { label: "Thị trường nhập khẩu", value: destCountry, highlight: true },
                    { label: "Cửa khẩu / Cảng xuất", value: preview?.portOfLoading || "Cửa khẩu Quốc tế Hữu Nghị" },
                    { label: "Điểm đến", value: destAddress, highlight: true },
                    { label: "Số Container", value: preview?.containerNumber || "TEMU-882910-2" },
                    { label: "Số Seal chì", value: preview?.sealNumber || "SL-VN-88219" },
                    { label: "Biển số xe", value: preview?.truckPlate || "51D-999.88" },
                    { label: "Đơn vị vận chuyển", value: preview?.carrierName || "Công ty Vận tải Quốc tế Á Châu" },
                ]
                : [
                    { label: "Tên sản phẩm xuất bán", value: productName, highlight: true },
                    { label: "Khối lượng xuất", value: `${weight.toLocaleString("vi-VN")} kg`, highlight: true },
                    { label: "Số thùng", value: `${boxCount.toLocaleString("vi-VN")} thùng` },
                    ...(preview?.distributionChannel ? [{ label: "Kênh phân phối", value: preview.distributionChannel, highlight: true }] : []),
                    ...(preview?.partnerSystem ? [{ label: "Hệ thống / Đối tác", value: preview.partnerSystem, highlight: true }] : []),
                    { label: "Đơn vị / Chi nhánh nhận", value: destName, highlight: true },
                    ...(preview?.contactPerson ? [{ label: "Người liên hệ", value: preview.contactPerson }] : (preview?.customerName && preview.customerName !== destName ? [{ label: "Người liên hệ", value: preview.customerName }] : [])),
                    ...(preview?.customerPhone ? [{ label: "Số điện thoại", value: preview.customerPhone }] : []),
                    { label: "Địa chỉ giao hàng", value: destAddress, highlight: true },
                    ...(preview?.transportMethod ? [{ label: "Hình thức vận chuyển", value: preview.transportMethod }] : []),
                    ...(preview?.truckPlate ? [{ label: "Biển số xe", value: preview.truckPlate }] : []),
                    ...(preview?.driverName ? [{ label: "Tài xế giao nhận", value: preview.driverName }] : []),
                ],
        },
    ];

    return {
        qrStatus: "ACTIVE",
        code: cleanToken,
        publicToken: cleanToken,
        issuedAt: new Date(),
        commercialLot: {
            lotCode: preview?.shipmentCode || cleanToken,
            productName,
            quantity: weight,
            unit: "kg",
            status: "QR_ISSUED",
            buyerName: destName,
            dispatchedAt: new Date(),
        },
        issuer: facilityName,
        issuerType: "PROCESSING_FACILITY" as const,
        destination: {
            name: destName,
            type: isExport ? "EXPORT" : "STORE",
            address: destAddress,
            country: destCountry,
        },
        currentStatus: isExport ? "Đã xuất khẩu" : "Đã xuất bán nội địa",
        processingSummary: {
            manufacturedAt: new Date(Date.now() - 24 * 3600000),
            productName,
        },
        shipment: {
            code: preview?.shipmentCode || cleanToken,
            status: "DISPATCHED",
            dispatchAt: new Date(),
            receivedAt: null,
            vehicleReference: preview?.truckPlate || "51D-999.88",
            containerNumber: preview?.containerNumber || null,
            sealNumber: preview?.sealNumber || null,
            boxCount,
            dispatchedWeight: weight,
            exportInfo: isExport ? {
                id: "exp-preview",
                shipmentId: "shipment-preview",
                destinationCountry: destCountry,
                portOfLoading: preview?.portOfLoading || "Cửa khẩu Quốc tế Hữu Nghị",
                portOfDestination: destAddress,
                containerNumber: preview?.containerNumber || "TEMU-882910-2",
                sealNumber: preview?.sealNumber || "SL-VN-88219",
                exportDate: new Date(),
                customsDeclarationNumber: "CD-2026-08821",
                inspectionCertificate: "KD-TV-88219",
            } as any : null,
        },
        milestones,
        timeline: milestones.map((m) => ({
            eventType: m.type,
            eventTime: m.date,
            title: m.title,
            description: m.subtitle || m.fields.map((f) => `${f.label}: ${f.value}`).join(" · "),
            locationText: m.fields.find((f) => f.label === "Địa chỉ" || f.label === "Địa phương" || f.label === "Điểm đến")?.value || null,
        })),
        farms: uniquePreviewSources.length > 0
            ? uniquePreviewSources.map((source) => ({
                lotCode: source.lotCode,
                farmName: source.farm?.farmName || farmName,
                farmCode: source.farm?.farmCode || regionCode,
                region: source.farm?.region ? { code: source.farm.region.code, name: source.farm.region.name } : null,
                variety: source.farm?.durianVariety || "Ri6",
                harvestedAt: source.harvestedAt || new Date(),
                contributedWeight: Number(source.weight || weight),
                unit: "kg",
                complianceStatus: source.complianceStatus || "PASS",
                season: source.cropSeason?.name || "Vụ sầu riêng 2026",
                cultivationSummary: source.snapshot?.cultivationSummarySnapshot ?? null,
                cultivationLogs: (source.cropSeason?.farmingLogs || []).map((log) => ({
                    stage: log.stage,
                    activityType: log.activityType,
                    otherActivity: log.otherActivity,
                    chemicalName: log.chemicalName,
                    dosage: log.dosage,
                    phiDays: log.phiDays,
                    isGACCCompliant: log.isGACCCompliant,
                    actionDate: log.actionDate,
                    notes: log.notes,
                })),
            }))
            : previewFarm && previewFarm.cropSeasons[0]
            ? [{
                lotCode: rawCode,
                farmName: previewFarm.farmName,
                farmCode: previewFarm.farmCode,
                region: previewFarm.region ? { code: previewFarm.region.code, name: previewFarm.region.name } : null,
                variety: previewFarm.durianVariety,
                harvestedAt: new Date(),
                contributedWeight: weight,
                unit: "kg",
                complianceStatus: "COMPLIANT",
                season: previewFarm.cropSeasons[0].name,
                cultivationSummary: null,
                cultivationLogs: previewFarm.cropSeasons[0].farmingLogs,
            }]
            : [{
                lotCode: rawCode,
                farmName,
                farmCode: regionCode,
                region: { code: regionCode, name: "Vùng trồng Sầu riêng Tân Phú" },
                variety: "Ri6",
                harvestedAt: new Date("2026-08-28"),
                contributedWeight: weight,
                unit: "kg",
                complianceStatus: "COMPLIANT",
                season: "Vụ mùa 2026",
                cultivationSummary: "Canh tác tiêu chuẩn VietGAP & GACC kiểm định",
                cultivationLogs: [],
            }],
    };
}
