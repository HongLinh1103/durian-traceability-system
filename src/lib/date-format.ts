const VIETNAMESE_DATE_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/;

export function parseVietnameseDate(value: string): Date | null {
    const match = VIETNAMESE_DATE_PATTERN.exec(value.trim());
    if (!match) return null;

    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));

    if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
    ) {
        return null;
    }
    return date;
}

export function isValidVietnameseDate(value: string): boolean {
    return parseVietnameseDate(value) !== null;
}

export function toIsoDate(value: string): string {
    const parsed = parseVietnameseDate(value);
    return parsed ? parsed.toISOString().slice(0, 10) : value;
}

export function toIsoDateTime(dateValue: string, timeValue: string): string {
    const parsed = parseVietnameseDate(dateValue);
    const timeMatch = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(timeValue.trim());
    if (!parsed || !timeMatch) return dateValue;

    return new Date(
        parsed.getUTCFullYear(),
        parsed.getUTCMonth(),
        parsed.getUTCDate(),
        Number(timeMatch[1]),
        Number(timeMatch[2]),
    ).toISOString();
}

export function formatVietnameseDate(date: Date | string | number | null | undefined): string {
    if (!date) return "";
    const d = typeof date === "object" && date instanceof Date ? date : new Date(date);
    if (Number.isNaN(d.getTime())) return String(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${day}/${month}/${d.getFullYear()}`;
}

export function formatVietnameseDateTime(date: Date | string | number | null | undefined): string {
    if (!date) return "";
    const d = typeof date === "object" && date instanceof Date ? date : new Date(date);
    if (Number.isNaN(d.getTime())) return String(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes} ${day}/${month}/${d.getFullYear()}`;
}
