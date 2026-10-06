export function formatMaterialDosage(quantity: number, unit: string, farm?: { areaSize: number; areaUnit?: string } | null) {
    const amount = `${quantity.toLocaleString("vi-VN", { maximumFractionDigits: 6 })} ${unit}`;
    if (!farm || !Number.isFinite(farm.areaSize)) return amount;
    const areaUnit = farm.areaUnit === "SQUARE_METER" || farm.areaUnit === "M2" ? "m²" : farm.areaUnit === "HECTARE" || !farm.areaUnit ? "ha" : farm.areaUnit;
    return `${amount} - ${farm.areaSize.toLocaleString("vi-VN", { maximumFractionDigits: 6 })} ${areaUnit}`;
}
