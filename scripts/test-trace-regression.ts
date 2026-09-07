import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { prisma } from "../src/lib/prisma";
import { getPublicTrace } from "../src/lib/traceability";
import { encodePreviewPayload, getPreviewTrace, savePreviewTrace, PreviewTraceData } from "../src/lib/trace-preview";

// Replace DB delegates with fixtures: no production reads or writes.
async function main() {
    const date = new Date("2026-09-05T00:00:00.000Z");
    const preview: PreviewTraceData = {
        shipmentCode: "EXP-REGRESSION", shipmentType: "EXPORT",
        productName: "Sầu riêng kiểm thử", weight: 786, boxCount: 44,
        packaging: "3 trái/thùng", lotCode: "FP-REGRESSION",
        exportDate: "2026-09-05", destinationCountry: "Trung Quốc",
        portOfDestination: "Bằng Tường, Quảng Tây", containerNumber: "TGHU1234567",
        updatedAt: date.getTime(),
    };
    const payload = encodePreviewPayload(preview);
    const db = prisma as any;
    db.traceabilityCode.findFirst = async () => null;
    db.commercialLot.findUnique = async () => null;
    db.finishedProductLot.findUnique = async () => null;
    assert.equal(await getPublicTrace("DOES-NOT-EXIST"), null);
    assert.equal(await getPublicTrace("EXP-REGRESSION", "invalid"), null);
    assert.equal(await getPublicTrace("ANOTHER-LOT", payload), null);
    assert.equal(getPreviewTrace(preview.shipmentCode, encodePreviewPayload({ ...preview, weight: -1 })), undefined);
    savePreviewTrace(preview);
    assert.equal(await getPublicTrace(preview.shipmentCode), null, "Process memory cannot publish a QR");

    const trace = await getPublicTrace(preview.shipmentCode, payload);
    assert(trace);
    const field = (result: any, type: string, label: string) => result.milestones
        .find((m: any) => m.type === type)?.fields.find((f: any) => f.label === label)?.value;
    assert.equal(field(trace, "EXPORT", "Khối lượng xuất"), "786 kg");
    assert.equal(field(trace, "EXPORT", "Số thùng"), "44 thùng");
    assert.equal(field(trace, "EXPORT", "Số Container"), "TGHU1234567");
    assert.equal(field(trace, "PROCESSING_PACKAGING", "Quy cách đóng gói"), "3 trái/thùng");
    assert.equal(new Date(trace.shipment!.dispatchAt).toISOString(), date.toISOString());
    assert(!JSON.stringify(trace).includes("FP-FRESH-20260830-001"));
    assert(!JSON.stringify(trace).includes("TEMU-882910-2"));
    const withoutBoxes = await getPublicTrace(preview.shipmentCode, encodePreviewPayload({ ...preview, boxCount: undefined }));
    assert.equal(field(withoutBoxes, "EXPORT", "Số thùng"), "Chưa cập nhật");
    const domestic = await getPublicTrace(preview.shipmentCode, encodePreviewPayload({ ...preview, shipmentType: "DOMESTIC" }));
    assert.equal(field(domestic, "DISTRIBUTION", "Số thùng"), "44 thùng");

    const finishedLot = { lotCode: "FP-DATABASE", productName: preview.productName,
        packaging: "4 trái/thùng", quantity: 1000, netWeight: 1000, manufacturedAt: date };
    db.traceabilityCode.findFirst = async () => ({
        status: "ACTIVE", code: "TRC-PERSISTED", publicToken: "TRC-PERSISTED", issuedAt: date,
        commercialLotId: "commercial-1",
        commercialLot: {
            lotCode: preview.shipmentCode, productName: preview.productName, quantity: 786, unit: "kg",
            status: "QR_ISSUED", ownerType: "PROCESSING_FACILITY", createdAt: date, dispatchedAt: date,
            owner: { name: "Cơ sở kiểm thử" }, sourceFinishedProductLot: finishedLot,
            destination: { name: "Bằng Tường", type: "EXPORT", country: "Trung Quốc" },
            shipmentItems: [{ shipment: {
                shipmentCode: preview.shipmentCode, dispatchedWeight: 786, boxCount: 44, dispatchAt: date,
                status: "DISPATCHED", note: JSON.stringify({ carrierName: "Vận tải kiểm thử" }),
                exportInfo: { destinationCountry: "Trung Quốc", portOfDestination: "Bằng Tường", containerNumber: "TGHU1234567" },
            } }],
        },
    });
    const saved = await getPublicTrace(preview.shipmentCode, encodePreviewPayload({ ...preview, weight: 3100, boxCount: 999 }));
    assert(saved);
    assert.equal(saved.publicToken, "TRC-PERSISTED");
    assert.equal(field(saved, "EXPORT", "Khối lượng xuất"), "786 kg", "Saved data must override stale query data");
    assert.equal(field(saved, "EXPORT", "Số thùng"), "44 thùng");
    assert.equal(field(saved, "PROCESSING_PACKAGING", "Quy cách đóng gói"), "4 trái/thùng");
    assert.equal(field(saved, "EXPORT", "Đơn vị vận chuyển"), "Vận tải kiểm thử");
    assert.deepEqual(saved.farms, [], "No unrelated farm may be invented");

    db.traceabilityCode.findFirst = async () => { throw new Error("Simulated DB outage"); };
    const originalError = console.error;
    console.error = () => {};
    try {
        await assert.rejects(() => getPublicTrace(preview.shipmentCode, payload), /Simulated DB outage/);
    } finally { console.error = originalError; }
    // Execute the real POST handler with isolated authentication/DB adapters.
    const writes: Record<string, any> = {};
    let sourceLot: any = { id: "finished-1", facilityId: "facility-1", status: "AVAILABLE", remainingWeight: 1000 };
    const tx: any = {};
    for (const model of ["commercialLot", "shipment", "shipmentItem", "exportShipmentInfo", "lotRelation", "traceabilityCode", "traceEvent"]) {
        tx[model] = { create: async ({ data }: any) => { writes[model] = data; return { id: `${model}-1`, ...data }; } };
    }
    tx.finishedProductLot = { update: async ({ data }: any) => { writes.remaining = data; } };
    const fakeDb = {
        partnerFacility: { findFirst: async () => ({ id: "facility-1" }) },
        finishedProductLot: { findUnique: async () => sourceLot, findFirst: async () => null },
        distributionDestination: { findFirst: async () => ({ id: "destination-1" }) },
        $transaction: async (callback: any) => callback(tx),
    };
    const requireLocal = createRequire(resolve("package.json"));
    const routeExports: any = {};
    const source = readFileSync(resolve("src/app/api/processing/shipments/route.ts"), "utf8");
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    runInNewContext(compiled, {
        exports: routeExports, console,
        require: (name: string) => {
            if (name === "next-auth") return { getServerSession: async () => ({ user: { id: "user-1", role: "PROCESSING_FACILITY" } }) };
            if (name === "@/lib/auth") return { authOptions: {} };
            if (name === "@/lib/prisma") return { prisma: fakeDb };
            return requireLocal(name);
        },
    });
    const request = () => new Request("http://localhost/api/processing/shipments", {
        method: "POST", body: JSON.stringify({ ...preview, finishedProductLotId: "finished-1", status: "DISPATCHED" }),
    });
    const response = await routeExports.POST(request());
    assert.equal(response.status, 201);
    assert.equal(writes.shipment.dispatchedWeight, 786);
    assert.equal(writes.shipment.boxCount, 44);
    assert.equal(writes.exportShipmentInfo.containerNumber, "TGHU1234567");
    assert.equal(writes.commercialLot.sourceFinishedProductLotId, "finished-1");
    assert.equal(writes.remaining.remainingWeight, 214);
    assert.equal((await response.json()).data.traceCode.publicToken, writes.traceabilityCode.publicToken);
    sourceLot = null;
    assert.equal((await routeExports.POST(request())).status, 404, "Missing source must not create a replacement lot");
    sourceLot = { id: "finished-1", facilityId: "another-facility" };
    assert.equal((await routeExports.POST(request())).status, 404);
    console.log("Trace regression checks passed: shipment persistence, source validation, saved data, preview, unknown QR, stale payload, memory loss, and DB outage.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
