import type { BatchInput, FarmingLogInput, RegisterInput } from "@/lib/validation";

export const mockFarms = [
    { id: "farm_001", farmCode: "MSVT-001", farmName: "Vườn Sầu Riêng Hợp Tác Xanh", durianVariety: "Ri6" },
    { id: "farm_002", farmCode: "MSVT-002", farmName: "Trang trại Đông Phú", durianVariety: "Monthong" },
    { id: "farm_003", farmCode: "MSVT-003", farmName: "Vườn Musang King An Phát", durianVariety: "MusangKing" },
] as const;

export const mockPackhouses = [
    { id: "pack_001", packhouseCode: "MSCSĐG-001", packhouseName: "Vựa Đóng Gói Tân Lộc" },
    { id: "pack_002", packhouseCode: "MSCSĐG-002", packhouseName: "Nhà máy Xuất Khẩu GreenFarm" },
] as const;

export const mockRegisterDefaults: Partial<RegisterInput> = {
    role: "FARMER",
};

export const mockLogDefaults: Partial<FarmingLogInput> = {
    stage: "Ra hoa",
    activityType: "Phun thuốc",
    phiDays: 14,
    isGACCCompliant: true,
    actionDate: new Date().toISOString().slice(0, 10),
};

export const mockBatchDefaults: Partial<BatchInput> = {
    qualityGrade: "Loại 1",
    status: "DRAFT",
    harvestDate: new Date().toISOString().slice(0, 10),
};

export const prohibitedChemicalAlert = ["Trichlorfon", "Carbendazim", "Chlorpyrifos", "Paraquat", "Glyphosate"];

export const traceHistory = [
    {
        title: "Ra hoa",
        time: "2026-04-02",
        description: "Ghi nhận cây bước vào giai đoạn ra hoa đồng loạt sau chăm sóc dinh dưỡng cân đối.",
    },
    {
        title: "Đậu trái",
        time: "2026-05-01",
        description: "Trái đậu ổn định, tiến hành tỉa trái và kiểm soát sâu bệnh theo lịch chuẩn GACC.",
    },
    {
        title: "Phun thuốc",
        time: "2026-05-14",
        description: "Sử dụng hoạt chất phù hợp, PHI được theo dõi để đảm bảo an toàn trước thu hoạch.",
    },
    {
        title: "Thu hoạch",
        time: "2026-07-18",
        description: "Thu hoạch đạt chuẩn, chuyển về cơ sở đóng gói để phân loại và in tem QR.",
    },
] as const;

export const traceSummary = {
    farmName: "Vườn Sầu Riêng Hợp Tác Xanh",
    farmCode: "MSVT-001",
    latitude: 11.181,
    longitude: 107.121,
    packhouseName: "Vựa Đóng Gói Tân Lộc",
    packhouseCode: "MSCSĐG-001",
    variety: "Ri6",
    gaccReady: true,
    scanCount: 0,
};
