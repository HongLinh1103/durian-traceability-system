// Unified Processing Facility Workflow Service & Store
// Manages complete traceability pipeline:
// Purchases (Hồ sơ thu mua) -> Grading (Phân loại) -> Processing & Packaging (Chế biến & Đóng gói) -> Shipments (Xuất hàng & QR) -> Finance (Tài chính)

export interface PurchaseRecord {
    id: string;
    cropSeason: string; // e.g. "2025-2026"
    purchaseCode: string; // e.g. "TM-2025-2508"
    purchaseDate: string; // YYYY-MM-DD
    sellerName: string;
    sellerPhone: string;
    sellerAddress: string;
    durianVariety: "Ri6" | "Monthong" | "Khác";
    weightKg: number;
    pricePerKg: number;
    totalAmount: number; // weightKg * pricePerKg
    farmName: string;
    pucCode: string; // e.g. "VN-DNOR-0269"
    notes?: string;
    createdAt: string;
    gradingStatus: "PENDING" | "COMPLETED";
}

export interface GradingRecord {
    id: string;
    gradingCode: string; // e.g. "PL-2026-2706"
    purchaseId: string;
    purchaseCode: string;
    gradingDate: string;
    durianVariety: string;
    totalWeight: number;
    freshWeight: number; // Trái tươi (kg)
    freshPercent: number; // %
    processedWeight: number; // Chế biến khác (kg)
    processedPercent: number; // %
    notes?: string;
    // Backward links
    sellerName: string;
    farmName: string;
    pucCode: string;
    // Downstream status
    freshStatus: "WAITING_PACKAGING" | "COMPLETED";
    processedStatus: "WAITING_PROCESSING" | "COMPLETED";
}

export interface FinishedProductLot {
    id: string;
    productCode: string; // e.g. "TP-2026-2706"
    type: "FRESH" | "PROCESSED"; // Trái tươi | Chế biến khác
    productName: string; // e.g. "Sầu riêng tươi xuất khẩu"
    processingMethod?: string; // "Bóc múi & cấp đông" | "Cấp đông nguyên trái" | "Sấy thăng hoa" | "Đóng thùng tươi" | "Khác"
    inputWeightKg: number;
    packagingSpec: string; // "Thùng 18kg" | "Thùng 10kg" | "Túi 500g" | "Khay 1kg" | "Thùng 5kg" | "Khác"
    packageCount: number; // Số thùng / khay / gói
    fruitCount?: number; // Số trái/thùng (chỉ dành cho Trái tươi)
    netWeightKg: number; // Khối lượng thành phẩm
    lossWeightKg: number; // Hao hụt
    recoveryRatePercent: number; // Tỉ lệ thu hồi
    completionDate: string;
    status: "READY" | "SHIPPED"; // Sẵn sàng xuất | Đã xuất
    notes?: string;

    // TRACEABILITY BACKWARD LINKS
    gradingId: string;
    gradingCode: string;
    purchaseId: string;
    purchaseCode: string;
    sellerName: string;
    farmName: string;
    pucCode: string;
    phcCode: string; // VN-DNPH-131
    facilityName: string;
    durianVariety: string;
}

export interface ShipmentRecord {
    id: string;
    shipmentCode: string; // e.g. "XH-2526-001"
    shipmentDate: string;
    contractType: "EXPORT" | "DOMESTIC";
    // Bên bán / Cảng đi
    sellerFacilityName: string;
    sellerPhcCode: string;
    departurePort: string;
    // Bên mua / Cảng đến
    buyerName: string;
    destinationMarket: string;
    destinationPort: string;
    // Hàng hóa
    finishedProductLotId: string;
    productCode: string;
    productName: string;
    packagingSpec: string;
    netWeightKg: number;
    packageCount: number;
    unitPrice: number;
    currency: "VND" | "USD";
    totalAmount: number;
    // Vận chuyển
    truckPlate: string;
    containerNumber: string;
    sealNumber: string;
    carrierName: string;
    containerTemp?: string;
    // Nguồn gốc & Truy xuất (Locked, backward link from finishedProductLot)
    farmName: string;
    pucCode: string;
    facilityName: string;
    phcCode: string;
    purchaseCode: string;
    durianVariety: string;
    // QR Code
    qrIssued: boolean;
    qrCodeUrl?: string;
    issuedAt?: string;
}

export interface ReceivableRecord {
    id: string;
    shipmentId: string;
    shipmentCode: string;
    buyerName: string;
    market: string;
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    status: "UNPAID" | "PARTIAL" | "PAID";
    date: string;
}

export interface PayableRecord {
    id: string;
    purchaseId: string;
    purchaseCode: string;
    sellerName: string;
    sellerPhone: string;
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    status: "UNPAID" | "PARTIAL" | "PAID";
    date: string;
}

export interface CashFlowRecord {
    id: string;
    date: string;
    type: "INFLOW" | "OUTFLOW";
    category: "SALES" | "PURCHASE" | "OTHER";
    description: string;
    amount: number;
    balanceAfter: number;
    paymentMethod: "BANK" | "CASH";
    referenceCode?: string;
}

export interface ProcessingWorkflowState {
    purchases: PurchaseRecord[];
    gradings: GradingRecord[];
    finishedLots: FinishedProductLot[];
    shipments: ShipmentRecord[];
    receivables: ReceivableRecord[];
    payables: PayableRecord[];
    cashFlowLogs: CashFlowRecord[];
}

const STORAGE_KEY = "triviet_processing_workflow_v2";

export const DEFAULT_FACILITY_INFO = {
    name: "Kim Quy OneMember LimitedLiabilityCompany",
    phcCode: "VN-DNPH-131",
    phone: "0909000003",
    address: "Hamlet 9, Nam Cat Tien Commune, Dong Nai Province, Vietnam",
    representative: "Trần Minh Anh",
};

// INITIAL SEED DATA
const SEED_PURCHASES: PurchaseRecord[] = [
    {
        id: "tm-minh-2908",
        cropSeason: "2025-2026",
        purchaseCode: "TM-2026-2908",
        purchaseDate: "2026-08-29",
        sellerName: "Trần Văn Minh",
        sellerPhone: "0912345678",
        sellerAddress: "Ấp Phú Lộc, Xã Phú Lộc, Huyện Tân Phú, Tỉnh Đồng Nai",
        durianVariety: "Ri6",
        weightKg: 4500,
        pricePerKg: 55000,
        totalAmount: 247500000,
        farmName: "Vườn sầu riêng Minh Phát",
        pucCode: "VN-DNOR-0269",
        notes: "Thu mua từ phiếu thu hoạch TH-2526-2908 của nông dân Trần Văn Minh (Vườn sầu riêng Minh Phát)",
        createdAt: "2026-08-29T08:30:00Z",
        gradingStatus: "COMPLETED",
    },
    {
        id: "tm-minh-2007",
        cropSeason: "2025-2026",
        purchaseCode: "TM-2026-2007",
        purchaseDate: "2026-07-20",
        sellerName: "Trần Văn Minh",
        sellerPhone: "0912345678",
        sellerAddress: "Ấp Phú Lộc, Xã Phú Lộc, Huyện Tân Phú, Tỉnh Đồng Nai",
        durianVariety: "Ri6",
        weightKg: 1140,
        pricePerKg: 52000,
        totalAmount: 59280000,
        farmName: "Vườn sầu riêng Minh Phát",
        pucCode: "VN-DNOR-0269",
        notes: "Thu mua từ phiếu thu hoạch TH-2526-2007 của nông dân Trần Văn Minh (Vườn sầu riêng Minh Phát)",
        createdAt: "2026-07-20T08:00:00Z",
        gradingStatus: "COMPLETED",
    },
    {
        id: "tm-1",
        cropSeason: "2025-2026",
        purchaseCode: "TM-2026-0503",
        purchaseDate: "2026-03-05",
        sellerName: "Nguyễn Văn Nam",
        sellerPhone: "0912345678",
        sellerAddress: "Ấp 3, Xã Bình Lộc, TP. Long Khánh, Đồng Nai",
        durianVariety: "Ri6",
        weightKg: 5000,
        pricePerKg: 85000,
        totalAmount: 425000000,
        farmName: "Vườn Sầu Riêng Bác Ba",
        pucCode: "VN-DNOR-0269",
        notes: "Thu mua đợt 1 đầu vụ, trái nở gai đều, cơm vàng hạt lép",
        createdAt: "2026-03-05T08:00:00Z",
        gradingStatus: "COMPLETED",
    },
    {
        id: "tm-2",
        cropSeason: "2025-2026",
        purchaseCode: "TM-2026-0803",
        purchaseDate: "2026-03-08",
        sellerName: "Trần Thị Mai",
        sellerPhone: "0987654321",
        sellerAddress: "Thôn 2, Xã Đắk Wer, Huyện Đắk R'lấp, Đắk Nông",
        durianVariety: "Monthong",
        weightKg: 7500,
        pricePerKg: 95000,
        totalAmount: 712500000,
        farmName: "Vườn Hoàng Long",
        pucCode: "67-PUC-SR-00002-CHN",
        notes: "Hàng tuyển Monthong cơm dầy, chuẩn xuất khẩu",
        createdAt: "2026-03-08T09:30:00Z",
        gradingStatus: "COMPLETED",
    },
    {
        id: "tm-3",
        cropSeason: "2025-2026",
        purchaseCode: "TM-2026-1203",
        purchaseDate: "2026-03-12",
        sellerName: "Lê Quốc Hưng",
        sellerPhone: "0903112233",
        sellerAddress: "Xã Tam Bình, Huyện Cai Lậy, Tiền Giang",
        durianVariety: "Ri6",
        weightKg: 3800,
        pricePerKg: 82000,
        totalAmount: 311600000,
        farmName: "Vườn Chú Năm Cai Lậy",
        pucCode: "82-PUC-SR-00001-CHN",
        notes: "Lô thu mua đầu vụ Cai Lậy, đã phân loại",
        createdAt: "2026-03-12T07:45:00Z",
        gradingStatus: "COMPLETED",
    },
    {
        id: "tm-4",
        cropSeason: "2025-2026",
        purchaseCode: "TM-2026-1403",
        purchaseDate: "2026-03-14",
        sellerName: "Phạm Hải Đăng",
        sellerPhone: "0934556677",
        sellerAddress: "Xã Tân Hưng, TP. Bà Rịa, Tỉnh Bà Rịa - Vũng Tàu",
        durianVariety: "Monthong",
        weightKg: 4200,
        pricePerKg: 90000,
        totalAmount: 378000000,
        farmName: "Nông trại Hải Đăng",
        pucCode: "77-PUC-SR-00003-CHN",
        notes: "Lô Monthong chuẩn xuất khẩu, đã phân loại",
        createdAt: "2026-03-14T08:15:00Z",
        gradingStatus: "COMPLETED",
    },
    {
        id: "tm-5",
        cropSeason: "2025-2026",
        purchaseCode: "TM-2026-1503",
        purchaseDate: "2026-03-15",
        sellerName: "Nguyễn Thành Long",
        sellerPhone: "0918776655",
        sellerAddress: "Xã Nam Cát Tiên, tỉnh Đồng Nai",
        durianVariety: "Ri6",
        weightKg: 2500,
        pricePerKg: 86000,
        totalAmount: 215000000,
        farmName: "Vườn Sầu Riêng Ba Long",
        pucCode: "VN-DNOR-0269",
        notes: "Lô thu mua mới nhập về bãi kiểm định sáng nay",
        createdAt: "2026-03-15T07:30:00Z",
        gradingStatus: "PENDING",
    },
];

const SEED_GRADINGS: GradingRecord[] = [
    {
        id: "pl-minh-2908",
        gradingCode: "PL-2026-2908",
        purchaseId: "tm-minh-2908",
        purchaseCode: "TM-2026-2908",
        gradingDate: "2026-08-29",
        durianVariety: "Ri6",
        totalWeight: 4500,
        freshWeight: 3150,
        freshPercent: 70,
        processedWeight: 1350,
        processedPercent: 30,
        notes: "Phân loại theo phiếu thu hoạch TH-2526-2908 (Trần Văn Minh - Vườn Minh Phát)",
        sellerName: "Trần Văn Minh",
        farmName: "Vườn sầu riêng Minh Phát",
        pucCode: "VN-DNOR-0269",
        freshStatus: "WAITING_PACKAGING",
        processedStatus: "WAITING_PROCESSING",
    },
    {
        id: "pl-minh-2007",
        gradingCode: "PL-2026-2007",
        purchaseId: "tm-minh-2007",
        purchaseCode: "TM-2026-2007",
        gradingDate: "2026-07-20",
        durianVariety: "Ri6",
        totalWeight: 1140,
        freshWeight: 800,
        freshPercent: 70.18,
        processedWeight: 340,
        processedPercent: 29.82,
        notes: "Phân loại theo phiếu thu hoạch TH-2526-2007 (Trần Văn Minh - Vườn Minh Phát)",
        sellerName: "Trần Văn Minh",
        farmName: "Vườn sầu riêng Minh Phát",
        pucCode: "VN-DNOR-0269",
        freshStatus: "WAITING_PACKAGING",
        processedStatus: "WAITING_PROCESSING",
    },
    {
        id: "pl-3105",
        gradingCode: "PL-2026-1203",
        purchaseId: "tm-3",
        purchaseCode: "TM-2026-1203",
        gradingDate: "2026-03-12",
        durianVariety: "Ri6",
        totalWeight: 3800,
        freshWeight: 2660,
        freshPercent: 70,
        processedWeight: 1140,
        processedPercent: 30,
        notes: "Phân loại lô sầu riêng Ri6 Vườn Chú Năm Cai Lậy: 70% tươi, 30% chế biến",
        sellerName: "Lê Quốc Hưng",
        farmName: "Vườn Chú Năm Cai Lậy",
        pucCode: "82-PUC-SR-00001-CHN",
        freshStatus: "WAITING_PACKAGING",
        processedStatus: "WAITING_PROCESSING",
    },
    {
        id: "pl-3180",
        gradingCode: "PL-2026-1403",
        purchaseId: "tm-4",
        purchaseCode: "TM-2026-1403",
        gradingDate: "2026-03-14",
        durianVariety: "Monthong",
        totalWeight: 4200,
        freshWeight: 3000,
        freshPercent: 71.43,
        processedWeight: 1200,
        processedPercent: 28.57,
        notes: "Phân loại lô Monthong Nông trại Hải Đăng: 3.000 kg tươi đạt chuẩn A, 1.200 kg chuyển chế biến",
        sellerName: "Phạm Hải Đăng",
        farmName: "Nông trại Hải Đăng",
        pucCode: "77-PUC-SR-00003-CHN",
        freshStatus: "WAITING_PACKAGING",
        processedStatus: "WAITING_PROCESSING",
    },
    {
        id: "pl-1",
        gradingCode: "PL-2026-0503",
        purchaseId: "tm-1",
        purchaseCode: "TM-2026-0503",
        gradingDate: "2026-03-05",
        durianVariety: "Ri6",
        totalWeight: 5000,
        freshWeight: 3500,
        freshPercent: 70,
        processedWeight: 1500,
        processedPercent: 30,
        notes: "70% đạt chuẩn xuất trái tươi, 30% trái nhỏ chuyển bóc múi cấp đông",
        sellerName: "Nguyễn Văn Nam",
        farmName: "Vườn Sầu Riêng Bác Ba",
        pucCode: "VN-DNOR-0269",
        freshStatus: "COMPLETED",
        processedStatus: "COMPLETED",
    },
    {
        id: "pl-2",
        gradingCode: "PL-2026-0803",
        purchaseId: "tm-2",
        purchaseCode: "TM-2026-0803",
        gradingDate: "2026-03-08",
        durianVariety: "Monthong",
        totalWeight: 7500,
        freshWeight: 5500,
        freshPercent: 73.33,
        processedWeight: 2000,
        processedPercent: 26.67,
        notes: "5,500 kg đủ chuẩn đóng thùng xuất tươi, 2,000 kg chờ bóc múi cấp đông",
        sellerName: "Trần Thị Mai",
        farmName: "Vườn Hoàng Long",
        pucCode: "67-PUC-SR-00002-CHN",
        freshStatus: "COMPLETED",
        processedStatus: "WAITING_PROCESSING",
    },
];

const SEED_FINISHED_LOTS: FinishedProductLot[] = [
    {
        id: "tp-1",
        productCode: "TP-2026-0603",
        type: "FRESH",
        productName: "Sầu riêng Ri6 tươi đóng thùng xuất khẩu",
        inputWeightKg: 3500,
        packagingSpec: "Thùng 18kg",
        packageCount: 188,
        fruitCount: 5,
        netWeightKg: 3384,
        lossWeightKg: 116,
        recoveryRatePercent: 96.69,
        completionDate: "2026-03-06",
        status: "SHIPPED",
        notes: "Đóng gói theo tiêu chuẩn GACC quả tươi, dán tem QR từng thùng",
        gradingId: "pl-1",
        gradingCode: "PL-2026-0503",
        purchaseId: "tm-1",
        purchaseCode: "TM-2026-0503",
        sellerName: "Nguyễn Văn Nam",
        farmName: "Vườn Sầu Riêng Bác Ba",
        pucCode: "VN-DNOR-0269",
        phcCode: "VN-DNPH-131",
        facilityName: "Công ty TNHH MTV Kim Quy",
        durianVariety: "Ri6",
    },
    {
        id: "tp-2",
        productCode: "TP-2026-0703",
        type: "PROCESSED",
        productName: "Sầu riêng Ri6 múi cấp đông IQF",
        processingMethod: "Bóc múi & cấp đông",
        inputWeightKg: 1500,
        packagingSpec: "Khay 1kg",
        packageCount: 480,
        netWeightKg: 480,
        lossWeightKg: 1020,
        recoveryRatePercent: 32.0,
        completionDate: "2026-03-07",
        status: "READY",
        notes: "Múi vàng ruộm dầy cơm, cấp đông sâu -40°C bảo quản -18°C",
        gradingId: "pl-1",
        gradingCode: "PL-2026-0503",
        purchaseId: "tm-1",
        purchaseCode: "TM-2026-0503",
        sellerName: "Nguyễn Văn Nam",
        farmName: "Vườn Sầu Riêng Bác Ba",
        pucCode: "VN-DNOR-0269",
        phcCode: "VN-DNPH-131",
        facilityName: "Công ty TNHH MTV Kim Quy",
        durianVariety: "Ri6",
    },
    {
        id: "tp-3",
        productCode: "TP-2026-0903",
        type: "FRESH",
        productName: "Sầu riêng Monthong tươi xuất khẩu chuẩn A",
        inputWeightKg: 5500,
        packagingSpec: "Thùng 18kg",
        packageCount: 295,
        fruitCount: 4,
        netWeightKg: 5310,
        lossWeightKg: 190,
        recoveryRatePercent: 96.55,
        completionDate: "2026-03-09",
        status: "READY",
        notes: "Đã bọc lưới xốp, dán tem chống hàng giả và sẵn sàng xuất",
        gradingId: "pl-2",
        gradingCode: "PL-2026-0803",
        purchaseId: "tm-2",
        purchaseCode: "TM-2026-0803",
        sellerName: "Trần Thị Mai",
        farmName: "Vườn Hoàng Long",
        pucCode: "67-PUC-SR-00002-CHN",
        phcCode: "VN-DNPH-131",
        facilityName: "Công ty TNHH MTV Kim Quy",
        durianVariety: "Monthong",
    },
];

const SEED_SHIPMENTS: ShipmentRecord[] = [
    {
        id: "xh-1",
        shipmentCode: "XH-2526-001",
        shipmentDate: "2026-03-10",
        contractType: "EXPORT",
        sellerFacilityName: "Công ty TNHH MTV Kim Quy",
        sellerPhcCode: "VN-DNPH-131",
        departurePort: "Cảng Cát Lái, TP. Hồ Chí Minh",
        buyerName: "Tập đoàn Nông sản Quảng Tây (Guangxi Agri-Trade Group)",
        destinationMarket: "Trung Quốc",
        destinationPort: "Cảng Khâm Châu (Qinzhou Port, China)",
        finishedProductLotId: "tp-1",
        productCode: "TP-2026-0603",
        productName: "Sầu riêng Ri6 tươi đóng thùng xuất khẩu",
        packagingSpec: "Thùng 18kg",
        netWeightKg: 3384,
        packageCount: 188,
        unitPrice: 160000,
        currency: "VND",
        totalAmount: 541440000,
        truckPlate: "51D-892.45",
        containerNumber: "TGHU-782910-4",
        sealNumber: "VN-GACC-992104",
        carrierName: "Công ty TNHH Vận tải & Tiếp vận Biển Đông",
        containerTemp: "+13°C (Độ ẩm 85%)",
        farmName: "Vườn Sầu Riêng Bác Ba",
        pucCode: "VN-DNOR-0269",
        facilityName: "Công ty TNHH MTV Kim Quy",
        phcCode: "VN-DNPH-131",
        purchaseCode: "TM-2026-0503",
        durianVariety: "Ri6",
        qrIssued: false,
    },
];

const SEED_RECEIVABLES: ReceivableRecord[] = [
    {
        id: "rec-1",
        shipmentId: "xh-1",
        shipmentCode: "XH-2526-001",
        buyerName: "Tập đoàn Nông sản Quảng Tây (Guangxi Agri-Trade Group)",
        market: "Trung Quốc",
        totalAmount: 541440000,
        paidAmount: 300000000,
        remainingAmount: 241440000,
        status: "PARTIAL",
        date: "2026-03-10",
    },
];

const SEED_PAYABLES: PayableRecord[] = [
    {
        id: "pay-minh-2908",
        purchaseId: "tm-minh-2908",
        purchaseCode: "TM-2026-2908",
        sellerName: "Trần Văn Minh",
        sellerPhone: "0912345678",
        totalAmount: 247500000,
        paidAmount: 247500000,
        remainingAmount: 0,
        status: "PAID",
        date: "2026-08-29",
    },
    {
        id: "pay-minh-2007",
        purchaseId: "tm-minh-2007",
        purchaseCode: "TM-2026-2007",
        sellerName: "Trần Văn Minh",
        sellerPhone: "0912345678",
        totalAmount: 59280000,
        paidAmount: 59280000,
        remainingAmount: 0,
        status: "PAID",
        date: "2026-07-20",
    },
    {
        id: "pay-1",
        purchaseId: "tm-1",
        purchaseCode: "TM-2026-0503",
        sellerName: "Nguyễn Văn Nam",
        sellerPhone: "0912345678",
        totalAmount: 425000000,
        paidAmount: 425000000,
        remainingAmount: 0,
        status: "PAID",
        date: "2026-03-05",
    },
    {
        id: "pay-2",
        purchaseId: "tm-2",
        purchaseCode: "TM-2026-0803",
        sellerName: "Trần Thị Mai",
        sellerPhone: "0987654321",
        totalAmount: 712500000,
        paidAmount: 400000000,
        remainingAmount: 312500000,
        status: "PARTIAL",
        date: "2026-03-08",
    },
    {
        id: "pay-3",
        purchaseId: "tm-3",
        purchaseCode: "TM-2026-1203",
        sellerName: "Lê Quốc Hưng",
        sellerPhone: "0903112233",
        totalAmount: 311600000,
        paidAmount: 0,
        remainingAmount: 311600000,
        status: "UNPAID",
        date: "2026-03-12",
    },
    {
        id: "pay-4",
        purchaseId: "tm-4",
        purchaseCode: "TM-2026-1403",
        sellerName: "Phạm Hải Đăng",
        sellerPhone: "0934556677",
        totalAmount: 378000000,
        paidAmount: 0,
        remainingAmount: 378000000,
        status: "UNPAID",
        date: "2026-03-14",
    },
    {
        id: "pay-5",
        purchaseId: "tm-5",
        purchaseCode: "TM-2026-1503",
        sellerName: "Nguyễn Thành Long",
        sellerPhone: "0918776655",
        totalAmount: 215000000,
        paidAmount: 0,
        remainingAmount: 215000000,
        status: "UNPAID",
        date: "2026-03-15",
    },
];

const SEED_CASH_FLOW: CashFlowRecord[] = [
    {
        id: "cf-1",
        date: "2026-03-05",
        type: "OUTFLOW",
        category: "PURCHASE",
        description: "Thanh toán toàn bộ tiền thu mua lô TM-2026-0503 cho Nguyễn Văn Nam",
        amount: 425000000,
        balanceAfter: 1575000000,
        paymentMethod: "BANK",
        referenceCode: "TM-2026-0503",
    },
    {
        id: "cf-2",
        date: "2026-03-08",
        type: "OUTFLOW",
        category: "PURCHASE",
        description: "Thanh toán đợt 1 tiền thu mua lô TM-2026-0803 cho Trần Thị Mai",
        amount: 400000000,
        balanceAfter: 1175000000,
        paymentMethod: "BANK",
        referenceCode: "TM-2026-0803",
    },
    {
        id: "cf-3",
        date: "2026-03-11",
        type: "INFLOW",
        category: "SALES",
        description: "Thu tiền đợt 1 hợp đồng xuất khẩu XH-2526-001 (Guangxi Agri-Trade Group)",
        amount: 300000000,
        balanceAfter: 1475000000,
        paymentMethod: "BANK",
        referenceCode: "XH-2526-001",
    },
];

export function getInitialProcessingState(): ProcessingWorkflowState {
    return {
        purchases: SEED_PURCHASES,
        gradings: SEED_GRADINGS,
        finishedLots: SEED_FINISHED_LOTS,
        shipments: SEED_SHIPMENTS,
        receivables: SEED_RECEIVABLES,
        payables: SEED_PAYABLES,
        cashFlowLogs: SEED_CASH_FLOW,
    };
}

export function loadProcessingState(): ProcessingWorkflowState {
    if (typeof window === "undefined") return getInitialProcessingState();
    try {
        if (localStorage.getItem("triviet_processing_workflow_v1")) {
            localStorage.removeItem("triviet_processing_workflow_v1");
        }
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            const initial = getInitialProcessingState();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
            return initial;
        }
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed.purchases)) {
            parsed.purchases = parsed.purchases.filter(
                (p: PurchaseRecord) => p.id !== "tm-minh-phat" && p.purchaseCode !== "TH-20260829-002"
            );
            for (const sp of SEED_PURCHASES) {
                const existingIdx = parsed.purchases.findIndex((p: PurchaseRecord) => p.id === sp.id || p.purchaseCode === sp.purchaseCode);
                if (existingIdx === -1) {
                    parsed.purchases.unshift(sp);
                } else {
                    parsed.purchases[existingIdx].purchaseCode = sp.purchaseCode;
                    parsed.purchases[existingIdx].gradingStatus = sp.gradingStatus;
                }
            }
        }
        if (Array.isArray(parsed.gradings)) {
            parsed.gradings = parsed.gradings.filter((g: GradingRecord) => g.purchaseCode !== "TH-20260829-002");
            for (const sg of SEED_GRADINGS) {
                const existingIdx = parsed.gradings.findIndex((g: GradingRecord) => g.id === sg.id || g.gradingCode === sg.gradingCode);
                if (existingIdx === -1) {
                    parsed.gradings.unshift(sg);
                } else {
                    parsed.gradings[existingIdx].gradingCode = sg.gradingCode;
                    parsed.gradings[existingIdx].purchaseCode = sg.purchaseCode;
                    parsed.gradings[existingIdx].freshStatus = sg.freshStatus;
                    parsed.gradings[existingIdx].processedStatus = sg.processedStatus;
                }
            }
        }
        if (Array.isArray(parsed.finishedLots)) {
            for (const sfl of SEED_FINISHED_LOTS) {
                const existingIdx = parsed.finishedLots.findIndex((fl: FinishedProductLot) => fl.id === sfl.id);
                if (existingIdx !== -1) {
                    parsed.finishedLots[existingIdx].productCode = sfl.productCode;
                    parsed.finishedLots[existingIdx].gradingCode = sfl.gradingCode;
                    parsed.finishedLots[existingIdx].purchaseCode = sfl.purchaseCode;
                }
            }
        }
        if (Array.isArray(parsed.payables)) {
            parsed.payables = parsed.payables.filter((p: PayableRecord) => p.purchaseCode !== "TH-20260829-002");
            for (const spay of SEED_PAYABLES) {
                const existingIdx = parsed.payables.findIndex((p: PayableRecord) => p.id === spay.id || p.purchaseCode === spay.purchaseCode);
                if (existingIdx === -1) {
                    parsed.payables.unshift(spay);
                } else {
                    parsed.payables[existingIdx].purchaseCode = spay.purchaseCode;
                }
            }
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        return parsed;
    } catch {
        return getInitialProcessingState();
    }
}

export function saveProcessingState(state: ProcessingWorkflowState): void {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        window.dispatchEvent(new Event("processing-state-updated"));
    } catch (e) {
        console.error("Failed to save processing state:", e);
    }
}

/**
 * Format mã quy trình theo quy tắc chuẩn:
 * - Mã lô TM: TM-YYYY-DDMM (Ví dụ: thu mua 25/08/2025 -> TM-2025-2508)
 * - Mã lô PL: PL-YYYY-DDMM (Ví dụ: phân loại 27/06/2026 -> PL-2026-2706)
 * - Mã lô TP: TP-YYYY-DDMM (Ví dụ: hoàn thành 27/06/2026 -> TP-2026-2706)
 * Nếu trùng ngày với lô đã có, thêm hậu tố tuần tự -01, -02...
 */
export function formatWorkflowCode(prefix: string, dateInput?: string | Date, existingCodes: string[] = []): string {
    let year = "";
    let month = "";
    let day = "";

    if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
        year = dateInput.getFullYear().toString();
        month = (dateInput.getMonth() + 1).toString().padStart(2, "0");
        day = dateInput.getDate().toString().padStart(2, "0");
    } else if (typeof dateInput === "string" && dateInput.trim()) {
        const clean = dateInput.trim();
        const ymdMatch = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (ymdMatch) {
            year = ymdMatch[1];
            month = ymdMatch[2].padStart(2, "0");
            day = ymdMatch[3].padStart(2, "0");
        } else {
            const dmyMatch = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
            if (dmyMatch) {
                day = dmyMatch[1].padStart(2, "0");
                month = dmyMatch[2].padStart(2, "0");
                year = dmyMatch[3];
            } else {
                const d = new Date(clean);
                if (!isNaN(d.getTime())) {
                    year = d.getFullYear().toString();
                    month = (d.getMonth() + 1).toString().padStart(2, "0");
                    day = d.getDate().toString().padStart(2, "0");
                }
            }
        }
    }

    if (!year || !month || !day) {
        const now = new Date();
        year = now.getFullYear().toString();
        month = (now.getMonth() + 1).toString().padStart(2, "0");
        day = now.getDate().toString().padStart(2, "0");
    }

    const baseCode = `${prefix}-${year}-${day}${month}`;

    if (!existingCodes || existingCodes.length === 0) {
        return baseCode;
    }

    if (!existingCodes.includes(baseCode)) {
        return baseCode;
    }

    let counter = 1;
    let candidate = `${baseCode}-${counter.toString().padStart(2, "0")}`;
    while (existingCodes.includes(candidate)) {
        counter++;
        candidate = `${baseCode}-${counter.toString().padStart(2, "0")}`;
    }
    return candidate;
}

// AUTO-CODE GENERATORS
export function generatePurchaseCode(existingPurchases: PurchaseRecord[] = [], purchaseDate?: string): string {
    const existingCodes = existingPurchases.map((p) => p.purchaseCode);
    return formatWorkflowCode("TM", purchaseDate, existingCodes);
}

export function generateGradingCode(existingGradings: GradingRecord[] = [], gradingDate?: string): string {
    const existingCodes = existingGradings.map((g) => g.gradingCode);
    return formatWorkflowCode("PL", gradingDate, existingCodes);
}

export function generateFinishedLotCode(existingLots: FinishedProductLot[] = [], completionDate?: string): string {
    const existingCodes = existingLots.map((l) => l.productCode);
    return formatWorkflowCode("TP", completionDate, existingCodes);
}

export function generateShipmentCode(existingShipments: ShipmentRecord[]): string {
    const prefix = "XH-2526-";
    const maxNumber = existingShipments.reduce((max, s) => {
        const match = s.shipmentCode.match(/XH-2526-(\d+)/);
        if (match) {
            const num = parseInt(match[1], 10);
            return num > max ? num : max;
        }
        return max;
    }, 0);
    const nextNum = maxNumber + 1;
    return `${prefix}${nextNum.toString().padStart(3, "0")}`;
}

// 5 CORE KPIS CALCULATOR
export function calculateProcessingKpis(
    state: ProcessingWorkflowState,
    filters?: { cropSeason?: string; fromDate?: string; toDate?: string }
) {
    let purchases = state.purchases;
    let gradings = state.gradings;
    let shipments = state.shipments;

    if (filters?.cropSeason && filters.cropSeason !== "ALL") {
        purchases = purchases.filter((p) => p.cropSeason === filters.cropSeason);
    }
    if (filters?.fromDate) {
        purchases = purchases.filter((p) => p.purchaseDate >= filters.fromDate!);
        gradings = gradings.filter((g) => g.gradingDate >= filters.fromDate!);
        shipments = shipments.filter((s) => s.shipmentDate >= filters.fromDate!);
    }
    if (filters?.toDate) {
        purchases = purchases.filter((p) => p.purchaseDate <= filters.toDate!);
        gradings = gradings.filter((g) => g.gradingDate <= filters.toDate!);
        shipments = shipments.filter((s) => s.shipmentDate <= filters.toDate!);
    }

    // 1. Tổng thu mua: Tổng kg đã ghi nhận trong Hồ sơ thu mua
    const totalPurchaseWeight = purchases.reduce((sum, p) => sum + p.weightKg, 0);

    // 2. Chờ phân loại: Khối lượng/lô chưa phân loại
    const pendingGradingPurchases = purchases.filter((p) => p.gradingStatus === "PENDING");
    const pendingGradingWeight = pendingGradingPurchases.reduce((sum, p) => sum + p.weightKg, 0);
    const pendingGradingCount = pendingGradingPurchases.length;

    // 3. Trái tươi: Khối lượng được phân loại sang Trái tươi
    const freshClassifiedWeight = gradings.reduce((sum, g) => sum + g.freshWeight, 0);

    // 4. Chế biến khác: Khối lượng được phân loại sang Chế biến khác
    const processedClassifiedWeight = gradings.reduce((sum, g) => sum + g.processedWeight, 0);

    // 5. Đã xuất: Khối lượng đã hoàn tất xuất hàng
    const shippedWeight = shipments.reduce((sum, s) => sum + s.netWeightKg, 0);

    return {
        totalPurchaseWeight,
        pendingGradingWeight,
        pendingGradingCount,
        freshClassifiedWeight,
        processedClassifiedWeight,
        shippedWeight,
    };
}
