import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("=== BẮT ĐẦU RÀ SOÁT VÀ CHUẨN HÓA MÃ VÙNG TRỒNG (PUC) ===");

    // 1. Lấy danh sách tất cả các GrowingRegion hiện tại
    const regions = await prisma.growingRegion.findMany();
    console.log(`Tìm thấy ${regions.length} vùng trồng trong CSDL:`);
    for (const r of regions) {
        console.log(`- ID: ${r.id} | Code: ${r.code} | Tên: ${r.name}`);
    }

    const regionMapById = new Map(regions.map(r => [r.id, r]));

    // 2. Rà soát & Cập nhật AreaManagerApplication
    console.log("\n--- 2. RÀ SOÁT HỒ SƠ TRƯỞNG BAN (AreaManagerApplication) ---");
    const applications = await prisma.areaManagerApplication.findMany({
        include: { user: true }
    });

    for (const app of applications) {
        let modified = false;
        let managed = app.managedRegions as any;

        if (Array.isArray(managed)) {
            managed = managed.map((item: any) => {
                if (item.code && item.code.includes("MSVT")) {
                    modified = true;
                    // Tìm region khớp theo tên hoặc tỉnh
                    const matched = regions.find(r => r.name.toLowerCase().includes(item.name?.toLowerCase() || "") || item.name?.toLowerCase().includes(r.name.toLowerCase()));
                    const newCode = matched ? matched.code : (item.name?.includes("Tân Phú") ? "75-PUC-SR-00001-CHN" : (item.name?.includes("Phú An") ? "75-PUC-SR-00002-CHN" : "75-PUC-SR-00003"));
                    console.log(`  + Đổi application ${app.id} (${app.user?.fullName}): ${item.code} -> ${newCode}`);
                    return { ...item, code: newCode, id: matched?.id || item.id };
                }
                return item;
            });
        } else if (managed && typeof managed === "object") {
            if (managed.code && managed.code.includes("MSVT")) {
                modified = true;
                const matched = regions.find(r => r.name.toLowerCase().includes(managed.name?.toLowerCase() || "") || managed.name?.toLowerCase().includes(r.name.toLowerCase()));
                const newCode = matched ? matched.code : (managed.name?.includes("Tân Phú") ? "75-PUC-SR-00001-CHN" : (managed.name?.includes("Phú An") ? "75-PUC-SR-00002-CHN" : "75-PUC-SR-00003"));
                console.log(`  + Đổi application ${app.id} (${app.user?.fullName}): ${managed.code} -> ${newCode}`);
                managed = { ...managed, code: newCode, id: matched?.id || managed.id };
            }
        }

        if (modified) {
            await prisma.areaManagerApplication.update({
                where: { id: app.id },
                data: { managedRegions: managed }
            });
            console.log(`  => Đã cập nhật AreaManagerApplication ${app.id}`);
        }

        // Đảm bảo có phân công vùng (AreaManagerRegionAssignment) cho trưởng ban này
        if (app.userId) {
            const targetRegionCode = Array.isArray(managed) ? managed[0]?.code : managed?.code;
            const targetRegion = regions.find(r => r.code === targetRegionCode);
            if (targetRegion) {
                const existingAssignment = await prisma.areaManagerRegionAssignment.findFirst({
                    where: { areaManagerId: app.userId, growingRegionId: targetRegion.id, endedAt: null }
                });
                if (!existingAssignment) {
                    await prisma.areaManagerRegionAssignment.create({
                        data: {
                            areaManagerId: app.userId,
                            growingRegionId: targetRegion.id,
                            assignedById: app.userId,
                            isActive: true,
                            note: "Tự động liên kết theo đơn đăng ký BQL"
                        }
                    });
                    console.log(`  => Đã tạo AreaManagerRegionAssignment cho user ${app.user?.fullName} -> ${targetRegion.code}`);
                }
            }
        }
    }

    // 3. Rà soát & Cập nhật mã farm (Farm.farmCode) và liên kết vùng
    console.log("\n--- 3. RÀ SOÁT TẤT CẢ VƯỜN TRỒNG (Farm) ---");
    const farms = await prisma.farm.findMany({
        include: { region: true, farmer: true },
        orderBy: { createdAt: "asc" }
    });

    console.log(`Tổng số farms: ${farms.length}`);
    const regionFarmCounter: Record<string, number> = {};

    for (const farm of farms) {
        // Xác định vùng trồng chuẩn
        let region = farm.region;
        if (!region && farm.growingRegionId) {
            region = regionMapById.get(farm.growingRegionId) || null;
        }
        if (!region && farm.growingRegion) {
            for (const r of regions) {
                if (farm.growingRegion.includes(r.code) || farm.growingRegion.toLowerCase().includes(r.name.toLowerCase())) {
                    region = r;
                    break;
                }
            }
        }
        if (!region) {
            region = regions[0]; // Mặc định vùng Tân Phú 75-PUC-SR-00001-CHN
        }

        const regionCode = region.code;
        regionFarmCounter[regionCode] = (regionFarmCounter[regionCode] || 0) + 1;
        const seq = regionFarmCounter[regionCode];

        // Nếu farmCode chứa MSVT- hoặc PENDING- hoặc chưa theo chuẩn
        const oldCode = farm.farmCode;
        let newFarmCode = farm.farmCode;

        if (!oldCode || oldCode.startsWith("MSVT-") || oldCode.startsWith("PENDING-") || oldCode.startsWith("VN-")) {
            newFarmCode = `${regionCode}-F${String(seq).padStart(2, "0")}`;
        }

        const newGrowingRegionStr = `${region.code} - ${region.name}`;

        if (newFarmCode !== oldCode || farm.growingRegionId !== region.id || farm.growingRegion !== newGrowingRegionStr) {
            await prisma.farm.update({
                where: { id: farm.id },
                data: {
                    farmCode: newFarmCode,
                    growingRegionId: region.id,
                    growingRegion: newGrowingRegionStr,
                }
            });
            console.log(`  + Farm [${farm.farmName}]: Mã cũ "${oldCode}" -> Mã mới "${newFarmCode}" | Vùng PUC: ${region.code}`);
        } else {
            console.log(`  ✓ Farm [${farm.farmName}]: ${farm.farmCode} | Vùng PUC: ${region.code}`);
        }
    }

    console.log("\n=== HOÀN TẤT RÀ SOÁT VÀ ĐỒNG BỘ CƠ SỞ DỮ LIỆU ===");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
