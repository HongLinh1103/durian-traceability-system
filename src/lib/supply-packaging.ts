/** Only explicit mass units are converted; volume and ambiguous multipacks stay unknown. */
export function supplyPackaging(unit: string, packaging: string | null, quantity: number) {
    const normalized = unit.trim().toLowerCase();
    const direct = normalized === "kg" ? 1 : normalized === "g" ? 0.001 : null;
    const source = packaging?.trim() || unit.trim();
    const match = source.match(/^(?:(?:bao|gói|chai|hộp|can|túi|thùng)\s*)?(\d+(?:[.,]\d+)?)\s*(kg|g)(?:\s*\/\s*(?:bao|gói|chai|hộp|can|túi|thùng))?$/iu);
    const perUnit = match ? Number(match[1].replace(",", ".")) * (match[2].toLowerCase() === "kg" ? 1 : 0.001) : null;
    const mass = direct ?? perUnit;
    return {
        unit: unit.replace(/\s+\d+(?:[.,]\d+)?\s*(?:kg|g|ml|l)$/i, "").trim(),
        packaging: packaging?.trim() || (/\d/.test(unit) ? unit : null),
        weightKg: mass === null ? null : quantity * mass,
    };
}
