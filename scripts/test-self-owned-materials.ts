import assert from "node:assert/strict";
import { createLogMaterials, updateLogStock } from "../src/lib/farming-log-stock";
import { formatMaterialDosage } from "../src/lib/material-dosage";
import { SELF_OWNED_MATERIALS } from "../src/lib/self-owned-materials";

async function main() {
    const snapshots: any[] = [];
    const farm = { areaSize: 25, areaUnit: "HECTARE" };
    let warehouseWrites = 0;
    const tx: any = {
        $queryRaw: async () => [],
        farm: { findUniqueOrThrow: async () => farm },
        farmingLog: { findUniqueOrThrow: async () => ({ farm }) },
        farmerSupply: { findFirst: async () => { throw new Error("Unexpected warehouse lookup"); }, findMany: async () => [] },
        farmerSupplyTransaction: { create: async () => { warehouseWrites++; }, findMany: async () => [] },
        farmingLogMaterial: { create: async ({ data }: any) => { snapshots.push(data); return data; }, findMany: async () => snapshots },
    };
    const input: any = { logId: "log", farmerId: "farmer", farmId: "farm", cropSeasonId: "season", actionDate: new Date(), stage: "FRUIT_DEVELOPMENT", activityType: "BASE_FERTILIZING", materials: [{ supplyId: SELF_OWNED_MATERIALS[0].id, quantity: 5, content: "Bón phân tự có" }] };
    const summary = await createLogMaterials(tx, input);
    assert.equal(summary.chemicalName, "Phân chuồng ủ hoai mục");
    assert.equal(summary.dosage, "5 kg - 25 ha");
    assert.equal(snapshots[0].totalCost, 0);
    assert.equal(snapshots[0].unitPrice, 0);
    assert.equal(snapshots[0].supplyId, undefined);
    assert.equal(snapshots[0].transactionId, undefined);
    assert.equal(warehouseWrites, 0);
    await assert.rejects(createLogMaterials(tx, { ...input, activityType: "SPRAY_PESTICIDE" }), /chỉ dùng/);
    assert.equal(snapshots.length, 1);
    const edited = await updateLogStock(tx, { ...input, quantities: [] });
    assert.deepEqual(edited, summary);
    assert.equal(formatMaterialDosage(5, "bao", farm), "5 bao - 25 ha");
    assert.equal(formatMaterialDosage(2, "kg", { areaSize: 1000, areaUnit: "SQUARE_METER" }), "2 kg - 1.000 m²");
    snapshots.length = 0;
    const supply: any = { id: "npk", farmerId: "farmer", name: "NPK", type: "FERTILIZER", unit: "bao", quantity: 10, transactions: [{ id: "receipt", supplyId: "npk", type: "IN", quantity: 10, unitPrice: 100, actionDate: new Date("2020-01-01"), createdAt: new Date("2020-01-01") }] };
    tx.farmerSupply.findFirst = async () => supply;
    tx.farmerSupply.findMany = async () => [supply];
    tx.farmerSupply.update = async ({ data }: any) => Object.assign(supply, data);
    tx.farmerSupplyTransaction.create = async ({ data }: any) => { warehouseWrites++; const movement = { ...data, id: "export", createdAt: new Date() }; supply.transactions.push(movement); return movement; };
    tx.farmerSupplyTransaction.update = async () => {};
    tx.farmingLogMaterial.updateMany = async ({ where, data }: any) => { snapshots.filter(m => m.transactionId === where.transactionId).forEach(m => Object.assign(m, data)); };
    const mixed = await createLogMaterials(tx, { ...input, materials: [...input.materials, { supplyId: "npk", quantity: 2, content: "Bón NPK" }] });
    assert.equal(mixed.chemicalName, "Phân chuồng ủ hoai mục + NPK");
    assert.equal(warehouseWrites, 1);
    assert.equal(supply.quantity, 8);
    assert.equal(snapshots[0].totalCost, 0);
    assert.equal(snapshots[1].totalCost, 200);
    console.log("Self-owned materials: zero warehouse movements/cost, activity validation, edit preservation, dosage passed.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
