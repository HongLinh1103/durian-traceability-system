export function formatMaterialDosage(quantity: number, unit: string, farm?: { areaSize: number; areaUnit?: string } | null, selfOwned = false) {
    const amount = selfOwned ? "" : `${quantity.toLocaleString("vi-VN", { maximumFractionDigits: 6 })} ${unit}`;
    if (!farm || !Number.isFinite(farm.areaSize)) return selfOwned ? "" : amount;
    const areaUnit = farm.areaUnit === "SQUARE_METER" || farm.areaUnit === "M2" ? "m²" : farm.areaUnit === "HECTARE" || !farm.areaUnit ? "ha" : farm.areaUnit;
    const area = `${farm.areaSize.toLocaleString("vi-VN", { maximumFractionDigits: 6 })} ${areaUnit}`;
    return selfOwned ? area : `${amount} - ${area}`;
}
