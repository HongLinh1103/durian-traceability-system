import assert from "node:assert/strict";
import { prisma } from "@/lib/prisma";
import { getPublicTrace, validateTraceability } from "@/lib/traceability";

const activeTokens = ["TV-FARMER-DIRECT-DEMO", "TV-FARMER-PARTIAL-DEMO", "TV-COLLECTOR-RETAIL-DEMO", "TV-PROCESS-RETAIL-DEMO", "TV-RETAIL-DEMO", "TV-PROCESS-DEMO", "TV-EXPORT-DEMO", "TV-COLLECTOR-EXPORT-DEMO"];

async function main() {
    for (const token of activeTokens) {
        const trace = await getPublicTrace(token);
        assert(trace, `${token} must exist`);
        assert.equal(trace.qrStatus, "ACTIVE", `${token} must be active`);
        assert((trace.milestones || []).length > 0, `${token} must have milestones`);
        assert(trace.timeline.every((event: any, index: number, rows: any[]) => index === 0 || rows[index - 1].eventTime >= event.eventTime), `${token} timeline must use eventTime DESC`);
        const publicJson = JSON.stringify(trace).toLowerCase();
        for (const privateField of ["phone", "email", "identitynumber", "agreedprice", "purchaseprice"])
            assert(!publicJson.includes(`\"${privateField}\"`), `public response leaked ${privateField}`);
    }
    assert.equal((await getPublicTrace("TV-SUSPENDED-DEMO"))?.qrStatus, "SUSPENDED");
    assert.equal((await getPublicTrace("TV-REVOKED-DEMO"))?.qrStatus, "REVOKED");
    assert.equal(await getPublicTrace("DOES-NOT-EXIST"), null);
    const partial = await prisma.harvestLot.findUnique({ where: { lotCode: "HL-PARTIAL-001" }, include: { commercialLots: true, procurementOrders: true } });
    assert(partial, "partial-sale harvest lot must exist");
    assert.equal(Number(partial.remainingWeight), 150, "partial-sale remaining quantity must be 150kg");
    assert.equal(partial.commercialLots.reduce((sum, lot) => sum + Number(lot.quantity), 0), 150);
    assert.equal(partial.procurementOrders.reduce((sum, order) => sum + Number(order.agreedWeight ?? 0), 0), 200);
    const blocked = await prisma.commercialLot.findUnique({ where: { lotCode: "TV-NO-QR-QC-FAILED" } });
    assert(blocked && !(await validateTraceability(blocked.id)).canIssueQr, "blocked harvest must not issue QR");
    const collectorQcFailed = await prisma.commercialLot.findUnique({ where: { lotCode: "CM-COLLECTOR-QC-FAILED" } });
    assert(collectorQcFailed && !(await validateTraceability(collectorQcFailed.id)).canIssueQr, "collector QC failed lot must not issue QR");
    const processorQcFailed = await prisma.commercialLot.findUnique({ where: { lotCode: "CM-PROCESSOR-QC-FAILED" } });
    assert(processorQcFailed && !(await validateTraceability(processorQcFailed.id)).canIssueQr, "processor QC failed lot must not issue QR");
    const commercialLots = await prisma.commercialLot.findMany({ select: { id: true, traceabilityCode: true } });
    for (const lot of commercialLots.filter(row => row.traceabilityCode?.status === "ACTIVE"))
        assert((await validateTraceability(lot.id)).canIssueQr, `active QR lot ${lot.id} must remain traceable`);
    console.log(`Traceability checks passed for ${activeTokens.length + 3} public-token scenarios.`);
}

main().finally(() => prisma.$disconnect());
