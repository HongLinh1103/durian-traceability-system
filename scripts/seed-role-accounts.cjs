const { PrismaClient } = require("@prisma/client");
const bcryptjs = require("bcryptjs");

const prisma = new PrismaClient();

const users = [
    { fullName: "Nguyễn Văn Hùng", role: "AREA_MANAGER", phone: "0901234567", email: "manager@triviet.vn", password: "Manager@123", approved: true },
    { fullName: "Trần Thị Mai", role: "AREA_MANAGER", phone: "0901234568", email: "area.manager2@triviet.vn", password: "123456", approved: true },
    { fullName: "Nguyễn Văn Thành", role: "AREA_MANAGER", phone: "0909123456", email: "truongban.trian@triviet.vn", password: "Truongban@123", approved: true },
    { fullName: "Trần Văn Minh", role: "FARMER", phone: "0912345678", email: "farmer@triviet.vn", password: "123456", approved: true },
    { fullName: "Lê Văn Phúc", role: "FARMER", phone: "0908123456", email: "levanphuc.phuan@triviet.vn", password: "123456", approved: true },
    { fullName: "Nguyễn Thị Lan", role: "FARMER", phone: "0908234567", email: "nguyenthilan.phuan@triviet.vn", password: "123456", approved: true },
    { fullName: "Nguyễn Văn Được", role: "FARMER", phone: "0912345670", email: null, password: "123456D", approved: false },
];

const partners = [
    {
        fullName: "Nguyễn Thành Phát", role: "COLLECTOR", phone: "0909000002", email: "collector@triviet.vn", password: "ThuMua@123",
        facility: { type: "COLLECTOR", representativeName: "Nguyễn Thành Phát", representativePhone: "0909000002", representativeEmail: "collector@triviet.vn", identityNumber: "079203000002", name: "Vựa Sầu riêng Thành Phát", organizationType: "Hộ kinh doanh", taxCode: "3603999002", businessCode: "HKD-TP-2026", phone: "0909000002", email: "collector@triviet.vn", address: "Long Khánh, Đồng Nai", province: "Đồng Nai", ward: "Phường Xuân Lập", contactPerson: "Nguyễn Thành Phát", purchasingAreas: ["Đồng Nai", "Bình Phước", "Lâm Đồng"], processingTypes: [], description: "Vựa thu mua sầu riêng trực tiếp từ nhà vườn." },
    },
    {
        fullName: "Trần Minh Anh", role: "PROCESSING_FACILITY", phone: "0909000003", email: "processing@triviet.vn", password: "CheBien@123",
        facility: { type: "PROCESSING_FACILITY", representativeName: "Trần Minh Anh", representativePhone: "0909000003", representativeEmail: "processing@triviet.vn", identityNumber: "079203000003", name: "Cơ sở Chế biến Sầu riêng Trị An", organizationType: "Doanh nghiệp", taxCode: "3603999003", businessCode: "DN-CB-2026", phone: "0909000003", email: "processing@triviet.vn", website: "https://triviet.vn", address: "Trảng Bom, Đồng Nai", province: "Đồng Nai", ward: "Xã Sông Trầu", contactPerson: "Trần Minh Anh", purchasingAreas: ["Đồng Nai", "Bình Phước"], processingTypes: ["Sầu riêng nguyên trái", "Tách múi", "Cấp đông"], expectedCapacity: 20, capacityUnit: "tấn/ngày", description: "Cơ sở tiếp nhận, sơ chế và chế biến sầu riêng." },
    },
];

const farms = [
    { farmerPhone: "0912345678", farmCode: "MSVT-TP-0001", farmName: "Vườn sầu riêng Minh Phát", areaSize: 5.2, totalTrees: 420, durianVariety: "Dona", address: "Long Khánh, Đồng Nai", province: "Đồng Nai", district: "Long Khánh", ward: "Xuân Lập", latitude: 10.945, longitude: 107.238 },
    { farmerPhone: "0908123456", farmCode: "MSVT-PA-0001", farmName: "Vườn sầu riêng Phúc An", areaSize: 3.8, totalTrees: 310, durianVariety: "Ri6", address: "Phú An, Tân Phú, Đồng Nai", province: "Đồng Nai", district: "Tân Phú", ward: "Phú An", latitude: 11.295, longitude: 107.429 },
    { farmerPhone: "0908234567", farmCode: "MSVT-LH-0001", farmName: "Vườn Dona Lan Hương", areaSize: 4.5, totalTrees: 360, durianVariety: "Dona", address: "Phú Lập, Tân Phú, Đồng Nai", province: "Đồng Nai", district: "Tân Phú", ward: "Phú Lập", latitude: 11.365, longitude: 107.347 },
];

async function saveUser(account) {
    const existing = await prisma.user.findFirst({ where: { OR: [{ phone: account.phone }, ...(account.email ? [{ email: account.email }] : [])] } });
    const password = await bcryptjs.hash(account.password, 10);
    const data = { phone: account.phone, email: account.email, password, fullName: account.fullName, role: account.role, isApproved: account.approved, isLocked: false, accountStatus: account.approved ? "APPROVED" : "PENDING", approvedAt: account.approved ? (existing?.approvedAt || new Date()) : null, deletedAt: null };
    return existing ? prisma.user.update({ where: { id: existing.id }, data }) : prisma.user.create({ data });
}

async function main() {
    const savedUsers = new Map();
    for (const account of users) {
        const user = await saveUser(account);
        savedUsers.set(account.phone, user);
        console.log(`✓ ${account.role}: ${account.fullName} (${account.phone})`);
    }
    for (const farm of farms) {
        const farmer = savedUsers.get(farm.farmerPhone);
        if (!farmer) continue;
        const existingFarm = await prisma.farm.findFirst({ where: { farmerId: farmer.id }, select: { farmCode: true, farmName: true } });
        if (existingFarm) {
            console.log(`↷ Giữ vườn hiện có: ${existingFarm.farmName} (${existingFarm.farmCode})`);
            continue;
        }
        await prisma.farm.upsert({
            where: { farmCode: farm.farmCode },
            update: { farmerId: farmer.id, farmName: farm.farmName, areaSize: farm.areaSize, totalTrees: farm.totalTrees, durianVariety: farm.durianVariety, address: farm.address, province: farm.province, district: farm.district, ward: farm.ward, latitude: farm.latitude, longitude: farm.longitude, isActive: true, isInSeason: true },
            create: { ...farm, farmerPhone: undefined, farmerId: farmer.id, areaUnit: "HECTARE", isActive: true, isInSeason: true },
        });
        await prisma.user.update({ where: { id: farmer.id }, data: { registeredAreaSize: farm.areaSize, registeredTotalTrees: farm.totalTrees, registeredDurianVariety: farm.durianVariety, province: farm.province, district: farm.district, ward: farm.ward, address: farm.address } });
        console.log(`✓ FARM: ${farm.farmName} (${farm.farmCode})`);
    }
    for (const account of partners) {
        const user = await saveUser({ ...account, approved: true });
        await prisma.partnerFacility.upsert({
            where: { ownerId: user.id },
            update: { ...account.facility, status: "APPROVED", reviewReason: null, approvedAt: new Date(), deletedAt: null },
            create: { ownerId: user.id, ...account.facility, status: "APPROVED", approvedAt: new Date() },
        });
        console.log(`✓ ${account.role}: ${account.fullName} (${account.phone})`);
    }
}

main().then(() => console.log("Đã cập nhật đầy đủ tài khoản mẫu.")).catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
