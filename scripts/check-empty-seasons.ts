import { prisma } from "../src/lib/prisma";

async function main() {
    const farms = await prisma.farm.findMany({
        include: {
            farmer: { select: { id: true, fullName: true, phone: true, role: true } },
            cropSeasons: {
                include: {
                    farmingLogs: { select: { id: true } }
                }
            },
            farmingLogs: { select: { id: true, cropSeasonId: true } }
        }
    });

    console.log(`Tổng số vườn: ${farms.length}`);
    const emptySeasons: any[] = [];
    const seasonsSummary: any[] = [];

    for (const f of farms) {
        for (const s of f.cropSeasons) {
            const count = s.farmingLogs.length;
            seasonsSummary.push({
                farmCode: f.farmCode,
                farmName: f.farmName,
                farmerPhone: f.farmer?.phone,
                farmerName: f.farmer?.fullName,
                seasonName: s.name,
                seasonYear: s.year,
                seasonStatus: s.status,
                seasonId: s.id,
                logCount: count,
            });
            if (count === 0) {
                emptySeasons.push({
                    farmCode: f.farmCode,
                    farmName: f.farmName,
                    farmerPhone: f.farmer?.phone,
                    farmerName: f.farmer?.fullName,
                    seasonName: s.name,
                    seasonId: s.id,
                    seasonStatus: s.status
                });
            }
        }
    }

    console.log(`Số vụ mùa có 0 nhật ký: ${emptySeasons.length}`);
    if (emptySeasons.length > 0) {
        console.log("Các vụ mùa có 0 nhật ký:", emptySeasons);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
