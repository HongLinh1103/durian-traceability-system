import { prisma } from "../src/lib/prisma";

async function main() {
    console.log("=== TẠO DỮ LIỆU XUẤT HÀNG & TÀI CHÍNH CHO CƠ SỞ CHẾ BIẾN TRỊ AN ===");

    // 1. Tìm cơ sở chế biến Trị An
    const facility = await prisma.partnerFacility.findFirst({
        where: {
            OR: [
                { id: "cmsogs6ws000514g3mw5vcx9y" },
                { name: { contains: "Trị An" } },
            ],
            deletedAt: null,
        },
        include: { owner: true },
    });

    if (!facility) {
        throw new Error("Không tìm thấy Cơ sở Chế biến Sầu riêng Trị An");
    }
    console.log(`- Cơ sở: ${facility.name} (${facility.id})`);
    const ownerId = facility.ownerId;

    // 2. Tìm 2 lô thành phẩm
    const freshLot = await prisma.finishedProductLot.findFirst({
        where: {
            facilityId: facility.id,
            lotCode: "FP-PK-TH-20260901-001",
        },
    });

    const procLot = await prisma.finishedProductLot.findFirst({
        where: {
            facilityId: facility.id,
            lotCode: "FP-PROC-TH-20260901-001",
        },
    });

    if (!freshLot || !procLot) {
        throw new Error("Không tìm thấy 2 lô thành phẩm FP-PK-TH-20260901-001 hoặc FP-PROC-TH-20260901-001");
    }

    console.log(`- Lô tươi: ${freshLot.lotCode} (${freshLot.netWeight} kg)`);
    console.log(`- Lô chế biến: ${procLot.lotCode} (${procLot.netWeight} kg)`);

    // 3. Tạo điểm đến xuất khẩu (Destination Export)
    let destExport = await prisma.distributionDestination.findFirst({
        where: { name: "Côn Minh, Vân Nam (Trung Quốc)" },
    });
    if (!destExport) {
        destExport = await prisma.distributionDestination.create({
            data: {
                name: "Côn Minh, Vân Nam (Trung Quốc)",
                type: "EXPORT",
                country: "Trung Quốc",
                address: "Côn Minh, Tỉnh Vân Nam, Trung Quốc (Cửa khẩu Hữu Nghị)",
                contactName: "Lý Gia Hào",
                contactPhone: "+86 138 0013 8000",
            },
        });
    }

    // 4. Tạo điểm đến nội địa (Destination Domestic)
    let destDomestic = await prisma.distributionDestination.findFirst({
        where: { name: "Hệ thống Siêu thị WinMart Miền Nam" },
    });
    if (!destDomestic) {
        destDomestic = await prisma.distributionDestination.create({
            data: {
                name: "Hệ thống Siêu thị WinMart Miền Nam",
                type: "RETAIL",
                country: "Việt Nam",
                address: "Kho trung chuyển WinMart, TP. Dĩ An, Tỉnh Bình Dương",
                contactName: "Trần Bảo Ngọc",
                contactPhone: "0903 889 900",
            },
        });
    }

    // Thời gian xuất hàng: Chiều ngày 04/09/2026
    const exportDate1 = new Date("2026-09-04T10:30:00.000Z"); // 17:30 GMT+7
    const exportDate2 = new Date("2026-09-04T10:45:00.000Z"); // 17:45 GMT+7

    // =========================================================================
    // LÔ 1: XUẤT KHẨU SẦU RIÊNG TƯƠI
    // Mã lô / Mã shipment: EXP-20260904-001
    // Khối lượng: 788 kg (84 thùng, 3 trái/thùng)
    // Đơn giá bán: 135.000 đ/kg
    // Tổng thu: 106.380.000 đ (100% thanh toán)
    // =========================================================================
    console.log("\n--- XỬ LÝ LÔ 1: EXP-20260904-001 (XUẤT KHẨU TƯƠI) ---");
    const shipmentCode1 = "EXP-20260904-001";
    const publicToken1 = "EXP-20260904-001";
    const qrCode1 = "QR-EXP-20260904-001";
    const weight1 = 788;
    const unitPrice1 = 135000;
    const totalAmount1 = 106380000;

    // Xóa dữ liệu cũ nếu có
    const oldComm1 = await prisma.commercialLot.findFirst({
        where: { lotCode: shipmentCode1 },
    });
    if (oldComm1) {
        await prisma.partnerPaymentRecord.deleteMany({ where: { commercialLotId: oldComm1.id } });
        await prisma.traceEvent.deleteMany({ where: { commercialLotId: oldComm1.id } });
        await prisma.traceabilityCode.deleteMany({ where: { commercialLotId: oldComm1.id } });
        await prisma.shipmentItem.deleteMany({ where: { commercialLotId: oldComm1.id } });
        await prisma.lotRelation.deleteMany({ where: { targetId: oldComm1.id } });
        await prisma.commercialLot.delete({ where: { id: oldComm1.id } });
    }
    const oldShip1 = await prisma.shipment.findFirst({ where: { shipmentCode: shipmentCode1 } });
    if (oldShip1) {
        await prisma.exportShipmentInfo.deleteMany({ where: { shipmentId: oldShip1.id } });
        await prisma.shipmentItem.deleteMany({ where: { shipmentId: oldShip1.id } });
        await prisma.traceEvent.deleteMany({ where: { entityId: oldShip1.id } });
        await prisma.shipment.delete({ where: { id: oldShip1.id } });
    }

    // Tạo CommercialLot 1
    const commLot1 = await prisma.commercialLot.create({
        data: {
            lotCode: shipmentCode1,
            ownerType: "PROCESSING_FACILITY",
            ownerId: facility.id,
            sourceType: "FINISHED_PRODUCT_LOT",
            sourceId: freshLot.id,
            sourceFinishedProductLotId: freshLot.id,
            destinationId: destExport.id,
            productName: "Sầu riêng tươi xuất khẩu (Ri6)",
            quantity: weight1,
            remainingQuantity: 0,
            unit: "kg",
            stockBeforeDispatch: weight1,
            unitPrice: unitPrice1,
            subtotal: totalAmount1,
            discount: 0,
            totalAmount: totalAmount1,
            paidAmount: totalAmount1,
            debtAmount: 0,
            paymentStatus: "PAID",
            paymentMethod: "Chuyển khoản",
            buyerName: "Công ty TNHH Nông sản Vân Nam",
            buyerPhone: "+86 138 0013 8000",
            buyerAddress: "Côn Minh, Tỉnh Vân Nam, Trung Quốc (Cửa khẩu Hữu Nghị)",
            dispatchedAt: exportDate1,
            status: "DISPATCHED",
            note: "Xuất khẩu 84 thùng (3 trái/thùng) theo chuẩn kiểm dịch GACC",
            createdAt: exportDate1,
            updatedAt: exportDate1,
        },
    });

    // Tạo Shipment 1
    const meta1 = {
        carrierName: "Công ty Logistics Tân Cảng",
        truckPlate: "51D-928.34",
        containerNumber: "TRHU-849201",
        sealNumber: "VN-EXP-9921",
        destinationCountry: "Trung Quốc",
        portOfLoading: "Cửa khẩu Quốc tế Hữu Nghị (Lạng Sơn)",
        portOfDestination: "Côn Minh, Vân Nam (Trung Quốc)",
        boxCount: 84,
        unitPrice: unitPrice1,
        totalAmount: totalAmount1,
    };

    const shipment1 = await prisma.shipment.create({
        data: {
            shipmentCode: shipmentCode1,
            senderType: "PROCESSING_FACILITY",
            senderId: facility.id,
            destinationId: destExport.id,
            dispatchedWeight: weight1,
            dispatchAt: exportDate1,
            vehicleReference: "51D-928.34",
            containerNumber: "TRHU-849201",
            sealNumber: "VN-EXP-9921",
            boxCount: 84,
            status: "DISPATCHED",
            note: JSON.stringify(meta1),
            createdAt: exportDate1,
            updatedAt: exportDate1,
        },
    });

    // ShipmentItem 1
    await prisma.shipmentItem.create({
        data: {
            shipmentId: shipment1.id,
            commercialLotId: commLot1.id,
            quantity: weight1,
            weight: weight1,
            createdAt: exportDate1,
        },
    });

    // ExportShipmentInfo 1
    await prisma.exportShipmentInfo.create({
        data: {
            shipmentId: shipment1.id,
            destinationCountry: "Trung Quốc",
            portOfLoading: "Cửa khẩu Quốc tế Hữu Nghị (Lạng Sơn)",
            portOfDestination: "Côn Minh, Vân Nam (Trung Quốc)",
            containerNumber: "TRHU-849201",
            sealNumber: "VN-EXP-9921",
            exportDate: exportDate1,
            phytosanitaryCertificateNumber: "KDTV-2026-88392",
            customsDeclarationNumber: "HQ-VN-884921",
        },
    });

    // LotRelation 1
    await prisma.lotRelation.create({
        data: {
            sourceType: "FINISHED_PRODUCT_LOT",
            sourceId: freshLot.id,
            targetType: "COMMERCIAL_LOT",
            targetId: commLot1.id,
            relationType: "PACKAGED_INTO",
            quantity: weight1,
        },
    });

    // TraceabilityCode 1
    await prisma.traceabilityCode.create({
        data: {
            code: qrCode1,
            publicToken: publicToken1,
            commercialLotId: commLot1.id,
            status: "ACTIVE",
            issuedAt: exportDate1,
            issuedById: ownerId,
            issuedByRole: "PROCESSING_FACILITY",
            activatedAt: exportDate1,
        },
    });

    // PartnerPaymentRecord 1 (Finance)
    await prisma.partnerPaymentRecord.create({
        data: {
            facilityId: facility.id,
            commercialLotId: commLot1.id,
            type: "RECEIPT",
            amount: totalAmount1,
            paymentDate: exportDate1,
            paymentMethod: "Chuyển khoản",
            payerName: "Công ty TNHH Nông sản Vân Nam",
            receiverName: facility.name,
            note: "Thanh toán 100% lô sầu riêng tươi xuất khẩu 788 kg (84 thùng)",
        },
    });

    // TraceEvent 1 (Shipment / CommercialLot)
    await prisma.traceEvent.create({
        data: {
            entityType: "COMMERCIAL_LOT",
            entityId: commLot1.id,
            commercialLotId: commLot1.id,
            eventType: "EXPORT_DISPATCHED",
            eventTime: exportDate1,
            actorId: ownerId,
            actorRole: "PROCESSING_FACILITY",
            organizationType: "PROCESSING_FACILITY",
            organizationId: facility.id,
            title: "Xuất khẩu nước ngoài (Trung Quốc)",
            description: "Xuất khẩu 788 kg (84 thùng, 3 trái/thùng) sầu riêng tươi Ri6 qua Cửa khẩu Hữu Nghị đi Côn Minh, Vân Nam",
            sourceEntityType: "FINISHED_PRODUCT_LOT",
            sourceEntityId: freshLot.id,
            metadata: {
                shipmentCode: shipmentCode1,
                destinationCountry: "Trung Quốc",
                portOfLoading: "Cửa khẩu Quốc tế Hữu Nghị",
                portOfDestination: "Côn Minh, Vân Nam",
                containerNumber: "TRHU-849201",
                sealNumber: "VN-EXP-9921",
                truckPlate: "51D-928.34",
                boxCount: 84,
                weight: weight1,
                unitPrice: unitPrice1,
                totalAmount: totalAmount1,
            },
            isPublic: true,
            createdAt: exportDate1,
        },
    });

    console.log(`✓ Đã tạo Lô xuất khẩu 1: ${shipmentCode1} (788 kg @ 135.000 = ${totalAmount1.toLocaleString()} đ)`);

    // =========================================================================
    // LÔ 2: XUẤT BÁN NỘI ĐỊA CƠM SẦU RIÊNG BÓC MÚI
    // Mã lô / Mã shipment: DOM-20260904-001
    // Khối lượng: 109 kg (218 khay hút chân không 500g)
    // Đơn giá bán: 280.000 đ/kg
    // Tổng thu: 30.520.000 đ (100% thanh toán)
    // =========================================================================
    console.log("\n--- XỬ LÝ LÔ 2: DOM-20260904-001 (NỘI ĐỊA WINMART) ---");
    const shipmentCode2 = "DOM-20260904-001";
    const publicToken2 = "DOM-20260904-001";
    const qrCode2 = "QR-DOM-20260904-001";
    const weight2 = 109;
    const unitPrice2 = 280000;
    const totalAmount2 = 30520000;

    // Xóa dữ liệu cũ nếu có
    const oldComm2 = await prisma.commercialLot.findFirst({
        where: { lotCode: shipmentCode2 },
    });
    if (oldComm2) {
        await prisma.partnerPaymentRecord.deleteMany({ where: { commercialLotId: oldComm2.id } });
        await prisma.traceEvent.deleteMany({ where: { commercialLotId: oldComm2.id } });
        await prisma.traceabilityCode.deleteMany({ where: { commercialLotId: oldComm2.id } });
        await prisma.shipmentItem.deleteMany({ where: { commercialLotId: oldComm2.id } });
        await prisma.lotRelation.deleteMany({ where: { targetId: oldComm2.id } });
        await prisma.commercialLot.delete({ where: { id: oldComm2.id } });
    }
    const oldShip2 = await prisma.shipment.findFirst({ where: { shipmentCode: shipmentCode2 } });
    if (oldShip2) {
        await prisma.exportShipmentInfo.deleteMany({ where: { shipmentId: oldShip2.id } });
        await prisma.shipmentItem.deleteMany({ where: { shipmentId: oldShip2.id } });
        await prisma.traceEvent.deleteMany({ where: { entityId: oldShip2.id } });
        await prisma.shipment.delete({ where: { id: oldShip2.id } });
    }

    // Tạo CommercialLot 2
    const commLot2 = await prisma.commercialLot.create({
        data: {
            lotCode: shipmentCode2,
            ownerType: "PROCESSING_FACILITY",
            ownerId: facility.id,
            sourceType: "FINISHED_PRODUCT_LOT",
            sourceId: procLot.id,
            sourceFinishedProductLotId: procLot.id,
            destinationId: destDomestic.id,
            productName: "Cơm sầu riêng bóc múi hút chân không (Khay 500g)",
            quantity: weight2,
            remainingQuantity: 0,
            unit: "kg",
            stockBeforeDispatch: weight2,
            unitPrice: unitPrice2,
            subtotal: totalAmount2,
            discount: 0,
            totalAmount: totalAmount2,
            paidAmount: totalAmount2,
            debtAmount: 0,
            paymentStatus: "PAID",
            paymentMethod: "Chuyển khoản",
            buyerName: "Hệ thống Siêu thị WinMart Miền Nam",
            buyerPhone: "0903 889 900",
            buyerAddress: "Kho trung chuyển WinMart, TP. Dĩ An, Tỉnh Bình Dương",
            dispatchedAt: exportDate2,
            status: "DISPATCHED",
            note: "Giao 218 khay cơm sầu riêng bóc múi hút chân không cấp đông -18°C",
            createdAt: exportDate2,
            updatedAt: exportDate2,
        },
    });

    // Tạo Shipment 2
    const meta2 = {
        channel: "Siêu thị / Bán lẻ",
        partnerSystem: "WinMart",
        partnerBranch: "Kho trung chuyển WinMart Dĩ An",
        customerName: "Hệ thống Siêu thị WinMart Miền Nam",
        customerPhone: "0903 889 900",
        deliveryAddress: "Kho trung chuyển WinMart, TP. Dĩ An, Tỉnh Bình Dương",
        truckPlate: "60C-445.89",
        transportMethod: "Xe tải lạnh chuyên dụng (-18°C)",
        unitPrice: unitPrice2,
        totalAmount: totalAmount2,
    };

    const shipment2 = await prisma.shipment.create({
        data: {
            shipmentCode: shipmentCode2,
            senderType: "PROCESSING_FACILITY",
            senderId: facility.id,
            destinationId: destDomestic.id,
            dispatchedWeight: weight2,
            dispatchAt: exportDate2,
            vehicleReference: "60C-445.89",
            status: "DISPATCHED",
            note: JSON.stringify(meta2),
            createdAt: exportDate2,
            updatedAt: exportDate2,
        },
    });

    // ShipmentItem 2
    await prisma.shipmentItem.create({
        data: {
            shipmentId: shipment2.id,
            commercialLotId: commLot2.id,
            quantity: weight2,
            weight: weight2,
            createdAt: exportDate2,
        },
    });

    // LotRelation 2
    await prisma.lotRelation.create({
        data: {
            sourceType: "FINISHED_PRODUCT_LOT",
            sourceId: procLot.id,
            targetType: "COMMERCIAL_LOT",
            targetId: commLot2.id,
            relationType: "PACKAGED_INTO",
            quantity: weight2,
        },
    });

    // TraceabilityCode 2
    await prisma.traceabilityCode.create({
        data: {
            code: qrCode2,
            publicToken: publicToken2,
            commercialLotId: commLot2.id,
            status: "ACTIVE",
            issuedAt: exportDate2,
            issuedById: ownerId,
            issuedByRole: "PROCESSING_FACILITY",
            activatedAt: exportDate2,
        },
    });

    // PartnerPaymentRecord 2 (Finance)
    await prisma.partnerPaymentRecord.create({
        data: {
            facilityId: facility.id,
            commercialLotId: commLot2.id,
            type: "RECEIPT",
            amount: totalAmount2,
            paymentDate: exportDate2,
            paymentMethod: "Chuyển khoản",
            payerName: "Hệ thống Siêu thị WinMart Miền Nam",
            receiverName: facility.name,
            note: "Thanh toán 100% lô cơm sầu riêng bóc múi 218 khay (109 kg)",
        },
    });

    // TraceEvent 2 (Shipment / CommercialLot)
    await prisma.traceEvent.create({
        data: {
            entityType: "COMMERCIAL_LOT",
            entityId: commLot2.id,
            commercialLotId: commLot2.id,
            eventType: "DOMESTIC_DISPATCHED",
            eventTime: exportDate2,
            actorId: ownerId,
            actorRole: "PROCESSING_FACILITY",
            organizationType: "PROCESSING_FACILITY",
            organizationId: facility.id,
            title: "Xuất bán trong nước",
            description: "Giao 218 khay (109 kg) cơm sầu riêng bóc múi hút chân không đến Kho trung chuyển WinMart Dĩ An, Bình Dương",
            sourceEntityType: "FINISHED_PRODUCT_LOT",
            sourceEntityId: procLot.id,
            metadata: {
                shipmentCode: shipmentCode2,
                partnerSystem: "WinMart",
                partnerBranch: "Kho trung chuyển WinMart Dĩ An",
                deliveryAddress: "Kho trung chuyển WinMart, TP. Dĩ An, Tỉnh Bình Dương",
                truckPlate: "60C-445.89",
                weight: weight2,
                packageCount: "218 khay",
                unitPrice: unitPrice2,
                totalAmount: totalAmount2,
            },
            isPublic: true,
            createdAt: exportDate2,
        },
    });

    console.log(`✓ Đã tạo Lô nội địa 2: ${shipmentCode2} (109 kg @ 280.000 = ${totalAmount2.toLocaleString()} đ)`);

    // 5. Cập nhật trạng thái 2 lô thành phẩm sang DISTRIBUTED & remainingWeight = 0
    await prisma.finishedProductLot.update({
        where: { id: freshLot.id },
        data: {
            remainingWeight: 0,
            status: "DISTRIBUTED",
        },
    });
    await prisma.finishedProductLot.update({
        where: { id: procLot.id },
        data: {
            remainingWeight: 0,
            status: "DISTRIBUTED",
        },
    });
    console.log("✓ Đã cập nhật 2 lô thành phẩm sang trạng thái DISTRIBUTED (Không còn đủ điều kiện xuất vì đã xuất hết).");

    console.log("\n=== HOÀN TẤT SEED DỮ LIỆU XUẤT HÀNG & TÀI CHÍNH THÀNH CÔNG ===");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
