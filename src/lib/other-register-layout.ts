import { GmpRecord } from './processing-gmp';
import { OTHER_REGISTERS, OtherRegisterKey, otherRegisterValue } from './other-registers';
import { GMP_REGISTER_COLUMN_WIDTHS } from '@/components/processing/processing-gmp-column-widths';

export function otherRegisterColumnLayout(book: OtherRegisterKey, rows: GmpRecord[]) {
 if (book === 'preprocessing') {
  const freshWidths = GMP_REGISTER_COLUMN_WIDTHS.preprocessing!;
  return { widths: freshWidths.slice(0, -1), actionWidth: freshWidths[freshWidths.length - 1] };
 }
 const widths = OTHER_REGISTERS[book].fields.map(column => {
  if (column.key === 'serial') return 45;
  if (column.key === 'lotCode') return Math.min(240, Math.max(130, ...rows.map(r => r.lotCode.length * 7 + 16)));
  if (column.type === 'datetime-local') return 145;
  if (column.type === 'date') return 105;
  if (column.group === 'Nhiệt độ tâm sản phẩm (°C)') return 60;
  if (column.type === 'check') return column.label.length > 55 ? 130 : 100;
  if (column.type === 'number') return 90;
  if (column.key === 'quantityWeight') return 125;
  const content = Math.max(0, ...rows.map((r, index) => String(otherRegisterValue(column, r, index)).length));
  if (['receiver', 'supervisor', 'operator'].includes(column.key)) return Math.min(155, Math.max(115, content * 7 + 16));
  if (column.key === 'correction') return Math.min(230, Math.max(115, content * 6 + 16));
  if (column.key === 'warehouse') return Math.min(150, Math.max(90, content * 7 + 16));
  if (column.key === 'equipmentOk') return 125;
  return Math.min(230, Math.max(column.key === 'product' ? 170 : 120, content * 6 + 16));
 });
 return { widths, actionWidth: 80 };
}
