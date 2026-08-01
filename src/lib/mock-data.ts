import type { FarmingLogInput, RegisterInput } from "@/lib/validation";

export const mockFarms = [
    { id: "farm_001", farmCode: "MSVT-001", farmName: "Vườn Sầu Riêng Hợp Tác Xanh", durianVariety: "Ri6" },
    { id: "farm_002", farmCode: "MSVT-002", farmName: "Trang trại Đông Phú", durianVariety: "Monthong" },
    { id: "farm_003", farmCode: "MSVT-003", farmName: "Vườn Musang King An Phát", durianVariety: "MusangKing" },
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

export const prohibitedChemicalAlert = ["Trichlorfon", "Carbendazim", "Chlorpyrifos", "Paraquat", "Glyphosate"];
