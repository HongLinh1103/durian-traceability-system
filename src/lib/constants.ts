export const growthStages = [
    "Phục hồi sau thu hoạch",
    "Làm đọt",
    "Xử lý ra hoa",
    "Ra hoa",
    "Đậu trái",
    "Nuôi trái",
    "Trước thu hoạch",
    "Thu hoạch",
] as const;

export const activityTypes = [
    "Bón lót",
    "Trồng",
    "Tủ gốc",
    "Tưới nước",
    "Bón phân",
    "Phun phân bón lá",
    "Làm cỏ",
    "Tỉa cành / tạo tán",
    "Quản lý đọt",
    "Xiết nước",
    "Xử lý ra hoa",
    "Tỉa bông",
    "Thụ phấn",
    "Tỉa trái",
    "Kiểm tra sâu bệnh",
    "Theo dõi trái",
    "Phun thuốc BVTV",
    "Bao trái",
    "Chống cành",
    "Thu hoạch",
    "Vệ sinh vườn",
    "Khác",
] as const;

export type GrowthStageLabel = (typeof growthStages)[number];
export type ActivityTypeLabel = (typeof activityTypes)[number];

export const activitiesByStage: Record<GrowthStageLabel, readonly ActivityTypeLabel[]> = {
    "Phục hồi sau thu hoạch": ["Vệ sinh vườn", "Tỉa cành / tạo tán", "Bón lót", "Bón phân", "Tủ gốc", "Tưới nước", "Làm cỏ", "Kiểm tra sâu bệnh", "Khác"],
    "Làm đọt": ["Tưới nước", "Bón phân", "Phun phân bón lá", "Tỉa cành / tạo tán", "Quản lý đọt", "Phun thuốc BVTV", "Kiểm tra sâu bệnh", "Làm cỏ", "Khác"],
    "Xử lý ra hoa": ["Xiết nước", "Bón phân", "Phun phân bón lá", "Xử lý ra hoa", "Tưới nước", "Phun thuốc BVTV", "Kiểm tra sâu bệnh", "Khác"],
    "Ra hoa": ["Tưới nước", "Tỉa bông", "Thụ phấn", "Bón phân", "Phun phân bón lá", "Phun thuốc BVTV", "Kiểm tra sâu bệnh", "Khác"],
    "Đậu trái": ["Tỉa trái", "Bón phân", "Tưới nước", "Phun thuốc BVTV", "Bao trái", "Chống cành", "Kiểm tra sâu bệnh", "Khác"],
    "Nuôi trái": ["Bón phân", "Phun phân bón lá", "Tưới nước", "Phun thuốc BVTV", "Tỉa trái", "Bao trái", "Chống cành", "Kiểm tra sâu bệnh", "Khác"],
    "Trước thu hoạch": ["Tưới nước", "Bón phân", "Kiểm tra sâu bệnh", "Phun thuốc BVTV", "Theo dõi trái", "Khác"],
    "Thu hoạch": ["Thu hoạch", "Vệ sinh vườn", "Khác"],
};
