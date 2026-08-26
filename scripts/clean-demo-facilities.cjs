const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
    console.log("Cleaning up Demo facilities...");

    // Find all PartnerFacilities with 'Demo 1', 'Demo 2', 'Vựa thu mua Demo', 'Cơ sở chế biến Demo'
    const demoFacilities = await prisma.partnerFacility.findMany({
        where: {
            OR: [
                { name: { contains: "Demo 1", mode: "insensitive" } },
                { name: { contains: "Demo 2", mode: "insensitive" } },
                { name: { contains: "Vựa thu mua Demo", mode: "insensitive" } },
                { name: { contains: "Cơ sở chế biến Demo", mode: "insensitive" } },
                { representativeName: { contains: "Demo 1", mode: "insensitive" } },
                { representativeName: { contains: "Demo 2", mode: "insensitive" } },
            ],
        },
    });

    console.log(`Found ${demoFacilities.length} demo facilities to remove.`);

    for (const fac of demoFacilities) {
        console.log(`Deleting facility: ${fac.name} (ID: ${fac.id})`);
        try {
            await prisma.partnerFacility.delete({
                where: { id: fac.id },
            });
        } catch (e) {
            console.log(`Could not hard-delete, soft-deleting facility ${fac.name}: ${e.message}`);
            await prisma.partnerFacility.update({
                where: { id: fac.id },
                data: { deletedAt: new Date(), status: "SUSPENDED" },
            });
        }
    }

    // Also delete any demo collector/processor users
    const demoUsers = await prisma.user.findMany({
        where: {
            OR: [
                { email: { in: ["collector1@triviet.local", "collector2@triviet.local", "processor1@triviet.local", "processor2@triviet.local"] } },
                { phone: { in: ["0909300001", "0909300002", "0909400001", "0909400002", "0909300011", "0909300021", "0909300012", "0909300022"] } },
                { fullName: { in: ["Chủ vựa Demo 1", "Chủ vựa Demo 2", "Quản lý chế biến Demo 1", "Quản lý chế biến Demo 2"] } },
            ],
        },
    });

    console.log(`Found ${demoUsers.length} demo partner users to remove.`);
    for (const u of demoUsers) {
        console.log(`Deleting demo user: ${u.fullName} (${u.email || u.phone})`);
        try {
            await prisma.user.delete({ where: { id: u.id } });
        } catch (e) {
            console.log(`Could not hard-delete, soft-deleting user ${u.email}: ${e.message}`);
            await prisma.user.update({
                where: { id: u.id },
                data: { deletedAt: new Date(), isLocked: true },
            });
        }
    }

    console.log("Cleanup completed successfully!");
}

main()
    .catch((e) => {
        console.error("Cleanup error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
