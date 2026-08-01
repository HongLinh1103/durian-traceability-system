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

export function formatVietnameseDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${day}/${month}/${date.getFullYear()}`;
}

export function formatVietnameseDateTime(date: Date): string {
    return date.toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}
