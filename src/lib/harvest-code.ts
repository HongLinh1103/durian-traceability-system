import { seasonYears } from "./crop-season";

/**
 * Trích xuất mã 4 số đại diện niên vụ, ví dụ "2025-2026" -> "2526"
 */
export function formatSeasonCode(season: { name: string; year: number }): string {
    const [start, end] = seasonYears(season);
    const startStr = String(start).slice(-2);
    const endStr = String(end).slice(-2);
    return `${startStr}${endStr}`;
}

/**
 * Trích xuất mã 4 số đại diện ngày và tháng thu hoạch theo định dạng DDMM (Ví dụ: 20/07 -> 2007)
 */
export function formatHarvestDateCode(date: Date | string): string {
    if (!date) return "0101";
    // Nếu date là string dạng YYYY-MM-DD từ date input
    if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}/.test(date)) {
        const parts = date.split("T")[0].split("-");
        const month = parts[1];
        const day = parts[2];
        return `${day}${month}`;
    }
    const d = new Date(date);
    if (isNaN(d.getTime())) return "0101";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${day}${month}`;
}

/**
 * Tạo mã cơ sở: TH-{NIENVU}-{DDMM}, ví dụ: TH-2526-2007
 */
export function buildBaseHarvestCode(
    season: { name: string; year: number },
    harvestDate: Date | string
): string {
    const nienVu = formatSeasonCode(season);
    const ddmm = formatHarvestDateCode(harvestDate);
    return `TH-${nienVu}-${ddmm}`;
}

/**
 * Xem trước mã tự động trên giao diện client từ danh sách mã hiện có trong bảng.
 * Quy tắc:
 * - Lô đầu tiên trong ngày: TH-2526-2007
 * - Lô thứ 2 cùng ngày: TH-2526-2007-02
 * - Lô thứ 3 cùng ngày: TH-2526-2007-03
 */
export function previewNextHarvestCode(
    baseCode: string,
    existingCodes: string[],
    currentEditingCode?: string
): string {
    if (!baseCode) return "TH-2526-2007";
    const codes = new Set(
        existingCodes.filter((c) => Boolean(c) && c !== currentEditingCode)
    );

    if (!codes.has(baseCode)) {
        return baseCode;
    }

    let suffix = 2;
    while (true) {
        const candidate = `${baseCode}-${String(suffix).padStart(2, "0")}`;
        if (!codes.has(candidate)) {
            return candidate;
        }
        suffix++;
    }
}

/**
 * Sinh mã duy nhất trên server kiểm tra với database
 */
export async function generateUniqueHarvestCode(
    baseCode: string,
    isCodeTaken: (code: string) => Promise<boolean>
): Promise<string> {
    if (!(await isCodeTaken(baseCode))) {
        return baseCode;
    }
    let suffix = 2;
    while (true) {
        const candidate = `${baseCode}-${String(suffix).padStart(2, "0")}`;
        if (!(await isCodeTaken(candidate))) {
            return candidate;
        }
        suffix++;
    }
}
