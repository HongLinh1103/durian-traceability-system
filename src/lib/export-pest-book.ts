export function pestBookFilename(pestName: string, season: string) {
    const normalizedName = pestName.normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .replace(/[^a-zA-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
    return `SoTheoDoi_${normalizedName}_${season}`;
}

/** Export only the visible book form, excluding navigation and action controls. */
export async function exportPestBook(root: HTMLElement, filename: string) {
    const { Workbook } = await import("exceljs");
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet("Sổ theo dõi", {
        pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });
    const width = 7;
    sheet.columns = [20, 28, 30, 26, 24, 30, 44].map(w => ({ width: w }));
    const text = (element: Element) => (element as HTMLElement).innerText.trim();
    function heading(value: string, title = false) {
        const row = sheet.addRow([value]);
        sheet.mergeCells(row.number, 1, row.number, width);
        row.font = { name: "Arial", size: title ? 18 : 12, bold: true };
        row.alignment = { vertical: "middle", horizontal: title ? "center" : "left", wrapText: true };
        row.height = title ? 32 : 28;
    }
    for (const section of Array.from(root.children)) {
        const title = section.querySelector("h2");
        if (title) {
            heading(text(title), true);
            const subtitle = section.querySelector("p");
            if (subtitle) heading(text(subtitle));
            sheet.addRow([]);
            continue;
        }
        const table = section.querySelector("table");
        if (!table) {
            for (const item of Array.from(section.querySelectorAll("div"))) {
                const spans = Array.from(item.children).filter(child => child.tagName === "SPAN");
                if (spans.length >= 2) {
                    const row = sheet.addRow([text(spans[0]), text(spans[1])]);
                    sheet.mergeCells(row.number, 2, row.number, width);
                    row.getCell(1).font = { name: "Arial", bold: true };
                }
            }
            sheet.addRow([]);
            continue;
        }
        const label = section.querySelector("h3");
        if (label) heading(text(label));
        const headers = Array.from(table.querySelectorAll("thead th"));
        const included = headers.map((cell, index) => text(cell) === "Thao tác" ? -1 : index).filter(index => index >= 0);
        const header = sheet.addRow(included.map(index => text(headers[index])));
        header.font = { name: "Arial", bold: true };
        for (let column = 1; column <= included.length; column++) {
            header.getCell(column).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
        }
        const occupiedUntil = new Map<number, number>();
        const verticalMerges: Array<[number, number, number]> = [];
        for (const tr of Array.from(table.querySelectorAll("tbody tr"))) {
            const cells = Array.from(tr.querySelectorAll("td"));
            if (cells.length === 1 && cells[0].colSpan > 1) {
                const row = sheet.addRow(["Chưa có dữ liệu"]);
                sheet.mergeCells(row.number, 1, row.number, included.length);
            } else {
                const row = sheet.addRow([]);
                let sourceColumn = 0;
                for (const cell of cells) {
                    while ((occupiedUntil.get(sourceColumn) || 0) >= row.number) sourceColumn++;
                    const outputColumn = included.indexOf(sourceColumn) + 1;
                    if (outputColumn > 0) {
                        // Explicit strings preserve free text, including a leading '='.
                        row.getCell(outputColumn).value = text(cell);
                        if (cell.rowSpan > 1) {
                            const end = row.number + cell.rowSpan - 1;
                            occupiedUntil.set(sourceColumn, end);
                            verticalMerges.push([row.number, end, outputColumn]);
                        }
                    }
                    sourceColumn += cell.colSpan || 1;
                }
            }
        }
        for (const [start, end, column] of verticalMerges) {
            sheet.mergeCells(start, column, end, column);
            sheet.getCell(start, column).alignment = { vertical: "middle", wrapText: true };
        }
        for (let rowNumber = header.number; rowNumber <= sheet.rowCount; rowNumber++) {
            for (let column = 1; column <= included.length; column++) {
                sheet.getCell(rowNumber, column).border = {
                    top: { style: "thin", color: { argb: "FF64748B" } },
                    bottom: { style: "thin", color: { argb: "FF64748B" } },
                    left: { style: "thin", color: { argb: "FF64748B" } },
                    right: { style: "thin", color: { argb: "FF64748B" } },
                };
            }
        }
        sheet.addRow([]);
    }
    sheet.eachRow(row => {
        let height = 30;
        row.eachCell(cell => {
            cell.font = { name: "Arial", size: 11, ...cell.font };
            cell.alignment = { vertical: "top", wrapText: true, ...cell.alignment };
            if (typeof cell.value === "string" && !cell.isMerged) {
                height = Math.max(height, cell.value.split("\n").reduce((n, line) => n + Math.max(1, Math.ceil(line.length / 24)), 0) * 16 + 8);
            }
        });
        if (!row.height) row.height = height;
    });
    sheet.pageSetup.printArea = `A1:G${sheet.rowCount}`;
    const buffer = await workbook.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename.replace(/[<>:"/\\|?*\x00-\x1f]/g, "-")}.xlsx`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
