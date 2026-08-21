import { prisma } from "../src/lib/prisma";

async function main() {
    const farmers = await prisma.user.findMany({
        where: { role: "FARMER" },
        include: {
            farms: {
                include: {
                    cropSeasons: {
                        include: {
                            _count: {
                                select: {
                                    farmingLogs: true,
                                    pestMonitoringBooks: true,
                                },
                            },
                        },
                    },
                },
            },
        },
    });

    console.log("=== DANH SÁCH NÔNG DÂN & VỤ MÙA ===");
    for (const f of farmers) {
        console.log(`\nFarmer: ${f.fullName} (${f.phoneNumber || f.username}) [ID: ${f.id}]`);
        for (const farm of f.farms) {
            console.log(`  Farm: ${farm.farmName} [ID: ${farm.id}]`);
            for (const s of farm.cropSeasons) {
                console.log(`    Season: ${s.name} (${s.year}) [${s.status}] [ID: ${s.id}] => Logs: ${s._count.farmingLogs}, PestBooks: ${s._count.pestMonitoringBooks}`);
            }
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
