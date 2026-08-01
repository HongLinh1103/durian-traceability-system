export const prismaGrowthStageMap = {
    "Làm đọt": "MAKING_SPROUT",
    "Ra hoa": "FLOWERING",
    "Đậu trái": "FRUIT_SETTING",
    "Nuôi trái": "FRUIT_GROWING",
    "Thu hoạch": "HARVEST",
} as const;

export const prismaActivityTypeMap = {
    "Phun thuốc": "SPRAY_PESTICIDE",
    "Bón phân": "FERTILIZE",
    "Tưới nước": "IRRIGATE",
    "Làm cỏ": "WEEDING",
} as const;

export type PrismaGrowthStageLabel = keyof typeof prismaGrowthStageMap;
export type PrismaActivityTypeLabel = keyof typeof prismaActivityTypeMap;

export function toPrismaGrowthStage(label: keyof typeof prismaGrowthStageMap) {
    return prismaGrowthStageMap[label];
}

export function toPrismaActivityType(label: keyof typeof prismaActivityTypeMap) {
    return prismaActivityTypeMap[label];
}
