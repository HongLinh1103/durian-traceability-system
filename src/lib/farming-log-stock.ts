import type { Prisma, ActivityType, GrowthStage } from "@prisma/client";
import { stockLedger } from "@/lib/farmer-stock-ledger";

export function materialSummary(materials: Array<{ supplyName: string; quantity: number; unit: string }>) {
    return {
        chemicalName: materials.map(m => m.supplyName).join(" + "),
        dosage: materials.map(m => `${m.quantity.toLocaleString("vi-VN", { maximumFractionDigits: 6 })} ${m.unit}`).join(" + "),
    };
}

export async function removeLogStock(tx: Prisma.TransactionClient, logId: string) {
    await tx.$queryRaw`SELECT id FROM "FarmingLog" WHERE id = ${logId} FOR UPDATE`;
    const movements = await tx.farmerSupplyTransaction.findMany({ where: { farmingLogId: logId } });
    const supplyIds = [...new Set(movements.map(m => m.supplyId))].sort();
    for (const supplyId of supplyIds) await tx.$queryRaw`SELECT id FROM farmer_supplies WHERE id = ${supplyId} FOR UPDATE`;
    await tx.farmerSupplyTransaction.deleteMany({ where: { farmingLogId: logId } });
    await tx.farmingLogMaterial.deleteMany({ where: { farmingLogId: logId } });
    for (const supplyId of supplyIds) {
        const history = await tx.farmerSupplyTransaction.findMany({ where: { supplyId } });
        await tx.farmerSupply.update({ where: { id: supplyId }, data: { quantity: stockLedger(history).balance } });
    }
}

export async function updateLogStock(tx: Prisma.TransactionClient, input: {
    logId: string; farmerId: string; actionDate: Date; stage: GrowthStage; activityType: ActivityType;
    quantities?: Array<{ transactionId: string; quantity: number }>;
}) {
    const movements = await tx.farmerSupplyTransaction.findMany({ where: { farmingLogId: input.logId, type: "OUT" }, include: { supply: { include: { productBatch: true } } } });
    const supplied = input.quantities || [];
    if (new Set(supplied.map(q => q.transactionId)).size !== supplied.length || supplied.some(q => !movements.some(t => t.id === q.transactionId) || !Number.isFinite(q.quantity) || q.quantity <= 0)) throw new Error("Số lượng hoặc phiếu xuất liên kết không hợp lệ");
    for (const supplyId of [...new Set(movements.map(m => m.supplyId))].sort()) {
        await tx.$queryRaw`SELECT id FROM farmer_supplies WHERE id = ${supplyId} FOR UPDATE`;
    }
    const revised = movements.map(m => ({ ...m, quantity: supplied.find(q => q.transactionId === m.id)?.quantity ?? m.quantity, actionDate: input.actionDate }));
    for (const supplyId of [...new Set(movements.map(m => m.supplyId))]) {
        const history = await tx.farmerSupplyTransaction.findMany({ where: { supplyId } });
        const revisedHistory = history.map(t => revised.find(r => r.id === t.id) || t);
        const ledger = stockLedger(revisedHistory);
        if (ledger.invalidHistory) throw new Error("Ngày hoặc số lượng sử dụng làm xuất vượt lượng đã nhập. Vui lòng kiểm tra lại kho.");
        await tx.farmerSupply.update({ where: { id: supplyId }, data: { quantity: ledger.balance } });
    }
    for (const m of revised) {
        if (m.farmerId !== input.farmerId || m.supply.farmerId !== input.farmerId) throw new Error("Vật tư không thuộc chủ nhật ký");
        if (m.supply.productBatch?.expiryDate && input.actionDate.toISOString().slice(0, 10) > m.supply.productBatch.expiryDate.toISOString().slice(0, 10)) throw new Error("Vật tư đã hết hạn tại ngày sử dụng");
        await tx.farmerSupplyTransaction.update({ where: { id: m.id }, data: { quantity: m.quantity, totalAmount: Number(m.unitPrice) * m.quantity, actionDate: input.actionDate, stage: input.stage, activityType: input.activityType } });
        // Each linked export has exactly one material snapshot in the journal.
        await tx.farmingLogMaterial.deleteMany({ where: { farmingLogId: input.logId, transactionId: m.id } });
        await tx.farmingLogMaterial.create({ data: { farmingLogId: input.logId, supplyId: m.supplyId, supplyName: m.supply.name, supplyType: m.supply.type, unit: m.supply.unit, quantity: m.quantity, unitPrice: m.unitPrice, totalCost: Number(m.unitPrice) * m.quantity, transactionId: m.id } });
    }
    return revised.length ? materialSummary(revised.map(m => ({ supplyName: m.supply.name, quantity: m.quantity, unit: m.supply.unit }))) : null;
}
