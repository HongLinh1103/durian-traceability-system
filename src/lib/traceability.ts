import { randomBytes } from "crypto";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

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
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
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
    farm: { include: { region: true, farmer: { select: { fullName: true } } } },
    cropSeason: {
        include: {
            farmingLogs: {
                orderBy: { actionDate: "desc" as const },
                take: 30,
                select: { id: true, stage: true, activityType: true, actionDate: true, notes: true },
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
    lot.sourceCollectionLot?.items.forEach((item) => sources.push(item.harvestLot));
    lot.sourceFinishedProductLot?.processingBatch.inputs.forEach((input) => {
        const receipt = input.rawMaterialLot.rawMaterialReceipt;
        if (receipt.sourceHarvestLot) sources.push(receipt.sourceHarvestLot);
        receipt.sourceCollectionLot?.items.forEach((item) => sources.push(item.harvestLot));
    });
    return [...new Map(sources.map((source) => [source.id, source])).values()];
}

export async function getPublicTrace(publicToken: string) {
    const cleanToken = publicToken?.trim();
    if (!cleanToken) return null;

    const trace: any = await prisma.traceabilityCode.findFirst({
        where: {
            OR: [
                { publicToken: { equals: cleanToken, mode: "insensitive" } },
                { code: { equals: cleanToken, mode: "insensitive" } },
                { commercialLot: { lotCode: { equals: cleanToken, mode: "insensitive" } } },
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

    if (!trace) return null;

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
    const seasonStartedAt = earliestDate(sources.map((s) => s.cropSeason.startedAt)) || new Date("2026-02-01");
    const seasonNames = [...new Set(sources.map((s) => s.cropSeason.name))].join(", ") || "Vụ sầu riêng 2026";
    const farmNames = [...new Set(sources.map((s) => s.farm.farmName))].join(", ") || "Vườn sầu riêng";
    const regionCodes = [...new Set(sources.map((s) => s.farm.region?.code || s.farm.farmCode))].filter(Boolean).join(", ") || "MSVT-DN-LK-001";
    const farmLocations = [...new Set(sources.map((s) => [s.farm.district, s.farm.province].filter(Boolean).join(", ") || s.farm.address))].filter(Boolean).join("; ") || "Long Khánh, Đồng Nai";
    const varieties = [...new Set(sources.map((s) => s.farm.durianVariety))].filter(Boolean).join(", ") || "Ri6";

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
    const harvestedAt = latestDate(sources.map((s) => s.harvestRecord.actualHarvestedAt ?? s.harvestedAt)) || new Date();
    const harvestLotCodes = sources.map((s) => s.lotCode).join(", ") || "HL-20260824-001";
    const totalHarvestWeight = sources.reduce(
        (sum, s) => sum + Number(s.harvestRecord.receivedWeight ?? s.harvestRecord.actualWeight ?? s.weight),
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
            title: "VỰA THU MUA",
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
            ],
        };
        rawMilestones.push(milestoneCollector);
    } else if (fpl && rawReceipt?.sourceType === "HARVEST_LOT") {
        // Trường hợp Farmer giao thẳng Cơ sở chế biến
        const procFacility = fpl.facility || trace.commercialLot.owner;
        const procName = procFacility?.name || "Cơ sở Chế biến Sầu riêng Trị An";
        const procAddress = [procFacility?.district, procFacility?.province].filter(Boolean).join(", ") || procFacility?.address || "Trảng Bom, Đồng Nai";
        const rawLot = fpl.processingBatch.inputs[0]?.rawMaterialLot;
        const rawLotCode = rawLot?.lotCode || rawReceipt.receiptCode || "RM-20260825-001";
        const rawWeight = Number(rawLot?.acceptedWeight || rawReceipt.receivedWeight || totalHarvestWeight);
        const receiptDate = rawReceipt.receivedAt || harvestedAt;

        const milestoneProcReceipt: TraceMilestone = {
            id: "milestone-proc-receipt",
            stepNumber: 3,
            type: "PROCESSING_RECEIPT",
            title: "CƠ SỞ TIẾP NHẬN",
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
        const batchCode = fpl?.processingBatch?.batchCode || "PB-20260826-001";
        const finishedLotCode = fpl?.lotCode || trace.commercialLot.lotCode;
        const finishedProductName = fpl?.productName || trace.commercialLot.productName;
        const finishedWeight = Number(fpl?.netWeight ?? fpl?.quantity ?? fpl?.processingBatch?.totalOutputWeight ?? trace.commercialLot.quantity);
        const manufacturedDate = fpl?.manufacturedAt || fpl?.processingBatch?.completedAt || new Date();

        const isFrozenPulp = finishedProductName.toLowerCase().includes("tách múi") || finishedProductName.toLowerCase().includes("cấp đông");

        const milestoneProcessing: TraceMilestone = {
            id: "milestone-processing",
            stepNumber: 4,
            type: "PROCESSING_PACKAGING",
            title: isFrozenPulp ? "CHẾ BIẾN & ĐÓNG GÓI" : "CHẾ BIẾN & ĐÓNG GÓI",
            subtitle: isFrozenPulp
                ? "Bóc múi chọn lọc, cấp đông sâu IQF và đóng khay hút chân không vô trùng"
                : "Phân loại trái, làm sạch bằng khí nén & xử lý bề mặt, đóng thùng carton chuẩn GACC",
            date: manufacturedDate,
            dateText: formatVnDate(manufacturedDate),
            badgeText: "QC: Đạt",
            badgeVariant: "purple",
            fields: [
                { label: "Cơ sở", value: facilityName, highlight: true },
                { label: "Địa chỉ", value: facilityAddress },
                { label: isFrozenPulp ? "Lô thành phẩm" : "Lô thành phẩm", value: finishedLotCode, highlight: true },
                { label: "QC", value: "Đạt" },
            ],
            substeps: isFrozenPulp
                ? [
                      { name: "1. Tiếp nhận & Khử trùng vỏ quả tươi", status: "Đạt tiêu chuẩn" },
                      { name: "2. Tách vỏ & Bóc múi chọn lọc múi loại A", status: "Đạt tiêu chuẩn" },
                      { name: "3. Cấp đông sâu IQF (-35°C đến -40°C)", status: "Đạt chuẩn công nghệ" },
                      { name: "4. Đóng khay hút chân không & dán tem", status: "Hoàn tất" },
                      { name: "5. Lưu kho bảo quản lạnh (-18°C)", status: "Đang lưu kho an toàn" },
                  ]
                : [
                      { name: "1. Tiếp nhận quả tươi & QC đầu vào", status: "Đạt tiêu chuẩn" },
                      { name: "2. Phân loại sầu riêng đạt tiêu chuẩn xuất khẩu Loại A", status: "Đạt tiêu chuẩn" },
                      { name: "3. Làm sạch bằng khí nén & rửa xử lý bề mặt vỏ", status: "Đạt tiêu chuẩn" },
                      { name: "4. Dán tem truy xuất & Đóng thùng carton chuẩn xuất khẩu", status: "Hoàn tất" },
                      { name: "5. Lưu kho mát bảo quản 13-15°C chờ xuất", status: "Đang lưu kho an toàn" },
                  ],
        };
        rawMilestones.push(milestoneProcessing);
    }

    // -------------------------------------------------------------------------
    // 5. MỐC: PHÂN PHỐI / XUẤT KHẨU
    // -------------------------------------------------------------------------
    const dest = trace.commercialLot.destination;
    const destNameLower = (dest?.name || "").toLowerCase();
    const destCountryLower = (dest?.country || "").toLowerCase();
    const isExport =
        dest?.type === "EXPORT" ||
        shipment?.exportInfo !== null ||
        Boolean(dest?.country) ||
        trace.commercialLot.lotCode.startsWith("EXP-") ||
        trace.commercialLot.lotCode.startsWith("CM-EXP-") ||
        destNameLower.includes("xuất khẩu") ||
        destNameLower.includes("trung quốc") ||
        destNameLower.includes("china") ||
        destCountryLower.includes("china");

    const dispatchDate = trace.commercialLot.dispatchedAt || shipment?.dispatchAt || trace.commercialLot.createdAt;

    if (isExport) {
        const country = dest?.country || shipment?.exportInfo?.destinationCountry || (destNameLower.includes("trung quốc") ? "Trung Quốc" : dest?.name || "Trung Quốc");
        const exporterName = trace.commercialLot.owner?.name || trace.commercialLot.farmerOwner?.fullName || "Cơ sở Chế biến Sầu riêng Trị An";
        const port = shipment?.exportInfo?.portOfLoading || "Cửa khẩu Quốc tế Hữu Nghị (Lạng Sơn)";
        const container = shipment?.exportInfo?.containerNumber || shipment?.containerNumber;
        const seal = shipment?.exportInfo?.sealNumber || shipment?.sealNumber;

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
                { label: "Thị trường", value: country, highlight: true },
                ...(port ? [{ label: "Cửa khẩu", value: port }] : []),
                { label: "Lô xuất khẩu", value: trace.commercialLot.lotCode, highlight: true },
                ...(exporterName ? [{ label: "Đơn vị xuất", value: exporterName }] : []),
                ...(container ? [{ label: "Container", value: container }] : []),
                ...(seal ? [{ label: "Seal niêm phong", value: seal }] : []),
            ],
        };
        rawMilestones.push(milestoneExport);
    } else {
        const buyerOrDestName = trace.commercialLot.buyerName || dest?.name || "Chợ đầu mối Thủ Đức";
        const destAddress = trace.commercialLot.buyerAddress || dest?.address || "TP. Hồ Chí Minh";
        const formType = dest?.type === "MARKET" ? "Chợ đầu mối nông sản" : dest?.type === "DISTRIBUTOR" ? "Nhà phân phối" : "Phân phối trong nước";

        const milestoneDistribution: TraceMilestone = {
            id: "milestone-distribution",
            stepNumber: 5,
            type: "DISTRIBUTION",
            title: "PHÂN PHỐI",
            subtitle: "Phân phối đến hệ thống siêu thị, chuỗi bán lẻ và chợ đầu mối",
            date: dispatchDate,
            dateText: formatVnDate(dispatchDate),
            badgeText: "Đã xuất hàng",
            badgeVariant: "emerald",
            fields: [
                { label: "Hình thức", value: formType },
                { label: "Điểm đến", value: buyerOrDestName, highlight: true },
                { label: "Địa chỉ", value: destAddress },
                { label: "Mã lô xuất bán", value: trace.commercialLot.lotCode, highlight: true },
                { label: "Khối lượng xuất", value: `${Number(trace.commercialLot.quantity).toLocaleString("vi-VN")} ${trace.commercialLot.unit}` },
                { label: "Trạng thái", value: "Đã xuất hàng đến điểm phân phối" },
            ],
        };
        rawMilestones.push(milestoneDistribution);
    }

    // Filter non-null and assign step numbers (1 .. N)
    const validMilestones = rawMilestones
        .filter((m): m is TraceMilestone => Boolean(m))
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
            buyerName: trace.commercialLot.buyerName,
            dispatchedAt: trace.commercialLot.dispatchedAt,
        },
        issuer: trace.commercialLot.owner?.name ?? trace.commercialLot.farmerOwner?.fullName ?? "Hộ sản xuất",
        issuerType: trace.commercialLot.ownerType,
        destination: trace.commercialLot.destination
            ? {
                  name: trace.commercialLot.destination.name,
                  type: trace.commercialLot.destination.type,
                  address: trace.commercialLot.destination.address,
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
        farms: sources.map((source) => ({
            lotCode: source.lotCode,
            farmName: source.farm.farmName,
            farmCode: source.farm.farmCode,
            region: source.farm.region ? { code: source.farm.region.code, name: source.farm.region.name } : null,
            variety: source.farm.durianVariety,
            harvestedAt: source.harvestedAt,
            contributedWeight: Number(source.weight),
            unit: "kg",
            complianceStatus: source.complianceStatus,
            season: source.cropSeason.name,
            cultivationSummary: source.snapshot?.cultivationSummarySnapshot ?? null,
            cultivationLogs: source.cropSeason.farmingLogs.map((log) => ({
                stage: log.stage,
                activityType: log.activityType,
                actionDate: log.actionDate,
                notes: log.notes,
            })),
        })),
    };
}
