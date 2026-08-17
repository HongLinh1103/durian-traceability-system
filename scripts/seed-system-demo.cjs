const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const now = new Date();
const atDay = (offset, hour = 8) => {
  const date = new Date(now);
  date.setDate(date.getDate() + offset);
  date.setHours(hour, 0, 0, 0);
  return date;
};

async function seedRegions() {
  const items = [
    ["0901234567", "079086000101", "MSVT-DN-LK-001", "Vùng trồng sầu riêng Long Khánh", "Long Khánh", "Xuân Lập", "MSVT-TP-0001"],
    ["0901234568", "079086000102", "MSVT-DN-TP-001", "Vùng trồng sầu riêng Tân Phú", "Tân Phú", "Phú An", "MSVT-PA-0001"],
    ["0909123456", "079086000103", "MSVT-DN-TRIAN-001", "Vùng trồng sầu riêng Trị An", "Vĩnh Cửu", "Trị An", "MSVT-LH-0001"],
  ];
  for (const [phone, identityNumber, code, name, district, ward, farmCode] of items) {
    const manager = await prisma.user.findUnique({ where: { phone } });
    if (!manager) continue;
    const region = await prisma.growingRegion.upsert({
      where: { code },
      update: { name, province: "Đồng Nai", district, ward, cropVarieties: ["Dona", "Ri6", "Monthong"], isActive: true, approvedAt: now },
      create: { code, name, province: "Đồng Nai", district, ward, cropVarieties: ["Dona", "Ri6", "Monthong"], isActive: true, approvedAt: now },
    });
    const managedRegions = [{ id: region.id, code, name, province: "Đồng Nai", district, ward, durianVarieties: region.cropVarieties }];
    await prisma.areaManagerApplication.upsert({
      where: { userId: manager.id },
      update: { managedRegions },
      create: { userId: manager.id, identityNumber, identityIssuedDate: new Date("2021-01-01"), identityIssuedPlace: "Cục Cảnh sát QLHC về TTXH", identityFrontKey: `seed/${code}/front.jpg`, identityBackKey: `seed/${code}/back.jpg`, organizationName: `Ban quản lý ${name}`, position: "Trưởng ban", officeProvince: "Đồng Nai", officeDistrict: district, officeWard: ward, officeDetailedAddress: `Trung tâm ${ward}`, authorityDocumentKey: `seed/${code}/decision.pdf`, managedRegions },
    });
    await prisma.farm.updateMany({ where: { farmCode }, data: { growingRegionId: region.id, growingRegion: name } });
  }
}

async function seedFarmOperations() {
  const farms = await prisma.farm.findMany({ where: { farmCode: { in: ["MSVT-TP-0001", "MSVT-PA-0001", "MSVT-LH-0001"] } }, include: { farmer: true }, orderBy: { farmCode: "asc" } });
  const activities = ["FERTILIZE", "IRRIGATE", "PEST_INSPECTION"];
  const titles = ["Bon phan nuoi trai", "Kiem tra he thong tuoi", "Kiem tra sau benh"];
  for (const [index, farm] of farms.entries()) {
    const log = { farmId: farm.id, actionDate: atDay(-index - 1), stage: "FRUIT_GROWING", activityType: activities[index], chemicalName: index ? null : "Dau Trau NPK 20-20-15", dosage: index ? null : "1 kg/cay", notes: "Du lieu mau theo doi canh tac.", isGACCCompliant: true };
    await prisma.farmingLog.upsert({ where: { id: `demo-log-${index + 1}` }, update: log, create: { id: `demo-log-${index + 1}`, ...log } });
    const plan = { farmerId: farm.farmerId, farmId: farm.id, plannedDate: atDay(index + 1, 7), title: titles[index], stage: "FRUIT_GROWING", activityType: activities[index], notes: "Ke hoach mau sap thuc hien.", status: "PLANNED" };
    await prisma.farmingPlan.upsert({ where: { id: `demo-plan-${index + 1}` }, update: plan, create: { id: `demo-plan-${index + 1}`, ...plan } });
    const weather = { farmerId: farm.farmerId, farmId: farm.id, observedAt: atDay(-index, 6), condition: index ? "Co mua" : "Nang, co may", temperatureMax: 33 - index, temperatureMin: 25, humidity: 72 + index * 3, rainfallMm: index * 4.5, windLevel: "Gio nhe", windDirection: "Dong Bac", windSpeed: 9 + index, phenomena: index ? ["Mua rao"] : ["Nang"], note: "Ghi nhan thoi tiet mau tai vuon." };
    await prisma.weatherObservation.upsert({ where: { id: `demo-weather-${index + 1}` }, update: weather, create: { id: `demo-weather-${index + 1}`, ...weather } });
  }
  return farms;
}

async function seedOrder(farm) {
  const store = await prisma.store.findFirst({ where: { status: "APPROVED", deletedAt: null }, include: { products: { where: { status: "APPROVED", deletedAt: null }, take: 1 } } });
  if (!store || !store.products[0] || !farm) return;
  const product = store.products[0];
  const subtotal = Number(product.salePrice || product.price) * 2;
  const order = await prisma.order.upsert({
    where: { orderCode: "DH-DEMO-20260817-001" },
    update: { farmerId: farm.farmerId, storeId: store.id, status: "CONFIRMED", recipientName: farm.farmer.fullName || farm.farmer.phone, recipientPhone: farm.farmer.phone, shippingAddress: farm.address, subtotal },
    create: { orderCode: "DH-DEMO-20260817-001", farmerId: farm.farmerId, storeId: store.id, status: "CONFIRMED", recipientName: farm.farmer.fullName || farm.farmer.phone, recipientPhone: farm.farmer.phone, shippingAddress: farm.address, subtotal, shippingFee: 20000, note: "Don hang mau phuc vu kiem thu." },
  });
  await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
  await prisma.orderItem.create({ data: { orderId: order.id, productId: product.id, productName: product.name, unitPrice: product.salePrice || product.price, quantity: 2, unit: product.unit, storeName: store.name } });
}

async function seedHarvests(farms) {
  const facilities = await prisma.partnerFacility.findMany({ where: { status: "APPROVED", deletedAt: null } });
  for (const [index, farm] of farms.slice(0, 2).entries()) {
    const facility = facilities.find((value) => value.type === (index ? "PROCESSING_FACILITY" : "COLLECTOR"));
    if (!facility) continue;
    const code = `TH-DEMO-20260817-00${index + 1}`;
    const harvest = { farmId: farm.id, farmerId: farm.farmerId, buyerType: facility.type, buyerFacilityId: facility.id, buyerUserId: facility.ownerId, status: index ? "CONFIRMED" : "WAITING_CONFIRMATION", expectedHarvestDate: atDay(7 + index), durianVariety: farm.durianVariety, expectedTreeCount: Math.round(farm.totalTrees * 0.8), expectedWeight: 3500 + index * 1000, weightUnit: "kg", expectedPricePerKg: 65000, deliveryMethod: "BUYER_PICKUP", transactionNote: "Phieu thu hoach mau lien ket voi doi tac." };
    const record = await prisma.harvestRecord.upsert({ where: { code }, update: harvest, create: { code, ...harvest } });
    await prisma.harvestVarietyItem.upsert({ where: { harvestId_durianVariety: { harvestId: record.id, durianVariety: farm.durianVariety } }, update: { expectedWeight: harvest.expectedWeight }, create: { harvestId: record.id, durianVariety: farm.durianVariety, expectedWeight: harvest.expectedWeight } });
    await prisma.notification.upsert({ where: { id: `demo-harvest-notification-${index + 1}` }, update: { userId: facility.ownerId, title: "Phieu thu hoach moi", message: `${farm.farmName} gui phieu ${code}.`, type: "HARVEST_REQUEST", isRead: false }, create: { id: `demo-harvest-notification-${index + 1}`, userId: facility.ownerId, title: "Phieu thu hoach moi", message: `${farm.farmName} gui phieu ${code}.`, type: "HARVEST_REQUEST" } });
  }
}

async function seedContent() {
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN", deletedAt: null } });
  if (!admin) return;
  await prisma.document.upsert({ where: { slug: "quy-trinh-canh-tac-sau-rieng-mau" }, update: { status: "PUBLISHED", publishedAt: now, deletedAt: null }, create: { title: "Quy trinh canh tac sau rieng tham khao", slug: "quy-trinh-canh-tac-sau-rieng-mau", summary: "Tai lieu mau dung chung trong he thong.", category: "Ky thuat canh tac", status: "PUBLISHED", fileName: "quy-trinh-canh-tac.pdf", fileUrl: "https://example.com/quy-trinh-canh-tac.pdf", storageKey: "demo/documents/quy-trinh-canh-tac.pdf", mimeType: "application/pdf", fileSize: 102400, uploaderId: admin.id, publishedAt: now } });
  await prisma.newsArticle.upsert({ where: { originalUrl: "https://example.com/tin-tuc-triviet-demo" }, update: { status: "PUBLISHED", publishedAt: now }, create: { title: "Cap nhat hoat dong vung trong sau rieng", description: "Tin tuc mau hien thi sau khi deploy.", sourceName: "TriViet", originalUrl: "https://example.com/tin-tuc-triviet-demo", sourcePublishedAt: now, status: "PUBLISHED", publishedAt: now } });
}

async function main() {
  await seedRegions();
  const farms = await seedFarmOperations();
  await seedOrder(farms[0]);
  await seedHarvests(farms);
  await seedContent();
  const counts = {};
  for (const [name, model] of [["users", "user"], ["farms", "farm"], ["regions", "growingRegion"], ["logs", "farmingLog"], ["plans", "farmingPlan"], ["weather", "weatherObservation"], ["stores", "store"], ["products", "storeProduct"], ["orders", "order"], ["harvests", "harvestRecord"], ["facilities", "partnerFacility"], ["documents", "document"], ["news", "newsArticle"]]) counts[name] = await prisma[model].count();
  console.table(counts);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
