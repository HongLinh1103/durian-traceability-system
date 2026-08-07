const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Trích từ file "Danh mục cấm sử dụng.xlsx" do người dùng cung cấp.
const groups = [
    {
        category: "Thuốc trừ sâu, thuốc bảo quản lâm sản",
        names: [
            "Aldrin", "BHC, Lindane", "Cadmium compound (Cd)", "Carbofuran", "Chlordane",
            "Chlordimeform", "DDT", "Dieldrin", "Endosulfan", "Endrin", "Heptachlor", "Isobenzan",
            "Isodrin", "Lead (Pb)", "Methamidophos", "Methyl Parathion", "Monocrotophos",
            "Parathion Ethyl", "Sodium Pentachlorophenate monohydrate", "Pentachlorophenol",
            "Phosphamidon", "Polychlorocamphene", "Trichlorfon (Chlorophos)",
        ],
    },
    {
        category: "Thuốc trừ bệnh",
        names: ["Arsenic (As)", "Captan", "Captafol", "Hexachlorobenzene", "Mercury (Hg)", "Selenium (Se)"],
    },
    { category: "Thuốc chuột", names: ["Talium compond"] },
    { category: "Thuốc trừ cỏ", names: ["2,4,5-T"] },
];

const rows = groups.flatMap((group) => group.names.map((name) => ({ name, category: group.category })));

async function main() {
    await prisma.$transaction(async (tx) => {
        // Bỏ 5 bản ghi minh họa cũ để danh sách phản ánh đúng file Excel được cung cấp.
        await tx.pesticide.deleteMany({
            where: { code: { in: ["BAN-TRICHLORFON", "BAN-CARBENDAZIM", "BAN-CHLORPYRIFOS", "BAN-PARAQUAT", "BAN-GLYPHOSATE"] } },
        });

        for (const [index, row] of rows.entries()) {
            const code = `XLSX-BAN-${String(index + 1).padStart(3, "0")}`;
            await tx.pesticide.upsert({
                where: { code },
                update: {
                    pesticideName: row.name,
                    tradeName: row.name,
                    activeIngredient: row.name,
                    category: row.category,
                    gaccStatus: "PROHIBITED",
                    localStatus: "Danh mục cấm",
                    notes: "Nhập từ file Danh mục cấm sử dụng.xlsx",
                    isActive: true,
                    deletedAt: null,
                },
                create: {
                    code,
                    pesticideName: row.name,
                    tradeName: row.name,
                    activeIngredient: row.name,
                    category: row.category,
                    gaccStatus: "PROHIBITED",
                    localStatus: "Danh mục cấm",
                    notes: "Nhập từ file Danh mục cấm sử dụng.xlsx",
                    isActive: true,
                },
            });
        }
    });

    const imported = await prisma.pesticide.findMany({
        where: { code: { startsWith: "XLSX-BAN-" }, gaccStatus: "PROHIBITED", deletedAt: null },
        select: { pesticideName: true, category: true },
    });
    const counts = imported.reduce((result, item) => {
        result[item.category] = (result[item.category] ?? 0) + 1;
        return result;
    }, {});
    console.log(`Imported and verified ${imported.length} prohibited chemicals from Excel.`);
    console.log(counts);
}

main().finally(() => prisma.$disconnect());
