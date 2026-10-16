import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";
loadEnvConfig(process.cwd(), true);
const db = new PrismaClient();
async function main() {
    const [logs, movements, materials] = await Promise.all([
        db.farmingLog.findMany({ where: { activityType: { in: ["FERTILIZE", "BASE_FERTILIZING", "FOLIAR_FERTILIZING", "SPRAY_PESTICIDE", "PEST_INSPECTION"] } }, select: { id: true, actionDate: true, farmId: true, cropSeasonId: true, chemicalName: true, dosage: true, activityType: true } }),
        db.farmerSupplyTransaction.findMany({ where: { type: "OUT" }, include: { supply: { select: { name: true, unit: true } } } }),
        db.farmingLogMaterial.findMany(),
    ]);
    const linked = materials.filter(m => m.transactionId);
    const mismatch = linked.flatMap(m => {
        const t = movements.find(t => t.id === m.transactionId);
        const l = logs.find(l => l.id === m.farmingLogId);
        const reasons = !t ? ["missing transaction"] : [
            t.farmingLogId !== m.farmingLogId && "log link",
            Math.abs(t.quantity - m.quantity) > 0.000001 && "quantity",
            t.supplyId !== m.supplyId && "supply link",
            t.supply.name !== m.supplyName && "name",
            Math.abs(Number(t.totalAmount) - Number(m.totalCost)) > 0.01 && "cost",
            l && t.actionDate.getTime() !== l.actionDate.getTime() && "date",
            l && (t.farmId !== l.farmId || t.cropSeasonId !== l.cropSeasonId) && "farm/season",
        ].filter(Boolean);
        return reasons.length ? [{ materialId: m.id, logId: m.farmingLogId, name: m.supplyName, reasons }] : [];
    });
    const missingSnapshots = movements.filter(t => t.farmingLogId && !linked.some(m => m.transactionId === t.id));
    const legacyLogs = logs.filter(l => l.chemicalName && !materials.some(m => m.farmingLogId === l.id));
    console.log(JSON.stringify({ logs: logs.length, materials: materials.length, exports: movements.length, linkedExports: movements.filter(t => t.farmingLogId).length, manualExports: movements.filter(t => !t.farmingLogId).length, mismatches: mismatch.length, mismatchDetails: mismatch.slice(0, 20), missingSnapshots: missingSnapshots.length, legacyLogsWithoutMaterials: legacyLogs.length, legacySamples: legacyLogs.slice(0, 8).map(l => ({ id: l.id, name: l.chemicalName, dosage: l.dosage })) }, null, 2));
}
main().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => db.$disconnect());
