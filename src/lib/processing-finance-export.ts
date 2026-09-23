import ExcelJS from 'exceljs';

export type FinanceExportSheet = {
  name: string;
  headers: string[];
  rows: Array<Array<string | number | Date | null>>;
  moneyColumns: number[];
};

export async function buildFinanceWorkbook(sheets: FinanceExportSheet[], period: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'TriViet';
  workbook.created = new Date();
  for (const data of sheets) {
    const sheet = workbook.addWorksheet(data.name, { views: [{ state: 'frozen', ySplit: 4 }] });
    sheet.mergeCells(1, 1, 1, data.headers.length);
    sheet.getCell('A1').value = `BÁO CÁO TÀI CHÍNH — ${data.name}`;
    sheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FF065F46' } };
    sheet.getRow(1).height = 32;
    sheet.mergeCells(2, 1, 2, data.headers.length);
    sheet.getCell('A2').value = period;
    sheet.getCell('A2').alignment = { wrapText: true, vertical: 'middle' };
    sheet.getRow(2).height = 42;
    sheet.getRow(4).values = data.headers;
    sheet.getRow(4).height = 32;
    sheet.getRow(4).eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF065F46' } };
      cell.alignment = { wrapText: true, vertical: 'middle' };
    });
    data.headers.forEach((header, index) => {
      sheet.getColumn(index + 1).width = /Nội dung|Đối tác|Chỉ tiêu/.test(header) ? 38 : /Ngày/.test(header) ? 15 : 24;
    });
    for (const values of data.rows) {
      if (values.some(value => typeof value === 'number' && !Number.isFinite(value))) throw new Error('Dữ liệu tài chính có số không hợp lệ. Vui lòng kiểm tra chứng từ.');
      const row = sheet.addRow(values);
      row.height = 42;
      row.eachCell(cell => {
        cell.alignment = { wrapText: true, vertical: 'middle' };
        if (cell.value instanceof Date) cell.numFmt = 'dd/mm/yyyy';
        if (row.number % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      });
      data.moneyColumns.forEach(column => { row.getCell(column).numFmt = '#,##0;[Red](#,##0);0'; });
    }
    sheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: Math.max(4, sheet.rowCount), column: data.headers.length } };
    if (!data.rows.length) sheet.getCell('A5').value = 'Không có dữ liệu trong bộ lọc đã chọn.';
    sheet.pageSetup = { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: '1:4' };
  }
  return workbook.xlsx.writeBuffer();
}

export function financeExcelDate(value: unknown): Date | string {
  const raw = String(value ?? '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const date = new Date(`${raw}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? raw : date;
}
