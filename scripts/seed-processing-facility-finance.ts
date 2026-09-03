import { prisma } from "../src/lib/prisma";

async function main() {
    console.log("--- 1. Kiểm tra Cơ sở Chế biến Sầu riêng Trị An ---");
    let facility = await prisma.partnerFacility.findFirst({
        where: {
            OR: [
                { id: "cmsogs6ws000514g3mw5vcx9y" },
                { phone: "0909000003" },
                { name: { contains: "Trị An" } },
            ],
        },
    });

    const user = await prisma.user.findFirst({
        where: { phone: "0909000003" },
    });

    if (!user) {
        throw new Error("Không tìm thấy người dùng Trần Minh Anh (0909000003)");
    }

    if (!facility) {
        facility = await prisma.partnerFacility.create({
            data: {
                id: "cmsogs6ws000514g3mw5vcx9y",
                ownerId: user.id,
                type: "PROCESSING_FACILITY",
                organizationType: "Doanh nghiệp / Hộ kinh doanh",
                name: "Cơ sở Chế biến Sầu riêng Trị An",
                representativeName: "Trần Minh Anh",
                representativePhone: "0909000003",
                representativeEmail: "processing@triviet.vn",
                identityNumber: "ID-0909000003",
                phone: "0909000003",
                address: "Tuyến ĐT 767, Xã Sông Trầu, Huyện Trảng Bom, Tỉnh Đồng Nai",
                province: "Đồng Nai",
                status: "APPROVED",
            },
        });
    } else {
        await prisma.partnerFacility.update({
            where: { id: facility.id },
            data: {
                ownerId: user.id,
                type: "PROCESSING_FACILITY",
                name: "Cơ sở Chế biến Sầu riêng Trị An",
                representativeName: "Trần Minh Anh",
                representativePhone: "0909000003",
                phone: "0909000003",
                address: "Tuyến ĐT 767, Xã Sông Trầu, Huyện Trảng Bom, Tỉnh Đồng Nai",
            },
        });
    }

    console.log("Facility:", facility.id, facility.name);

    console.log("--- 2. Tạo/Cập nhật Mẻ Chế Biến (ProcessingBatch) ---");
    let batch = await prisma.processingBatch.findUnique({
        where: { batchCode: "PB-20260830-001" },
    });

    if (!batch) {
        batch = await prisma.processingBatch.create({
            data: {
                batchCode: "PB-20260830-001",
                facilityId: facility.id,
                method: "Tách múi & cấp đông",
                targetProduct: "Cơm sầu riêng bóc múi",
                startedAt: new Date("2026-08-30T07:00:00.000Z"),
                completedAt: new Date("2026-08-30T17:00:00.000Z"),
                supervisorId: user.id,
                totalInputWeight: 1020,
                totalOutputWeight: 326,
                lossWeight: 694,
                yieldPercent: 31.96,
                status: "COMPLETED",
                note: "Mẻ sầu riêng Ri6 từ phiếu TH-20260829-002 Vườn sầu riêng Minh Phát",
            },
        });
        console.log("Created batch:", batch.batchCode);
    } else {
        batch = await prisma.processingBatch.update({
            where: { id: batch.id },
            data: {
                facilityId: facility.id,
                supervisorId: user.id,
                totalInputWeight: 1020,
                totalOutputWeight: 326,
                lossWeight: 694,
                yieldPercent: 31.96,
                status: "COMPLETED",
            },
        });
        console.log("Updated batch:", batch.batchCode);
    }

    console.log("--- 3. Tạo/Cập nhật Lô Thành Phẩm (FinishedProductLot) ---");
    let fpFresh = await prisma.finishedProductLot.findUnique({
        where: { lotCode: "FP-FRESH-20260830-001" },
    });
    if (!fpFresh) {
        fpFresh = await prisma.finishedProductLot.create({
            data: {
                lotCode: "FP-FRESH-20260830-001",
                processingBatchId: batch.id,
                facilityId: facility.id,
                productName: "Sầu riêng tươi xuất khẩu",
                productType: "Sầu riêng tươi nguyên trái",
                branch: "FRESH_PACKED",
                quantity: 172,
                netWeight: 3100,
                remainingWeight: 0,
                manufacturedAt: new Date("2026-08-30T10:00:00.000Z"),
                status: "DISTRIBUTED",
                packaging: "Thùng 5-6 trái / 18kg",
            },
        });
        console.log("Created finished lot:", fpFresh.lotCode);
    } else {
        fpFresh = await prisma.finishedProductLot.update({
            where: { id: fpFresh.id },
            data: {
                facilityId: facility.id,
                netWeight: 3100,
                status: "DISTRIBUTED",
            },
        });
        console.log("Updated finished lot:", fpFresh.lotCode);
    }

    let fpPulp = await prisma.finishedProductLot.findUnique({
        where: { lotCode: "PB-20260830-001" },
    });
    if (!fpPulp) {
        fpPulp = await prisma.finishedProductLot.create({
            data: {
                lotCode: "PB-20260830-001",
                processingBatchId: batch.id,
                facilityId: facility.id,
                productName: "Cơm sầu riêng bóc múi",
                productType: "Cơm sầu riêng cấp đông",
                branch: "PROCESSED",
                quantity: 652,
                netWeight: 326,
                remainingWeight: 0,
                manufacturedAt: new Date("2026-08-30T16:00:00.000Z"),
                status: "DISTRIBUTED",
                packaging: "Khay hút chân không 500g",
            },
        });
        console.log("Created finished lot:", fpPulp.lotCode);
    } else {
        fpPulp = await prisma.finishedProductLot.update({
            where: { id: fpPulp.id },
            data: {
                facilityId: facility.id,
                netWeight: 326,
                status: "DISTRIBUTED",
            },
        });
        console.log("Updated finished lot:", fpPulp.lotCode);
    }

    console.log("--- 4. Tạo/Cập nhật Lô Thương Phẩm Xuất Bán (CommercialLot) ---");
    // Lô xuất khẩu 1: CM-EXP-20260831-001
    const lotExp = await prisma.commercialLot.upsert({
        where: { lotCode: "CM-EXP-20260831-001" },
        update: {
            ownerType: "PROCESSING_FACILITY",
            ownerId: facility.id,
            sourceType: "FINISHED_PRODUCT_LOT",
            sourceId: fpFresh.id,
            sourceFinishedProductLotId: fpFresh.id,
            productName: "Sầu riêng tươi xuất khẩu (Ri6)",
            quantity: 3100,
            remainingQuantity: 0,
            unit: "kg",
            stockBeforeDispatch: 3100,
            unitPrice: 135000,
            subtotal: 418500000,
            discount: 3500000,
            totalAmount: 415000000,
            paidAmount: 300000000,
            debtAmount: 115000000,
            paymentStatus: "PARTIAL",
            paymentMethod: "Chuyển khoản (L/C)",
            buyerName: "Công ty TNHH Nông sản Vân Nam",
            buyerPhone: "+86 138 0013 8000",
            buyerAddress: "Côn Minh, Tỉnh Vân Nam, Trung Quốc (Cửa khẩu Hữu Nghị)",
            dispatchedAt: new Date("2026-08-31T09:00:00.000Z"),
            status: "DISPATCHED",
            note: "Xuất khẩu 172 thùng theo mã số vùng trồng MSVT-GACC-001",
        },
        create: {
            lotCode: "CM-EXP-20260831-001",
            ownerType: "PROCESSING_FACILITY",
            ownerId: facility.id,
            sourceType: "FINISHED_PRODUCT_LOT",
            sourceId: fpFresh.id,
            sourceFinishedProductLotId: fpFresh.id,
            productName: "Sầu riêng tươi xuất khẩu (Ri6)",
            quantity: 3100,
            remainingQuantity: 0,
            unit: "kg",
            stockBeforeDispatch: 3100,
            unitPrice: 135000,
            subtotal: 418500000,
            discount: 3500000,
            totalAmount: 415000000,
            paidAmount: 300000000,
            debtAmount: 115000000,
            paymentStatus: "PARTIAL",
            paymentMethod: "Chuyển khoản (L/C)",
            buyerName: "Công ty TNHH Nông sản Vân Nam",
            buyerPhone: "+86 138 0013 8000",
            buyerAddress: "Côn Minh, Tỉnh Vân Nam, Trung Quốc (Cửa khẩu Hữu Nghị)",
            dispatchedAt: new Date("2026-08-31T09:00:00.000Z"),
            status: "DISPATCHED",
            note: "Xuất khẩu 172 thùng theo mã số vùng trồng MSVT-GACC-001",
        },
    });
    console.log("Upserted CommercialLot:", lotExp.lotCode);

    // Lô nội địa 2: CM-DOM-20260901-001
    const lotDom = await prisma.commercialLot.upsert({
        where: { lotCode: "CM-DOM-20260901-001" },
        update: {
            ownerType: "PROCESSING_FACILITY",
            ownerId: facility.id,
            sourceType: "FINISHED_PRODUCT_LOT",
            sourceId: fpPulp.id,
            sourceFinishedProductLotId: fpPulp.id,
            productName: "Cơm sầu riêng bóc múi (Khay hút chân không 500g)",
            quantity: 326,
            remainingQuantity: 0,
            unit: "kg",
            stockBeforeDispatch: 326,
            unitPrice: 280000,
            subtotal: 91280000,
            discount: 1280000,
            totalAmount: 90000000,
            paidAmount: 90000000,
            debtAmount: 0,
            paymentStatus: "PAID",
            paymentMethod: "Chuyển khoản",
            buyerName: "Hệ thống Siêu thị WinMart Miền Nam",
            buyerPhone: "0903 889 900",
            buyerAddress: "Kho trung chuyển WinMart, TP. Dĩ An, Tỉnh Bình Dương",
            dispatchedAt: new Date("2026-09-01T08:30:00.000Z"),
            status: "DISPATCHED",
            note: "Giao 652 khay hút chân không cấp đông -18°C",
        },
        create: {
            lotCode: "CM-DOM-20260901-001",
            ownerType: "PROCESSING_FACILITY",
            ownerId: facility.id,
            sourceType: "FINISHED_PRODUCT_LOT",
            sourceId: fpPulp.id,
            sourceFinishedProductLotId: fpPulp.id,
            productName: "Cơm sầu riêng bóc múi (Khay hút chân không 500g)",
            quantity: 326,
            remainingQuantity: 0,
            unit: "kg",
            stockBeforeDispatch: 326,
            unitPrice: 280000,
            subtotal: 91280000,
            discount: 1280000,
            totalAmount: 90000000,
            paidAmount: 90000000,
            debtAmount: 0,
            paymentStatus: "PAID",
            paymentMethod: "Chuyển khoản",
            buyerName: "Hệ thống Siêu thị WinMart Miền Nam",
            buyerPhone: "0903 889 900",
            buyerAddress: "Kho trung chuyển WinMart, TP. Dĩ An, Tỉnh Bình Dương",
            dispatchedAt: new Date("2026-09-01T08:30:00.000Z"),
            status: "DISPATCHED",
            note: "Giao 652 khay hút chân không cấp đông -18°C",
        },
    });
    console.log("Upserted CommercialLot:", lotDom.lotCode);

    console.log("--- 5. Tạo/Cập nhật Chi Phí Vận Hành (PartnerExpense) ---");
    const expensesToSeed = [
        {
            category: "PROCESSING_LABOR" as const,
            title: "Nhân công bóc tách múi & đóng khay xuất khẩu tháng 8",
            amount: 38000000,
            paidAmount: 38000000,
            status: "PAID" as const,
            expenseDate: new Date("2026-08-23T08:00:00.000Z"),
            paymentMethod: "Chuyển khoản",
            recipient: "Tổ nhân công Trị An",
            note: "Ca tách múi cấp đông IQF",
        },
        {
            category: "PACKAGING" as const,
            title: "Bao bì hút chân không & thùng carton chuẩn GACC",
            amount: 26000000,
            paidAmount: 16000000,
            status: "PARTIAL" as const,
            expenseDate: new Date("2026-08-24T08:00:00.000Z"),
            paymentMethod: "Chuyển khoản",
            recipient: "Công ty Bao bì Xanh",
            note: "Còn nợ tiền bao bì 10.000.000 đ",
        },
        {
            category: "COLD_STORAGE_ELECTRICITY" as const,
            title: "Tiền điện kho lạnh cấp đông sâu IQF (-35°C)",
            amount: 19500000,
            paidAmount: 10000000,
            status: "PARTIAL" as const,
            expenseDate: new Date("2026-08-25T08:00:00.000Z"),
            paymentMethod: "Chuyển khoản",
            recipient: "Điện lực Trảng Bom - Đồng Nai",
            note: "Còn nợ tiền điện 9.500.000 đ",
        },
        {
            category: "LOGISTICS_TRANSPORT" as const,
            title: "Vận chuyển container lạnh xuất khẩu Cửa khẩu Hữu Nghị",
            amount: 22000000,
            paidAmount: 22000000,
            status: "PAID" as const,
            expenseDate: new Date("2026-08-28T08:00:00.000Z"),
            paymentMethod: "Chuyển khoản",
            recipient: "Công ty Logistics Tân Cảng",
            note: "Vận chuyển xe lạnh -18°C",
        },
        {
            category: "EQUIPMENT_MAINTENANCE" as const,
            title: "Chi phí đánh giá kiểm định VSATTP & chứng nhận xuất khẩu",
            amount: 12000000,
            paidAmount: 12000000,
            status: "PAID" as const,
            expenseDate: new Date("2026-08-22T08:00:00.000Z"),
            paymentMethod: "Chuyển khoản",
            recipient: "Viện Kiểm nghiệm & Chứng nhận VinaCert",
            note: "Kiểm nghiệm vi sinh và dư lượng định kỳ",
        },
        {
            category: "FACTORY_OVERHEAD" as const,
            title: "Vật tư vệ sinh, cồn khử trùng xưởng chế biến",
            amount: 5500000,
            paidAmount: 3500000,
            status: "PARTIAL" as const,
            expenseDate: new Date("2026-08-20T08:00:00.000Z"),
            paymentMethod: "Chuyển khoản",
            recipient: "Công ty Hóa chất & Thiết bị Việt Nhật",
            note: "Còn nợ tiền hóa chất 2.000.000 đ",
        },
    ];

    for (const exp of expensesToSeed) {
        const existing = await prisma.partnerExpense.findFirst({
            where: {
                facilityId: facility.id,
                title: exp.title,
            },
        });
        if (!existing) {
            await prisma.partnerExpense.create({
                data: {
                    facilityId: facility.id,
                    ...exp,
                },
            });
        }
    }
    console.log("Created/checked expenses for facility.");

    console.log("--- 6. Tạo/Cập nhật Lịch Sử Thu Tiền & Thanh Toán (PartnerPaymentRecord) ---");
    const existingExpPay = await prisma.partnerPaymentRecord.findFirst({
        where: { commercialLotId: lotExp.id },
    });
    if (!existingExpPay) {
        await prisma.partnerPaymentRecord.create({
            data: {
                facilityId: facility.id,
                commercialLotId: lotExp.id,
                type: "RECEIPT",
                amount: 300000000,
                paymentDate: new Date("2026-08-31T14:30:00.000Z"),
                paymentMethod: "Chuyển khoản",
                payerName: "Công ty TNHH Nông sản Vân Nam",
                note: "Tạm ứng 72% giá trị lô hàng xuất khẩu theo hợp đồng L/C",
            },
        });
    }

    const existingDomPay = await prisma.partnerPaymentRecord.findFirst({
        where: { commercialLotId: lotDom.id },
    });
    if (!existingDomPay) {
        await prisma.partnerPaymentRecord.create({
            data: {
                facilityId: facility.id,
                commercialLotId: lotDom.id,
                type: "RECEIPT",
                amount: 90000000,
                paymentDate: new Date("2026-09-01T16:00:00.000Z"),
                paymentMethod: "Chuyển khoản",
                payerName: "Công ty CP Dịch vụ Thương mại WinMart",
                note: "Thanh toán 100% lô cơm sầu riêng bóc múi khay 500g",
            },
        });
    }

    console.log("✅ Đã cập nhật thành công dữ liệu tài chính cho Cơ sở Chế biến Sầu riêng Trị An!");
}

main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
