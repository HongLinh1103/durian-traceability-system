import type { Prisma, ActivityType, GrowthStage } from "@prisma/client";
import { lockFarmerStock, rebuildMaterialFifo } from "@/lib/farmer-material-fifo";
import { selfOwnedMaterial, allowsSelfOwnedMaterials } from "@/lib/self-owned-materials";
import { formatMaterialDosage } from "@/lib/material-dosage";
import { supplyPackaging } from "@/lib/supply-packaging";

export function materialSummary(materials: Array<{ supplyName: string; quantity: number; unit: string; dosage?: string | null; appliedArea?: number | null; selfOwned?: boolean }>, farm?: { areaSize: number; areaUnit?: string }) {
    return {
        chemicalName: materials.map(m => m.supplyName).join(" + "),
        dosage: materials.map(m => m.dosage || formatMaterialDosage(m.quantity, m.unit, farm ? { ...farm, areaSize: m.appliedArea ?? farm.areaSize } : farm, m.selfOwned ?? m.unit === "")).join(" + "),
    };
}

export async function removeLogStock(tx: Prisma.TransactionClient, logId: string, rebuild = true) {
    const log = await tx.farmingLog.findUniqueOrThrow({ where: { id: logId }, include: { farm: true } });
    await lockFarmerStock(tx, log.farm.farmerId);
    await tx.$queryRaw`SELECT id FROM "FarmingLog" WHERE id = ${logId} FOR UPDATE`;
    const removed = await tx.farmerSupplyTransaction.deleteMany({ where: { farmingLogId: logId } });
    await tx.farmingLogMaterial.deleteMany({ where: { farmingLogId: logId } });
    if (rebuild) await rebuildMaterialFifo(tx, log.farm.farmerId);
    return removed.count;
}

export async function updateLogStock(tx: Prisma.TransactionClient, input: {
    logId: string; farmerId: string; actionDate: Date; stage: GrowthStage; activityType: ActivityType;
    quantities?: Array<{ transactionId: string; quantity: number; content?: string }>;
}) {
    await lockFarmerStock(tx, input.farmerId);
    const movements = await tx.farmerSupplyTransaction.findMany({ where: { farmingLogId: input.logId, type: "OUT" }, include: { supply: { include: { productBatch: true } } } });
    const supplied = input.quantities || [];
    if (new Set(supplied.map(q => q.transactionId)).size !== supplied.length || supplied.some(q => !movements.some(t => t.id === q.transactionId) || !Number.isFinite(q.quantity) || q.quantity <= 0)) throw new Error("Số lượng hoặc phiếu xuất liên kết không hợp lệ");
    for (const supplyId of [...new Set(movements.map(m => m.supplyId))].sort()) {
        await tx.$queryRaw`SELECT id FROM farmer_supplies WHERE id = ${supplyId} FOR UPDATE`;
    }
    const revised = movements.map(m => ({ ...m, quantity: supplied.find(q => q.transactionId === m.id)?.quantity ?? m.quantity, actionDate: input.actionDate }));
    const log = await tx.farmingLog.findUniqueOrThrow({ where: { id: input.logId }, include: { farm: true } });
    for (const m of revised) {
        if (m.farmerId !== input.farmerId || m.supply.farmerId !== input.farmerId) throw new Error("Vật tư không thuộc chủ nhật ký");
        await tx.farmerSupplyTransaction.update({ where: { id: m.id }, data: { quantity: m.quantity, totalAmount: Number(m.unitPrice) * m.quantity, actionDate: input.actionDate, stage: input.stage, activityType: input.activityType, notes: supplied.find(q => q.transactionId === m.id)?.content } });
        // Each linked export has exactly one material snapshot in the journal.
        const existing = await tx.farmingLogMaterial.findFirst({ where: { farmingLogId: input.logId, transactionId: m.id } });
        const unit = existing?.unit || supplyPackaging(m.supply.unit, m.supply.packaging, 0).unit;
        const dosageFarm = { ...log.farm, areaSize: existing?.appliedArea ?? log.farm.areaSize };
        const previousAutoDosage = existing ? formatMaterialDosage(existing.quantity, unit, dosageFarm) : null;
        const dosage = existing?.dosage && existing.dosage !== previousAutoDosage ? existing.dosage : formatMaterialDosage(m.quantity, unit, dosageFarm);
        const data = { quantity: m.quantity, unitPrice: m.unitPrice, totalCost: Number(m.unitPrice) * m.quantity, dosage, content: supplied.find(q => q.transactionId === m.id)?.content ?? existing?.content };
        if (existing) await tx.farmingLogMaterial.update({ where: { id: existing.id }, data });
        else await tx.farmingLogMaterial.create({ data: { ...data, farmingLogId: input.logId, supplyId: m.supplyId, supplyName: m.supply.name, supplyType: m.supply.type, unit: m.supply.unit, transactionId: m.id } });
    }
    await rebuildMaterialFifo(tx, input.farmerId, revised.map(m => m.id));
    const snapshots = await tx.farmingLogMaterial.findMany({ where: { farmingLogId: input.logId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
    return snapshots.length ? materialSummary(snapshots, log.farm) : null;
}

export type LogMaterialInput = { supplyId: string; quantity: number; content: string; dosage?: string; phiDays?: number | null; appliedArea?: number | null };
export function isValidLogMaterial(m: any) {
    return !!m && typeof m.supplyId === "string" && !!m.supplyId.trim()
        && (selfOwnedMaterial(m.supplyId) ? !!selfOwnedMaterial(m.supplyId)?.name : Number.isFinite(m.quantity) && m.quantity > 0)
        && typeof m.content === "string" && !!m.content.trim()
        && (m.appliedArea == null || Number.isFinite(m.appliedArea) && m.appliedArea > 0)
        && (m.dosage == null || typeof m.dosage === "string" && !!m.dosage.trim() && m.dosage.trim().length <= 500)
        && (m.phiDays == null || Number.isInteger(m.phiDays) && m.phiDays >= 0);
}
export async function createLogMaterials(tx: Prisma.TransactionClient, input: { logId: string; farmerId: string; farmId: string; cropSeasonId: string; actionDate: Date; stage: GrowthStage; activityType: ActivityType; materials: LogMaterialInput[]; rebuildStock?: boolean }) {
    await lockFarmerStock(tx, input.farmerId);
    const snapshots: Array<{ supplyName: string; quantity: number; unit: string; dosage: string }> = [];
    const farm = await tx.farm.findUniqueOrThrow({ where: { id: input.farmId } });
    const movementIds: string[] = [];
    for (const m of input.materials) {
        if (!isValidLogMaterial(m)) throw new Error("Vật tư, số lượng, diện tích hoặc nội dung sử dụng không hợp lệ");
        const appliedArea = m.appliedArea ?? farm.areaSize;
        if (appliedArea <= 0 || appliedArea > farm.areaSize) throw new Error("Diện tích áp dụng phải lớn hơn 0 và không vượt diện tích vườn");
        const own = selfOwnedMaterial(m.supplyId);
        if (own) {
            if (!allowsSelfOwnedMaterials(input.activityType)) throw new Error("Vật tư tự có chỉ dùng cho hoạt động bón phân");
            const dosage = m.dosage?.trim() || formatMaterialDosage(0, "", { ...farm, areaSize: appliedArea }, true);
            await tx.farmingLogMaterial.create({ data: { farmingLogId: input.logId, supplyName: own.name, supplyType: own.type, quantity: 0, unit: "", content: m.content.trim(), appliedArea, dosage, unitPrice: 0, totalCost: 0 } });
            snapshots.push({ supplyName: own.name, quantity: 0, unit: "", dosage });
            continue;
        }
        const supply = await tx.farmerSupply.findFirst({ where: { id: m.supplyId, farmerId: input.farmerId } });
        if (!supply) throw new Error("Vật tư không thuộc kho của bạn");
        const movement = await tx.farmerSupplyTransaction.create({ data: { supplyId: supply.id, farmerId: input.farmerId, farmId: input.farmId, cropSeasonId: input.cropSeasonId, farmingLogId: input.logId, type: "OUT", quantity: m.quantity, unitPrice: 0, totalAmount: 0, exportPurpose: "CULTIVATION", purpose: "Phục vụ canh tác", notes: m.content.trim(), actionDate: input.actionDate, stage: input.stage, activityType: input.activityType } });
        movementIds.push(movement.id);
        const unit = supplyPackaging(supply.unit, supply.packaging, 0).unit;
        const dosage = m.dosage?.trim() || formatMaterialDosage(m.quantity, unit, { ...farm, areaSize: appliedArea });
        await tx.farmingLogMaterial.create({ data: { farmingLogId: input.logId, supplyId: supply.id, supplyName: supply.name, supplyType: supply.type, quantity: m.quantity, unit, transactionId: movement.id, content: m.content.trim(), appliedArea, dosage, phiDays: input.activityType === "SPRAY_PESTICIDE" ? m.phiDays ?? null : null } });
        snapshots.push({ supplyName: supply.name, quantity: m.quantity, unit, dosage });
    }
    if (movementIds.length || input.rebuildStock) await rebuildMaterialFifo(tx, input.farmerId, movementIds);
    return materialSummary(snapshots, farm);
}
