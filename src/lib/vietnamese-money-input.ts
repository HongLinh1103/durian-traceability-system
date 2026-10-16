export function formatMoneyInput(value: string) {
    const clean = value.replace(/[^\d,]/g, "");
    const [whole, ...decimals] = clean.split(",");
    const integer = whole.replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return integer + (decimals.length ? "," + decimals.join("").slice(0, 2) : "");
}
export function parseMoneyInput(value: string) {
    if (!value.trim()) return NaN;
    return Number(value.replace(/\./g, "").replace(",", "."));
}
export function moneyInputFromNumber(value: number | string) {
    return Number(value).toLocaleString("vi-VN", { maximumFractionDigits: 2 });
}
