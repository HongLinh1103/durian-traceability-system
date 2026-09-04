import type { ActivityTypeLabel, GrowthStageLabel } from "@/lib/constants";

export const prismaGrowthStageMap = {
    "Phục hồi sau thu hoạch": "POST_HARVEST_RECOVERY",
    "Làm đọt": "MAKING_SPROUT",
    "Xử lý ra hoa": "FLOWER_INDUCTION",
    "Ra hoa": "FLOWERING",
    "Đậu trái": "FRUIT_SETTING",
    "Nuôi trái": "FRUIT_GROWING",
    "Trước thu hoạch": "PRE_HARVEST",
    "Thu hoạch": "HARVEST",
} as const satisfies Record<GrowthStageLabel, string>;

export const prismaActivityTypeMap = {
    "Bón lót": "BASE_FERTILIZING",
    "Trồng": "PLANTING",
    "Tủ gốc": "MULCHING",
    "Tưới nước": "IRRIGATE",
    "Bón phân": "FERTILIZE",
    "Phun phân bón lá": "FOLIAR_FERTILIZING",
    "Làm cỏ": "WEEDING",
    "Tỉa cành / tạo tán": "PRUNE",
    "Quản lý đọt": "SHOOT_MANAGEMENT",
    "Xiết nước": "WATER_STRESS",
    "Xử lý ra hoa": "FLOWER_INDUCTION",
    "Tỉa bông": "FLOWER_THINNING",
    "Thụ phấn": "POLLINATION",
    "Tỉa trái": "FRUIT_THINNING",
    "Kiểm tra sâu bệnh": "PEST_INSPECTION",
    "Theo dõi trái": "TRACK_FRUIT",
    "Phun thuốc BVTV": "SPRAY_PESTICIDE",
    "Bao trái": "FRUIT_BAGGING",
    "Chống cành": "BRANCH_SUPPORT",
    "Thu hoạch": "HARVEST",
    "Vệ sinh vườn": "GARDEN_SANITATION",
    "Khác": "OTHER",
} as const satisfies Record<ActivityTypeLabel, string>;

export type PrismaGrowthStageLabel = keyof typeof prismaGrowthStageMap;
export type PrismaActivityTypeLabel = keyof typeof prismaActivityTypeMap;

export function toPrismaGrowthStage(label: PrismaGrowthStageLabel) {
    return prismaGrowthStageMap[label];
}

export function toPrismaActivityType(label: PrismaActivityTypeLabel) {
    return prismaActivityTypeMap[label];
}
