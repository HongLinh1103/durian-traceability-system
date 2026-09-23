const fs = require("fs");
const ExcelJS = require("exceljs");
const { PrismaClient } = require("@prisma/client");

const envLine = fs
  .readFileSync(".env", "utf8")
  .split(/\r?\n/)
  .find((line) => line.startsWith("DATABASE_URL="));

if (envLine) {
  process.env.DATABASE_URL = envLine.slice("DATABASE_URL=".length).replace(/^["']|["']$/g, "");
}

const prisma = new PrismaClient();

// Dữ liệu minh họa lấy từ file "Copy of 26.08.22 GACC phe duyrt qua.xlsx",
// sheet "Vùng trồng", các dòng 192-196 (kết luận: thông qua).
let REGION_UPDATES = [
  {
    currentCode: "VN-DNOR-0269",
    code: "VN - DNOR - 0269",
    name: "Kim Quy One Member Limited Liability Company",
    province: "Dong Nai",
    district: null,
    ward: null,
    address: "Nam Cat Tien Commune, Dong Nai Province, Vietnam",
  },
  {
    currentCode: "VN-DNOR-0271",
    code: "VN - DNOR - 0271",
    name: "Long Binh Durian Cooperative 1",
    province: "Dong Nai",
    district: null,
    ward: null,
    address: "Long Binh 5 Hamlet, Binh Tan Commune, Dong Nai Province",
  },
  {
    currentCode: "VN-DNOR-0272",
    code: "VN - DNOR - 0272",
    name: "Long Binh Durian Cooperative 2",
    province: "Dong Nai",
    district: null,
    ward: null,
    address: "Long Binh 5 Hamlet, Binh Tan Commune, Dong Nai Province",
  },
  {
    currentCode: "VN-DNOR-0273",
    code: "VN - DNOR - 0273",
    name: "THUYFRUITSONEMEMBER",
    province: "Dong Nai",
    district: null,
    ward: null,
    address: "Nam Cat Tien Commune, Dong Nai Province, Vietnam",
  },
  {
    currentCode: "VN-DNOR-0274",
    code: "VN - DNOR - 0274",
    name: "THUYFRUITSONEMEMBER",
    province: "Dong Nai",
    district: null,
    ward: null,
    address: "Nam Cat Tien Commune, Dong Nai Province, Vietnam",
  },
];

const SOURCE_WORKBOOK = process.argv[2] || "C:/Users/HP Slim/Downloads/Copy of 26.08.22 GACC phe duyrt qua.xlsx";

async function loadDongNaiRegions() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(SOURCE_WORKBOOK);
  const sheet = workbook.getWorksheet("Vùng trồng");
  if (!sheet) throw new Error('Không tìm thấy sheet "Vùng trồng".');

  const regions = [];
  sheet.eachRow((row, rowNumber) => {
    // Cột B trong file là tỉnh sau sắp xếp; C-E lần lượt là tên, mã, địa chỉ.
    if (row.getCell(2).text !== "Dong Nai") return;
    const name = row.getCell(3).text;
    const code = row.getCell(4).text;
    const address = row.getCell(5).text;
    if (!name || !code || !address) throw new Error(`Thiếu dữ liệu vùng trồng tại dòng ${rowNumber}.`);
    regions.push({
      sourceRow: rowNumber,
      currentCode: code.replace(/\s*-\s*/g, "-"),
      code,
      name,
      province: "Dong Nai",
      district: null,
      ward: null,
      address,
    });
  });
  if (!regions.length) throw new Error("File Excel không có vùng trồng thuộc Dong Nai.");
  return regions;
}

// Sheet "CSĐG", các dòng 36-38 (kết luận: thông qua).
const FACILITY_UPDATES = [
  {
    phone: "0909000003",
    code: "VN-DNPH-131",
    name: "Kim Quy OneMember LimitedLiabilityCompany",
    address: "Hamlet 9, Nam Cat Tien Commune, Dong Nai Province, Vietnam",
    province: "Dong Nai",
    ward: null,
  },
  {
    currentCode: "75-PHC-SR-00005-CHN",
    code: "VN-DNPH-120",
    name: "BA CO TIEN DURIAN COMPANY LIMITED",
    address: "Phu An commune,  Dong Nai Provice",
    province: "Dong Nai",
    ward: null,
  },
  {
    currentCode: "75-PHC-SR-00006-CHN",
    code: "VN-DNPH-129",
    name: "KHOI PHONG FARM Co.,Ldt",
    address: "Hang Gon Ward,  Dong Nai Provice",
    province: "Dong Nai",
    ward: null,
  },
];

function updateManagedRegions(value, before, after) {
  if (!Array.isArray(value)) return value;
  return value.map((item) => {
    if (!item || typeof item !== "object") return item;
    if (item.id !== before.id && item.code !== before.code) return item;
    return {
      ...item,
      id: before.id,
      code: after.code,
      name: after.name,
      province: after.province,
      district: after.district,
      ward: after.ward,
    };
  });
}

const TEXT_REPLACEMENTS = new Map([
  ["VN-DNOR-0269", "VN - DNOR - 0269"],
  ["VN-DNOR-0271", "VN - DNOR - 0271"],
  ["VN-DNOR-0272", "VN - DNOR - 0272"],
  ["VN-DNOR-0273", "VN - DNOR - 0273"],
  ["VN-DNOR-0274", "VN - DNOR - 0274"],
  ["75-PUC-SR-00001-CHN", "VN - DNOR - 0269"],
  ["75-PUC-SR-00001", "VN - DNOR - 0269"],
  ["75-PUC-SR-00002-CHN", "VN - DNOR - 0271"],
  ["75-PUC-SR-00003", "VN - DNOR - 0272"],
  ["75-PUC-SR-00004", "VN - DNOR - 0273"],
  ["75-PUC-SR-00005", "VN - DNOR - 0274"],
  ["75-PHC-SR-00002-CHN", "VN-DNPH-131"],
  ["75-PHC-SR-00001-CHN", "VN-DNPH-131"],
  ["Cơ sở Chế biến & Đóng gói Sầu riêng Trị An", "Công ty TNHH MTV Kim Quy"],
  ["Cơ sở Chế biến Sầu riêng Trị An", "Công ty TNHH MTV Kim Quy"],
  ["Tuyến ĐT 767, Xã Sông Trầu, Huyện Trảng Bom, Tỉnh Đồng Nai", "Ấp 9, xã Nam Cát Tiên, tỉnh Đồng Nai"],
]);

function normalizeJson(value) {
  if (typeof value === "string") {
    let result = value;
    for (const [from, to] of TEXT_REPLACEMENTS) result = result.replaceAll(from, to);
    return result;
  }
  if (Array.isArray(value)) return value.map(normalizeJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalizeJson(item)]));
  }
  return value;
}

function normalizeGmpData(value) {
  const data = normalizeJson(value);
  const records = data && typeof data === "object" ? data.records : null;
  if (!records || typeof records !== "object") return data;
  for (const stageRecords of Object.values(records)) {
    if (!Array.isArray(stageRecords)) continue;
    for (const record of stageRecords) {
      if (!record?.values || typeof record.values !== "object") continue;
      const normalizedCode = String(record.values.puc || "").replace(/\s*-\s*/g, "-").toUpperCase();
      const region = REGION_UPDATES.find((item) => item.currentCode === normalizedCode || item.code.replace(/\s*-\s*/g, "-") === normalizedCode);
      if (!region) continue;
      record.values.puc = region.code;
      if (record.values.origin !== undefined) record.values.origin = `${region.name} - ${region.address}`;
    }
  }
  return data;
}

async function main() {
  REGION_UPDATES = await loadDongNaiRegions();
  const summary = { regions: 0, linkedFarms: 0, facilities: 0, managerProfiles: 0, gmpWorkspaces: 0 };

  await prisma.$transaction(async (tx) => {
    for (const item of REGION_UPDATES) {
      const region = await tx.growingRegion.findFirst({
        where: { code: { in: [item.currentCode, item.code] } },
      });
      const regionData = {
          code: item.code,
          name: item.name,
          province: item.province,
          district: item.district,
          ward: item.ward,
          address: item.address,
          cropType: "Sầu riêng",
          approvalCode: item.code,
          exportMarkets: ["Trung Quốc"],
          status: "ACTIVE",
          isActive: true,
      };
      const updatedRegion = region
        ? await tx.growingRegion.update({ where: { id: region.id }, data: regionData })
        : await tx.growingRegion.create({ data: regionData });
      summary.regions += 1;

      const farms = await tx.farm.findMany({
        where: { growingRegionId: updatedRegion.id },
        orderBy: { farmCode: "asc" },
        select: { id: true },
      });
      summary.linkedFarms += farms.length;

      const profiles = await tx.areaManagerApplication.findMany({
        select: { id: true, userId: true, managedRegions: true },
      });
      for (const profile of profiles) {
        const managesRegion = Array.isArray(profile.managedRegions) && profile.managedRegions.some(
          (managed) => managed && typeof managed === "object" &&
            (managed.id === updatedRegion.id || managed.code === region?.code || managed.code === item.currentCode || managed.code === item.code),
        );
        if (!managesRegion) continue;
        const managedRegions = updateManagedRegions(profile.managedRegions, region || updatedRegion, updatedRegion);
        await tx.areaManagerApplication.update({
          where: { id: profile.id },
          data: { managedRegions },
        });
        summary.managerProfiles += 1;
      }
    }

    for (const item of FACILITY_UPDATES) {
      const facility = await tx.partnerFacility.findFirst({
        where: item.phone
          ? { phone: item.phone, type: "PROCESSING_FACILITY", deletedAt: null }
          : { code: { in: [item.currentCode, item.code] }, type: "PROCESSING_FACILITY", deletedAt: null },
      });
      if (!facility) continue;
      await tx.partnerFacility.update({
        where: { id: facility.id },
        data: {
          code: item.code,
          approvalCode: item.code,
          name: item.name,
          address: item.address,
          province: item.province,
          ward: item.ward,
        },
      });
      summary.facilities += 1;
    }

    const workspaces = await tx.processingGmpWorkspace.findMany({ select: { ownerId: true, data: true } });
    for (const workspace of workspaces) {
      const data = normalizeGmpData(workspace.data);
      if (JSON.stringify(data) === JSON.stringify(workspace.data)) continue;
      await tx.processingGmpWorkspace.update({ where: { ownerId: workspace.ownerId }, data: { data } });
      summary.gmpWorkspaces += 1;
    }
  });

  const [regions, facilities, farms] = await Promise.all([
    prisma.growingRegion.findMany({
      where: { code: { in: REGION_UPDATES.map((item) => item.code) } },
      select: { id: true, code: true, name: true, address: true, province: true, district: true, ward: true },
    }),
    prisma.partnerFacility.findMany({
      where: { code: { in: FACILITY_UPDATES.map((item) => item.code) }, deletedAt: null },
      select: { code: true, name: true, address: true, province: true, ward: true },
    }),
    prisma.farm.findMany({
      where: { growingRegion: { not: null } },
      select: {
        farmCode: true,
        address: true,
        province: true,
        district: true,
        ward: true,
        region: { select: { code: true, province: true, district: true, ward: true } },
      },
    }),
  ]);
  const regionMismatches = REGION_UPDATES.filter((expected) => !regions.some((actual) =>
    actual.code === expected.code && actual.name === expected.name && actual.address === expected.address,
  ));
  const facilityMismatches = FACILITY_UPDATES.filter((expected) => !facilities.some((actual) =>
    actual.code === expected.code && actual.name === expected.name && actual.address === expected.address,
  ));
  if (regionMismatches.length || facilityMismatches.length) {
    throw new Error(`Kiểm tra dữ liệu thất bại: regionMismatches=${regionMismatches.length}, facilityMismatches=${facilityMismatches.length}`);
  }
  summary.verification = { sourceRows: REGION_UPDATES.length, regions: regions.length, facilities: facilities.length, linkedFarms: farms.length, exactSourceMismatches: 0 };

  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
