import type { HarvestRow } from "@/components/farmer-harvests";
import { formatSeasonName } from "@/lib/crop-season";
import { formatVietnameseDate } from "@/lib/date-format";

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

export async function exportHarvestRecordsToExcel(
    rows: HarvestRow[],
    seasonName: string,
    farmName?: string
) {
    const { Workbook } = await import("exceljs");
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet("Sổ thu hoạch", {
        pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });

    // Column widths
    sheet.columns = [
        { width: 8 },  // STT
        { width: 22 }, // Mã lô TH
        { width: 16 }, // Niên vụ
        { width: 18 }, // Ngày thu hoạch
        { width: 22 }, // Tổng sản lượng (kg)
        { width: 26 }, // Người mua
        { width: 34 }, // Địa chỉ
        { width: 18 }, // Giá bán (đ/kg)
        { width: 22 }, // Thành tiền (đ)
    ];

    // Main Title
    const titleRow = sheet.addRow(["SỔ THEO DÕI THU HOẠCH SẦU RIÊNG"]);
    sheet.mergeCells(titleRow.number, 1, titleRow.number, 9);
    titleRow.font = { name: "Arial", size: 16, bold: true, color: { argb: "FF065F46" } };
    titleRow.alignment = { vertical: "middle", horizontal: "center" };
    titleRow.height = 34;

    // Subtitle with meta
    const todayStr = new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date());
    const subTitle = [
        farmName ? `Vườn: ${farmName}` : "",
        `Niên vụ: ${seasonName}`,
        `Ngày xuất: ${todayStr}`,
    ].filter(Boolean).join("   |   ");

    const subTitleRow = sheet.addRow([subTitle]);
    sheet.mergeCells(subTitleRow.number, 1, subTitleRow.number, 9);
    subTitleRow.font = { name: "Arial", size: 11, italic: true, color: { argb: "FF475569" } };
    subTitleRow.alignment = { vertical: "middle", horizontal: "center" };
    subTitleRow.height = 22;

    sheet.addRow([]); // Empty space

    // Table Headers
    const headers = [
        "STT",
        "Mã lô TH",
        "Niên vụ",
        "Ngày thu hoạch",
        "Tổng sản lượng (kg)",
        "Người mua",
        "Địa chỉ",
        "Giá bán (đ/kg)",
        "Thành tiền (đ)",
    ];
    const headerRow = sheet.addRow(headers);
    headerRow.height = 28;
    headerRow.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF1E293B" } };

    for (let col = 1; col <= headers.length; col++) {
        const cell = headerRow.getCell(col);
        cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF1F5F9" },
        };
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    }

    // Border styling
    const thinBorder = {
        top: { style: "thin" as const, color: { argb: "FF94A3B8" } },
        bottom: { style: "thin" as const, color: { argb: "FF94A3B8" } },
        left: { style: "thin" as const, color: { argb: "FF94A3B8" } },
        right: { style: "thin" as const, color: { argb: "FF94A3B8" } },
    };

    let totalWeight = 0;
    let totalAmount = 0;

    rows.forEach((row, index) => {
        const weight = Number(row.actualWeight ?? row.expectedWeight ?? 0);
        const price = Number(row.expectedPricePerKg ?? 0);
        const total = Math.round(weight * price);
        totalWeight += weight;
        totalAmount += total;

        const buyer = getBuyerName(row);
        const address = getBuyerAddress(row);
        const season = row.cropSeason ? formatSeasonName(row.cropSeason) : "—";
        const dateStr = formatVietnameseDate(row.actualHarvestedAt || row.expectedHarvestDate || row.createdAt);

        const dataRow = sheet.addRow([
            index + 1,
            row.code,
            season,
            dateStr,
            weight,
            buyer,
            address,
            price,
            total,
        ]);
        dataRow.height = 24;

        dataRow.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
        dataRow.getCell(2).alignment = { vertical: "middle", horizontal: "center" };
        dataRow.getCell(2).font = { name: "Arial", size: 10, bold: true, color: { argb: "FF047857" } };
        dataRow.getCell(3).alignment = { vertical: "middle", horizontal: "center" };
        dataRow.getCell(4).alignment = { vertical: "middle", horizontal: "center" };

        dataRow.getCell(5).alignment = { vertical: "middle", horizontal: "right" };
        dataRow.getCell(5).numFmt = "#,##0";
        dataRow.getCell(5).font = { name: "Arial", size: 10, bold: true };

        dataRow.getCell(6).alignment = { vertical: "middle", horizontal: "left" };
        dataRow.getCell(6).font = { name: "Arial", size: 10, bold: true };

        dataRow.getCell(7).alignment = { vertical: "middle", horizontal: "left", wrapText: true };

        dataRow.getCell(8).alignment = { vertical: "middle", horizontal: "right" };
        dataRow.getCell(8).numFmt = "#,##0";

        dataRow.getCell(9).alignment = { vertical: "middle", horizontal: "right" };
        dataRow.getCell(9).numFmt = "#,##0";
        dataRow.getCell(9).font = { name: "Arial", size: 10, bold: true, color: { argb: "FF065F46" } };
    });

    // Summary Row
    const summaryRow = sheet.addRow([
        "Tổng cộng",
        "",
        "",
        "",
        totalWeight,
        "",
        "",
        "",
        totalAmount,
    ]);
    sheet.mergeCells(summaryRow.number, 1, summaryRow.number, 4);
    summaryRow.height = 26;
    summaryRow.font = { name: "Arial", size: 10, bold: true };

    summaryRow.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
    summaryRow.getCell(5).alignment = { vertical: "middle", horizontal: "right" };
    summaryRow.getCell(5).numFmt = "#,##0";
    summaryRow.getCell(9).alignment = { vertical: "middle", horizontal: "right" };
    summaryRow.getCell(9).numFmt = "#,##0";
    summaryRow.getCell(9).font = { name: "Arial", size: 10, bold: true, color: { argb: "FF065F46" } };

    for (let c = 1; c <= headers.length; c++) {
        summaryRow.getCell(c).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF8FAFC" },
        };
    }

    // Apply borders to all table cells
    for (let r = headerRow.number; r <= summaryRow.number; r++) {
        for (let c = 1; c <= headers.length; c++) {
            sheet.getCell(r, c).border = thinBorder;
        }
    }

    // Generate and trigger download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const cleanSeason = (seasonName || "TatCa").replace(/[^a-zA-Z0-9_-]/g, "_");
    link.download = `So_Thu_Hoach_${cleanSeason}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
