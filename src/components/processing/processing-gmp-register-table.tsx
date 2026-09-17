import { Field, GmpRecord, REGISTERS } from '@/lib/processing-gmp';

type RegisterStage = 'receiving' | 'preprocessing' | 'packaging';
const layout: Record<RegisterStage, { title?: string; groups: string[]; width: number }> = {
    receiving: { groups: ['Số lượng tiếp nhận (kg)'], width: 1450 },
    preprocessing: {
        groups: ['Đánh giá công đoạn vệ sinh tạp chất (Đ/K)', 'Đánh giá công đoạn phơi khô sản phẩm (Đ/K)'],
        width: 1450,
    },
    packaging: {
        title: 'THEO DÕI ĐÓNG GÓI/ĐÓNG THÙNG - NHẬP KHO THÀNH PHẨM',
        groups: ['Đánh giá công đoạn đóng gói - đóng thùng (Đ/K)', 'Nhập kho thành phẩm'],
        width: 1600,
    },
};

const headerClass = 'border border-slate-300 px-2.5 py-2.5 text-center align-middle text-xs font-semibold leading-snug text-slate-700';
function columnLabel(field: Field) {
    return field.label;
}

function RecordValue({ field, record, onDetail }: { field: Field; record: GmpRecord; onDetail: (record: GmpRecord) => void }) {
    const value = field.key === 'lotCode' ? record.lotCode : record.values[field.key];
    if (field.key === 'lotCode' || field.key === 'productLot') {
        const variety = String(record.values.variety || record.values.productLot || '').split(' · ')[0];
        return <button type="button" onClick={() => onDetail(record)} className="text-left font-semibold text-emerald-700 hover:underline">
            {field.key === 'productLot' && variety && <span className="mb-1 block text-slate-700">{variety}</span>}
            <span className="break-words">{record.lotCode}</span>
        </button>;
    }
    if (value === undefined || value === null || value === '') return <span className="text-slate-400">—</span>;
    if (field.type === 'check') return <span title={value === 'Đ' ? 'Đạt' : 'Không đạt'} className={`inline-flex h-7 min-w-7 items-center justify-center rounded-md px-2 font-bold ${value === 'Đ' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{value}</span>;
    if (field.type === 'date') return <span className="whitespace-nowrap">{String(value).split('-').reverse().join('/')}</span>;
    if (field.type === 'number') return <span className="font-medium tabular-nums">{Number(value).toLocaleString('vi-VN')}</span>;
    return <span className="whitespace-pre-wrap break-words">{value}</span>;
}

export function ProcessingGmpRegisterTable({ stage, rows, onDetail, onEdit }: {
    stage: RegisterStage;
    rows: GmpRecord[];
    onDetail: (record: GmpRecord) => void;
    onEdit: (record: GmpRecord) => void;
}) {
    const config = REGISTERS[stage];
    const { title, groups, width } = layout[stage];
    const fields = config.fields.filter(field => !field.internal);
    // The first two columns span the master heading in BM-GMP-02 and 03.
    const headingFields = title ? fields.slice(2) : fields;
    const headings: { label: string; fields: Field[]; grouped: boolean }[] = [];
    for (const field of headingFields) {
        const grouped = Boolean(field.group && groups.includes(field.group));
        const previous = headings[headings.length - 1];
        if (grouped && previous?.grouped && previous.label === field.group) previous.fields.push(field);
        else headings.push({ label: grouped ? field.group! : columnLabel(field), fields: [field], grouped });
    }
    return <>
        <p className="px-5 py-3 text-xs text-slate-500">{config.code} · Kéo ngang để xem đầy đủ các cột trong sổ.{stage !== 'receiving' && ' Đ = Đạt; K = Không đạt.'}</p>
        <div role="region" aria-label={`Bảng ${config.code}`} tabIndex={0} className="max-w-full overflow-x-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500">
            <table className="w-full table-fixed border-collapse text-sm" style={{ minWidth: width }}>
                <caption className="sr-only">{config.title} — {config.code}</caption>
                <colgroup>{fields.map(field => <col key={field.key} style={{ width: field.key === 'origin' ? 240 : ['productLot', 'lotCode'].includes(field.key) ? 140 : field.key === 'correction' ? 140 : ['supplierOk', 'transportOk', 'materialOk', 'brushOk', 'airOk', 'dryOk', 'qualityOk'].includes(field.key) ? 80 : field.type === 'number' || field.type === 'time' ? 85 : 100 }} />)}<col style={{ width: 110 }} /></colgroup>
                <thead className="bg-slate-50">
                    {title && <tr>
                        {fields.slice(0, 2).map(field => <th key={field.key} scope="col" rowSpan={3} className={headerClass}>{field.label}</th>)}
                        <th scope="colgroup" colSpan={fields.length - 2} className={`${headerClass} bg-emerald-50 !text-sm !text-emerald-900`}>{title}</th>
                        <th scope="col" rowSpan={3} className={headerClass}>Thao tác</th>
                    </tr>}
                    <tr>
                        {headings.map(heading => <th key={heading.fields[0].key} scope={heading.grouped ? 'colgroup' : 'col'} colSpan={heading.fields.length} rowSpan={heading.grouped || !groups.length ? 1 : 2} className={headerClass}>{heading.label}</th>)}
                        {!title && <th scope="col" rowSpan={groups.length ? 2 : 1} className={headerClass}>Thao tác</th>}
                    </tr>
                    {groups.length > 0 && <tr>{headings.filter(heading => heading.grouped).flatMap(heading => heading.fields).map(field => <th key={field.key} scope="col" className={`${headerClass} font-semibold`}>{field.label}</th>)}</tr>}
                </thead>
                <tbody>{rows.map(record => <tr key={record.id} className="hover:bg-emerald-50/30">
                    {fields.map(field => <td key={field.key} className={`border border-slate-200 px-2.5 py-2.5 align-middle leading-snug ${['number', 'check', 'time', 'date'].includes(field.type || '') ? 'text-center' : 'text-left'}`}><RecordValue field={field} record={record} onDetail={onDetail} /></td>)}
                    <td className="border border-slate-200 px-2.5 py-2.5 text-center"><div className="flex flex-col items-center gap-1.5"><button type="button" className="font-semibold text-emerald-700 hover:underline" onClick={() => onDetail(record)}>Chi tiết</button><button type="button" className="font-semibold text-slate-500 hover:underline" onClick={() => onEdit(record)}>Sửa</button></div></td>
                </tr>)}{!rows.length && <tr><td colSpan={fields.length + 1} className="border border-slate-200 p-10 text-center text-slate-500">Chưa có bản ghi phù hợp. Điều chỉnh bộ lọc hoặc thêm bản ghi mới.</td></tr>}</tbody>
            </table>
        </div>
    </>;
}
