import { prisma } from "../src/lib/prisma";
import { rebuildMaterialFifo } from "../src/lib/farmer-material-fifo";

async function main() {
    const apply = process.argv.includes("--apply");
    const farmers = await prisma.farmerSupply.findMany({ distinct: ["farmerId"], select: { farmerId: true } });
    let failures = 0;
    for (const { farmerId } of farmers) {
        try {
            await prisma.$transaction(async tx => {
                await rebuildMaterialFifo(tx, farmerId);
                if (!apply) throw new Error("FIFO_DRY_RUN_ROLLBACK");
            }, { timeout: 120000 });
            console.log(`${farmerId}: updated FIFO allocations, stock and journal costs`);
        } catch (error) {
            if (error instanceof Error && error.message === "FIFO_DRY_RUN_ROLLBACK") console.log(`${farmerId}: valid (preview only)`);
            else { failures++; console.error(`${farmerId}: ${error instanceof Error ? error.message : "reconciliation failed"}`); }
        }
    }
    if (failures) process.exitCode = 1;
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
