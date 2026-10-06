import type { Prisma, ActivityType, GrowthStage } from "@prisma/client";
import { lockFarmerStock, rebuildMaterialFifo } from "@/lib/farmer-material-fifo";
import { selfOwnedMaterial, allowsSelfOwnedMaterials } from "@/lib/self-owned-materials";
import { formatMaterialDosage } from "@/lib/material-dosage";

export function materialSummary(materials: Array<{ supplyName: string; quantity: number; unit: string }>, farm?: { areaSize: number; areaUnit?: string }) {
    return {
        chemicalName: materials.map(m => m.supplyName).join(" + "),
        dosage: materials.map(m => formatMaterialDosage(m.quantity, m.unit, farm)).join(" + "),
    };
}

export async function removeLogStock(tx: Prisma.TransactionClient, logId: string, rebuild = true) {
    const log = await tx.farmingLog.findUniqueOrThrow({ where: { id: logId }, include: { farm: true } });
    await lockFarmerStock(tx, log.farm.farmerId);
    await tx.$queryRaw`SELECT id FROM "FarmingLog" WHERE id = ${logId} FOR UPDATE`;
    await tx.farmerSupplyTransaction.deleteMany({ where: { farmingLogId: logId } });
    await tx.farmingLogMaterial.deleteMany({ where: { farmingLogId: logId } });
    if (rebuild) await rebuildMaterialFifo(tx, log.farm.farmerId);
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
    for (const m of revised) {
        if (m.farmerId !== input.farmerId || m.supply.farmerId !== input.farmerId) throw new Error("Vật tư không thuộc chủ nhật ký");
        await tx.farmerSupplyTransaction.update({ where: { id: m.id }, data: { quantity: m.quantity, totalAmount: Number(m.unitPrice) * m.quantity, actionDate: input.actionDate, stage: input.stage, activityType: input.activityType, notes: supplied.find(q => q.transactionId === m.id)?.content } });
        // Each linked export has exactly one material snapshot in the journal.
        await tx.farmingLogMaterial.deleteMany({ where: { farmingLogId: input.logId, transactionId: m.id } });
        await tx.farmingLogMaterial.create({ data: { farmingLogId: input.logId, supplyId: m.supplyId, supplyName: m.supply.name, supplyType: m.supply.type, unit: m.supply.unit, quantity: m.quantity, unitPrice: m.unitPrice, totalCost: Number(m.unitPrice) * m.quantity, transactionId: m.id } });
    }
    await rebuildMaterialFifo(tx, input.farmerId, revised.map(m => m.id));
    const snapshots = await tx.farmingLogMaterial.findMany({ where: { farmingLogId: input.logId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
    const log = await tx.farmingLog.findUniqueOrThrow({ where: { id: input.logId }, include: { farm: true } });
    return snapshots.length ? materialSummary(snapshots, log.farm) : null;
}

export type LogMaterialInput = { supplyId: string; quantity: number; content: string; phiDays?: number | null };
export async function createLogMaterials(tx: Prisma.TransactionClient, input: { logId: string; farmerId: string; farmId: string; cropSeasonId: string; actionDate: Date; stage: GrowthStage; activityType: ActivityType; materials: LogMaterialInput[] }) {
    await lockFarmerStock(tx, input.farmerId);
    const snapshots: Array<{ supplyName: string; quantity: number; unit: string }> = [];
    const movementIds: string[] = [];
    for (const m of input.materials) {
        if (!m || !Number.isFinite(m.quantity) || m.quantity <= 0 || !m.content?.trim()) throw new Error("Chọn vật tư, số lượng lớn hơn 0 và nội dung sử dụng");
        const own = selfOwnedMaterial(m.supplyId);
        if (own) {
            if (!allowsSelfOwnedMaterials(input.activityType)) throw new Error("Vật tư tự có chỉ dùng cho hoạt động bón phân");
            await tx.farmingLogMaterial.create({ data: { farmingLogId: input.logId, supplyName: own.name, supplyType: own.type, quantity: m.quantity, unit: own.unit, content: m.content.trim(), unitPrice: 0, totalCost: 0 } });
            snapshots.push({ supplyName: own.name, quantity: m.quantity, unit: own.unit });
            continue;
        }
        const supply = await tx.farmerSupply.findFirst({ where: { id: m.supplyId, farmerId: input.farmerId } });
        if (!supply) throw new Error("Vật tư không thuộc kho của bạn");
        const movement = await tx.farmerSupplyTransaction.create({ data: { supplyId: supply.id, farmerId: input.farmerId, farmId: input.farmId, cropSeasonId: input.cropSeasonId, farmingLogId: input.logId, type: "OUT", quantity: m.quantity, unitPrice: 0, totalAmount: 0, exportPurpose: "CULTIVATION", purpose: "Phục vụ canh tác", notes: m.content.trim(), actionDate: input.actionDate, stage: input.stage, activityType: input.activityType } });
        movementIds.push(movement.id);
        await tx.farmingLogMaterial.create({ data: { farmingLogId: input.logId, supplyId: supply.id, supplyName: supply.name, supplyType: supply.type, quantity: m.quantity, unit: supply.unit, transactionId: movement.id, content: m.content.trim(), phiDays: input.activityType === "SPRAY_PESTICIDE" ? m.phiDays ?? null : null } });
        snapshots.push({ supplyName: supply.name, quantity: m.quantity, unit: supply.unit });
    }
    if (movementIds.length) await rebuildMaterialFifo(tx, input.farmerId, movementIds);
    const farm = await tx.farm.findUniqueOrThrow({ where: { id: input.farmId } });
    return materialSummary(snapshots, farm);
}
