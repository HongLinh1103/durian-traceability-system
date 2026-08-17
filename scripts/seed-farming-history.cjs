const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const farmCodes = ["MSVT-TP-0001", "MSVT-PA-0001", "MSVT-LH-0001"];
const stages = [
  ["POST_HARVEST_RECOVERY", 180, [
    ["GARDEN_SANITATION", "Vệ sinh vườn, thu gom cành và trái còn lại sau thu hoạch."],
    ["PRUNE", "Tỉa cành sau thu hoạch và tạo lại độ thông thoáng của tán."],
    ["FERTILIZE", "Bón phân để phục hồi bộ rễ, thân và lá.", "Phân hữu cơ + NPK 16-16-8", "5 kg hữu cơ + 1 kg NPK/cây"],
  ]],
  ["MAKING_SPROUT", 145, [
    ["IRRIGATE", "Tưới giữ ẩm để cây ra đọt đồng đều."],
    ["FERTILIZE", "Bổ sung dinh dưỡng cho đọt non phát triển.", "NPK 20-10-10", "0,8 kg/cây"],
    ["SHOOT_MANAGEMENT", "Theo dõi và tỉa bỏ đọt yếu, đọt vượt không cần thiết."],
  ]],
  ["FLOWER_INDUCTION", 110, [
    ["WATER_STRESS", "Điều tiết nước để tạo khô hạn phù hợp trước xử lý ra hoa."],
    ["FLOWER_INDUCTION", "Theo dõi mầm hoa và điều chỉnh chế độ chăm sóc."],
    ["PEST_INSPECTION", "Kiểm tra sâu bệnh trên lá và cành trước khi hoa xuất hiện."],
  ]],
  ["FLOWERING", 78, [
    ["FLOWER_THINNING", "Tỉa chùm hoa yếu, giữ mật độ hoa phù hợp trên cành."],
    ["POLLINATION", "Theo dõi thụ phấn và tỷ lệ đậu trái ban đầu."],
    ["IRRIGATE", "Tưới lượng nhỏ, duy trì độ ẩm ổn định trong giai đoạn hoa."],
  ]],
  ["FRUIT_SETTING", 48, [
    ["FRUIT_THINNING", "Tỉa trái méo, trái sâu bệnh và điều chỉnh số trái trên cành."],
    ["PEST_INSPECTION", "Kiểm tra sâu đục trái và dấu hiệu nấm bệnh trên trái non."],
    ["BRANCH_SUPPORT", "Lắp dây neo và chống cành mang trái."],
  ]],
  ["FRUIT_GROWING", 20, [
    ["FERTILIZE", "Bón phân nuôi trái theo hiện trạng cây và số lượng trái.", "NPK 12-12-17 + TE", "0,8 kg/cây"],
    ["TRACK_FRUIT", "Theo dõi kích thước, màu gai và tình trạng phát triển của trái."],
    ["BRANCH_SUPPORT", "Kiểm tra lại dây neo, cây chống và tải trọng trên cành."],
  ]],
];

function toDate(daysAgo, farmIndex, entryIndex) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo + farmIndex + entryIndex * 4);
  date.setHours(7 + entryIndex * 2, 30, 0, 0);
  return date;
}

async function main() {
  const farms = await prisma.farm.findMany({ where: { farmCode: { in: farmCodes } }, orderBy: { farmCode: "asc" } });
  if (!farms.length) throw new Error("Khong tim thay vuon de tao lich su canh tac.");

  let total = 0;
  for (const [farmIndex, farm] of farms.entries()) {
    for (const [stageIndex, [stage, daysAgo, entries]] of stages.entries()) {
      for (const [entryIndex, [activityType, notes, chemicalName, dosage]] of entries.entries()) {
        const id = `demo-history-${farm.farmCode.toLowerCase()}-${stageIndex + 1}-${entryIndex + 1}`;
        const data = { farmId: farm.id, stage, actionDate: toDate(daysAgo, farmIndex, entryIndex), activityType, chemicalName: chemicalName || null, dosage: dosage || null, notes, isGACCCompliant: true };
        await prisma.farmingLog.upsert({ where: { id }, update: data, create: { id, ...data } });
        total += 1;
      }
    }
  }

  const summary = await prisma.farmingLog.groupBy({ by: ["stage"], where: { farmId: { in: farms.map(({ id }) => id) } }, _count: { _all: true } });
  console.log(`Da tao/cap nhat ${total} nhat ky cho ${farms.length} vuon.`);
  console.table(summary.map(({ stage, _count }) => ({ stage, records: _count._all })));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
