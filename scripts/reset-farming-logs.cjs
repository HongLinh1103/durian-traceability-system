const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const DAY_PLANS = [
    {
        date: "2026-07-28",
        activities: [
            { time: "06:20", type: "IRRIGATE", notes: "Tưới gốc buổi sáng, kiểm tra độ ẩm đất và hệ thống tưới." },
        ],
    },
    {
        date: "2026-07-29",
        activities: [
            { time: "07:10", type: "WEEDING", notes: "Phát cỏ quanh gốc, giữ lại thảm cỏ thấp giữa các hàng cây." },
            { time: "15:40", type: "PRUNE", notes: "Tỉa cành khô, cành sâu bệnh và thu gom khỏi khu vực vườn." },
        ],
    },
    {
        date: "2026-07-30",
        activities: [
            { time: "06:35", type: "IRRIGATE", notes: "Tưới bổ sung theo từng bồn, không để nước đọng quanh gốc." },
        ],
    },
    {
        date: "2026-07-31",
        activities: [
            {
                time: "07:30",
                type: "FERTILIZE",
                chemicalName: "NPK 20-20-15",
                dosage: "1,5 kg/cây",
                phiDays: 0,
                notes: "Bón theo hình chiếu tán, lấp đất nhẹ và tưới đủ ẩm sau khi bón.",
            },
        ],
    },
    {
        date: "2026-08-01",
        activities: [
            { time: "06:10", type: "IRRIGATE", notes: "Tưới sáng, kiểm tra đầu nhỏ giọt và vệ sinh các đầu bị nghẹt." },
            { time: "16:15", type: "WEEDING", notes: "Làm cỏ thủ công quanh gốc, không sử dụng thuốc diệt cỏ." },
        ],
    },
    {
        date: "2026-08-02",
        activities: [
            {
                time: "08:00",
                type: "SPRAY_PESTICIDE",
                chemicalName: "Amistar Top 325SC",
                dosage: "0,5 lít/ha",
                phiDays: 7,
                notes: "Phun phòng nấm bệnh vào buổi sáng, trang bị đầy đủ bảo hộ lao động.",
            },
        ],
    },
    {
        date: "2026-08-03",
        activities: [
            { time: "06:25", type: "IRRIGATE", notes: "Tưới duy trì độ ẩm và kiểm tra tình trạng sinh trưởng của trái." },
            { time: "15:20", type: "PRUNE", notes: "Tỉa chồi vượt và cành che khuất, tạo độ thông thoáng cho tán cây." },
        ],
    },
];

function vietnamDate(date, time) {
    return new Date(`${date}T${time}:00+07:00`);
}

function createdDate(farmName, actionDate, time) {
    if (farmName.toLocaleLowerCase("vi").includes("út được") && actionDate === "2026-07-30") {
        return vietnamDate("2026-07-31", "07:15");
    }
    const [hour, minute] = time.split(":").map(Number);
    const created = vietnamDate(actionDate, time);
    created.setMinutes(created.getMinutes() + 20 + ((hour + minute) % 25));
    return created;
}

async function main() {
    const farms = await prisma.farm.findMany({
        where: {
            isActive: true,
            farmer: {
                isApproved: true,
                accountStatus: "APPROVED",
                deletedAt: null,
            },
        },
        orderBy: { farmName: "asc" },
        select: { id: true, farmCode: true, farmName: true },
    });

    if (farms.length === 0) {
        throw new Error("Không tìm thấy vườn nào để tạo nhật ký.");
    }

    const newLogs = farms.flatMap((farm) =>
        DAY_PLANS.flatMap((plan) =>
            plan.activities.map((activity) => ({
                farmId: farm.id,
                stage: "FRUIT_GROWING",
                actionDate: vietnamDate(plan.date, activity.time),
                activityType: activity.type,
                chemicalName: activity.chemicalName ?? null,
                dosage: activity.dosage ?? null,
                phiDays: activity.phiDays ?? null,
                isGACCCompliant: true,
                notes: activity.notes,
                images: [],
                createdAt: createdDate(farm.farmName, plan.date, activity.time),
            })),
        ),
    );

    const result = await prisma.$transaction(async (tx) => {
        const deleted = await tx.farmingLog.deleteMany();
        const inserted = await tx.farmingLog.createMany({ data: newLogs });
        return { deleted: deleted.count, inserted: inserted.count };
    });

    console.log(JSON.stringify({ farms: farms.length, ...result }, null, 2));
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
