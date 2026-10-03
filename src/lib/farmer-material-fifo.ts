import type { Prisma } from "@prisma/client";
import { allocateFifo, materialKey } from "@/lib/material-fifo";

// Every inventory writer takes the same farmer lock before reading or changing stock.
export async function lockFarmerStock(tx: Prisma.TransactionClient, farmerId: string) {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${farmerId} FOR UPDATE`;
}
export async function rebuildMaterialFifo(tx: Prisma.TransactionClient, farmerId: string, validateMovementIds: string[] = []) {
    await lockFarmerStock(tx, farmerId);
    const supplies = await tx.farmerSupply.findMany({ where: { farmerId }, include: { productBatch: true, transactions: true, orderItem: { select: { product: { select: { packaging: true } } } } } });
    const groups = new Map<string, typeof supplies>();
    for (const s of supplies) { const key = materialKey(s); groups.set(key, [...(groups.get(key) || []), s]); }
    for (const group of groups.values()) {
        const history = group.flatMap(s => s.transactions);
        const byId = new Map(history.map(t => [t.id, t]));
        const result = allocateFifo(group.flatMap(s => s.transactions.map(t => ({ ...t, unitPrice: Number(t.unitPrice), expiryDate: t.expiryDate ?? s.productBatch?.expiryDate }))));
        for (const s of group) {
            const quantity = Math.round((result.balances.get(s.id) || 0) * 1e6) / 1e6;
            if (quantity !== s.quantity) await tx.farmerSupply.update({ where: { id: s.id }, data: { quantity } });
        }
        for (const [id, value] of result.exports) {
            const movement = byId.get(id)!;
            if (validateMovementIds.includes(id) && movement.exportPurpose !== "DISPOSAL" && value.allocations.some(a => a.expiryDate && movement.actionDate.toISOString().slice(0, 10) > a.expiryDate.slice(0, 10))) throw new Error("Lô vật tư FIFO đã hết hạn tại ngày sử dụng. Hãy xuất hủy vật tư hết hạn trước.");
            const unitPrice = movement.quantity ? value.totalAmount / movement.quantity : 0;
            const saved = movement.fifoAllocations;
            const sameAllocations = Array.isArray(saved) && saved.length === value.allocations.length && saved.every((allocation, index) =>
                allocation && typeof allocation === "object" && !Array.isArray(allocation) && Object.entries(value.allocations[index]).every(([key, entry]) => allocation[key] === entry));
            if (Number(movement.totalAmount) === value.totalAmount && sameAllocations) continue;
            await tx.farmerSupplyTransaction.update({ where: { id }, data: { totalAmount: value.totalAmount, unitPrice, fifoAllocations: value.allocations } });
            await tx.farmingLogMaterial.updateMany({ where: { transactionId: id }, data: { quantity: movement.quantity, totalCost: value.totalAmount, unitPrice } });
        }
    }
}
