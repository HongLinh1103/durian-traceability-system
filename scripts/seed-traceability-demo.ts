import bcryptjs from "bcryptjs";
import { HarvestLot, PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();
const password = "TriViet@123";
const at = (value: string) => new Date(`${value}T08:00:00+07:00`);

async function user(email: string, phone: string, role: UserRole, fullName: string) {
    const hashed = await bcryptjs.hash(password, 10);
    return prisma.user.upsert({ where: { email }, update: { phone, role, fullName, password: hashed, isApproved: true, isLocked: false, accountStatus: "APPROVED", deletedAt: null }, create: { email, phone, role, fullName, password: hashed, isApproved: true, accountStatus: "APPROVED", approvedAt: new Date() } });
}

async function facility(ownerId: string, type: "COLLECTOR" | "PROCESSING_FACILITY") {
    return prisma.partnerFacility.upsert({
        where: { ownerId },
        update: { status: "APPROVED", deletedAt: null },
        create: {
            ownerId,
            type,
            representativeName: type === "COLLECTOR" ? "Nguyễn Thành Phát" : "Lê Văn Trị",
            representativePhone: type === "COLLECTOR" ? "0909000002" : "0909000003",
            identityNumber: type === "COLLECTOR" ? "079203000002" : "079203000003",
            name: type === "COLLECTOR" ? "Vựa Sầu riêng Thành Phát" : "Cơ sở Chế biến Sầu riêng Trị An",
            organizationType: type === "COLLECTOR" ? "Hộ kinh doanh" : "Công ty TNHH",
            phone: type === "COLLECTOR" ? "0909000002" : "0909000003",
            address: "Đồng Nai",
            province: "Đồng Nai",
            status: "APPROVED",
            approvedAt: new Date(),
        },
    });
}

async function main() {
    const admin = await user("admin@triviet.local", "0909100001", "ADMIN", "Admin TriViet Demo");
    const managerLk = await user("manager.longkhanh@triviet.local", "0909100002", "AREA_MANAGER", "Trưởng ban Long Khánh");
    const managerTp = await user("manager.tanphu@triviet.local", "0909100003", "AREA_MANAGER", "Trưởng ban Tân Phú");
    const farmers = await Promise.all(Array.from({ length: 6 }, (_, index) => user(`farmer${index + 1}@triviet.local`, `090920000${index + 1}`, "FARMER", `Nông dân Demo ${index + 1}`)));
    await Promise.all([1, 2].map((index) => user(`store${index}@triviet.local`, `090925000${index}`, "STORE_OWNER", `Chủ cửa hàng Demo ${index}`)));
    const collectors = [await user("collector@triviet.vn", "0909000002", "COLLECTOR", "Nguyễn Thành Phát")];
    const processors = [await user("processor@triviet.vn", "0909000003", "PROCESSING_FACILITY", "Lê Văn Trị")];
    const collector = await facility(collectors[0].id, "COLLECTOR");
    const processor = await facility(processors[0].id, "PROCESSING_FACILITY");

    const storeUsers = await prisma.user.findMany({ where: { email: { in: ["store1@triviet.local", "store2@triviet.local"] } }, orderBy: { email: "asc" } });
    for (let index = 0; index < storeUsers.length; index++) {
        const account = storeUsers[index];
        let store = await prisma.store.findFirst({ where: { ownerId: account.id, deletedAt: null } });
        if (!store) store = await prisma.store.create({ data: { ownerId: account.id, representativeName: account.fullName || `Chủ cửa hàng Demo ${index + 1}`, representativePhone: account.phone, identityNumber: `07920610000${index}`, name: `Cửa hàng vật tư Demo ${index + 1}`, address: "Đồng Nai", phone: account.phone, status: "APPROVED", submittedAt: new Date(), approvedAt: new Date() } });
        let product = await prisma.storeProduct.findFirst({ where: { storeId: store.id, name: `Thuốc BVTV truy xuất Demo ${index + 1}`, deletedAt: null } });
        if (!product) product = await prisma.storeProduct.create({ data: { storeId: store.id, type: "PESTICIDE", name: `Thuốc BVTV truy xuất Demo ${index + 1}`, manufacturer: "TriViet Demo", price: 120000, costPrice: 90000, stock: 100, unit: "chai", phiDays: index ? 14 : 7, status: "APPROVED" } });
        await prisma.productBatch.upsert({ where: { batchCode: `PB-STORE-${index + 1}-ACTIVE` }, update: {}, create: { batchCode: `PB-STORE-${index + 1}-ACTIVE`, storeProductId: product.id, supplierName: "Nhà cung cấp Demo", manufacturerName: product.manufacturer, manufacturingDate: at("2026-01-01"), expiryDate: at("2027-12-31"), receivedQuantity: 100, remainingQuantity: 80, status: "ACTIVE" } });
        await prisma.productBatch.upsert({ where: { batchCode: `PB-STORE-${index + 1}-EXPIRED` }, update: {}, create: { batchCode: `PB-STORE-${index + 1}-EXPIRED`, storeProductId: product.id, supplierName: "Nhà cung cấp Demo", manufacturerName: product.manufacturer, manufacturingDate: at("2024-01-01"), expiryDate: at("2025-01-01"), receivedQuantity: 20, remainingQuantity: 5, status: "EXPIRED" } });
    }

    const lk = await prisma.growingRegion.upsert({ where: { code: "MSVT-DN-LK-001" }, update: { status: "ACTIVE", isActive: true }, create: { code: "MSVT-DN-LK-001", name: "Vùng trồng sầu riêng Long Khánh", province: "Đồng Nai", district: "Long Khánh", ward: "Xuân Lập", areaSize: 125, cropVarieties: ["Ri6", "Monthong"], status: "ACTIVE", isActive: true } });
    const tp = await prisma.growingRegion.upsert({ where: { code: "MSVT-DN-TP-001" }, update: { status: "ACTIVE", isActive: true }, create: { code: "MSVT-DN-TP-001", name: "Vùng trồng sầu riêng Tân Phú", province: "Đồng Nai", district: "Tân Phú", ward: "Phú Lập", areaSize: 160, cropVarieties: ["Dona", "Ri6"], status: "ACTIVE", isActive: true } });
    for (const [manager, region] of [[managerLk, lk], [managerTp, tp]] as const) {
        const existing = await prisma.areaManagerRegionAssignment.findFirst({ where: { growingRegionId: region.id, isActive: true } });
        if (!existing) await prisma.areaManagerRegionAssignment.create({ data: { areaManagerId: manager.id, growingRegionId: region.id, assignedById: admin.id, note: "Seed traceability demo" } });
    }

    const farms = [];
    for (let index = 0; index < 6; index++) {
        const region = index < 3 ? lk : tp;
        const code = index < 3 ? `VN-LK-F00${index + 1}` : `VN-TP-F00${index - 2}`;
        const farm = await prisma.farm.upsert({ where: { farmCode: code }, update: { growingRegionId: region.id, farmerId: farmers[index].id, isActive: true, status: "ACTIVE" }, create: { farmCode: code, farmName: `Vườn sầu riêng Demo ${index + 1}`, areaSize: 3 + index, totalTrees: 250 + index * 20, durianVariety: index % 2 ? "Ri6" : "Dona", address: index < 3 ? "Xuân Lập, Long Khánh, Đồng Nai" : "Phú Lập, Tân Phú, Đồng Nai", province: "Đồng Nai", district: index < 3 ? "Long Khánh" : "Tân Phú", ward: index < 3 ? "Xuân Lập" : "Phú Lập", farmerId: farmers[index].id, growingRegionId: region.id, growingRegion: `${region.code} - ${region.name}`, isActive: true, status: "ACTIVE" } });
        farms.push(farm);
    }

    const seasons = [];
    for (const farm of farms) seasons.push(await prisma.cropSeason.upsert({ where: { farmId_year_sequence: { farmId: farm.id, year: 2026, sequence: 1 } }, update: { status: "ACTIVE" }, create: { farmId: farm.id, name: "Vụ 2026", year: 2026, sequence: 1, status: "ACTIVE", startedAt: at("2026-02-01") } }));

    for (let index = 0; index < farms.length; index++) {
        const logData = [
            { activityType: "FERTILIZE" as const, actionDate: at("2026-04-01"), notes: `TRACE-BASE-FERTILIZER-${index}`, chemicalName: "Phân hữu cơ" },
            { activityType: "SPRAY_PESTICIDE" as const, actionDate: at("2026-05-01"), notes: `TRACE-BASE-PESTICIDE-${index}`, chemicalName: "Thuốc BVTV truy xuất Demo 1", phiDays: 7 },
            { activityType: "PEST_INSPECTION" as const, actionDate: at("2026-05-15"), notes: `TRACE-BASE-MONITOR-${index}` },
            { activityType: "PRUNE" as const, actionDate: at("2026-03-01"), notes: `TRACE-BASE-CULTIVATION-${index}` },
        ];
        for (const data of logData) if (!await prisma.farmingLog.findFirst({ where: { farmId: farms[index].id, cropSeasonId: seasons[index].id, notes: data.notes } })) await prisma.farmingLog.create({ data: { farmId: farms[index].id, cropSeasonId: seasons[index].id, stage: "FRUIT_GROWING", isGACCCompliant: true, ...data } });
    }

    const activeBatches = await prisma.productBatch.findMany({ where: { batchCode: { in: ["PB-STORE-1-ACTIVE", "PB-STORE-2-ACTIVE"] } }, include: { storeProduct: { include: { store: true } } }, orderBy: { batchCode: "asc" } });
    for (let index = 0; index < 3; index++) {
        const batchItem = activeBatches[index % activeBatches.length];
        const order = await prisma.order.upsert({ where: { orderCode: `DH-TRACE-00${index + 1}` }, update: { status: "COMPLETED", paymentStatus: "PAID" }, create: { orderCode: `DH-TRACE-00${index + 1}`, farmerId: farmers[index].id, storeId: batchItem.storeProduct.store.id, status: "COMPLETED", paymentStatus: "PAID", paidAmount: 240000, paidAt: at("2026-02-10"), recipientName: farmers[index].fullName || `Nông dân Demo ${index + 1}`, recipientPhone: farmers[index].phone, shippingAddress: farms[index].address, subtotal: 240000, shippingFee: 0 } });
        let item = await prisma.orderItem.findFirst({ where: { orderId: order.id, productId: batchItem.storeProductId } });
        if (!item) item = await prisma.orderItem.create({ data: { orderId: order.id, productId: batchItem.storeProductId, productName: batchItem.storeProduct.name, unitPrice: batchItem.storeProduct.price, costPrice: batchItem.storeProduct.costPrice, quantity: 2, unit: batchItem.storeProduct.unit, storeName: batchItem.storeProduct.store.name } });
        await prisma.orderItemBatch.upsert({ where: { orderItemId_productBatchId: { orderItemId: item.id, productBatchId: batchItem.id } }, update: { quantity: 2 }, create: { orderItemId: item.id, productBatchId: batchItem.id, quantity: 2 } });
        let supply = await prisma.farmerSupply.findFirst({ where: { farmerId: farmers[index].id, orderItemId: item.id } });
        if (!supply) supply = await prisma.farmerSupply.create({ data: { farmerId: farmers[index].id, name: batchItem.storeProduct.name, type: "PESTICIDE", unit: batchItem.storeProduct.unit, quantity: 2, unitPrice: batchItem.storeProduct.price, phiDays: batchItem.storeProduct.phiDays, orderItemId: item.id, productId: batchItem.storeProductId, sourceType: "STORE_PURCHASE", storeId: batchItem.storeProduct.store.id, orderId: order.id, productBatchId: batchItem.id, verified: true } });
        let log = await prisma.farmingLog.findFirst({ where: { farmId: farms[index].id, cropSeasonId: seasons[index].id, notes: `TRACE-SEED-${index + 1}` } });
        if (!log) log = await prisma.farmingLog.create({ data: { farmId: farms[index].id, cropSeasonId: seasons[index].id, stage: "FRUIT_GROWING", actionDate: at("2026-06-01"), activityType: "SPRAY_PESTICIDE", chemicalName: supply.name, dosage: "Theo hướng dẫn", phiDays: supply.phiDays, notes: `TRACE-SEED-${index + 1}` } });
        if (!await prisma.farmingLogMaterial.findFirst({ where: { farmingLogId: log.id, supplyId: supply.id } })) await prisma.farmingLogMaterial.create({ data: { farmingLogId: log.id, supplyId: supply.id, supplyName: supply.name, supplyType: supply.type, quantity: 1, unit: supply.unit, unitPrice: supply.unitPrice, totalCost: supply.unitPrice } });
    }

    const harvestLots: HarvestLot[] = [];
    for (let index = 0; index < 4; index++) {
        const harvest = await prisma.harvestRecord.upsert({ where: { code: `TH-TRACE-00${index + 1}` }, update: { status: "COMPLETED" }, create: { code: `TH-TRACE-00${index + 1}`, farmId: farms[index].id, farmerId: farmers[index].id, cropSeasonId: seasons[index].id, buyerType: "COLLECTOR", buyerFacilityId: collector.id, buyerUserId: collectors[0].id, status: "COMPLETED", expectedHarvestDate: at("2026-08-19"), durianVariety: farms[index].durianVariety, expectedWeight: index % 2 ? 600 : 400, actualWeight: index % 2 ? 600 : 400, completedAt: at("2026-08-19") } });
        if (!await prisma.farmingLog.findUnique({ where: { harvestRecordId: harvest.id } })) await prisma.farmingLog.create({ data: { farmId: farms[index].id, cropSeasonId: seasons[index].id, harvestRecordId: harvest.id, stage: "HARVEST", activityType: "HARVEST", actionDate: at("2026-08-19"), notes: `Thu hoạch hoàn tất ${harvest.code}: ${index % 2 ? 600 : 400} kg` } });
        const lot = await prisma.harvestLot.upsert({ where: { lotCode: `HL-DEMO-00${index + 1}` }, update: { status: "FINALIZED" }, create: { lotCode: `HL-DEMO-00${index + 1}`, harvestRecordId: harvest.id, farmId: farms[index].id, cropSeasonId: seasons[index].id, harvestedAt: at("2026-08-19"), weight: index % 2 ? 600 : 400, remainingWeight: index % 2 ? 600 : 400, complianceStatus: "PASS", complianceDetails: { prohibitedPesticide: false, phiSatisfied: true }, status: "FINALIZED", finalizedAt: at("2026-08-19") } });
        await prisma.harvestTraceSnapshot.upsert({ where: { harvestLotId: lot.id }, update: {}, create: { harvestLotId: lot.id, farmerSnapshot: { name: farmers[index].fullName }, farmSnapshot: { code: farms[index].farmCode, name: farms[index].farmName }, regionSnapshot: { code: index < 3 ? lk.code : tp.code }, seasonSnapshot: { name: seasons[index].name }, cultivationSummarySnapshot: { activities: 4, verifiedSupply: true }, pesticideSnapshot: { compliant: true }, complianceSnapshot: { status: "PASS" } } });
        harvestLots.push(lot);
    }

    for (let index = 0; index < 4; index++) {
        const po = await prisma.procurementOrder.upsert({ where: { orderCode: `PO-DEMO-00${index + 1}` }, update: {}, create: { orderCode: `PO-DEMO-00${index + 1}`, sellerFarmerId: farmers[index].id, collectorFacilityId: collector.id, harvestLotId: harvestLots[index].id, expectedWeight: index % 2 ? 600 : 400, agreedWeight: index % 2 ? 580 : 390, agreedPrice: 65000, pickupDate: at("2026-08-20"), status: "RECEIVED" } });
        const receipt = await prisma.goodsReceipt.upsert({ where: { receiptCode: `GR-DEMO-00${index + 1}` }, update: {}, create: { receiptCode: `GR-DEMO-00${index + 1}`, procurementOrderId: po.id, deliveredWeight: index % 2 ? 600 : 400, receivedWeight: index % 2 ? 600 : 400, acceptedWeight: index % 2 ? 580 : 390, rejectedWeight: index % 2 ? 20 : 10, receivedAt: at("2026-08-20"), receivedById: collectors[0].id, status: "ACCEPTED" } });
        await prisma.goodsReceiptQuality.upsert({ where: { goodsReceiptId: receipt.id }, update: {}, create: { goodsReceiptId: receipt.id, appearance: "Tươi, nguyên vẹn", ripeness: "Đạt", grade: "A", result: "PASSED", inspectedAt: at("2026-08-21") } });
    }

    async function collection(code: string, indexes: number[]) {
        const total = indexes.reduce((sum, index) => sum + (index % 2 ? 580 : 390), 0);
        const lot = await prisma.collectionLot.upsert({ where: { lotCode: code }, update: { totalWeight: total, currentWeight: total }, create: { lotCode: code, collectorFacilityId: collector.id, totalWeight: total, currentWeight: total, storageLocation: "Kho Demo A1", status: "FINALIZED", finalizedAt: at("2026-08-22") } });
        for (const index of indexes) await prisma.collectionLotItem.upsert({ where: { collectionLotId_harvestLotId: { collectionLotId: lot.id, harvestLotId: harvestLots[index].id } }, update: {}, create: { collectionLotId: lot.id, harvestLotId: harvestLots[index].id, sourceWeight: index % 2 ? 580 : 390 } });
        return lot;
    }
    const retailCollection = await collection("CL-RETAIL-001", [0, 1]);
    const processCollection = await collection("CL-PROC-001", [2, 3]);

    const rawReceipt = await prisma.rawMaterialReceipt.upsert({ where: { receiptCode: "RMR-001" }, update: {}, create: { receiptCode: "RMR-001", sourceType: "COLLECTION_LOT", sourceCollectionLotId: processCollection.id, facilityId: processor.id, dispatchedWeight: 970, receivedWeight: 950, receivedAt: at("2026-08-22"), receivedById: processors[0].id, status: "ACCEPTED" } });
    const rawLot = await prisma.rawMaterialLot.upsert({ where: { lotCode: "RM-001" }, update: {}, create: { lotCode: "RM-001", facilityId: processor.id, rawMaterialReceiptId: rawReceipt.id, acceptedWeight: 900, currentWeight: 0, warehouseLocation: "Kho lạnh NL-01", status: "USED" } });
    if (!await prisma.qualityInspection.findFirst({ where: { rawMaterialLotId: rawLot.id, result: "PASSED" } })) await prisma.qualityInspection.create({ data: { rawMaterialLotId: rawLot.id, inspectorId: processors[0].id, inspectedAt: at("2026-08-22"), appearance: "Đạt", qualityGrade: "A", residueResult: "Đạt", result: "PASSED" } });
    const batch = await prisma.processingBatch.upsert({ where: { batchCode: "PB-001" }, update: {}, create: { batchCode: "PB-001", facilityId: processor.id, method: "Tách múi cấp đông", targetProduct: "Sầu riêng Ri6 cấp đông", startedAt: at("2026-08-22"), completedAt: at("2026-08-23"), supervisorId: processors[0].id, totalInputWeight: 900, totalOutputWeight: 650, lossWeight: 250, yieldPercent: 72.22, status: "COMPLETED" } });
    await prisma.processingBatchInput.upsert({ where: { processingBatchId_rawMaterialLotId: { processingBatchId: batch.id, rawMaterialLotId: rawLot.id } }, update: {}, create: { processingBatchId: batch.id, rawMaterialLotId: rawLot.id, inputWeight: 900 } });
    const finished = await prisma.finishedProductLot.upsert({ where: { lotCode: "FPL-001" }, update: {}, create: { lotCode: "FPL-001", processingBatchId: batch.id, facilityId: processor.id, productName: "Sầu riêng Ri6 cấp đông", productType: "Cấp đông", quantity: 1300, netWeight: 650, remainingWeight: 50, manufacturedAt: at("2026-08-23"), expiryDate: at("2027-02-23"), packaging: "500g/hộp", storageCondition: "Âm 18°C", warehouseLocation: "Kho TP-01", status: "PARTIALLY_DISTRIBUTED" } });

    const retail = await prisma.distributionDestination.upsert({ where: { name_address: { name: "Chợ đầu mối Thủ Đức", address: "Thủ Đức, TP.HCM" } }, update: {}, create: { name: "Chợ đầu mối Thủ Đức", type: "RETAIL", province: "TP.HCM", address: "Thủ Đức, TP.HCM" } });
    const supermarket = await prisma.distributionDestination.upsert({ where: { name_address: { name: "Siêu thị TriViet Demo", address: "Biên Hòa, Đồng Nai" } }, update: {}, create: { name: "Siêu thị TriViet Demo", type: "RETAIL", province: "Đồng Nai", address: "Biên Hòa, Đồng Nai" } });
    const china = await prisma.distributionDestination.upsert({ where: { name_address: { name: "Thị trường Trung Quốc", address: "China" } }, update: {}, create: { name: "Thị trường Trung Quốc", type: "EXPORT", country: "China", address: "China" } });

    const scenarios = [
        { lotCode: "CM-RETAIL-001", token: "TV-RETAIL-DEMO", owner: collector, ownerUser: collectors[0], ownerType: "COLLECTOR" as const, sourceType: "COLLECTION_LOT" as const, sourceId: retailCollection.id, sourceCollectionLotId: retailCollection.id, sourceFinishedProductLotId: null, destination: retail, quantity: 300, productName: "Sầu riêng tươi Dona", qrStatus: "ACTIVE" as const },
        { lotCode: "CM-COLLECTOR-RETAIL-DEMO", token: "TV-COLLECTOR-RETAIL-DEMO", owner: collector, ownerUser: collectors[0], ownerType: "COLLECTOR" as const, sourceType: "COLLECTION_LOT" as const, sourceId: retailCollection.id, sourceCollectionLotId: retailCollection.id, sourceFinishedProductLotId: null, destination: retail, quantity: 100, productName: "Sầu riêng tươi Dona", qrStatus: "ACTIVE" as const },
        { lotCode: "CM-PROCESSED-001", token: "TV-PROCESS-DEMO", owner: processor, ownerUser: processors[0], ownerType: "PROCESSING_FACILITY" as const, sourceType: "FINISHED_PRODUCT_LOT" as const, sourceId: finished.id, sourceCollectionLotId: null, sourceFinishedProductLotId: finished.id, destination: supermarket, quantity: 300, productName: finished.productName, qrStatus: "ACTIVE" as const },
        { lotCode: "CM-PROCESS-RETAIL-DEMO", token: "TV-PROCESS-RETAIL-DEMO", owner: processor, ownerUser: processors[0], ownerType: "PROCESSING_FACILITY" as const, sourceType: "FINISHED_PRODUCT_LOT" as const, sourceId: finished.id, sourceCollectionLotId: null, sourceFinishedProductLotId: finished.id, destination: supermarket, quantity: 50, productName: finished.productName, qrStatus: "ACTIVE" as const },
        { lotCode: "CM-EXPORT-001", token: "TV-EXPORT-DEMO", owner: processor, ownerUser: processors[0], ownerType: "PROCESSING_FACILITY" as const, sourceType: "FINISHED_PRODUCT_LOT" as const, sourceId: finished.id, sourceCollectionLotId: null, sourceFinishedProductLotId: finished.id, destination: china, quantity: 200, productName: finished.productName, qrStatus: "ACTIVE" as const },
        { lotCode: "CM-COLLECTOR-EXPORT-001", token: "TV-COLLECTOR-EXPORT-DEMO", owner: collector, ownerUser: collectors[0], ownerType: "COLLECTOR" as const, sourceType: "COLLECTION_LOT" as const, sourceId: retailCollection.id, sourceCollectionLotId: retailCollection.id, sourceFinishedProductLotId: null, destination: china, quantity: 200, productName: "Sầu riêng tươi xuất khẩu", qrStatus: "ACTIVE" as const },
        { lotCode: "CM-SUSPENDED-001", token: "TV-SUSPENDED-DEMO", owner: collector, ownerUser: collectors[0], ownerType: "COLLECTOR" as const, sourceType: "COLLECTION_LOT" as const, sourceId: retailCollection.id, sourceCollectionLotId: retailCollection.id, sourceFinishedProductLotId: null, destination: retail, quantity: 50, productName: "Sầu riêng tươi Dona", qrStatus: "SUSPENDED" as const },
        { lotCode: "CM-REVOKED-001", token: "TV-REVOKED-DEMO", owner: processor, ownerUser: processors[0], ownerType: "PROCESSING_FACILITY" as const, sourceType: "FINISHED_PRODUCT_LOT" as const, sourceId: finished.id, sourceCollectionLotId: null, sourceFinishedProductLotId: finished.id, destination: supermarket, quantity: 50, productName: finished.productName, qrStatus: "REVOKED" as const },
    ];
    for (const scenario of scenarios) {
        const commercial = await prisma.commercialLot.upsert({ where: { lotCode: scenario.lotCode }, update: {}, create: { lotCode: scenario.lotCode, ownerType: scenario.ownerType, ownerId: scenario.owner.id, sourceType: scenario.sourceType, sourceId: scenario.sourceId, sourceCollectionLotId: scenario.sourceCollectionLotId, sourceFinishedProductLotId: scenario.sourceFinishedProductLotId, destinationId: scenario.destination.id, productName: scenario.productName, quantity: scenario.quantity, status: "QR_ISSUED" } });
        await prisma.commercialLot.update({ where: { id: commercial.id }, data: { remainingQuantity: scenario.quantity } });
        const trace = await prisma.traceabilityCode.upsert({ where: { publicToken: scenario.token }, update: { status: scenario.qrStatus, issuedByRole: scenario.ownerUser.role }, create: { code: scenario.token, publicToken: scenario.token, commercialLotId: commercial.id, status: scenario.qrStatus, issuedAt: at("2026-08-24"), issuedById: scenario.ownerUser.id, issuedByRole: scenario.ownerUser.role, activatedAt: scenario.qrStatus === "ACTIVE" ? at("2026-08-24") : null, suspendedAt: scenario.qrStatus === "SUSPENDED" ? at("2026-08-24") : null, suspendedById: scenario.qrStatus === "SUSPENDED" ? admin.id : null, suspendReason: scenario.qrStatus === "SUSPENDED" ? "Kiểm tra chất lượng demo" : null, revokedAt: scenario.qrStatus === "REVOKED" ? at("2026-08-24") : null, revokedById: scenario.qrStatus === "REVOKED" ? admin.id : null, revokeReason: scenario.qrStatus === "REVOKED" ? "Thu hồi demo" : null } });
        await prisma.traceEvent.deleteMany({ where: { commercialLotId: commercial.id } });
        await prisma.traceEvent.createMany({ data: [
            { commercialLotId: commercial.id, entityType: "CROP_SEASON", entityId: seasons[0].id, eventType: "CROP_SEASON_STARTED", eventTime: at("2026-02-01"), title: "Bắt đầu vụ mùa", isPublic: true },
            { commercialLotId: commercial.id, entityType: "HARVEST_LOT", entityId: harvestLots[0].id, eventType: "HARVEST_LOT_FINALIZED", eventTime: at("2026-08-19"), title: "Lô thu hoạch hoàn tất", description: scenario.sourceType === "COLLECTION_LOT" ? "Nguồn từ 2 vườn" : "Nguồn thu hoạch đã xác minh", isPublic: true },
            { commercialLotId: commercial.id, entityType: scenario.sourceType, entityId: scenario.sourceId, eventType: scenario.sourceType === "COLLECTION_LOT" ? "COLLECTION_LOT_FINALIZED" : "PROCESSING_COMPLETED", eventTime: at("2026-08-22"), title: scenario.sourceType === "COLLECTION_LOT" ? "Lô thu mua hoàn tất" : "Chế biến hoàn tất", isPublic: true },
            { commercialLotId: commercial.id, entityType: "COMMERCIAL_LOT", entityId: commercial.id, eventType: "COMMERCIAL_LOT_CREATED", eventTime: at("2026-08-23"), title: "Lô thương mại được tạo", description: scenario.lotCode, isPublic: true },
            { commercialLotId: commercial.id, entityType: "TRACEABILITY_CODE", entityId: trace.id, eventType: "QR_ISSUED", eventTime: at("2026-08-24"), actorId: scenario.ownerUser.id, actorRole: scenario.ownerUser.role, title: "QR được phát hành", description: scenario.owner.name, isPublic: true },
        ] });
        await prisma.traceEvent.createMany({ data: [
            { commercialLotId: commercial.id, entityType: "HARVEST_LOT", entityId: harvestLots[0].id, eventType: "HARVEST_COMPLETED", eventTime: at("2026-08-19"), title: "Thu hoạch hoàn tất", isPublic: true },
            { commercialLotId: commercial.id, entityType: "PROCUREMENT_ORDER", entityId: scenario.sourceId, eventType: "PROCUREMENT_CONFIRMED", eventTime: at("2026-08-20"), title: "Xác nhận thu mua", isPublic: true },
            { commercialLotId: commercial.id, entityType: "GOODS_RECEIPT", entityId: scenario.sourceId, eventType: "GOODS_RECEIVED", eventTime: at("2026-08-20"), title: "Tiếp nhận nông sản", isPublic: true },
            { commercialLotId: commercial.id, entityType: "QUALITY_INSPECTION", entityId: scenario.sourceId, eventType: scenario.sourceType === "FINISHED_PRODUCT_LOT" ? "RAW_MATERIAL_QC_PASSED" : "COLLECTOR_QC_PASSED", eventTime: at("2026-08-21"), title: "Kiểm tra chất lượng đạt", isPublic: true },
        ] });
        if (scenario.qrStatus === "ACTIVE") {
            const shipment = await prisma.shipment.upsert({ where: { shipmentCode: `SHP-${scenario.lotCode}` }, update: {}, create: { shipmentCode: `SHP-${scenario.lotCode}`, senderType: scenario.ownerType, senderId: scenario.owner.id, destinationId: scenario.destination.id, dispatchAt: at("2026-08-24"), dispatchedWeight: scenario.quantity, status: "DISPATCHED", containerNumber: scenario.destination.type === "EXPORT" ? "TEST-CONT-001" : null, sealNumber: scenario.destination.type === "EXPORT" ? "TEST-SEAL-001" : null } });
            await prisma.shipmentItem.upsert({ where: { shipmentId_commercialLotId: { shipmentId: shipment.id, commercialLotId: commercial.id } }, update: {}, create: { shipmentId: shipment.id, commercialLotId: commercial.id, quantity: scenario.quantity, weight: scenario.quantity } });
            if (scenario.destination.type === "EXPORT") await prisma.exportShipmentInfo.upsert({ where: { shipmentId: shipment.id }, update: {}, create: { shipmentId: shipment.id, destinationCountry: "China", portOfLoading: "Cát Lái", portOfDestination: "China", containerNumber: "TEST-CONT-001", sealNumber: "TEST-SEAL-001", exportDate: at("2026-08-24") } });
            await prisma.traceEvent.create({ data: { commercialLotId: commercial.id, entityType: "SHIPMENT", entityId: shipment.id, eventType: scenario.destination.type === "EXPORT" ? "EXPORT_DISPATCHED" : "SHIPMENT_DISPATCHED", eventTime: at("2026-08-24"), title: "Đã xuất hàng đến điểm đến", description: scenario.destination.name, locationText: scenario.destination.address, isPublic: true } });
        }
    }
    await prisma.collectionLot.update({ where: { id: retailCollection.id }, data: { currentWeight: 320, status: "PARTIALLY_USED" } });
    await prisma.commercialLot.upsert({ where: { lotCode: "TV-NO-QR-TRACE-INCOMPLETE" }, update: { status: "DRAFT" }, create: { lotCode: "TV-NO-QR-TRACE-INCOMPLETE", ownerType: "COLLECTOR", ownerId: collector.id, sourceType: "COLLECTION_LOT", sourceId: "missing-source-demo", destinationId: retail.id, productName: "Lô thiếu liên kết nguồn", quantity: 10, status: "DRAFT" } });
    const failedHarvest = await prisma.harvestRecord.upsert({ where: { code: "TH-QC-FAILED" }, update: {}, create: { code: "TH-QC-FAILED", farmId: farms[4].id, farmerId: farmers[4].id, cropSeasonId: seasons[4].id, buyerType: "COLLECTOR", buyerFacilityId: collector.id, buyerUserId: collectors[0].id, status: "HARVESTED", expectedHarvestDate: at("2026-08-20"), durianVariety: farms[4].durianVariety, expectedWeight: 100 } });
    const blockedHarvest = await prisma.harvestLot.upsert({ where: { lotCode: "HL-QC-FAILED" }, update: { complianceStatus: "BLOCKED", status: "DRAFT" }, create: { lotCode: "HL-QC-FAILED", harvestRecordId: failedHarvest.id, farmId: farms[4].id, cropSeasonId: seasons[4].id, harvestedAt: at("2026-08-20"), weight: 100, remainingWeight: 100, complianceStatus: "BLOCKED", complianceDetails: { qc: "FAILED" }, status: "DRAFT" } });
    await prisma.commercialLot.upsert({ where: { lotCode: "TV-NO-QR-QC-FAILED" }, update: { status: "DRAFT" }, create: { lotCode: "TV-NO-QR-QC-FAILED", ownerType: "COLLECTOR", ownerId: collector.id, sourceType: "HARVEST_LOT", sourceId: blockedHarvest.id, sourceHarvestLotId: blockedHarvest.id, destinationId: retail.id, productName: "Lô QC không đạt", quantity: 50, status: "DRAFT" } });
    const directFarmer = await user("farmer.direct@triviet.local", "0909200099", "FARMER", "Nguyễn Văn An");
    const directFarm = await prisma.farm.upsert({ where: { farmCode: "VN-LK-F-DIRECT" }, update: { farmerId: directFarmer.id, growingRegionId: lk.id, isActive: true, status: "ACTIVE" }, create: { farmCode: "VN-LK-F-DIRECT", farmName: "Vườn Nguyễn Văn An", areaSize: 4, totalTrees: 320, durianVariety: "Ri6", address: "Long Khánh, Đồng Nai", province: "Đồng Nai", district: "Long Khánh", farmerId: directFarmer.id, growingRegionId: lk.id, growingRegion: `${lk.code} - ${lk.name}`, isActive: true, status: "ACTIVE" } });
    const directSeason = await prisma.cropSeason.upsert({ where: { farmId_year_sequence: { farmId: directFarm.id, year: 2026, sequence: 1 } }, update: { status: "ACTIVE" }, create: { farmId: directFarm.id, name: "Vụ 2026", year: 2026, sequence: 1, status: "ACTIVE", startedAt: at("2026-02-01") } });
    if (!await prisma.farmingLog.findFirst({ where: { farmId: directFarm.id, cropSeasonId: directSeason.id, notes: "TRACE-DIRECT-FERTILIZER" } })) await prisma.farmingLog.create({ data: { farmId: directFarm.id, cropSeasonId: directSeason.id, stage: "FRUIT_GROWING", actionDate: at("2026-05-01"), activityType: "FERTILIZE", chemicalName: "Phân hữu cơ", dosage: "5 kg/cây", notes: "TRACE-DIRECT-FERTILIZER" } });
    if (!await prisma.farmingLog.findFirst({ where: { farmId: directFarm.id, cropSeasonId: directSeason.id, notes: "TRACE-DIRECT-PEST" } })) await prisma.farmingLog.create({ data: { farmId: directFarm.id, cropSeasonId: directSeason.id, stage: "FRUIT_GROWING", actionDate: at("2026-06-01"), activityType: "SPRAY_PESTICIDE", chemicalName: "Thuốc BVTV truy xuất Demo 1", dosage: "Theo hướng dẫn", phiDays: 7, isGACCCompliant: true, notes: "TRACE-DIRECT-PEST" } });
    const market = await prisma.distributionDestination.upsert({ where: { name_address: { name: "Chợ Long Khánh", address: "Long Khánh, Đồng Nai" } }, update: { type: "MARKET" }, create: { name: "Chợ Long Khánh", type: "MARKET", province: "Đồng Nai", address: "Long Khánh, Đồng Nai" } });

    async function farmerDirectScenario(input: { harvestCode: string; harvestLotCode: string; commercialCode: string; token: string; weight: number; commercialWeight: number; remainingWeight: number; dispatch: boolean }) {
        const harvest = await prisma.harvestRecord.upsert({ where: { code: input.harvestCode }, update: { status: "COMPLETED" }, create: { code: input.harvestCode, farmId: directFarm.id, farmerId: directFarmer.id, cropSeasonId: directSeason.id, buyerType: "SELF_CONSUMPTION", status: "COMPLETED", expectedHarvestDate: at("2026-08-20"), durianVariety: "Ri6", expectedWeight: input.weight, actualWeight: input.weight, completedAt: at("2026-08-20") } });
        if (!await prisma.farmingLog.findUnique({ where: { harvestRecordId: harvest.id } })) await prisma.farmingLog.create({ data: { farmId: directFarm.id, cropSeasonId: directSeason.id, harvestRecordId: harvest.id, stage: "HARVEST", activityType: "HARVEST", actionDate: at("2026-08-20"), notes: `Thu hoạch hoàn tất ${harvest.code}: ${input.weight} kg` } });
        const harvestLot = await prisma.harvestLot.upsert({ where: { lotCode: input.harvestLotCode }, update: { remainingWeight: input.remainingWeight, complianceStatus: "PASS", status: input.remainingWeight > 0 ? "PARTIALLY_USED" : "USED" }, create: { lotCode: input.harvestLotCode, harvestRecordId: harvest.id, farmId: directFarm.id, cropSeasonId: directSeason.id, harvestedAt: at("2026-08-20"), weight: input.weight, remainingWeight: input.remainingWeight, complianceStatus: "PASS", complianceDetails: { prohibitedPesticide: false, phiSatisfied: true }, status: input.remainingWeight > 0 ? "PARTIALLY_USED" : "USED", finalizedAt: at("2026-08-20") } });
        await prisma.harvestTraceSnapshot.upsert({ where: { harvestLotId: harvestLot.id }, update: {}, create: { harvestLotId: harvestLot.id, farmerSnapshot: { name: directFarmer.fullName }, farmSnapshot: { code: directFarm.farmCode, name: directFarm.farmName }, regionSnapshot: { code: lk.code, name: lk.name }, seasonSnapshot: { name: directSeason.name }, cultivationSummarySnapshot: { activities: 4 }, pesticideSnapshot: { compliant: true }, complianceSnapshot: { status: "PASS" } } });
        const commercial = await prisma.commercialLot.upsert({ where: { lotCode: input.commercialCode }, update: { remainingQuantity: input.dispatch ? 0 : input.commercialWeight }, create: { lotCode: input.commercialCode, ownerType: "FARMER", farmerOwnerId: directFarmer.id, sourceType: "HARVEST_LOT", sourceId: harvestLot.id, sourceHarvestLotId: harvestLot.id, destinationId: market.id, productName: "Sầu riêng Ri6", quantity: input.commercialWeight, remainingQuantity: input.dispatch ? 0 : input.commercialWeight, status: input.dispatch ? "DISPATCHED" : "QR_ISSUED" } });
        await prisma.lotRelation.upsert({ where: { sourceType_sourceId_targetType_targetId_relationType: { sourceType: "HARVEST_LOT", sourceId: harvestLot.id, targetType: "COMMERCIAL_LOT", targetId: commercial.id, relationType: "SOLD_DIRECTLY_AS" } }, update: { quantity: input.commercialWeight }, create: { sourceType: "HARVEST_LOT", sourceId: harvestLot.id, targetType: "COMMERCIAL_LOT", targetId: commercial.id, relationType: "SOLD_DIRECTLY_AS", quantity: input.commercialWeight } });
        const trace = await prisma.traceabilityCode.upsert({ where: { publicToken: input.token }, update: { status: "ACTIVE", issuedByRole: "FARMER" }, create: { code: input.token, publicToken: input.token, commercialLotId: commercial.id, status: "ACTIVE", issuedAt: at("2026-08-24"), issuedById: directFarmer.id, issuedByRole: "FARMER", activatedAt: at("2026-08-24") } });
        await prisma.traceEvent.deleteMany({ where: { commercialLotId: commercial.id } });
        await prisma.traceEvent.createMany({ data: [
            { commercialLotId: commercial.id, entityType: "CROP_SEASON", entityId: directSeason.id, eventType: "CROP_SEASON_STARTED", eventTime: at("2026-02-01"), title: "Bắt đầu vụ mùa", isPublic: true },
            { commercialLotId: commercial.id, entityType: "HARVEST_LOT", entityId: harvestLot.id, eventType: "HARVEST_LOT_FINALIZED", eventTime: at("2026-08-20"), title: "Lô thu hoạch hoàn tất", isPublic: true },
            { commercialLotId: commercial.id, entityType: "HARVEST_LOT", entityId: harvestLot.id, eventType: "HARVEST_COMPLETED", eventTime: at("2026-08-20"), title: "Thu hoạch hoàn tất", description: `${input.commercialWeight} kg`, isPublic: true },
            { commercialLotId: commercial.id, entityType: "COMMERCIAL_LOT", entityId: commercial.id, eventType: "DIRECT_SALE_PREPARED", eventTime: at("2026-08-23"), title: "Chuẩn bị bán trực tiếp", isPublic: true },
            { commercialLotId: commercial.id, entityType: "TRACEABILITY_CODE", entityId: trace.id, eventType: "QR_ISSUED", eventTime: at("2026-08-24"), actorId: directFarmer.id, actorRole: "FARMER", title: "QR được phát hành", description: "Hộ sản xuất Nguyễn Văn An", isPublic: true },
        ] });
        if (input.dispatch) {
            const shipment = await prisma.shipment.upsert({ where: { shipmentCode: `SHP-${input.commercialCode}` }, update: {}, create: { shipmentCode: `SHP-${input.commercialCode}`, senderType: "FARMER", farmerSenderId: directFarmer.id, destinationId: market.id, dispatchAt: at("2026-08-24"), dispatchedWeight: input.commercialWeight, status: "DISPATCHED" } });
            await prisma.shipmentItem.upsert({ where: { shipmentId_commercialLotId: { shipmentId: shipment.id, commercialLotId: commercial.id } }, update: {}, create: { shipmentId: shipment.id, commercialLotId: commercial.id, quantity: input.commercialWeight, weight: input.commercialWeight } });
            await prisma.traceEvent.create({ data: { commercialLotId: commercial.id, entityType: "SHIPMENT", entityId: shipment.id, eventType: "DIRECT_RETAIL_DISPATCHED", eventTime: at("2026-08-24"), actorId: directFarmer.id, actorRole: "FARMER", title: "Đã xuất bán trực tiếp", description: market.name, locationText: market.address, metadata: { sourceActor: "FARMER", destinationType: "MARKET" }, isPublic: true } });
        }
        return { harvestLot, commercial };
    }
    await farmerDirectScenario({ harvestCode: "TH-DIRECT-001", harvestLotCode: "HL-DIRECT-001", commercialCode: "CM-FARM-001", token: "TV-FARMER-DIRECT-DEMO", weight: 500, commercialWeight: 150, remainingWeight: 350, dispatch: true });
    const partial = await farmerDirectScenario({ harvestCode: "TH-PARTIAL-001", harvestLotCode: "HL-PARTIAL-001", commercialCode: "CM-FARM-PARTIAL-001", token: "TV-FARMER-PARTIAL-DEMO", weight: 500, commercialWeight: 150, remainingWeight: 150, dispatch: false });
    await prisma.procurementOrder.upsert({ where: { orderCode: "PO-FARM-PARTIAL-001" }, update: { agreedWeight: 200 }, create: { orderCode: "PO-FARM-PARTIAL-001", sellerFarmerId: directFarmer.id, collectorFacilityId: collector.id, harvestLotId: partial.harvestLot.id, expectedWeight: 200, agreedWeight: 200, agreedPrice: 65000, pickupDate: at("2026-08-21"), status: "CONFIRMED" } });

    const qcFailHarvestRecord = await prisma.harvestRecord.upsert({ where: { code: "TH-COLLECTOR-QC-FAILED" }, update: {}, create: { code: "TH-COLLECTOR-QC-FAILED", farmId: farms[5].id, farmerId: farmers[5].id, cropSeasonId: seasons[5].id, buyerType: "COLLECTOR", buyerFacilityId: collector.id, buyerUserId: collectors[0].id, status: "COMPLETED", expectedHarvestDate: at("2026-08-20"), durianVariety: farms[5].durianVariety, expectedWeight: 100, actualWeight: 100, completedAt: at("2026-08-20") } });
    const qcFailHarvest = await prisma.harvestLot.upsert({ where: { lotCode: "HL-COLLECTOR-QC-FAILED" }, update: {}, create: { lotCode: "HL-COLLECTOR-QC-FAILED", harvestRecordId: qcFailHarvestRecord.id, farmId: farms[5].id, cropSeasonId: seasons[5].id, harvestedAt: at("2026-08-20"), weight: 100, remainingWeight: 100, complianceStatus: "PASS", status: "FINALIZED", finalizedAt: at("2026-08-20") } });
    await prisma.harvestTraceSnapshot.upsert({ where: { harvestLotId: qcFailHarvest.id }, update: {}, create: { harvestLotId: qcFailHarvest.id, farmerSnapshot: { name: farmers[5].fullName }, farmSnapshot: { code: farms[5].farmCode }, regionSnapshot: { code: tp.code }, seasonSnapshot: { name: seasons[5].name }, cultivationSummarySnapshot: { activities: 4 }, pesticideSnapshot: { compliant: true }, complianceSnapshot: { status: "PASS" } } });
    const qcFailOrder = await prisma.procurementOrder.upsert({ where: { orderCode: "PO-COLLECTOR-QC-FAILED" }, update: {}, create: { orderCode: "PO-COLLECTOR-QC-FAILED", sellerFarmerId: farmers[5].id, collectorFacilityId: collector.id, harvestLotId: qcFailHarvest.id, expectedWeight: 100, agreedWeight: 100, pickupDate: at("2026-08-21"), status: "RECEIVED" } });
    const qcFailReceipt = await prisma.goodsReceipt.upsert({ where: { receiptCode: "GR-COLLECTOR-QC-FAILED" }, update: {}, create: { receiptCode: "GR-COLLECTOR-QC-FAILED", procurementOrderId: qcFailOrder.id, deliveredWeight: 100, receivedWeight: 100, acceptedWeight: 0, rejectedWeight: 100, receivedAt: at("2026-08-21"), receivedById: collectors[0].id, status: "REJECTED" } });
    await prisma.goodsReceiptQuality.upsert({ where: { goodsReceiptId: qcFailReceipt.id }, update: { result: "FAILED" }, create: { goodsReceiptId: qcFailReceipt.id, result: "FAILED", note: "QC failed demo", inspectedAt: at("2026-08-21") } });
    const qcFailCollection = await prisma.collectionLot.upsert({ where: { lotCode: "CL-QC-FAILED" }, update: {}, create: { lotCode: "CL-QC-FAILED", collectorFacilityId: collector.id, totalWeight: 100, currentWeight: 100, status: "FINALIZED", finalizedAt: at("2026-08-22") } });
    await prisma.collectionLotItem.upsert({ where: { collectionLotId_harvestLotId: { collectionLotId: qcFailCollection.id, harvestLotId: qcFailHarvest.id } }, update: {}, create: { collectionLotId: qcFailCollection.id, harvestLotId: qcFailHarvest.id, sourceWeight: 100 } });
    await prisma.commercialLot.upsert({ where: { lotCode: "CM-COLLECTOR-QC-FAILED" }, update: { status: "DRAFT" }, create: { lotCode: "CM-COLLECTOR-QC-FAILED", ownerType: "COLLECTOR", ownerId: collector.id, sourceType: "COLLECTION_LOT", sourceId: qcFailCollection.id, sourceCollectionLotId: qcFailCollection.id, destinationId: retail.id, productName: "Lô QC thu mua không đạt", quantity: 50, remainingQuantity: 50, status: "DRAFT" } });

    const processorFailReceipt = await prisma.rawMaterialReceipt.upsert({ where: { receiptCode: "RMR-QC-FAILED" }, update: {}, create: { receiptCode: "RMR-QC-FAILED", sourceType: "HARVEST_LOT", sourceHarvestLotId: qcFailHarvest.id, facilityId: processor.id, dispatchedWeight: 100, receivedWeight: 100, receivedAt: at("2026-08-22"), receivedById: processors[0].id, status: "ACCEPTED" } });
    const processorFailRaw = await prisma.rawMaterialLot.upsert({ where: { lotCode: "RM-QC-FAILED" }, update: {}, create: { lotCode: "RM-QC-FAILED", facilityId: processor.id, rawMaterialReceiptId: processorFailReceipt.id, acceptedWeight: 100, currentWeight: 100, status: "QUARANTINED" } });
    if (!await prisma.qualityInspection.findFirst({ where: { rawMaterialLotId: processorFailRaw.id, result: "FAILED" } })) await prisma.qualityInspection.create({ data: { rawMaterialLotId: processorFailRaw.id, inspectorId: processors[0].id, inspectedAt: at("2026-08-22"), result: "FAILED", note: "Processor QC failed demo" } });
    const processorFailBatch = await prisma.processingBatch.upsert({ where: { batchCode: "PB-QC-FAILED" }, update: {}, create: { batchCode: "PB-QC-FAILED", facilityId: processor.id, method: "Demo QC failed", targetProduct: "Không phân phối", startedAt: at("2026-08-22"), completedAt: at("2026-08-23"), supervisorId: processors[0].id, totalInputWeight: 100, totalOutputWeight: 70, lossWeight: 30, yieldPercent: 70, status: "COMPLETED" } });
    await prisma.processingBatchInput.upsert({ where: { processingBatchId_rawMaterialLotId: { processingBatchId: processorFailBatch.id, rawMaterialLotId: processorFailRaw.id } }, update: {}, create: { processingBatchId: processorFailBatch.id, rawMaterialLotId: processorFailRaw.id, inputWeight: 100 } });
    const processorFailFinished = await prisma.finishedProductLot.upsert({ where: { lotCode: "FPL-QC-FAILED" }, update: {}, create: { lotCode: "FPL-QC-FAILED", processingBatchId: processorFailBatch.id, facilityId: processor.id, productName: "Thành phẩm QC không đạt", productType: "Demo", quantity: 70, netWeight: 70, remainingWeight: 70, manufacturedAt: at("2026-08-23"), status: "READY_FOR_DISTRIBUTION" } });
    await prisma.commercialLot.upsert({ where: { lotCode: "CM-PROCESSOR-QC-FAILED" }, update: { status: "DRAFT" }, create: { lotCode: "CM-PROCESSOR-QC-FAILED", ownerType: "PROCESSING_FACILITY", ownerId: processor.id, sourceType: "FINISHED_PRODUCT_LOT", sourceId: processorFailFinished.id, sourceFinishedProductLotId: processorFailFinished.id, destinationId: supermarket.id, productName: processorFailFinished.productName, quantity: 50, remainingQuantity: 50, status: "DRAFT" } });

    console.log("Traceability demo seeded. Password:", password);
    console.log("Tokens: TV-FARMER-DIRECT-DEMO, TV-COLLECTOR-RETAIL-DEMO, TV-PROCESS-RETAIL-DEMO, TV-EXPORT-DEMO, TV-SUSPENDED-DEMO, TV-REVOKED-DEMO");
}

main().finally(() => prisma.$disconnect());
