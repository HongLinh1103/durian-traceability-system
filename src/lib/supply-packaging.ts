/**
 * Chuẩn hóa đơn vị tính và quy cách đóng gói cho vật tư nông nghiệp.
 * - Đơn vị tính (unit): bao bì / vật chứa (bao, chai, gói, can, thùng, cuộn, lốc, cái, kg...)
 * - Quy cách đóng gói (packaging): biểu diễn dạng {lượng đo}/{vật chứa}, ví dụ: 25 kg/bao, 250 ml/chai, 500 g/gói
 * - weightKg: khối lượng quy đổi (kg) cho các vật tư có khối lượng cụ thể (kg, g)
 */
export function supplyPackaging(unit: string, packaging: string | null | undefined, quantity: number) {
    const rawUnit = (unit || "").trim();
    const rawPackaging = (packaging || "").trim();
    const normalizedUnit = rawUnit.toLowerCase();

    // Khối lượng trực tiếp nếu đơn vị tính là kg hoặc g
    const directMass = normalizedUnit === "kg" ? 1 : normalizedUnit === "g" ? 0.001 : null;
    const source = rawPackaging || rawUnit;

    // 1. Kiểm tra nếu đã đúng định dạng '<số lượng> <đơn vị đo>/<bao bì>'
    const alreadyMatch = source.match(/^(\d+(?:[.,]\d+)?)\s*(kg|g|ml|lít|lit|l|mét|m|chiếc|cái|viên|ống|tép|bầu)\s*\/\s*([a-zA-ZÀ-ỹ]+)$/iu);
    if (alreadyMatch) {
        const amountStr = alreadyMatch[1];
        let mUnit = alreadyMatch[2].toLowerCase();
        if (mUnit === "l") mUnit = "L";
        const container = alreadyMatch[3].toLowerCase();
        const cleanUnit = (rawUnit.replace(/\s*\d+(?:[.,]\d+)?\s*(?:kg|g|ml|lít|lit|l)$/i, "").trim().toLowerCase() || container);
        const amountNum = Number(amountStr.replace(",", "."));
        const perUnitMass = mUnit === "kg" ? amountNum : mUnit === "g" ? amountNum * 0.001 : null;
        const mass = directMass ?? perUnitMass;
        return {
            unit: cleanUnit,
            packaging: `${amountStr} ${mUnit}/${container}`,
            weightKg: mass === null ? null : quantity * mass,
        };
    }

    // 2. Tìm loại bao bì / vật chứa
    const containerMatch = source.match(/^(bao|gói|chai|hộp|can|túi|thùng|cuộn|lốc|bình|xô|vỉ|bộ|phuy|tuýp)/iu)
        || rawUnit.match(/^(bao|gói|chai|hộp|can|túi|thùng|cuộn|lốc|bình|xô|vỉ|bộ|phuy|tuýp)/iu);
    const container = containerMatch ? containerMatch[1].toLowerCase() : null;

    // 3. Tìm lượng đo lường (ví dụ 25kg, 250ml, 500g, 1L, 1 lít, 50 mét, 1 chiếc)
    const measureMatch = source.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|ml|lít|lit|l|mét|m|chiếc|cái|viên|ống|tép|bầu)(?:\b|\s*\(|$)/iu);

    let cleanUnit = rawUnit.replace(/\s*\d+(?:[.,]\d+)?\s*(?:kg|g|ml|lít|lit|l)$/i, "").trim().toLowerCase();
    if (!cleanUnit && container) cleanUnit = container;
    if (!cleanUnit) cleanUnit = rawUnit.toLowerCase();

    let formattedPackaging = rawPackaging || null;
    let perUnitMass = null;

    if (measureMatch && container) {
        const amountStr = measureMatch[1];
        let mUnit = measureMatch[2];
        if (mUnit.toLowerCase() === "l") mUnit = "L";
        else if (mUnit.toLowerCase() === "ml") mUnit = "ml";
        else if (mUnit.toLowerCase() === "kg") mUnit = "kg";
        else if (mUnit.toLowerCase() === "g") mUnit = "g";
        else mUnit = mUnit.toLowerCase();

        formattedPackaging = `${amountStr} ${mUnit}/${container}`;
        const amountNum = Number(amountStr.replace(",", "."));
        if (mUnit === "kg") perUnitMass = amountNum;
        else if (mUnit === "g") perUnitMass = amountNum * 0.001;
    } else if (measureMatch) {
        const amountNum = Number(measureMatch[1].replace(",", "."));
        const mUnit = measureMatch[2].toLowerCase();
        if (mUnit === "kg") perUnitMass = amountNum;
        else if (mUnit === "g") perUnitMass = amountNum * 0.001;
    }

    const mass = directMass ?? perUnitMass;

    return {
        unit: cleanUnit,
        packaging: formattedPackaging,
        weightKg: mass === null ? null : quantity * mass,
    };
}
