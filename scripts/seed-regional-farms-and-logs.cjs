const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();
const TODAY = new Date("2026-08-10T08:00:00+07:00");
const PASSWORD = "Farmer@123";
const farmerNames = [
    "Trần Văn Minh", "Nguyễn Thị Hồng", "Lê Quốc Bảo", "Phạm Văn Dũng",
    "Võ Thị Thanh Mai", "Đặng Hoàng Nam", "Bùi Văn Phúc", "Huỳnh Ngọc Lan",
    "Đỗ Văn Khánh", "Nguyễn Thị Kim Oanh", "Trương Quốc Huy", "Lâm Văn Tài",
];

const regionCenters = {
    "MSVT-GACC-001": [11.296, 107.429],
    "MSVT-GACC-002": [11.365, 107.347],
    "MSVT-DN-TRIAN-001": [11.102, 107.082],
};

const farmTemplates = [
    { name: "Vườn sầu riêng An Phát", variety: "Ri6", area: 3.2, trees: 285 },
    { name: "Vườn sầu riêng Hòa Bình", variety: "Monthong", area: 4.1, trees: 350 },
    { name: "Vườn sầu riêng Phú Quý", variety: "Dona", area: 2.7, trees: 238 },
    { name: "Vườn sầu riêng Thành Công", variety: "Ri6", area: 5.0, trees: 430 },
];

const logTemplates = [
    { daysAgo: 150, stage: "MAKING_SPROUT", activityType: "PRUNE", notes: "Tỉa cành sau thu hoạch, vệ sinh tán và ghi nhận khả năng ra đọt mới." },
    { daysAgo: 120, stage: "MAKING_SPROUT", activityType: "FERTILIZE", notes: "Bổ sung dinh dưỡng theo kế hoạch của vườn, kiểm tra độ ẩm đất trước khi thực hiện." },
    { daysAgo: 90, stage: "FLOWERING", activityType: "WEEDING", notes: "Làm cỏ quanh vùng rễ, giữ mặt vườn thông thoáng trong giai đoạn ra hoa." },
    { daysAgo: 60, stage: "FRUIT_SETTING", activityType: "IRRIGATE", notes: "Tưới duy trì ẩm sau khi kiểm tra đất, theo dõi tình trạng đậu trái." },
    { daysAgo: 30, stage: "FRUIT_GROWING", activityType: "PRUNE", notes: "Tỉa cành vượt và kiểm tra cành mang trái, dây neo và độ thông thoáng tán." },
];

const activityPatterns = [
    ["IRRIGATE", "FERTILIZE", "PRUNE", "SPRAY_PESTICIDE", "WEEDING", "IRRIGATE", "WEEDING"],
    ["WEEDING", "IRRIGATE", "FERTILIZE", "PRUNE", "SPRAY_PESTICIDE", "IRRIGATE", "PRUNE"],
    ["PRUNE", "WEEDING", "IRRIGATE", "FERTILIZE", "PRUNE", "SPRAY_PESTICIDE", "IRRIGATE"],
    ["IRRIGATE", "PRUNE", "WEEDING", "IRRIGATE", "FERTILIZE", "PRUNE", "SPRAY_PESTICIDE"],
];

const fertilizerVariants = [
    { name: "Phân bón Đầu Trâu NPK 20-20-15", dosage: "1,2 kg/cây" },
    { name: "Phân bón Bình Điền NPK 16-16-8+TE", dosage: "1,0 kg/cây" },
    { name: "Phân bón YaraMila 15-9-20", dosage: "0,8 kg/cây" },
    { name: "Phân hữu cơ vi sinh Sông Gianh", dosage: "3,0 kg/cây" },
];

const pesticideVariants = [
    { name: "Amistar Top 325SC (Azoxystrobin 200 g/l + Difenoconazole 125 g/l)", dosage: "0,5 lít/ha; pha theo đúng hướng dẫn trên nhãn", phiDays: 7 },
    { name: "Confidor 100SL (Imidacloprid 100 g/l)", dosage: "0,3 lít/ha; pha theo đúng hướng dẫn trên nhãn", phiDays: 14 },
];

const noteVariants = {
    IRRIGATE: [
        "Tưới gốc buổi sáng, kiểm tra độ ẩm đất và hệ thống tưới.",
        "Tưới bổ sung theo từng bồn, không để nước đọng quanh gốc.",
        "Tưới duy trì độ ẩm và kiểm tra tình trạng sinh trưởng của trái.",
        "Kiểm tra đầu nhỏ giọt, vệ sinh đầu nghẹt và tưới vừa đủ ẩm.",
    ],
    PRUNE: [
        "Tỉa chồi vượt và cành che khuất, tạo độ thông thoáng cho tán cây.",
        "Tỉa cành khô, cành sâu bệnh và thu gom khỏi khu vực vườn.",
        "Tỉa cành mọc sát đất, kiểm tra cành mang trái và dây neo.",
        "Cắt bỏ chồi trong tán, giữ các cành khỏe đang mang trái.",
    ],
    WEEDING: [
        "Làm cỏ thủ công quanh gốc, không sử dụng thuốc diệt cỏ.",
        "Phát cỏ quanh gốc, giữ lại thảm cỏ thấp giữa các hàng cây.",
        "Dọn cỏ trên lối đi và thu gom tàn dư ra khỏi vùng rễ.",
        "Làm sạch cỏ cạnh mương thoát nước, giữ mặt vườn thông thoáng.",
    ],
    FERTILIZE: [
        "Bón theo hình chiếu tán, lấp đất nhẹ và tưới đủ ẩm sau khi bón.",
        "Chia đều phân quanh mép tán, xới nhẹ mặt đất và tưới sau bón.",
        "Bón cách gốc theo mép tán, tránh để phân tiếp xúc trực tiếp với rễ nổi.",
        "Rải phân đều quanh tán khi đất đủ ẩm, thu gom bao bì sau khi sử dụng.",
    ],
    SPRAY_PESTICIDE: [
        "Phun phòng nấm bệnh vào buổi sáng, trang bị đầy đủ bảo hộ lao động.",
        "Phun đều hai mặt lá khi trời khô ráo, dừng phun khi gió tăng.",
        "Kiểm tra bình phun trước khi làm, phun đúng vùng tán cần xử lý.",
        "Phun vào đầu giờ sáng, đặt biển cảnh báo và vệ sinh dụng cụ sau khi dùng.",
    ],
};

const activityTimes = {
    IRRIGATE: ["05:45", "06:10", "06:35", "16:20"],
    PRUNE: ["07:15", "08:20", "14:40", "15:35"],
    WEEDING: ["07:05", "08:10", "15:15", "16:05"],
    FERTILIZE: ["06:30", "07:25", "15:10", "16:15"],
    SPRAY_PESTICIDE: ["06:00", "06:25", "06:50", "07:10"],
};

function recentDailyLogsForFarm(farm) {
    const seed = [...farm.farmCode].reduce((sum, character) => sum + character.charCodeAt(0), 0);
    const patternIndex = seed % activityPatterns.length;
    const pattern = activityPatterns[patternIndex];
    const fertilizer = fertilizerVariants[seed % fertilizerVariants.length];
    const pesticide = pesticideVariants[seed % pesticideVariants.length];
    const dates = ["2026-08-04", "2026-08-05", "2026-08-06", "2026-08-07", "2026-08-08", "2026-08-09", "2026-08-10"];
    return dates.map((date, index) => {
        const activityType = pattern[index];
        const notes = noteVariants[activityType][(seed + index) % noteVariants[activityType].length];
        const time = activityTimes[activityType][(seed + index * 2) % activityTimes[activityType].length];
        if (activityType === "FERTILIZE") return {
            date, time, stage: "FRUIT_GROWING", activityType,
            chemicalName: fertilizer.name, dosage: fertilizer.dosage, phiDays: null,
            notes,
        };
        if (activityType === "SPRAY_PESTICIDE") return {
            date, time, stage: "FRUIT_GROWING", activityType,
            chemicalName: pesticide.name, dosage: pesticide.dosage, phiDays: pesticide.phiDays,
            notes,
        };
        return { date, time, stage: "FRUIT_GROWING", activityType, notes };
    });
}

function managedRegionCodes(value) {
    const items = Array.isArray(value) ? value : value && typeof value === "object" ? [value] : [];
    return items.map((item) => item && typeof item.code === "string" ? item.code : null).filter(Boolean);
}

function dateDaysAgo(daysAgo) {
    const value = new Date(TODAY);
    value.setDate(value.getDate() - daysAgo);
    return value;
}

async function ensureLogs(farm) {
    let created = 0;
    for (const item of logTemplates) {
        const actionDate = dateDaysAgo(item.daysAgo);
        const exists = await prisma.farmingLog.findFirst({
            where: { farmId: farm.id, actionDate, stage: item.stage, activityType: item.activityType },
            select: { id: true, notes: true },
        });
        if (exists) {
            if (exists.notes?.startsWith("[SEED-REGIONAL-")) {
                await prisma.farmingLog.update({ where: { id: exists.id }, data: { notes: item.notes } });
            }
            continue;
        }
        await prisma.farmingLog.create({
            data: {
                farmId: farm.id,
                stage: item.stage,
                actionDate,
                activityType: item.activityType,
                isGACCCompliant: true,
                notes: item.notes,
                images: [],
            },
        });
        created += 1;
    }
    for (const item of recentDailyLogsForFarm(farm)) {
        const actionDate = new Date(`${item.date}T${item.time}:00+07:00`);
        const dayStart = new Date(`${item.date}T00:00:00+07:00`);
        const dayEnd = new Date(`${item.date}T23:59:59.999+07:00`);
        const exists = await prisma.farmingLog.findFirst({
            where: { farmId: farm.id, actionDate: { gte: dayStart, lte: dayEnd } },
            select: { id: true },
        });
        const data = {
            stage: item.stage,
            actionDate,
            activityType: item.activityType,
            chemicalName: item.chemicalName || null,
            dosage: item.dosage || null,
            phiDays: item.phiDays ?? null,
            isGACCCompliant: true,
            notes: item.notes,
            images: [],
        };
        if (exists) {
            await prisma.farmingLog.update({ where: { id: exists.id }, data });
            continue;
        }
        await prisma.farmingLog.create({ data: { farmId: farm.id, ...data } });
        created += 1;
    }
    return created;
}

async function main() {
    const managers = await prisma.user.findMany({
        where: { role: "AREA_MANAGER", deletedAt: null, isApproved: true },
        orderBy: { phone: "asc" },
        select: {
            id: true,
            phone: true,
            fullName: true,
            areaManagerApplication: { select: { managedRegions: true } },
        },
    });
    const password = await bcrypt.hash(PASSWORD, 10);
    let farmsCreated = 0;

    for (const [managerIndex, manager] of managers.entries()) {
        const codes = managedRegionCodes(manager.areaManagerApplication?.managedRegions);
        const region = await prisma.growingRegion.findFirst({
            where: { code: { in: codes }, isActive: true },
            orderBy: { code: "asc" },
        });
        if (!region) {
            console.warn(`Bỏ qua ${manager.phone}: không tìm thấy vùng đang quản lý.`);
            continue;
        }
        const center = regionCenters[region.code] || [10.95, 107.2];
        for (const [farmIndex, template] of farmTemplates.entries()) {
            const sequence = managerIndex * 4 + farmIndex + 1;
            const phone = `0918${String(sequence).padStart(6, "0")}`;
            const farmerName = farmerNames[sequence - 1] || `Chủ vườn ${sequence}`;
            const farmer = await prisma.user.upsert({
                where: { phone },
                update: {
                    fullName: farmerName,
                    password,
                    role: "FARMER",
                    isApproved: true,
                    accountStatus: "APPROVED",
                    approvedAt: TODAY,
                    deletedAt: null,
                    province: region.province,
                    district: region.district,
                    ward: region.ward,
                },
                create: {
                    phone,
                    email: `farmer.region.${sequence}@triviet.local`,
                    password,
                    fullName: farmerName,
                    role: "FARMER",
                    isApproved: true,
                    accountStatus: "APPROVED",
                    approvedAt: TODAY,
                    province: region.province,
                    district: region.district,
                    ward: region.ward,
                    address: `${region.ward || ""}, ${region.district || ""}, ${region.province}`,
                    registeredAreaSize: template.area,
                    registeredTotalTrees: template.trees,
                    registeredDurianVariety: template.variety,
                },
            });
            const farmCode = `${region.code}-V${String(farmIndex + 1).padStart(2, "0")}`;
            const existing = await prisma.farm.findUnique({ where: { farmCode }, select: { id: true } });
            const farm = await prisma.farm.upsert({
                where: { farmCode },
                update: {
                    farmerId: farmer.id,
                    growingRegionId: region.id,
                    growingRegion: region.name,
                    isActive: true,
                    isInSeason: true,
                },
                create: {
                    farmCode,
                    farmName: `${template.name} ${region.ward || region.district || region.province}`,
                    areaSize: template.area,
                    totalTrees: template.trees,
                    durianVariety: template.variety,
                    address: `Ấp ${farmIndex + 1}, ${region.ward || ""}, ${region.district || ""}, ${region.province}`,
                    province: region.province,
                    district: region.district,
                    ward: region.ward,
                    latitude: center[0] + (farmIndex - 1.5) * 0.008,
                    longitude: center[1] + (farmIndex % 2 === 0 ? -0.007 : 0.007),
                    growingRegion: region.name,
                    growingRegionId: region.id,
                    farmerId: farmer.id,
                    areaUnit: "HECTARE",
                    notes: `Dữ liệu mẫu phục vụ theo dõi vùng của ${manager.fullName || manager.phone}.`,
                    isActive: true,
                    isInSeason: true,
                },
            });
            if (!existing) farmsCreated += 1;
            console.log(`${region.code}: ${farm.farmCode} - ${farm.farmName}`);
        }
    }

    const allFarms = await prisma.farm.findMany({ select: { id: true, farmCode: true } });
    let logsCreated = 0;
    for (const farm of allFarms) logsCreated += await ensureLogs(farm);

    console.log(JSON.stringify({ managers: managers.length, farmsCreated, totalFarms: allFarms.length, logsCreated, latestDate: TODAY.toISOString() }, null, 2));
}

main()
    .catch((error) => { console.error(error); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
