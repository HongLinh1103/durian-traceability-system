import { PrismaClient, PartnerExpenseCategory, ExpensePaymentStatus, OrderPaymentStatus } from "@prisma/client";

const prisma = new PrismaClient();

function at(dateStr: string) {
    return new Date(`${dateStr}T08:00:00.000Z`);
}

async function main() {
    console.log("🌱 Bắt đầu tạo số liệu tài chính cho Vựa Thành Phát và Xưởng Trị An...");

    // 1. Tìm thông tin Vựa thu mua và Cơ sở chế biến
    let collector = await prisma.partnerFacility.findFirst({
        where: { type: "COLLECTOR", deletedAt: null },
    });
    if (!collector) {
        collector = await prisma.partnerFacility.findFirst({
            where: { type: "COLLECTOR" },
        });
    }

    let processor = await prisma.partnerFacility.findFirst({
        where: { type: "PROCESSING_FACILITY", deletedAt: null },
    });
    if (!processor) {
        processor = await prisma.partnerFacility.findFirst({
            where: { type: "PROCESSING_FACILITY" },
        });
    }

    if (!collector || !processor) {
        console.error("❌ Không tìm thấy cơ sở Vựa thu mua hoặc Cơ sở chế biến trong hệ thống.");
        return;
    }

    console.log(`🏢 Vựa thu mua: ${collector.name} (ID: ${collector.id})`);
    console.log(`🏭 Cơ sở chế biến: ${processor.name} (ID: ${processor.id})`);

    // 2. Tìm hoặc tạo các điểm đến phân phối
    const destinations = {
        thuduc: await prisma.distributionDestination.upsert({
            where: { name_address: { name: "Chợ đầu mối Nông sản Thủ Đức", address: "Quốc lộ 1A, P. Tam Bình, TP. Thủ Đức, TP.HCM" } },
            update: {},
            create: { name: "Chợ đầu mối Nông sản Thủ Đức", type: "MARKET", province: "TP.HCM", address: "Quốc lộ 1A, P. Tam Bình, TP. Thủ Đức, TP.HCM" }
        }),
        hocmon: await prisma.distributionDestination.upsert({
            where: { name_address: { name: "Chợ đầu mối Nông sản Hóc Môn", address: "Nguyễn Thị Sóc, Hóc Môn, TP.HCM" } },
            update: {},
            create: { name: "Chợ đầu mối Nông sản Hóc Môn", type: "MARKET", province: "TP.HCM", address: "Nguyễn Thị Sóc, Hóc Môn, TP.HCM" }
        }),
        binhdien: await prisma.distributionDestination.upsert({
            where: { name_address: { name: "Chợ đầu mối Bình Điền", address: "Đại lộ Nguyễn Văn Linh, P.7, Q.8, TP.HCM" } },
            update: {},
            create: { name: "Chợ đầu mối Bình Điền", type: "MARKET", province: "TP.HCM", address: "Đại lộ Nguyễn Văn Linh, P.7, Q.8, TP.HCM" }
        }),
        coopmart: await prisma.distributionDestination.upsert({
            where: { name_address: { name: "Hệ thống Siêu thị Co.opmart", address: "199-205 Nguyễn Thái Học, P. Phạm Ngũ Lão, Q.1, TP.HCM" } },
            update: {},
            create: { name: "Hệ thống Siêu thị Co.opmart", type: "RETAIL", province: "TP.HCM", address: "199-205 Nguyễn Thái Học, P. Phạm Ngũ Lão, Q.1, TP.HCM" }
        }),
        winmart: await prisma.distributionDestination.upsert({
            where: { name_address: { name: "Chuỗi Siêu thị WinMart", address: "Khu thương mại Vincom Plaza, Biên Hòa, Đồng Nai" } },
            update: {},
            create: { name: "Chuỗi Siêu thị WinMart", type: "RETAIL", province: "Đồng Nai", address: "Khu thương mại Vincom Plaza, Biên Hòa, Đồng Nai" }
        }),
        abcExport: await prisma.distributionDestination.upsert({
            where: { name_address: { name: "Công ty CP Xuất nhập khẩu ABC", address: "Tòa nhà Pearl Plaza, Bình Thạnh, TP.HCM" } },
            update: {},
            create: { name: "Công ty CP Xuất nhập khẩu ABC", type: "DISTRIBUTOR", province: "TP.HCM", address: "Tòa nhà Pearl Plaza, Bình Thạnh, TP.HCM" }
        }),
        chinaMarket: await prisma.distributionDestination.upsert({
            where: { name_address: { name: "Thị trường Trung Quốc (GACC Registered)", address: "Cửa khẩu Quốc tế Hữu Nghị, Lạng Sơn" } },
            update: {},
            create: { name: "Thị trường Trung Quốc (GACC Registered)", type: "EXPORT", country: "Trung Quốc", address: "Cửa khẩu Quốc tế Hữu Nghị, Lạng Sơn" }
        }),
    };

    // 3. Tìm vườn và nông dân để gán cho các phiếu thu mua
    const farmers = await prisma.user.findMany({ where: { role: "FARMER" }, take: 5 });
    const farms = await prisma.farm.findMany({ take: 5 });

    const farmer1 = farmers[0] || { id: collector.ownerId, fullName: "Nguyễn Văn Phát", phone: "0912345678" };
    const farmer2 = farmers[1] || farmer1;
    const farm1 = farms[0] || { id: "farm-1", farmName: "Vườn sầu riêng Minh Phát", farmCode: "VN-LK-F001" };
    const farm2 = farms[1] || farm1;

    // =========================================================================
    // A. SỐ LIỆU TÀI CHÍNH VỰA SẦU RIÊNG THÀNH PHÁT (COLLECTOR)
    // =========================================================================
    console.log("📊 Đang khởi tạo số liệu tài chính cho Vựa Thành Phát...");

    // A1. Lô xuất bán thương mại (Doanh thu & Công nợ khách hàng)
    const collectorSales = [
        // THÁNG 5/2026
        {
            lotCode: "CM-COL-20260515-001",
            productName: "Sầu riêng tươi Ri6 Loại 1",
            quantity: 2200,
            stockBeforeDispatch: 2500,
            buyerName: "Chợ đầu mối Nông sản Thủ Đức",
            buyerPhone: "0908112233",
            buyerAddress: destinations.thuduc.address,
            destinationId: destinations.thuduc.id,
            unitPrice: 78000,
            subtotal: 171600000,
            discount: 1600000,
            totalAmount: 170000000,
            paidAmount: 170000000,
            debtAmount: 0,
            paymentStatus: "PAID",
            paymentMethod: "Chuyển khoản",
            dispatchedAt: at("2026-05-15"),
        },
        // THÁNG 6/2026
        {
            lotCode: "CM-COL-20260618-001",
            productName: "Sầu riêng tươi Ri6",
            quantity: 800,
            stockBeforeDispatch: 1500,
            buyerName: "Chợ đầu mối Nông sản Hóc Môn",
            buyerPhone: "0918223344",
            buyerAddress: destinations.hocmon.address,
            destinationId: destinations.hocmon.id,
            unitPrice: 80000,
            subtotal: 64000000,
            discount: 0,
            totalAmount: 64000000,
            paidAmount: 64000000,
            debtAmount: 0,
            paymentStatus: "PAID",
            paymentMethod: "Chuyển khoản",
            dispatchedAt: at("2026-06-18"),
        },
        {
            lotCode: "CM-COL-20260626-001",
            productName: "Sầu riêng tươi Dona Đắk Lắk",
            quantity: 2500,
            stockBeforeDispatch: 3000,
            buyerName: "Chợ đầu mối Bình Điền",
            buyerPhone: "0903334455",
            buyerAddress: destinations.binhdien.address,
            destinationId: destinations.binhdien.id,
            unitPrice: 82000,
            subtotal: 205000000,
            discount: 0,
            totalAmount: 205000000,
            paidAmount: 205000000,
            debtAmount: 0,
            paymentStatus: "PAID",
            paymentMethod: "Chuyển khoản",
            dispatchedAt: at("2026-06-26"),
        },
        // THÁNG 7/2026
        {
            lotCode: "CM-COL-20260715-001",
            productName: "Sầu riêng tươi Dona",
            quantity: 1200,
            stockBeforeDispatch: 2500,
            buyerName: "Chợ đầu mối Bình Điền",
            buyerPhone: "0903334455",
            buyerAddress: destinations.binhdien.address,
            destinationId: destinations.binhdien.id,
            unitPrice: 82000,
            subtotal: 98400000,
            discount: 0,
            totalAmount: 98400000,
            paidAmount: 98400000,
            debtAmount: 0,
            paymentStatus: "PAID",
            paymentMethod: "Tiền mặt",
            dispatchedAt: at("2026-07-15"),
        },
        {
            lotCode: "CM-COL-20260728-001",
            productName: "Sầu riêng tươi Ri6 tuyển chọn",
            quantity: 3400,
            stockBeforeDispatch: 4000,
            buyerName: "Chợ đầu mối Nông sản Thủ Đức",
            buyerPhone: "0908112233",
            buyerAddress: destinations.thuduc.address,
            destinationId: destinations.thuduc.id,
            unitPrice: 84000,
            subtotal: 285600000,
            discount: 1600000,
            totalAmount: 284000000,
            paidAmount: 254000000,
            debtAmount: 30000000,
            paymentStatus: "PARTIAL",
            paymentMethod: "Chuyển khoản",
            dispatchedAt: at("2026-07-28"),
        },
        // THÁNG 8/2026
        {
            lotCode: "CM-COL-20260824-001",
            productName: "Sầu riêng tươi Ri6",
            quantity: 1500,
            stockBeforeDispatch: 4600,
            buyerName: "Chợ đầu mối Nông sản Thủ Đức",
            buyerPhone: "0912345678",
            buyerAddress: "Quốc lộ 1A, P. Tam Bình, TP. Thủ Đức, TP. Hồ Chí Minh",
            destinationId: destinations.thuduc.id,
            unitPrice: 85000,
            subtotal: 127500000,
            discount: 2500000,
            totalAmount: 125000000,
            paidAmount: 80000000,
            debtAmount: 45000000,
            paymentStatus: "PARTIAL",
            paymentMethod: "Chuyển khoản",
            dispatchedAt: at("2026-08-24"),
        },
        {
            lotCode: "CM-COL-20260827-001",
            productName: "Sầu riêng quả tươi Ri6",
            quantity: 1000,
            stockBeforeDispatch: 3500,
            buyerName: "Công ty CP Xuất nhập khẩu ABC",
            buyerPhone: "0977889900",
            buyerAddress: destinations.abcExport.address,
            destinationId: destinations.abcExport.id,
            unitPrice: 85000,
            subtotal: 85000000,
            discount: 2000000,
            totalAmount: 83000000,
            paidAmount: 50000000,
            debtAmount: 33000000,
            paymentStatus: "PARTIAL",
            paymentMethod: "Chuyển khoản",
            dispatchedAt: at("2026-08-27"),
        },
        {
            lotCode: "CM-EXP-20260828-001",
            productName: "Sầu riêng quả tươi xuất khẩu chuẩn GACC",
            quantity: 3000,
            stockBeforeDispatch: 3000,
            buyerName: "Thị trường Trung Quốc (GACC Registered)",
            buyerPhone: "+86-771-5588990",
            buyerAddress: destinations.chinaMarket.address,
            destinationId: destinations.chinaMarket.id,
            unitPrice: 95000,
            subtotal: 285000000,
            discount: 0,
            totalAmount: 285000000,
            paidAmount: 285000000,
            debtAmount: 0,
            paymentStatus: "PAID",
            paymentMethod: "Chuyển khoản",
            dispatchedAt: at("2026-08-28"),
        },
    ];

    for (const item of collectorSales) {
        const lot = await prisma.commercialLot.upsert({
            where: { lotCode: item.lotCode },
            update: {
                ownerId: collector.id,
                ownerType: "COLLECTOR",
                productName: item.productName,
                quantity: item.quantity,
                stockBeforeDispatch: item.stockBeforeDispatch,
                buyerName: item.buyerName,
                buyerPhone: item.buyerPhone,
                buyerAddress: item.buyerAddress,
                destinationId: item.destinationId,
                unitPrice: item.unitPrice,
                subtotal: item.subtotal,
                discount: item.discount,
                totalAmount: item.totalAmount,
                paidAmount: item.paidAmount,
                debtAmount: item.debtAmount,
                paymentStatus: item.paymentStatus as OrderPaymentStatus,
                paymentMethod: item.paymentMethod,
                dispatchedAt: item.dispatchedAt,
                status: "DISPATCHED",
            },
            create: {
                lotCode: item.lotCode,
                ownerId: collector.id,
                ownerType: "COLLECTOR",
                sourceType: "COLLECTION_LOT",
                sourceId: "CL-DEMO",
                destinationId: item.destinationId,
                productName: item.productName,
                quantity: item.quantity,
                stockBeforeDispatch: item.stockBeforeDispatch,
                buyerName: item.buyerName,
                buyerPhone: item.buyerPhone,
                buyerAddress: item.buyerAddress,
                unitPrice: item.unitPrice,
                subtotal: item.subtotal,
                discount: item.discount,
                totalAmount: item.totalAmount,
                paidAmount: item.paidAmount,
                debtAmount: item.debtAmount,
                paymentStatus: item.paymentStatus as OrderPaymentStatus,
                paymentMethod: item.paymentMethod,
                dispatchedAt: item.dispatchedAt,
                status: "DISPATCHED",
            },
        });

        // Tạo bản ghi nhật ký dòng tiền đã thu
        if (item.paidAmount > 0) {
            await prisma.partnerPaymentRecord.deleteMany({ where: { commercialLotId: lot.id } });
            await prisma.partnerPaymentRecord.create({
                data: {
                    facilityId: collector.id,
                    commercialLotId: lot.id,
                    type: "RECEIPT",
                    amount: item.paidAmount,
                    paymentDate: item.dispatchedAt,
                    paymentMethod: item.paymentMethod,
                    payerName: item.buyerName,
                    note: `Thanh toán tiền hàng lô ${item.lotCode}`,
                },
            });
        }
    }

    // A2. Phiếu thu mua từ nhà vườn (Harvest Purchases) cho Vựa
    const collectorPurchases = [
        { code: "TH-COL-MAY-01", variety: "Ri6", weight: 2400, price: 62000, date: "2026-05-10", farm: farm1, farmer: farmer1 },
        { code: "TH-COL-JUN-01", variety: "Ri6", weight: 1500, price: 64000, date: "2026-06-12", farm: farm1, farmer: farmer1 },
        { code: "TH-COL-JUN-02", variety: "Dona", weight: 2300, price: 66000, date: "2026-06-20", farm: farm2, farmer: farmer2 },
        { code: "TH-COL-JUL-01", variety: "Dona", weight: 2200, price: 65000, date: "2026-07-08", farm: farm1, farmer: farmer1 },
        { code: "TH-COL-JUL-02", variety: "Ri6", weight: 3000, price: 67000, date: "2026-07-22", farm: farm2, farmer: farmer2 },
        { code: "TH-COL-AUG-01", variety: "Ri6", weight: 3500, price: 68000, date: "2026-08-18", farm: farm1, farmer: farmer1 },
        { code: "TH-COL-AUG-02", variety: "Ri6", weight: 3000, price: 68000, date: "2026-08-22", farm: farm2, farmer: farmer2 },
    ];

    for (const p of collectorPurchases) {
        await prisma.harvestRecord.upsert({
            where: { code: p.code },
            update: {
                buyerUserId: collector.ownerId,
                buyerFacilityId: collector.id,
                actualWeight: p.weight,
                expectedWeight: p.weight,
                receivedWeight: p.weight,
                expectedPricePerKg: p.price,
                status: "COMPLETED",
                completedAt: at(p.date),
                expectedHarvestDate: at(p.date),
            },
            create: {
                code: p.code,
                farmId: p.farm.id,
                farmerId: p.farmer.id,
                buyerType: "COLLECTOR",
                buyerUserId: collector.ownerId,
                buyerFacilityId: collector.id,
                status: "COMPLETED",
                durianVariety: p.variety,
                expectedHarvestDate: at(p.date),
                expectedWeight: p.weight,
                actualWeight: p.weight,
                receivedWeight: p.weight,
                expectedPricePerKg: p.price,
                completedAt: at(p.date),
            },
        });
    }

    // A3. Chi phí vận hành của Vựa thu mua
    const collectorExpenses = [
        { category: "LOGISTICS_TRANSPORT" as PartnerExpenseCategory, title: "Thuê xe tải 5 tấn vận chuyển sầu tháng 5", amount: 6500000, paidAmount: 6500000, status: "PAID" as ExpensePaymentStatus, date: "2026-05-15", recipient: "Đội xe tải Thành Công" },
        { category: "PROCESSING_LABOR" as PartnerExpenseCategory, title: "Nhân công bốc xếp phân loại tháng 5", amount: 3000000, paidAmount: 3000000, status: "PAID" as ExpensePaymentStatus, date: "2026-05-16", recipient: "Tổ bốc xếp vựa Thành Phát" },
        { category: "LOGISTICS_TRANSPORT" as PartnerExpenseCategory, title: "Thuê xe tải vận chuyển sầu tháng 6", amount: 5500000, paidAmount: 5500000, status: "PAID" as ExpensePaymentStatus, date: "2026-06-18", recipient: "Đội xe tải Thành Công" },
        { category: "PROCESSING_LABOR" as PartnerExpenseCategory, title: "Nhân công bốc xếp và đóng sọt tháng 6", amount: 3700000, paidAmount: 3700000, status: "PAID" as ExpensePaymentStatus, date: "2026-06-25", recipient: "Tổ bốc xếp vựa Thành Phát" },
        { category: "LOGISTICS_TRANSPORT" as PartnerExpenseCategory, title: "Thuê xe tải giao hàng chợ đầu mối tháng 7", amount: 8200000, paidAmount: 8200000, status: "PAID" as ExpensePaymentStatus, date: "2026-07-15", recipient: "Đội xe tải Thành Công" },
        { category: "PROCESSING_LABOR" as PartnerExpenseCategory, title: "Tiền công bốc xếp phân loại tháng 7", amount: 4600000, paidAmount: 4600000, status: "PAID" as ExpensePaymentStatus, date: "2026-07-28", recipient: "Tổ bốc xếp vựa Thành Phát" },
        { category: "LOGISTICS_TRANSPORT" as PartnerExpenseCategory, title: "Thuê xe tải giao hàng đợt 1 tháng 8", amount: 6500000, paidAmount: 6500000, status: "PAID" as ExpensePaymentStatus, date: "2026-08-20", recipient: "Đội xe tải Thành Công" },
        { category: "LOGISTICS_TRANSPORT" as PartnerExpenseCategory, title: "Thuê container lạnh xuất khẩu tháng 8", amount: 15000000, paidAmount: 10000000, status: "PARTIAL" as ExpensePaymentStatus, date: "2026-08-28", recipient: "Công ty Logistics Tân Cảng", note: "Còn nợ nhà xe 5.000.000 đ" },
        { category: "PROCESSING_LABOR" as PartnerExpenseCategory, title: "Tiền công bốc xếp phân loại hàng xuất khẩu", amount: 5200000, paidAmount: 5200000, status: "PAID" as ExpensePaymentStatus, date: "2026-08-24", recipient: "Tổ bốc xếp vựa Thành Phát" },
        { category: "FACTORY_OVERHEAD" as PartnerExpenseCategory, title: "Sọt nhựa & vật tư bọc trái chống dập", amount: 4800000, paidAmount: 4800000, status: "PAID" as ExpensePaymentStatus, date: "2026-08-21", recipient: "Đại lý Nhựa Tân Tiến" },
    ];

    for (const exp of collectorExpenses) {
        const createdExp = await prisma.partnerExpense.create({
            data: {
                facilityId: collector.id,
                category: exp.category,
                title: exp.title,
                amount: exp.amount,
                paidAmount: exp.paidAmount,
                status: exp.status,
                expenseDate: at(exp.date),
                paymentMethod: "Chuyển khoản",
                recipient: exp.recipient,
                note: exp.note,
            },
        });

        if (exp.paidAmount > 0) {
            await prisma.partnerPaymentRecord.create({
                data: {
                    facilityId: collector.id,
                    expenseId: createdExp.id,
                    type: "PAYMENT",
                    amount: exp.paidAmount,
                    paymentDate: at(exp.date),
                    paymentMethod: "Chuyển khoản",
                    receiverName: exp.recipient,
                    note: `Chi thanh toán: ${exp.title}`,
                },
            });
        }
    }

    // =========================================================================
    // B. SỐ LIỆU TÀI CHÍNH CƠ SỞ CHẾ BIẾN SẦU RIÊNG TRỊ AN (PROCESSING_FACILITY)
    // =========================================================================
    console.log("📊 Đang khởi tạo số liệu tài chính cho Cơ sở Chế biến Trị An...");

    // B1. Các mẻ chế biến qua các tháng (Yield & Loss Analytics)
    const batches = [
        { batchCode: "PB-202605-01", date: "2026-05-14", inWeight: 3500, outWeight: 2520, lossWeight: 980, yield: 72.0 },
        { batchCode: "PB-202606-01", date: "2026-06-15", inWeight: 5000, outWeight: 3650, lossWeight: 1350, yield: 73.0 },
        { batchCode: "PB-202607-01", date: "2026-07-10", inWeight: 6800, outWeight: 5032, lossWeight: 1768, yield: 74.0 },
        { batchCode: "PB-202608-01", date: "2026-08-20", inWeight: 5500, outWeight: 4100, lossWeight: 1400, yield: 74.55 },
        { batchCode: "PB-202608-02", date: "2026-08-23", inWeight: 3000, outWeight: 2232, lossWeight: 768, yield: 74.4 },
    ];

    for (const b of batches) {
        await prisma.processingBatch.upsert({
            where: { batchCode: b.batchCode },
            update: {
                facilityId: processor.id,
                totalInputWeight: b.inWeight,
                totalOutputWeight: b.outWeight,
                lossWeight: b.lossWeight,
                yieldPercent: b.yield,
                status: "COMPLETED",
                startedAt: at(b.date),
                completedAt: at(b.date),
            },
            create: {
                batchCode: b.batchCode,
                facilityId: processor.id,
                supervisorId: processor.ownerId,
                method: "Tách múi cấp đông IQF (-35°C)",
                targetProduct: "Sầu riêng Ri6 tách múi cấp đông",
                startedAt: at(b.date),
                completedAt: at(b.date),
                totalInputWeight: b.inWeight,
                totalOutputWeight: b.outWeight,
                lossWeight: b.lossWeight,
                yieldPercent: b.yield,
                status: "COMPLETED",
            },
        });
    }

    // B2. Lô xuất bán thành phẩm chế biến (Doanh thu & Công nợ khách hàng)
    const processorSales = [
        // THÁNG 5/2026
        {
            lotCode: "TP-20260516-001",
            productName: "Sầu riêng Ri6 tách múi cấp đông",
            quantity: 2200,
            stockBeforeDispatch: 2500,
            buyerName: "Chuỗi Siêu thị WinMart",
            buyerPhone: "0909112233",
            buyerAddress: destinations.winmart.address,
            destinationId: destinations.winmart.id,
            unitPrice: 140000,
            subtotal: 308000000,
            discount: 3000000,
            totalAmount: 305000000,
            paidAmount: 305000000,
            debtAmount: 0,
            paymentStatus: "PAID",
            paymentMethod: "Chuyển khoản",
            dispatchedAt: at("2026-05-16"),
        },
        // THÁNG 6/2026
        {
            lotCode: "TP-20260616-001",
            productName: "Sầu riêng Ri6 tách múi cấp đông",
            quantity: 600,
            stockBeforeDispatch: 1000,
            buyerName: "Chuỗi Siêu thị WinMart",
            buyerPhone: "0909112233",
            buyerAddress: destinations.winmart.address,
            destinationId: destinations.winmart.id,
            unitPrice: 140000,
            subtotal: 84000000,
            discount: 0,
            totalAmount: 84000000,
            paidAmount: 84000000,
            debtAmount: 0,
            paymentStatus: "PAID",
            paymentMethod: "Chuyển khoản",
            dispatchedAt: at("2026-06-16"),
        },
        {
            lotCode: "TP-20260628-001",
            productName: "Sầu riêng Dona cấp đông xuất khẩu",
            quantity: 2500,
            stockBeforeDispatch: 3000,
            buyerName: "Công ty CP Xuất nhập khẩu ABC",
            buyerPhone: "0977889900",
            buyerAddress: destinations.abcExport.address,
            destinationId: destinations.abcExport.id,
            unitPrice: 145000,
            subtotal: 362500000,
            discount: 2500000,
            totalAmount: 360000000,
            paidAmount: 360000000,
            debtAmount: 0,
            paymentStatus: "PAID",
            paymentMethod: "Chuyển khoản",
            dispatchedAt: at("2026-06-28"),
        },
        // THÁNG 7/2026
        {
            lotCode: "TP-20260712-001",
            productName: "Sầu riêng Dona cấp đông",
            quantity: 1000,
            stockBeforeDispatch: 2000,
            buyerName: "Hệ thống Siêu thị Co.opmart",
            buyerPhone: "0903889911",
            buyerAddress: destinations.coopmart.address,
            destinationId: destinations.coopmart.id,
            unitPrice: 150000,
            subtotal: 150000000,
            discount: 0,
            totalAmount: 150000000,
            paidAmount: 120000000,
            debtAmount: 30000000,
            paymentStatus: "PARTIAL",
            paymentMethod: "Chuyển khoản",
            dispatchedAt: at("2026-07-12"),
        },
        {
            lotCode: "TP-20260725-001",
            productName: "Sầu riêng Ri6 bóc múi hút chân không",
            quantity: 3200,
            stockBeforeDispatch: 4000,
            buyerName: "Công ty CP Xuất nhập khẩu ABC",
            buyerPhone: "0977889900",
            buyerAddress: destinations.abcExport.address,
            destinationId: destinations.abcExport.id,
            unitPrice: 148000,
            subtotal: 473600000,
            discount: 3600000,
            totalAmount: 470000000,
            paidAmount: 470000000,
            debtAmount: 0,
            paymentStatus: "PAID",
            paymentMethod: "Chuyển khoản",
            dispatchedAt: at("2026-07-25"),
        },
        // THÁNG 8/2026
        {
            lotCode: "TP-20260827-001",
            productName: "Sầu riêng Ri6 tách múi cấp đông",
            quantity: 1000,
            stockBeforeDispatch: 2975,
            buyerName: "Công ty CP Xuất nhập khẩu ABC",
            buyerPhone: "0977889900",
            buyerAddress: destinations.abcExport.address,
            destinationId: destinations.abcExport.id,
            unitPrice: 145000,
            subtotal: 145000000,
            discount: 5000000,
            totalAmount: 140000000,
            paidAmount: 80000000,
            debtAmount: 60000000,
            paymentStatus: "PARTIAL",
            paymentMethod: "Chuyển khoản",
            dispatchedAt: at("2026-08-27"),
        },
        {
            lotCode: "EXP-20260828-001",
            productName: "Sầu riêng múi cấp đông sâu xuất khẩu Trung Quốc",
            quantity: 4000,
            stockBeforeDispatch: 4000,
            buyerName: "Thị trường Trung Quốc (GACC Registered)",
            buyerPhone: "+86-771-5588990",
            buyerAddress: destinations.chinaMarket.address,
            destinationId: destinations.chinaMarket.id,
            unitPrice: 165000,
            subtotal: 660000000,
            discount: 0,
            totalAmount: 660000000,
            paidAmount: 660000000,
            debtAmount: 0,
            paymentStatus: "PAID",
            paymentMethod: "Chuyển khoản",
            dispatchedAt: at("2026-08-28"),
        },
    ];

    for (const item of processorSales) {
        const lot = await prisma.commercialLot.upsert({
            where: { lotCode: item.lotCode },
            update: {
                ownerId: processor.id,
                ownerType: "PROCESSING_FACILITY",
                productName: item.productName,
                quantity: item.quantity,
                stockBeforeDispatch: item.stockBeforeDispatch,
                buyerName: item.buyerName,
                buyerPhone: item.buyerPhone,
                buyerAddress: item.buyerAddress,
                destinationId: item.destinationId,
                unitPrice: item.unitPrice,
                subtotal: item.subtotal,
                discount: item.discount,
                totalAmount: item.totalAmount,
                paidAmount: item.paidAmount,
                debtAmount: item.debtAmount,
                paymentStatus: item.paymentStatus as OrderPaymentStatus,
                paymentMethod: item.paymentMethod,
                dispatchedAt: item.dispatchedAt,
                status: "DISPATCHED",
            },
            create: {
                lotCode: item.lotCode,
                ownerId: processor.id,
                ownerType: "PROCESSING_FACILITY",
                sourceType: "FINISHED_PRODUCT_LOT",
                sourceId: "FPL-DEMO",
                destinationId: item.destinationId,
                productName: item.productName,
                quantity: item.quantity,
                stockBeforeDispatch: item.stockBeforeDispatch,
                buyerName: item.buyerName,
                buyerPhone: item.buyerPhone,
                buyerAddress: item.buyerAddress,
                unitPrice: item.unitPrice,
                subtotal: item.subtotal,
                discount: item.discount,
                totalAmount: item.totalAmount,
                paidAmount: item.paidAmount,
                debtAmount: item.debtAmount,
                paymentStatus: item.paymentStatus as OrderPaymentStatus,
                paymentMethod: item.paymentMethod,
                dispatchedAt: item.dispatchedAt,
                status: "DISPATCHED",
            },
        });

        if (item.paidAmount > 0) {
            await prisma.partnerPaymentRecord.deleteMany({ where: { commercialLotId: lot.id } });
            await prisma.partnerPaymentRecord.create({
                data: {
                    facilityId: processor.id,
                    commercialLotId: lot.id,
                    type: "RECEIPT",
                    amount: item.paidAmount,
                    paymentDate: item.dispatchedAt,
                    paymentMethod: item.paymentMethod,
                    payerName: item.buyerName,
                    note: `Thanh toán xuất bán thành phẩm ${item.lotCode}`,
                },
            });
        }
    }

    // B3. Chi phí sản xuất & vận hành xưởng chế biến Trị An (Đầy đủ 6 nhóm danh mục)
    const processorExpenses = [
        // THÁNG 5/2026
        { category: "PROCESSING_LABOR" as PartnerExpenseCategory, title: "Tiền lương nhân công bóc múi sầu tháng 5", amount: 18000000, paidAmount: 18000000, status: "PAID" as ExpensePaymentStatus, date: "2026-05-15", recipient: "Tổ nhân công Trị An" },
        { category: "PACKAGING" as PartnerExpenseCategory, title: "Khay nhựa định hình & màng hút chân không tháng 5", amount: 12000000, paidAmount: 12000000, status: "PAID" as ExpensePaymentStatus, date: "2026-05-16", recipient: "Công ty Bao bì Xanh" },
        { category: "COLD_STORAGE_ELECTRICITY" as PartnerExpenseCategory, title: "Tiền điện kho lạnh cấp đông IQF tháng 5", amount: 9500000, paidAmount: 9500000, status: "PAID" as ExpensePaymentStatus, date: "2026-05-25", recipient: "Điện lực Trảng Bom - Đồng Nai" },
        { category: "LOGISTICS_TRANSPORT" as PartnerExpenseCategory, title: "Vận chuyển hàng đông lạnh xe -18°C tháng 5", amount: 8000000, paidAmount: 8000000, status: "PAID" as ExpensePaymentStatus, date: "2026-05-17", recipient: "Đội xe lạnh Hoàng Hà" },

        // THÁNG 6/2026
        { category: "PROCESSING_LABOR" as PartnerExpenseCategory, title: "Nhân công chế biến & đóng khay sầu riêng tháng 6", amount: 24000000, paidAmount: 24000000, status: "PAID" as ExpensePaymentStatus, date: "2026-06-16", recipient: "Tổ nhân công Trị An" },
        { category: "PACKAGING" as PartnerExpenseCategory, title: "Bao bì hút chân không & thùng carton in logo tháng 6", amount: 16500000, paidAmount: 16500000, status: "PAID" as ExpensePaymentStatus, date: "2026-06-17", recipient: "Công ty Bao bì Xanh" },
        { category: "COLD_STORAGE_ELECTRICITY" as PartnerExpenseCategory, title: "Tiền điện kho lạnh bảo quản & hầm đông tháng 6", amount: 12500000, paidAmount: 12500000, status: "PAID" as ExpensePaymentStatus, date: "2026-06-25", recipient: "Điện lực Trảng Bom - Đồng Nai" },
        { category: "LOGISTICS_TRANSPORT" as PartnerExpenseCategory, title: "Vận chuyển hàng đông lạnh giao siêu thị tháng 6", amount: 11000000, paidAmount: 11000000, status: "PAID" as ExpensePaymentStatus, date: "2026-06-28", recipient: "Đội xe lạnh Hoàng Hà" },
        { category: "EQUIPMENT_MAINTENANCE" as PartnerExpenseCategory, title: "Bảo dưỡng định kỳ máy hút chân không & máy nén", amount: 6500000, paidAmount: 6500000, status: "PAID" as ExpensePaymentStatus, date: "2026-06-20", recipient: "Công ty Cơ điện Lạnh Miền Nam" },

        // THÁNG 7/2026
        { category: "PROCESSING_LABOR" as PartnerExpenseCategory, title: "Nhân công bóc tách múi sầu riêng ca ngày & đêm tháng 7", amount: 32000000, paidAmount: 32000000, status: "PAID" as ExpensePaymentStatus, date: "2026-07-12", recipient: "Tổ nhân công Trị An" },
        { category: "PACKAGING" as PartnerExpenseCategory, title: "Khay nhựa định hình & thùng carton xuất khẩu tháng 7", amount: 22000000, paidAmount: 22000000, status: "PAID" as ExpensePaymentStatus, date: "2026-07-14", recipient: "Công ty Bao bì Xanh" },
        { category: "COLD_STORAGE_ELECTRICITY" as PartnerExpenseCategory, title: "Tiền điện kho lạnh bảo quản tháng 7", amount: 16000000, paidAmount: 16000000, status: "PAID" as ExpensePaymentStatus, date: "2026-07-25", recipient: "Điện lực Trảng Bom - Đồng Nai" },
        { category: "LOGISTICS_TRANSPORT" as PartnerExpenseCategory, title: "Vận chuyển hàng đông lạnh xe chuyên dụng tháng 7", amount: 14000000, paidAmount: 14000000, status: "PAID" as ExpensePaymentStatus, date: "2026-07-26", recipient: "Đội xe lạnh Hoàng Hà" },
        { category: "EQUIPMENT_MAINTENANCE" as PartnerExpenseCategory, title: "Kiểm nghiệm vi sinh và dư lượng định kỳ phòng lab", amount: 8500000, paidAmount: 8500000, status: "PAID" as ExpensePaymentStatus, date: "2026-07-18", recipient: "Trung tâm Kiểm nghiệm Quatest 3" },

        // THÁNG 8/2026
        { category: "PROCESSING_LABOR" as PartnerExpenseCategory, title: "Nhân công bóc tách múi và đóng khay xuất khẩu tháng 8", amount: 38000000, paidAmount: 38000000, status: "PAID" as ExpensePaymentStatus, date: "2026-08-23", recipient: "Tổ nhân công Trị An" },
        { category: "PACKAGING" as PartnerExpenseCategory, title: "Bao bì hút chân không & thùng carton chuẩn GACC", amount: 26000000, paidAmount: 16000000, status: "PARTIAL" as ExpensePaymentStatus, date: "2026-08-24", recipient: "Công ty Bao bì Xanh", note: "Còn nợ tiền bao bì 10.000.000 đ" },
        { category: "COLD_STORAGE_ELECTRICITY" as PartnerExpenseCategory, title: "Tiền điện kho lạnh cấp đông sâu IQF tháng 8", amount: 19500000, paidAmount: 10000000, status: "PARTIAL" as ExpensePaymentStatus, date: "2026-08-25", recipient: "Điện lực Trảng Bom - Đồng Nai", note: "Còn nợ tiền điện 9.500.000 đ" },
        { category: "LOGISTICS_TRANSPORT" as PartnerExpenseCategory, title: "Vận chuyển container lạnh xuất khẩu cửa khẩu Hữu Nghị", amount: 22000000, paidAmount: 22000000, status: "PAID" as ExpensePaymentStatus, date: "2026-08-28", recipient: "Công ty Logistics Tân Cảng" },
        { category: "EQUIPMENT_MAINTENANCE" as PartnerExpenseCategory, title: "Chi phí đánh giá kiểm định VSATTP & chứng nhận xuất khẩu", amount: 12000000, paidAmount: 12000000, status: "PAID" as ExpensePaymentStatus, date: "2026-08-22", recipient: "Viện Kiểm nghiệm & Chứng nhận VinaCert" },
        { category: "FACTORY_OVERHEAD" as PartnerExpenseCategory, title: "Vật tư vệ sinh, cồn khử trùng xưởng chế biến", amount: 5500000, paidAmount: 5500000, status: "PAID" as ExpensePaymentStatus, date: "2026-08-20", recipient: "Công ty Hóa chất & Thiết bị Việt Nhật" },
    ];

    for (const exp of processorExpenses) {
        const createdExp = await prisma.partnerExpense.create({
            data: {
                facilityId: processor.id,
                category: exp.category,
                title: exp.title,
                amount: exp.amount,
                paidAmount: exp.paidAmount,
                status: exp.status,
                expenseDate: at(exp.date),
                paymentMethod: "Chuyển khoản",
                recipient: exp.recipient,
                note: exp.note,
            },
        });

        if (exp.paidAmount > 0) {
            await prisma.partnerPaymentRecord.create({
                data: {
                    facilityId: processor.id,
                    expenseId: createdExp.id,
                    type: "PAYMENT",
                    amount: exp.paidAmount,
                    paymentDate: at(exp.date),
                    paymentMethod: "Chuyển khoản",
                    receiverName: exp.recipient,
                    note: `Chi thanh toán: ${exp.title}`,
                },
            });
        }
    }

    console.log("✅ HOÀN TẤT: Đã tạo đầy đủ dữ liệu 4 tháng (T5, T6, T7, T8) cho 6 biểu đồ tài chính của cả 2 cơ sở!");
}

main()
    .catch((e) => {
        console.error("❌ Lỗi khi tạo dữ liệu tài chính:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
