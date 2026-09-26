import JSZip from "jszip";
import { formatVietnameseDate } from "./date-format";

const xml = (value: unknown) =>
    String(value ?? "").replace(/[&<>"']/g, (c) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
    }[c]!));

const wrapping = '<w:suppressAutoHyphens/><w:wordWrap w:val="1"/><w:snapToGrid w:val="0"/>';

// Kích thước chuẩn khổ giấy A4 ngang với lề 0.75cm (giống các sổ cơ sở đóng gói)
export const DOCX_PAGE_WIDTH = 16838; // 297mm in dxa
export const DOCX_PAGE_HEIGHT = 11906; // 210mm in dxa
export const DOCX_SIDE_MARGIN = 425; // 0.75 cm in dxa
export const DOCX_CONTENT_WIDTH = DOCX_PAGE_WIDTH - DOCX_SIDE_MARGIN * 2; // 15988 dxa

export function docxParagraph(
    text: unknown,
    bold = false,
    size = 18,
    align: "left" | "center" | "right" = "center",
    spaceAfter = 60,
    italic = false
) {
    const hasText = text !== "" && text !== undefined && text !== null;
    const content = hasText
        ? `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b w:val="${bold ? 1 : 0}"/><w:i w:val="${italic ? 1 : 0}"/><w:sz w:val="${size}"/><w:lang w:val="vi-VN"/></w:rPr><w:t xml:space="preserve">${xml(text)}</w:t></w:r>`
        : "";
    return `<w:p><w:pPr>${wrapping}<w:spacing w:after="${spaceAfter}"/><w:jc w:val="${align}"/><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="${size}"/></w:rPr></w:pPr>${content}</w:p>`;
}

export function docxCell(
    text: unknown,
    width: number,
    options?: {
        span?: number;
        merge?: "restart" | "continue";
        bold?: boolean;
        italic?: boolean;
        size?: number;
        align?: "left" | "center" | "right";
        bgColor?: string;
        noWrap?: boolean;
        borderColor?: string;
    }
) {
    const span = options?.span || 1;
    const merge = options?.merge;
    const bold = options?.bold ?? false;
    const italic = options?.italic ?? false;
    const size = options?.size ?? 18;
    const align = options?.align ?? "center";
    const bgColor = options?.bgColor;
    const noWrap = options?.noWrap ?? false;

    const shd = bgColor ? `<w:shd w:val="clear" w:color="auto" w:fill="${bgColor}"/>` : "";

    return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${span > 1 ? `<w:gridSpan w:val="${span}"/>` : ""}${merge ? `<w:vMerge w:val="${merge}"/>` : ""}${noWrap ? "<w:noWrap/>" : ""}${shd}<w:vAlign w:val="center"/></w:tcPr>${docxParagraph(text, bold, size, align, 40, italic)}</w:tc>`;
}

export interface TextRun {
    text: unknown;
    bold?: boolean;
    italic?: boolean;
    size?: number;
}

export function docxRunsParagraph(
    runs: TextRun[],
    options?: {
        align?: "left" | "center" | "right";
        spaceAfter?: number;
        defaultSize?: number;
    }
) {
    const align = options?.align ?? "left";
    const spaceAfter = options?.spaceAfter ?? 40;
    const defaultSize = options?.defaultSize ?? 19;

    const runsXml = runs
        .filter((r) => r.text !== undefined && r.text !== null && r.text !== "")
        .map((r) => {
            const bold = r.bold ?? false;
            const italic = r.italic ?? false;
            const size = r.size ?? defaultSize;
            return `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b w:val="${bold ? 1 : 0}"/><w:i w:val="${italic ? 1 : 0}"/><w:sz w:val="${size}"/><w:lang w:val="vi-VN"/></w:rPr><w:t xml:space="preserve">${xml(r.text)}</w:t></w:r>`;
        })
        .join("");

    return `<w:p><w:pPr>${wrapping}<w:spacing w:after="${spaceAfter}"/><w:jc w:val="${align}"/><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="${defaultSize}"/></w:rPr></w:pPr>${runsXml}</w:p>`;
}

export function docxCellWithRuns(
    runs: TextRun[],
    width: number,
    options?: {
        span?: number;
        merge?: "restart" | "continue";
        align?: "left" | "center" | "right";
        bgColor?: string;
        noWrap?: boolean;
        spaceAfter?: number;
        defaultSize?: number;
    }
) {
    const span = options?.span || 1;
    const merge = options?.merge;
    const bgColor = options?.bgColor;
    const noWrap = options?.noWrap ?? false;
    const align = options?.align ?? "left";
    const spaceAfter = options?.spaceAfter ?? 40;
    const defaultSize = options?.defaultSize ?? 19;

    const shd = bgColor ? `<w:shd w:val="clear" w:color="auto" w:fill="${bgColor}"/>` : "";

    return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${span > 1 ? `<w:gridSpan w:val="${span}"/>` : ""}${merge ? `<w:vMerge w:val="${merge}"/>` : ""}${noWrap ? "<w:noWrap/>" : ""}${shd}<w:vAlign w:val="center"/></w:tcPr>${docxRunsParagraph(runs, { align, spaceAfter, defaultSize })}</w:tc>`;
}

export function docxLabelValueCell(
    label: string,
    value: unknown,
    width: number,
    options?: {
        span?: number;
        size?: number;
        valueItalic?: boolean;
        bgColor?: string;
    }
) {
    const size = options?.size ?? 19;
    const labelText = label.endsWith(":") ? `${label} ` : `${label}: `;
    const valueText = value !== undefined && value !== null && value !== "" ? String(value) : "—";

    return docxCellWithRuns(
        [
            { text: labelText, bold: true, size },
            { text: valueText, bold: false, italic: options?.valueItalic ?? false, size },
        ],
        width,
        {
            span: options?.span,
            align: "left",
            bgColor: options?.bgColor,
            defaultSize: size,
        }
    );
}

export function docxRow(cellsXml: string, isHeader = false) {
    return `<w:tr><w:trPr>${isHeader ? "<w:tblHeader/>" : ""}<w:cantSplit/></w:trPr>${cellsXml}</w:tr>`;
}

export function docxTable(widths: number[], rowsXml: string, tableWidth = DOCX_CONTENT_WIDTH, hasBorders = true) {
    const borders = hasBorders
        ? `<w:tblBorders>${["top", "left", "bottom", "right", "insideH", "insideV"]
            .map((edge) => `<w:${edge} w:val="single" w:sz="4" w:color="000000"/>`)
            .join("")}</w:tblBorders>`
        : `<w:tblBorders>${["top", "left", "bottom", "right", "insideH", "insideV"]
            .map((edge) => `<w:${edge} w:val="none"/>`)
            .join("")}</w:tblBorders>`;

    return `<w:tbl><w:tblPr><w:tblW w:w="${tableWidth}" w:type="dxa"/><w:tblLayout w:type="fixed"/>${borders}<w:tblCellMar><w:top w:w="80" w:type="dxa"/><w:left w:w="60" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:right w:w="60" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${widths
        .map((w) => `<w:gridCol w:w="${w}"/>`)
        .join("")}</w:tblGrid>${rowsXml}</w:tbl>`;
}

export async function packageDocx(documentBodyXml: string): Promise<Uint8Array> {
    const zip = new JSZip();

    const fullDocumentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${documentBodyXml}
    <w:sectPr>
      <w:pgSz w:w="${DOCX_PAGE_WIDTH}" w:h="${DOCX_PAGE_HEIGHT}" w:orient="landscape"/>
      <w:pgMar w:top="${DOCX_SIDE_MARGIN}" w:right="${DOCX_SIDE_MARGIN}" w:bottom="${DOCX_SIDE_MARGIN}" w:left="${DOCX_SIDE_MARGIN}" w:header="283" w:footer="283"/>
    </w:sectPr>
  </w:body>
</w:document>`;

    zip.file(
        "[Content_Types].xml",
        '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>'
    );
    zip.file(
        "_rels/.rels",
        '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'
    );
    zip.file("word/document.xml", fullDocumentXml);
    zip.file(
        "word/settings.xml",
        '<?xml version="1.0" encoding="UTF-8"?><w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:autoHyphenation w:val="0"/><w:compat><w:useWord97LineBreakRules w:val="0"/><w:doNotUseEastAsianBreakRules w:val="1"/><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>'
    );
    zip.file(
        "word/styles.xml",
        `<?xml version="1.0" encoding="UTF-8"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="18"/><w:lang w:val="vi-VN"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr>${wrapping}</w:pPr></w:pPrDefault></w:docDefaults></w:styles>`
    );
    zip.file(
        "word/_rels/document.xml.rels",
        '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="settings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/><Relationship Id="styles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'
    );

    return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

export function downloadDocxFile(data: Uint8Array, filename: string) {
    const safeFilename = filename
        .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
        .trim();
    const finalName = safeFilename.endsWith(".docx") ? safeFilename : `${safeFilename}.docx`;
    const blob = new Blob([data.buffer as ArrayBuffer], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = finalName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// =========================================================================
// 1. XUẤT SỔ THEO DÕI SINH VẬT GÂY HẠI (WORD A4 NGANG)
// =========================================================================
export interface PestBookDocxData {
    farmName?: string;
    farmCode?: string;
    regionCode?: string;
    regionName?: string;
    farmAddress?: string;
    seasonName?: string;
    pestName: string;
    scientificName?: string | null;
    firstDetectedDate?: string | null;
    startDate?: string | null;
    discoveryStage?: string | null;
    controlMethod?: string | null;
    trapType?: string | null;
    attractant?: string | null;
    chemicalName?: string | null;
    dosage?: string | null;
    checkFrequencyDays?: number | null;
    traps?: Array<{
        trapCode: string;
        trapType?: string | null;
        attractant?: string | null;
        locationName?: string | null;
        latitude?: number | null;
        longitude?: number | null;
        installedDate?: string | null;
        status?: string | null;
        notes?: string | null;
    }>;
    inspections?: Array<{
        inspectionDate: string;
        inspectorName?: string | null;
        resultText?: string | null;
        totalPestsCount?: number;
        densityLevel?: string | null;
        notes?: string | null;
        items?: Array<{
            trap?: { trapCode: string; locationName?: string | null };
            trapId?: string | null;
            pestsCount: number;
            notes?: string | null;
            resultText?: string | null;
            baitStatus?: string | null;
        }>;
    }>;
}

export async function exportPestMonitoringBookDocx(book: PestBookDocxData, filename?: string) {
    const title = "SỔ THEO DÕI SINH VẬT GÂY HẠI";

    const farmName = book.farmName || "Chưa cập nhật";
    const regionName = book.regionName || "Kim Quy One Member Limited Liability Company";
    const regionCode = book.regionCode || "VN - DNOR - 0269";
    const farmAddress = book.farmAddress || "Chưa cập nhật";
    const seasonName = book.seasonName || "2025-2026";
    const firstDetected = formatVietnameseDate(book.firstDetectedDate || book.startDate);
    const stage = book.discoveryStage || "Đậu trái";
    const isTrap = book.controlMethod === "Bẫy" || (book.traps && book.traps.length > 0);

    // Header bảng thông tin chung
    const infoWidths = [7994, 7994];
    const infoRows: string[] = [
        docxRow(
            docxLabelValueCell("Vườn", farmName, 7994, { size: 20 }) +
            docxLabelValueCell("Tên vùng trồng", regionName, 7994, { size: 20 })
        ),
        docxRow(
            docxLabelValueCell("Mã vùng trồng", regionCode, 7994, { size: 20 }) +
            docxLabelValueCell("Niên vụ", seasonName, 7994, { size: 19 })
        ),
        docxRow(
            docxLabelValueCell("Địa chỉ vườn", farmAddress, 15988, { span: 2, size: 19 })
        ),
        docxRow(
            docxLabelValueCell("Sinh vật theo dõi", book.pestName, 7994, { size: 20 }) +
            docxLabelValueCell("Tên khoa học", book.scientificName || "—", 7994, { size: 19, valueItalic: true })
        ),
        docxRow(
            docxLabelValueCell("Ngày phát hiện đầu tiên", firstDetected, 7994, { size: 19 }) +
            docxLabelValueCell("Giai đoạn cây khi phát hiện", stage, 7994, { size: 19 })
        ),
        docxRow(
            docxLabelValueCell("Biện pháp xử lý", book.controlMethod || (isTrap ? "Bẫy" : "Phun thuốc"), 7994, { size: 19 }) +
            docxLabelValueCell("Tần suất kiểm tra", `${book.checkFrequencyDays || 7} ngày/lần`, 7994, { size: 19 })
        ),
    ];

    if (isTrap) {
        infoRows.push(
            docxRow(
                docxLabelValueCell("Chất dẫn dụ", book.attractant || "Pheromone Methyl Eugenol", 15988, { span: 2, size: 19 })
            )
        );
    } else {
        infoRows.push(
            docxRow(
                docxLabelValueCell("Tên hoạt chất / chế phẩm", book.chemicalName || "—", 7994, { size: 19 }) +
                docxLabelValueCell("Liều lượng", book.dosage || "—", 7994, { size: 19 })
            )
        );
    }

    const infoTableXml = docxTable(infoWidths, infoRows.join(""), DOCX_CONTENT_WIDTH, true);

    // Phần BẢNG DANH SÁCH BẪY THEO DÕI (nếu là bẫy)
    let trapsSectionXml = "";
    if (isTrap && book.traps && book.traps.length > 0) {
        const trapWidths = [1000, 2500, 2500, 2500, 2500, 4988];
        const trapHeaderCells = [
            docxCell("STT", 1000, { bold: true, size: 18, bgColor: "E2E8F0", align: "center", noWrap: true }),
            docxCell("Mã bẫy", 2500, { bold: true, size: 18, bgColor: "E2E8F0", align: "center", noWrap: true }),
            docxCell("Loại bẫy", 2500, { bold: true, size: 18, bgColor: "E2E8F0", align: "center", noWrap: true }),
            docxCell("Chất dẫn dụ / Mồi bẫy", 2500, { bold: true, size: 18, bgColor: "E2E8F0", align: "center", noWrap: true }),
            docxCell("Vị trí đặt", 2500, { bold: true, size: 18, bgColor: "E2E8F0", align: "center", noWrap: true }),
            docxCell("Ghi chú", 4988, { bold: true, size: 18, bgColor: "E2E8F0", align: "center" }),
        ].join("");

        const trapRows = book.traps.map((t, idx) => {
            const locStr = t.locationName || "—";
            const attractantStr = t.attractant || book.attractant || "—";
            const notesStr = t.notes || "—";

            return docxRow(
                docxCell(String(idx + 1), 1000, { size: 18, align: "center", noWrap: true }) +
                docxCell(t.trapCode, 2500, { bold: true, size: 18, align: "center", noWrap: true }) +
                docxCell(t.trapType || book.trapType || "Bẫy lồng", 2500, { size: 18, align: "center", noWrap: true }) +
                docxCell(attractantStr, 2500, { size: 18, align: "center", noWrap: true }) +
                docxCell(locStr, 2500, { size: 18, align: "center", noWrap: true }) +
                docxCell(notesStr, 4988, { size: 18, align: "center" })
            );
        });

        trapsSectionXml = `
            ${docxParagraph("DANH SÁCH BẪY THEO DÕI", true, 22, "left", 80)}
            ${docxTable(trapWidths, docxRow(trapHeaderCells, true) + trapRows.join(""), DOCX_CONTENT_WIDTH, true)}
            ${docxParagraph("", false, 12, "left", 100)}
        `;
    }

    // Phần BẢNG THEO DÕI CHI TIẾT
    let inspectionsSectionXml = "";
    const inspections = book.inspections || [];

    if (isTrap) {
        // Table theo bẫy
        const inspWidths = [2100, 2100, 2100, 2100, 2100, 5488];
        const inspHeaderCells = [
            docxCell("Ngày điều tra", 2100, { bold: true, size: 18, bgColor: "E2E8F0", align: "center", noWrap: true }),
            docxCell("Bẫy", 2100, { bold: true, size: 18, bgColor: "E2E8F0", align: "center", noWrap: true }),
            docxCell("Vị trí", 2100, { bold: true, size: 18, bgColor: "E2E8F0", align: "center", noWrap: true }),
            docxCell("Kết quả thu được", 2100, { bold: true, size: 18, bgColor: "E2E8F0", align: "center", noWrap: true }),
            docxCell("Người điều tra", 2100, { bold: true, size: 18, bgColor: "E2E8F0", align: "center", noWrap: true }),
            docxCell("Ghi chú / Đánh giá", 5488, { bold: true, size: 18, bgColor: "E2E8F0", align: "center" }),
        ].join("");

        // Flat các item bẫy
        const rowsXml: string[] = [];
        for (const ins of inspections) {
            const dateStr = formatVietnameseDate(ins.inspectionDate);
            const inspector = ins.inspectorName || "Trần Văn Minh";
            const items = ins.items || [];

            if (items.length > 0) {
                items.forEach((item, itemIdx) => {
                    const trapCode = item.trap?.trapCode || "BAY-01";
                    const location = item.trap?.locationName || "Vườn";
                    const countStr = `${item.pestsCount} cá thể`;
                    const noteStr = item.notes || item.baitStatus || ins.notes || "Mồi còn tốt";

                    const dateCell = items.length > 1
                        ? (itemIdx === 0
                            ? docxCell(dateStr, 2100, { size: 18, align: "center", merge: "restart", noWrap: true })
                            : docxCell("", 2100, { size: 18, align: "center", merge: "continue", noWrap: true }))
                        : docxCell(dateStr, 2100, { size: 18, align: "center", noWrap: true });

                    rowsXml.push(
                        docxRow(
                            dateCell +
                            docxCell(trapCode, 2100, { bold: true, size: 18, align: "center", noWrap: true }) +
                            docxCell(location, 2100, { size: 18, align: "center", noWrap: true }) +
                            docxCell(countStr, 2100, { bold: true, size: 18, align: "center", noWrap: true }) +
                            docxCell(inspector, 2100, { size: 18, align: "center", noWrap: true }) +
                            docxCell(noteStr, 5488, { size: 18, align: "center" })
                        )
                    );
                });
            } else {
                rowsXml.push(
                    docxRow(
                        docxCell(dateStr, 2100, { size: 18, align: "center", noWrap: true }) +
                        docxCell("—", 2100, { size: 18, align: "center", noWrap: true }) +
                        docxCell("Vườn", 2100, { size: 18, align: "center", noWrap: true }) +
                        docxCell(`${ins.totalPestsCount || 0} cá thể`, 2100, { bold: true, size: 18, align: "center", noWrap: true }) +
                        docxCell(inspector, 2100, { size: 18, align: "center", noWrap: true }) +
                        docxCell(ins.notes || "Bình thường", 5488, { size: 18, align: "center" })
                    )
                );
            }
        }

        if (rowsXml.length === 0) {
            rowsXml.push(
                docxRow(docxCell("Chưa có ghi nhận điều tra nào", 15988, { span: 6, size: 18, italic: true }))
            );
        }

        inspectionsSectionXml = `
            ${docxParagraph("BẢNG THEO DÕI CHI TIẾT", true, 22, "left", 80)}
            ${docxTable(inspWidths, docxRow(inspHeaderCells, true) + rowsXml.join(""), DOCX_CONTENT_WIDTH, true)}
        `;
    } else {
        // Table theo dõi trực tiếp
        const inspWidths = [2800, 2800, 2800, 7588];
        const inspHeaderCells = [
            docxCell("Ngày điều tra", 2800, { bold: true, size: 18, bgColor: "E2E8F0", align: "center", noWrap: true }),
            docxCell("Kết quả điều tra", 2800, { bold: true, size: 18, bgColor: "E2E8F0", align: "center", noWrap: true }),
            docxCell("Người điều tra", 2800, { bold: true, size: 18, bgColor: "E2E8F0", align: "center", noWrap: true }),
            docxCell("Ghi chú / Đánh giá", 7588, { bold: true, size: 18, bgColor: "E2E8F0", align: "center" }),
        ].join("");

        const rowsXml = inspections.map((ins) => {
            const dateStr = formatVietnameseDate(ins.inspectionDate);
            const resultStr = ins.resultText || (ins.totalPestsCount && ins.totalPestsCount > 0 ? `Có phát hiện (${ins.densityLevel || "Nhẹ"})` : "Không phát hiện");
            const inspector = ins.inspectorName || "Trần Văn Minh";
            const note = ins.notes || ins.items?.[0]?.notes || "Bình thường";

            return docxRow(
                docxCell(dateStr, 2800, { size: 18, align: "center", noWrap: true }) +
                docxCell(resultStr, 2800, { size: 18, align: "center", noWrap: true }) +
                docxCell(inspector, 2800, { size: 18, align: "center", noWrap: true }) +
                docxCell(note, 7588, { size: 18, align: "center" })
            );
        });

        if (rowsXml.length === 0) {
            rowsXml.push(
                docxRow(docxCell("Chưa có ghi nhận điều tra nào", 15988, { span: 4, size: 18, italic: true }))
            );
        }

        inspectionsSectionXml = `
            ${docxParagraph("BẢNG THEO DÕI CHI TIẾT", true, 22, "left", 80)}
            ${docxTable(inspWidths, docxRow(inspHeaderCells, true) + rowsXml.join(""), DOCX_CONTENT_WIDTH, true)}
        `;
    }

    const bodyXml = `
        ${docxParagraph(title, true, 28, "center", 80)}
        ${infoTableXml}
        ${docxParagraph("", false, 14, "left", 100)}
        ${trapsSectionXml}
        ${inspectionsSectionXml}
    `;

    const docxData = await packageDocx(bodyXml);
    const saveName = filename || `So_theo_doi_${book.pestName}_${seasonName}`;
    downloadDocxFile(docxData, saveName);
}

// =========================================================================
// 2. XUẤT NHẬT KÝ THỜI TIẾT (WORD A4 NGANG)
// =========================================================================
export interface WeatherObservationDocxItem {
    observedAt: string;
    timeOfDay?: string | null;
    condition: string;
    temperature?: number | null;
    temperatureMin?: number | null;
    temperatureMax?: number | null;
    soilCondition?: string | null;
    soilHumidity?: number | null;
    rainLevel?: string | null;
    rainfallMm?: number | null;
    phenomena?: string[];
    note?: string | null;
}

export interface WeatherExportParams {
    farmName?: string;
    farmAddress?: string;
    regionCode?: string;
    seasonName?: string;
    observations: WeatherObservationDocxItem[];
    conditionLabels?: Record<string, string>;
}

export async function exportWeatherJournalDocx(params: WeatherExportParams, filename?: string) {
    const title = "NHẬT KÝ THEO DÕI THỜI TIẾT";
    const subTitle = "THEO DÕI NHIỆT ĐỘ, MƯA, ĐỘ ẨM VÀ HIỆN TƯỢNG THỜI TIẾT TẠI VƯỜN TRỒNG";

    const farmName = params.farmName || "Vườn sầu riêng";
    const regionCode = params.regionCode || "VN - DNOR - 0269";
    const farmAddress = params.farmAddress || "Ấp 3, xã Phú Lộc, huyện Tân Phú, tỉnh Đồng Nai";
    const seasonName = params.seasonName || "2025-2026";

    // Info table
    const infoWidths = [7994, 7994];
    const infoRows = [
        docxRow(
            docxLabelValueCell("Vườn", farmName, 7994, { size: 20 }) +
            docxLabelValueCell("Mã vùng trồng", regionCode, 7994, { size: 20 })
        ),
        docxRow(
            docxLabelValueCell("Địa chỉ vườn", farmAddress, 7994, { size: 19 }) +
            docxLabelValueCell("Niên vụ", seasonName, 7994, { size: 19 })
        ),
    ];
    const infoTableXml = docxTable(infoWidths, infoRows.join(""), DOCX_CONTENT_WIDTH, true);

    // Weather Table
    // Total: 15988 dxa
    const widths = [600, 1600, 1400, 2100, 1800, 1600, 1400, 1600, 1300, 2588];
    const headerCells = [
        docxCell("STT", 600, { bold: true, size: 18, bgColor: "E2E8F0", align: "center" }),
        docxCell("Ngày", 1600, { bold: true, size: 18, bgColor: "E2E8F0", align: "center" }),
        docxCell("Thời điểm", 1400, { bold: true, size: 18, bgColor: "E2E8F0", align: "center" }),
        docxCell("Tình trạng trời", 2100, { bold: true, size: 18, bgColor: "E2E8F0", align: "center" }),
        docxCell("Nhiệt độ (°C)", 1800, { bold: true, size: 18, bgColor: "E2E8F0", align: "center" }),
        docxCell("Mức độ mưa", 1600, { bold: true, size: 18, bgColor: "E2E8F0", align: "center" }),
        docxCell("Lượng mưa", 1400, { bold: true, size: 18, bgColor: "E2E8F0", align: "center" }),
        docxCell("Tình trạng đất", 1600, { bold: true, size: 18, bgColor: "E2E8F0", align: "center" }),
        docxCell("Độ ẩm đất", 1300, { bold: true, size: 18, bgColor: "E2E8F0", align: "center" }),
        docxCell("Hiện tượng & Ghi chú", 2588, { bold: true, size: 18, bgColor: "E2E8F0", align: "center" }),
    ].join("");

    const conditionMap: Record<string, string> = {
        SUNNY: "Nắng",
        PARTLY_CLOUDY: "Có mây",
        CLOUDY: "Nhiều mây",
        OVERCAST: "Âm u",
        RAIN: "Có mưa",
        LIGHT_RAIN: "Mưa nhẹ",
        THUNDERSTORM: "Mưa dông",
        FOG: "Sương mù",
        ...(params.conditionLabels || {}),
    };

    const rowsXml = params.observations.map((row, idx) => {
        const dateStr = formatVietnameseDate(row.observedAt);
        const timeOfDay = row.timeOfDay || "Cả ngày";
        const cond = (row.condition || "")
            .split(",")
            .filter(Boolean)
            .map((c) => conditionMap[c] || c)
            .join(" · ") || "Nắng";

        let tempStr = "—";
        if (row.temperatureMin != null && row.temperatureMax != null) {
            tempStr = `${row.temperatureMin}°C - ${row.temperatureMax}°C`;
        } else if (row.temperature != null) {
            tempStr = `${row.temperature}°C`;
        }

        const rainLevel = row.rainLevel && row.rainLevel !== "Không mưa" ? row.rainLevel : "—";
        const rainMm = row.rainfallMm != null && row.rainfallMm > 0 ? `${row.rainfallMm} mm` : "—";
        const soilCond = row.soilCondition || "—";
        const soilHum = row.soilHumidity != null ? `${row.soilHumidity}%` : "—";

        const phenomenaNotes = [
            ...(row.phenomena || []),
            row.note ? `Ghi chú: ${row.note}` : "",
        ].filter(Boolean).join(" · ") || "—";

        return docxRow(
            docxCell(String(idx + 1), 600, { size: 18 }) +
            docxCell(dateStr, 1600, { size: 18 }) +
            docxCell(timeOfDay, 1400, { size: 18 }) +
            docxCell(cond, 2100, { size: 18 }) +
            docxCell(tempStr, 1800, { size: 18 }) +
            docxCell(rainLevel, 1600, { size: 18 }) +
            docxCell(rainMm, 1400, { size: 18 }) +
            docxCell(soilCond, 1600, { size: 18 }) +
            docxCell(soilHum, 1300, { size: 18 }) +
            docxCell(phenomenaNotes, 2588, { size: 18, align: "left" })
        );
    });

    if (rowsXml.length === 0) {
        rowsXml.push(
            docxRow(docxCell("Chưa có lượt ghi nhận thời tiết nào", 15988, { span: 10, size: 18, italic: true }))
        );
    }

    const bodyXml = `
        ${docxParagraph(title, true, 28, "center", 40)}
        ${docxParagraph(subTitle, false, 18, "center", 120, true)}
        ${infoTableXml}
        ${docxParagraph("", false, 14, "left", 100)}
        ${docxParagraph("BẢNG GHI NHẬN THỜI TIẾT TẠI VƯỜN TRỒNG", true, 22, "left", 80)}
        ${docxTable(widths, docxRow(headerCells, true) + rowsXml.join(""), DOCX_CONTENT_WIDTH, true)}
    `;

    const docxData = await packageDocx(bodyXml);
    const saveName = filename || `Nhat_ky_thoi_tiet_${farmName}_${seasonName}`;
    downloadDocxFile(docxData, saveName);
}

// =========================================================================
// 3. XUẤT NHẬT KÝ CANH TÁC (WORD A4 NGANG)
// =========================================================================
export interface CultivationLogDocxItem {
    actionDate: string;
    stage: string;
    activityType: string;
    otherActivity?: string | null;
    chemicalName?: string | null;
    dosage?: string | null;
    phiDays?: number | null;
    pestsDetected?: string | null;
    notes?: string | null;
}

export interface CultivationExportParams {
    farmName?: string;
    farmAddress?: string;
    regionCode?: string;
    seasonName?: string;
    logs: CultivationLogDocxItem[];
    activityLabels?: Record<string, string>;
    stageLabels?: Record<string, string>;
}

export async function exportCultivationLogsDocx(params: CultivationExportParams, filename?: string) {
    const title = "NHẬT KÝ CANH TÁC";
    const subTitle = "SỔ GHI CHÉP HOẠT ĐỘNG CANH TÁC SẦU RIÊNG - QUẢN LÝ MÃ SỐ VÙNG TRỒNG (PUC)";

    const farmName = params.farmName || "Vườn sầu riêng";
    const regionCode = params.regionCode || "VN - DNOR - 0269";
    const farmAddress = params.farmAddress || "Ấp 3, xã Phú Lộc, huyện Tân Phú, tỉnh Đồng Nai";
    const seasonName = params.seasonName || "2025-2026";

    // Info Table
    const infoWidths = [7994, 7994];
    const infoRows = [
        docxRow(
            docxLabelValueCell("Vườn", farmName, 7994, { size: 20 }) +
            docxLabelValueCell("Mã vùng trồng", regionCode, 7994, { size: 20 })
        ),
        docxRow(
            docxLabelValueCell("Địa chỉ vườn", farmAddress, 7994, { size: 19 }) +
            docxLabelValueCell("Niên vụ", seasonName, 7994, { size: 19 })
        ),
    ];
    const infoTableXml = docxTable(infoWidths, infoRows.join(""), DOCX_CONTENT_WIDTH, true);

    // Cultivation Logs Table
    // Total width = 15988 dxa
    const widths = [600, 1600, 2200, 2400, 1800, 2200, 1600, 1100, 2488];
    const headerCells = [
        docxCell("STT", 600, { bold: true, size: 18, bgColor: "E2E8F0", align: "center" }),
        docxCell("Ngày thực hiện", 1600, { bold: true, size: 18, bgColor: "E2E8F0", align: "center" }),
        docxCell("Giai đoạn sinh trưởng", 2200, { bold: true, size: 18, bgColor: "E2E8F0", align: "center" }),
        docxCell("Hoạt động canh tác", 2400, { bold: true, size: 18, bgColor: "E2E8F0", align: "center" }),
        docxCell("SV gây hại", 1800, { bold: true, size: 18, bgColor: "E2E8F0", align: "center" }),
        docxCell("Vật tư sử dụng", 2200, { bold: true, size: 18, bgColor: "E2E8F0", align: "center" }),
        docxCell("Liều lượng", 1600, { bold: true, size: 18, bgColor: "E2E8F0", align: "center" }),
        docxCell("PHI", 1100, { bold: true, size: 18, bgColor: "E2E8F0", align: "center" }),
        docxCell("Ghi chú & Đánh giá", 2488, { bold: true, size: 18, bgColor: "E2E8F0", align: "center" }),
    ].join("");

    const stageMap: Record<string, string> = {
        POST_HARVEST_RECOVERY: "Phục hồi sau thu hoạch",
        MAKING_SPROUT: "Làm đọt",
        FLOWER_INDUCTION: "Xử lý ra hoa",
        FLOWERING: "Ra hoa",
        FRUIT_SETTING: "Đậu trái",
        FRUIT_GROWING: "Nuôi trái",
        PRE_HARVEST: "Trước thu hoạch",
        HARVEST: "Thu hoạch",
        ...(params.stageLabels || {}),
    };

    const activityMap: Record<string, string> = {
        SPRAY_PESTICIDE: "Phun thuốc BVTV",
        FERTILIZE: "Bón phân",
        IRRIGATE: "Tưới nước",
        PRUNE: "Tỉa cành / Tỉa bông",
        WEEDING: "Làm cỏ",
        HARVEST: "Thu hoạch",
        PEST_INSPECTION: "Kiểm tra sâu bệnh",
        WATER_STRESS: "Xiết nước làm bông",
        POLLINATION: "Thụ phấn nhân tạo",
        FLOWER_THINNING: "Tỉa hoa",
        FRUIT_THINNING: "Tỉa trái non",
        GARDEN_SANITATION: "Vệ sinh vườn",
        OTHER: "Khác",
        ...(params.activityLabels || {}),
    };

    const rowsXml = params.logs.map((log, idx) => {
        const dateStr = formatVietnameseDate(log.actionDate);
        const stageStr = stageMap[log.stage] || log.stage;
        const actStr = log.activityType === "OTHER"
            ? (log.otherActivity || "Khác")
            : (activityMap[log.activityType] || log.activityType);

        const pestStr = log.pestsDetected && log.pestsDetected !== "Không phát hiện"
            ? log.pestsDetected
            : "Không";

        const materialStr = log.chemicalName || "—";
        const dosageStr = log.dosage || "—";
        const phiStr = log.phiDays != null && log.phiDays > 0 ? `${log.phiDays} ngày` : "—";
        const noteStr = log.notes || "—";

        return docxRow(
            docxCell(String(idx + 1), 600, { size: 18 }) +
            docxCell(dateStr, 1600, { size: 18 }) +
            docxCell(stageStr, 2200, { size: 18 }) +
            docxCell(actStr, 2400, { size: 18, align: "left" }) +
            docxCell(pestStr, 1800, { size: 18 }) +
            docxCell(materialStr, 2200, { size: 18, align: "left" }) +
            docxCell(dosageStr, 1600, { size: 18 }) +
            docxCell(phiStr, 1100, { size: 18 }) +
            docxCell(noteStr, 2488, { size: 18, align: "left" })
        );
    });

    if (rowsXml.length === 0) {
        rowsXml.push(
            docxRow(docxCell("Chưa có ghi chép nhật ký canh tác nào", 15988, { span: 9, size: 18, italic: true }))
        );
    }

    const bodyXml = `
        ${docxParagraph(title, true, 28, "center", 40)}
        ${docxParagraph(subTitle, false, 18, "center", 120, true)}
        ${infoTableXml}
        ${docxParagraph("", false, 14, "left", 100)}
        ${docxParagraph("BẢNG GHI CHÉP HOẠT ĐỘNG CANH TÁC", true, 22, "left", 80)}
        ${docxTable(widths, docxRow(headerCells, true) + rowsXml.join(""), DOCX_CONTENT_WIDTH, true)}
    `;

    const docxData = await packageDocx(bodyXml);
    const saveName = filename || `Nhat_ky_canh_tac_${farmName}_${seasonName}`;
    downloadDocxFile(docxData, saveName);
}
