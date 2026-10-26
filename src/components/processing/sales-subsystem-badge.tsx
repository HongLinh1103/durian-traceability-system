export function SalesSubsystemBadge({other}:{other:boolean}) {
  return <span className={`inline-flex items-center justify-center rounded-full border px-2.5 py-1 text-center text-xs font-semibold ${other?'border-blue-200 bg-blue-50 text-blue-700':'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{other?'Chế biến khác':'Đóng gói trái tươi'}</span>;
}
