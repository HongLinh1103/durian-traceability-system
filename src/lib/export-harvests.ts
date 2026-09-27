import type { HarvestRow } from "@/components/farmer-harvests";
import { exportHarvestRecordsDocx } from "@/lib/farmer-docx-export";

export function getBuyerName(item: HarvestRow): string {
    if (item.buyerFacility?.name) return item.buyerFacility.name;
    const note = item.transactionNote || "";
    if (note.includes(" · ")) return note.split(" · ")[0].trim();
    if (note.includes(" - ")) return note.split(" - ")[0].trim();
    return (note || "Chưa xác định").trim();
}

export function getBuyerAddress(item: HarvestRow): string {
    if (item.buyerFacility) {
        const parts = [item.buyerFacility.address, item.buyerFacility.ward, item.buyerFacility.province].filter(Boolean);
        if (parts.length > 0) return parts.join(", ");
    }
    const note = item.transactionNote || "";
    if (note.includes(" · ")) {
        const parts = note.split(" · ");
        if (parts.length > 1 && parts[1].trim()) return parts.slice(1).join(" · ").trim();
    }
    if (note.includes(" - ")) {
        const parts = note.split(" - ");
        if (parts.length > 1 && parts[1].trim()) return parts.slice(1).join(" - ").trim();
    }
    return "—";
}

/**
 * Xuất sổ theo dõi thu hoạch sang file Word (.docx), khổ A4 ngang, lề nhỏ
 */
export async function exportHarvestRecordsToWord(
    rows: HarvestRow[],
    seasonName: string,
    farmName?: string,
    filename = "SỔ THU HOẠCH"
) {
    await exportHarvestRecordsDocx(
        {
            rows,
            seasonName,
            farmName,
        },
        filename
    );
}

// Giữ lại alias để tương thích nếu còn tham chiếu
export const exportHarvestRecordsToExcel = exportHarvestRecordsToWord;
