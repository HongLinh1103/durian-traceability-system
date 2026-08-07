const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const prohibitedChemicals = [
    { code: "BAN-TRICHLORFON", name: "Trichlorfon", category: "Thuốc trừ sâu" },
    { code: "BAN-CARBENDAZIM", name: "Carbendazim", category: "Thuốc trừ bệnh" },
    { code: "BAN-CHLORPYRIFOS", name: "Chlorpyrifos", category: "Thuốc trừ sâu" },
    { code: "BAN-PARAQUAT", name: "Paraquat", category: "Thuốc trừ cỏ" },
    { code: "BAN-GLYPHOSATE", name: "Glyphosate", category: "Thuốc trừ cỏ" },
];

async function main() {
    for (const item of prohibitedChemicals) {
        await prisma.pesticide.upsert({
            where: { code: item.code },
            update: {
                pesticideName: item.name,
                tradeName: item.name,
                activeIngredient: item.name,
                category: item.category,
                gaccStatus: "PROHIBITED",
                localStatus: "Danh mục cấm",
                isActive: true,
                deletedAt: null,
            },
            create: {
                code: item.code,
                pesticideName: item.name,
                tradeName: item.name,
                activeIngredient: item.name,
                category: item.category,
                gaccStatus: "PROHIBITED",
                localStatus: "Danh mục cấm",
                notes: "Dữ liệu khởi tạo; quản trị viên cần cập nhật nguồn và văn bản áp dụng hiện hành.",
                isActive: true,
            },
        });
    }
    console.log(`Seeded ${prohibitedChemicals.length} prohibited chemicals.`);
}

main().finally(() => prisma.$disconnect());
