import assert from "node:assert/strict";
import { createLogMaterials, updateLogStock, removeLogStock, isValidLogMaterial } from "../src/lib/farming-log-stock";
import { formatMaterialDosage } from "../src/lib/material-dosage";
import { SELF_OWNED_MATERIALS } from "../src/lib/self-owned-materials";
import { rebuildMaterialFifo } from "../src/lib/farmer-material-fifo";
import { materialKey } from "../src/lib/material-fifo";
import { formatMoneyInput, parseMoneyInput, moneyInputFromNumber } from "../src/lib/vietnamese-money-input";

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
    assert.equal(summary.dosage, "25 ha");
    assert.equal(snapshots[0].quantity, 0);
    assert.equal(snapshots[0].unit, "");
    assert.equal(snapshots[0].appliedArea, 25);
    assert.equal(isValidLogMaterial({ supplyId: SELF_OWNED_MATERIALS[0].id, content: "Bón lót", appliedArea: 8.5 }), true);
    assert.equal(isValidLogMaterial({ supplyId: "npk", content: "Bón lót", quantity: 0 }), false);
    assert.equal(isValidLogMaterial({ supplyId: "npk", content: "Bón lót", quantity: 2, appliedArea: -1 }), false);
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
    assert.equal(formatMaterialDosage(0, "", { areaSize: 8.5, areaUnit: "HECTARE" }, true), "8,5 ha");
    await assert.rejects(createLogMaterials(tx, { ...input, materials: [{ ...input.materials[0], appliedArea: 26 }] }), /không vượt/);
    snapshots.length = 0;
    const supply: any = { id: "npk", farmerId: "farmer", name: "NPK", type: "FERTILIZER", unit: "bao", quantity: 10, transactions: [{ id: "receipt", supplyId: "npk", type: "IN", quantity: 10, unitPrice: 100, actionDate: new Date("2020-01-01"), createdAt: new Date("2020-01-01") }] };
    tx.farmerSupply.findFirst = async () => supply;
    tx.farmerSupply.findMany = async () => [supply];
    tx.farmerSupply.update = async ({ data }: any) => Object.assign(supply, data);
    tx.farmerSupplyTransaction.create = async ({ data }: any) => { warehouseWrites++; const movement = { ...data, id: "export", createdAt: new Date() }; supply.transactions.push(movement); return movement; };
    tx.farmerSupplyTransaction.update = async ({ where, data }: any) => Object.assign(supply.transactions.find((t: any) => t.id === where.id), data);
    tx.farmingLogMaterial.updateMany = async ({ where, data }: any) => { snapshots.filter(m => m.transactionId === where.transactionId).forEach(m => Object.assign(m, data)); };
    const mixed = await createLogMaterials(tx, { ...input, materials: [{ supplyId: SELF_OWNED_MATERIALS[0].id, content: "Bón lót", appliedArea: 8.5 }, { supplyId: "npk", quantity: 2, content: "Bón lót", appliedArea: 8.5 }] });
    assert.equal(mixed.chemicalName, "Phân chuồng ủ hoai mục + NPK");
    assert.equal(warehouseWrites, 1);
    assert.equal(supply.quantity, 8);
    assert.equal(snapshots[0].totalCost, 0);
    assert.equal(snapshots[1].totalCost, 200);
    assert.equal(mixed.dosage, "8,5 ha + 2 bao - 8,5 ha");
    assert.equal(snapshots[0].dosage, "8,5 ha");
    assert.equal(snapshots[1].dosage, "2 bao - 8,5 ha");
    tx.farmerSupplyTransaction.findMany = async () => supply.transactions.filter((t: any) => t.type === "OUT").map((t: any) => ({ ...t, supply }));
    tx.farmingLogMaterial.findFirst = async ({ where }: any) => snapshots.find(m => m.transactionId === where.transactionId);
    tx.farmingLogMaterial.update = async ({ data }: any) => Object.assign(snapshots[1], data);
    const adjusted = await updateLogStock(tx, { ...input, quantities: [{ transactionId: "export", quantity: 3 }] });
    assert.equal(snapshots[1].dosage, "3 bao - 8,5 ha");
    assert.equal(snapshots[0].dosage, "8,5 ha");
    assert.equal(adjusted?.dosage, "8,5 ha + 3 bao - 8,5 ha");
    assert.equal(snapshots[1].quantity, 3);
    assert.equal(snapshots[1].totalCost, 300);
    assert.equal(supply.transactions.find((t: any) => t.id === "export").quantity, snapshots[1].quantity);
    snapshots[1].dosage = "1 bao / 200 gốc";
    const custom = await updateLogStock(tx, { ...input, quantities: [{ transactionId: "export", quantity: 4 }] });
    assert.equal(snapshots[1].dosage, "1 bao / 200 gốc");
    assert.equal(snapshots[1].quantity, 4);
    assert.equal(snapshots[1].totalCost, 400);
    assert.equal(custom?.dosage, "8,5 ha + 1 bao / 200 gốc");
    // Unchanged FIFO allocations must still correct an out-of-sync journal snapshot.
    snapshots[1].quantity = 99;
    snapshots[1].totalCost = 99;
    await rebuildMaterialFifo(tx, "farmer");
    assert.equal(snapshots[1].quantity, 4);
    assert.equal(snapshots[1].totalCost, 400);
    const otherSnapshots: any[] = [];
    await createLogMaterials({ ...tx, farmerSupply: { ...tx.farmerSupply, findMany: async () => [] }, farmingLogMaterial: { create: async ({ data }: any) => otherSnapshots.push(data) } }, { ...input, materials: [{ supplyId: SELF_OWNED_MATERIALS[0].id, content: "Bón lót", dosage: "Một phần vườn: 3 ha" }] });
    assert.equal(otherSnapshots[0].dosage, "Một phần vườn: 3 ha");
    assert.equal(isValidLogMaterial({ supplyId: "npk", quantity: 2, content: "Bón lót", dosage: " " }), false);
    assert.equal(formatMoneyInput("1234567,89"), "1.234.567,89");
    assert.equal(parseMoneyInput("1.234.567,89"), 1234567.89);
    assert.equal(moneyInputFromNumber(650000), "650.000");
    assert.equal(Number.isNaN(parseMoneyInput("")), true);
    const product = { name: "NPK", type: "FERTILIZER", unit: "bao" };
    assert.notEqual(materialKey({ ...product, packaging: "25 kg/bao" }), materialKey({ ...product, packaging: "50 kg/bao" }));
    assert.equal(materialKey({ ...product, packaging: "25 kg/bao" }), materialKey({ ...product, unit: "bao 25kg" }));
    tx.farmingLog.findUniqueOrThrow = async () => ({ farm: { ...farm, farmerId: "farmer" } });
    tx.farmerSupplyTransaction.deleteMany = async () => { const count = supply.transactions.filter((t: any) => t.type === "OUT").length; supply.transactions = supply.transactions.filter((t: any) => t.type !== "OUT"); return { count }; };
    tx.farmingLogMaterial.deleteMany = async () => { snapshots.length = 0; return { count: 2 }; };
    const removed = await removeLogStock(tx, "log", false);
    await createLogMaterials(tx, { ...input, rebuildStock: removed > 0 });
    assert.equal(supply.quantity, 10, "Replacing warehouse materials with self-owned materials refunds the stock");
    assert.equal(snapshots.length, 1);
    assert.equal(snapshots[0].transactionId, undefined);
    console.log("Self-owned materials: zero warehouse movements/cost, activity validation, edit preservation, dosage passed.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
