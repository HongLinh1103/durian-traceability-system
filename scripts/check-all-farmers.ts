import { prisma } from "../src/lib/prisma";

async function main() {
    const farmers = await prisma.user.findMany({
        where: { role: "FARMER" },
        include: {
            farms: {
                include: {
                    cropSeasons: true,
                    farmingLogs: true,
                },
            },
        },
    });

    console.log(`Tìm thấy ${farmers.length} tài khoản role FARMER.`);

    for (const farmer of farmers) {
        const farmCount = farmer.farms.length;
        if (farmCount === 0) {
            console.log(`⚠️ Nông dân ${farmer.fullName} (${farmer.phone}) KHÔNG CÓ VƯỜN NÀO!`);
        } else {
            for (const farm of farmer.farms) {
                if (!farm.isActive) {
                    console.log(`⚠️ Vườn ${farm.farmName} (${farm.farmCode}) của ${farmer.fullName} có isActive = false!`);
                }
                const totalLogs = farm.farmingLogs.length;
                if (totalLogs === 0) {
                    console.log(`⚠️ Vườn ${farm.farmName} (${farm.farmCode}) của ${farmer.fullName} có 0 logs!`);
                }
            }
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
