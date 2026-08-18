import { HarvestStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ProcessingHarvestSource = {
    id: string;
    code: string;
    status: HarvestStatus;
    expectedHarvestDate: Date;
    expectedWeight: number;
    weightUnit: string;
    durianVariety: string;
    farmName: string;
    farmCode: string;
    farmAddress: string;
    supplierName: string;
    supplierPhone: string;
    createdAt: Date;
};

export type RawMaterialLotStatus = "WAITING_INSPECTION" | "ACCEPTED" | "REJECTED" | "STORED" | "IN_PROCESSING" | "CLOSED";

export type RawMaterialLot = {
    id: string;
    code: string;
    sourceHarvestId: string;
    sourceCode: string;
    sourceType: "FARMER" | "COLLECTOR";
    supplierName: string;
    supplierPhone: string;
    farmName: string;
    durianVariety: string;
    receivedAt: Date;
    sentWeight: number;
    actualReceivedWeight: number;
    qualityResult: "PASS" | "CONDITIONAL" | "FAIL";
    status: RawMaterialLotStatus;
    storageLocation: string;
    inspectorName: string;
    note: string;
};

export type ProcessingLotStatus = "PREPARING" | "IN_PROGRESS" | "PAUSED" | "COMPLETED" | "CANCELLED";

export type ProcessingLot = {
    id: string;
    code: string;
    rawMaterialLotCodes: string[];
    method: string;
    startedAt: Date;
    finishedAt: Date | null;
    inputWeight: number;
    outputWeight: number;
    lossRate: number;
    supervisor: string;
    status: ProcessingLotStatus;
    note: string;
};

export type FinishedProductLot = {
    id: string;
    code: string;
    productName: string;
    productType: string;
    sourceProcessingLotCode: string;
    producedAt: Date;
    expiresAt: Date | null;
    packageSpec: string;
    quantity: number;
    totalWeight: number;
    unit: string;
    storageCondition: string;
    qrIssued: boolean;
    dispatchStatus: "PENDING" | "IN_TRANSIT" | "RECEIVED" | "COMPLETED" | "CANCELLED";
};

export async function getProcessingHarvestSources(userId: string): Promise<ProcessingHarvestSource[]> {
    const rows = await prisma.harvestRecord.findMany({
        where: { buyerUserId: userId },
        include: {
            farm: { select: { farmName: true, farmCode: true, address: true } },
            farmer: { select: { fullName: true, phone: true } },
        },
        orderBy: { createdAt: "desc" },
    });

    return rows.map((row) => ({
        id: row.id,
        code: row.code,
        status: row.status,
        expectedHarvestDate: row.expectedHarvestDate,
        expectedWeight: Number(row.expectedWeight),
        weightUnit: row.weightUnit,
        durianVariety: row.durianVariety,
        farmName: row.farm.farmName,
        farmCode: row.farm.farmCode,
        farmAddress: row.farm.address,
        supplierName: row.farmer.fullName || row.farmer.phone,
        supplierPhone: row.farmer.phone,
        createdAt: row.createdAt,
    }));
}

function mapHarvestStatusToRawMaterialStatus(status: HarvestStatus): RawMaterialLotStatus {
    if (["WAITING_CONFIRMATION", "CONFIRMED"].includes(status)) return "WAITING_INSPECTION";
    if (["REJECTED", "CANCELLED"].includes(status)) return "REJECTED";
    if (["HARVESTING", "HARVESTED", "DELIVERY_CONFIRMED"].includes(status)) return "ACCEPTED";
    if (status === "COMPLETED") return "STORED";
    return "WAITING_INSPECTION";
}

function qualityFromStatus(status: RawMaterialLotStatus): "PASS" | "CONDITIONAL" | "FAIL" {
    if (status === "REJECTED") return "FAIL";
    if (status === "WAITING_INSPECTION") return "CONDITIONAL";
    return "PASS";
}

export function buildRawMaterialLots(sources: ProcessingHarvestSource[]): RawMaterialLot[] {
    return sources.map((source, index) => {
        const status = mapHarvestStatusToRawMaterialStatus(source.status);
        const actualReceivedWeight = Number((source.expectedWeight * (status === "REJECTED" ? 0 : 0.98)).toFixed(2));
        return {
            id: `raw-${source.id}`,
            code: `RM-${source.code}`,
            sourceHarvestId: source.id,
            sourceCode: source.code,
            sourceType: "FARMER",
            supplierName: source.supplierName,
            supplierPhone: source.supplierPhone,
            farmName: source.farmName,
            durianVariety: source.durianVariety,
            receivedAt: source.expectedHarvestDate,
            sentWeight: source.expectedWeight,
            actualReceivedWeight,
            qualityResult: qualityFromStatus(status),
            status,
            storageLocation: `Kho NL-A${(index % 4) + 1}`,
            inspectorName: "Tổ QC cơ sở",
            note: status === "WAITING_INSPECTION" ? "Đang chờ kiểm tra đầu vào." : "Đã ghi nhận theo phiếu nguồn.",
        };
    });
}

export function buildProcessingLots(rawLots: RawMaterialLot[]): ProcessingLot[] {
    const candidates = rawLots.filter((lot) => ["ACCEPTED", "STORED", "IN_PROCESSING"].includes(lot.status));
    return candidates.slice(0, 12).map((lot, index) => {
        const inputWeight = lot.actualReceivedWeight;
        const status: ProcessingLotStatus = index % 4 === 0 ? "IN_PROGRESS" : index % 5 === 0 ? "PAUSED" : "COMPLETED";
        const outputWeight = Number((inputWeight * (status === "COMPLETED" ? 0.74 : 0.68)).toFixed(2));
        return {
            id: `pl-${lot.id}`,
            code: `PL-${lot.code}`,
            rawMaterialLotCodes: [lot.code],
            method: ["Nguyên trái", "Tách múi", "Cấp đông", "Đông lạnh", "Sấy", "Đóng gói"][index % 6],
            startedAt: lot.receivedAt,
            finishedAt: status === "COMPLETED" ? new Date(lot.receivedAt.getTime() + 8 * 60 * 60 * 1000) : null,
            inputWeight,
            outputWeight,
            lossRate: Number((((inputWeight - outputWeight) / Math.max(inputWeight, 1)) * 100).toFixed(2)),
            supervisor: "Tổ trưởng ca chế biến",
            status,
            note: "Dữ liệu mẻ chế biến MVP, giữ lineage từ lô nguyên liệu nguồn.",
        };
    });
}

export function buildFinishedProductLots(processingLots: ProcessingLot[]): FinishedProductLot[] {
    return processingLots
        .filter((lot) => lot.status === "COMPLETED")
        .map((lot, index) => {
            const quantity = Math.max(1, Math.round((lot.outputWeight * 1000) / 500));
            return {
                id: `fp-${lot.id}`,
                code: `TV-FP-${lot.code.replace("PL-RM-TH-", "")}`,
                productName: "Sầu riêng Dona tách múi cấp đông",
                productType: lot.method,
                sourceProcessingLotCode: lot.code,
                producedAt: lot.finishedAt || lot.startedAt,
                expiresAt: lot.finishedAt ? new Date(lot.finishedAt.getTime() + 180 * 24 * 60 * 60 * 1000) : null,
                packageSpec: "500g/hộp",
                quantity,
                totalWeight: Number((quantity * 0.5).toFixed(2)),
                unit: "kg",
                storageCondition: "Âm 18°C",
                qrIssued: index % 3 !== 0,
                dispatchStatus: index % 4 === 0 ? "PENDING" : index % 4 === 1 ? "IN_TRANSIT" : "COMPLETED",
            };
        });
}

export function formatStatusLabel(status: RawMaterialLotStatus | ProcessingLotStatus | string): string {
    const labels: Record<string, string> = {
        WAITING_INSPECTION: "Chờ kiểm tra",
        ACCEPTED: "Đạt",
        REJECTED: "Không đạt",
        STORED: "Đang lưu",
        IN_PROCESSING: "Đã đưa vào chế biến",
        CLOSED: "Đã đóng lô",
        PREPARING: "Chuẩn bị",
        IN_PROGRESS: "Đang chế biến",
        PAUSED: "Tạm dừng",
        COMPLETED: "Hoàn tất",
        CANCELLED: "Hủy",
        PENDING: "Chờ giao",
        IN_TRANSIT: "Đang giao",
        RECEIVED: "Đã nhận",
    };
    return labels[status] || status;
}
