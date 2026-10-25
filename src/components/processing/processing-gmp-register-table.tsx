import { GMP_GRADE_COLUMN_WIDTH } from './processing-gmp-column-widths';
import { Field, GmpRecord, REGISTERS, formatPurchaseLotCode } from '@/lib/processing-gmp';
import { normalizeUnitCode } from '@/lib/puc-phc';
import type { ReactNode } from 'react';

export type RegionSource = { code: string; name: string; address: string | null };

type RegisterStage = 'receiving' | 'preprocessing' | 'packaging' | 'inspection';
const layout: Record<RegisterStage, { title?: string; groups: string[]; width: number }> = {
    receiving: { groups: ['Số lượng tiếp nhận (kg)', 'Khối lượng tiếp nhận (kg)'], width: 1520 },
    preprocessing: {
        groups: ['Đánh giá công đoạn vệ sinh tạp chất (Đ/K)', 'Đánh giá công đoạn phơi khô sản phẩm (Đ/K)'],
        width: 1450,
    },
    inspection: { groups: [], width: 1440 },
    packaging: {
        title: 'THEO DÕI ĐÓNG GÓI/ĐÓNG THÙNG - NHẬP KHO THÀNH PHẨM',
        groups: ['Đánh giá công đoạn đóng gói - đóng thùng (Đ/K)', 'Nhập kho thành phẩm'],
        width: 1600,
    },
};

const headerClass = 'border border-slate-300 px-3 py-2.5 text-center align-middle text-xs font-semibold leading-snug text-slate-700 whitespace-nowrap';
function columnLabel(field: Field) {
    return field.label;
}

function cleanText(val?: unknown): string {
    if (!val) return '';
    return String(val).replace(/\s*\(minh họa\)/gi, '').replace(/\s*\(minh hoa\)/gi, '').trim();
}

export function renderOriginContent(record: GmpRecord, regions: RegionSource[] = []) {
    const puc = String(record.values?.puc || '').trim();
    const matchedRegion = puc
        ? regions.find(region => normalizeUnitCode(region.code) === normalizeUnitCode(puc))
        : undefined;
    if (matchedRegion) {
        return (
            <div className="text-xs text-slate-700">
                <div className="font-semibold text-slate-900">{matchedRegion.name}</div>
                <div className="mt-1 text-slate-500">{matchedRegion.address || 'Chưa có địa chỉ'}</div>
            </div>
        );
    }
    const text = cleanText(record.values?.origin);
    if (!text) return <span className="text-slate-400">—</span>;
    if (text.includes(' - ')) {
        const [name, ...rest] = text.split(' - ');
        return (
            <div className="text-xs text-slate-700">
                <div className="font-semibold text-slate-900">{name.trim()}</div>
                <div className="mt-1 text-slate-500">{rest.join(' - ').trim()}</div>
            </div>
        );
    }
    const commaIdx = text.indexOf(', ');
    if (commaIdx > 5) {
        const name = text.slice(0, commaIdx).trim();
        const addr = text.slice(commaIdx + 2).trim();
        return (
            <div className="text-xs text-slate-700">
                <div className="font-semibold text-slate-900">{name}</div>
                <div className="mt-1 text-slate-500">{addr}</div>
            </div>
        );
    }
    return <div className="text-xs font-semibold text-slate-900">{text}</div>;
}

function getColumnWidth(field: Field, stage: RegisterStage): number {
    if (/^(grade|inputWeight|outputWeight|inputBoxes|quantity_boxes|weight_kg|sample)(1|2|3|Other)$/.test(field.key)) return GMP_GRADE_COLUMN_WIDTH;
    if (stage === 'receiving') {
        if (field.key === 'purchaseCode') return 135;
        if (field.key === 'date') return 120;
        if (field.key === 'seller') return 135;
        if (field.key === 'puc') return 130;
        if (field.key === 'origin') return 260;
        if (field.key === 'variety') return 105;
        if (field.key === 'initialWeight') return 110;
        if (field.key === 'acceptedWeight') return 120;
        if (field.group === 'Khối lượng tiếp nhận (kg)' || field.key.startsWith('grade')) return 70;
        if (field.key === 'otherProcessing') return 110;
        if (field.key === 'rejected') return 120;
        if (field.key === 'receiver') return 150;
        if (field.key === 'dgLotCodes') return 160;
        if (field.key === 'cbLotCodes') return 160;
        if (field.key === 'notes') return 160;
        if (field.key === 'lotCode') return 135;
    }
    if (stage === 'inspection') {
        if (
            field.group === 'Số lượng/khối lượng tiếp nhận kiểm tra' ||
            field.group === 'Số lượng/khối lượng đưa qua xuất bán' ||
            ['quantity_boxes', 'weight_kg', 'inputBoxes', 'inputWeight'].includes(field.key) ||
            field.key.startsWith('inputBoxes') ||
            field.key.startsWith('inputWeight')
        ) return 75;
    }
    if (field.key === 'origin') return 280;
    if (field.key === 'lotCode') return 135;
    if (field.key === 'productLot') return 150;
    if (field.key === 'rejected') return 80;
    if (field.key === 'receiver') return 170;
    if (field.key === 'seller') return 135;
    if (field.key === 'puc') return 130;
    if (field.key === 'date') return 120;
    if (field.key === 'variety') return 105;
    if (field.key === 'correction' || field.key === 'treatmentPlan') return 160;
    if (['supplierOk', 'transportOk', 'materialOk', 'brushOk', 'airOk', 'dryOk', 'qualityOk'].includes(field.key)) return 80;
    if (field.type === 'number' || field.type === 'time') return 95;
    return 120;
}

function RecordValue({ field, record, regions, onDetail }: {
    field: Field;
    record: GmpRecord;
    regions?: RegionSource[];
    onDetail: (record: GmpRecord) => void;
}) {
    const value = field.key === 'lotCode' ? record.lotCode : record.values[field.key];
    if (field.key === 'origin') {
        return renderOriginContent(record, regions);
    }
    if (field.key === 'dgLotCodes') {
        const str = String(record.values.dgLotCodes || '');
        const normalized = str ? str.replace(/\bLH-/g, 'DG-') : '';
        return <span className="whitespace-nowrap font-mono font-semibold">{normalized || '—'}</span>;
    }
    if (field.key === 'cbLotCodes') {
        const str = String(record.values.cbLotCodes || '');
        const normalized = str ? str.replace(/\bLH-/g, 'CB-') : '';
        return <span className="whitespace-nowrap font-mono font-semibold">{normalized || '—'}</span>;
    }
    if (field.key === 'lotCode' || field.key === 'productLot') {
        const variety = String(record.values.variety || record.values.productLot || '').split(' · ')[0];
        return (
            <button type="button" onClick={() => onDetail(record)} className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-bold font-mono text-emerald-700 hover:underline">
                <span>{record.lotCode}</span>
                {field.key === 'productLot' && variety && (
                    <span className="text-xs text-slate-500 font-normal">({variety})</span>
                )}
            </button>
        );
    }
    if (field.key === 'seller') {
        return <span className="font-normal text-slate-900 whitespace-nowrap">{String(value || '—')}</span>;
    }
    if (field.key === 'puc') {
        return <span className="font-mono text-xs font-medium text-slate-700 whitespace-nowrap">{String(value || '—')}</span>;
    }
    if (field.key === 'rejected') {
        const num = Number(value || 0);
        return num > 0 ? (
            <span className="font-bold font-mono text-rose-700 whitespace-nowrap">{Number(value).toLocaleString('vi-VN')}</span>
        ) : (
            <span className="text-slate-400 font-mono whitespace-nowrap">0</span>
        );
    }
    if (value === undefined || value === null || value === '') return <span className="text-slate-400">—</span>;
    if (field.type === 'check') return <span title={value === 'Đ' ? 'Đạt' : 'Không đạt'} className={`inline-flex h-7 min-w-7 items-center justify-center rounded-md px-2 font-bold ${value === 'Đ' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{value}</span>;
    if (field.type === 'date') return <span className="whitespace-nowrap">{String(value).split('-').reverse().join('/')}</span>;
    if (field.type === 'number') return <span className="font-medium tabular-nums whitespace-nowrap font-mono">{Number(value).toLocaleString('vi-VN')}</span>;
    return <span className="whitespace-nowrap">{String(value)}</span>;
}

export function ProcessingGmpRegisterTable({ stage, rows, purchases = [], regions = [], onDetail, onEdit, presentation }: {
    stage: RegisterStage;
    rows: GmpRecord[];
    purchases?: GmpRecord[];
    regions?: RegionSource[];
    onDetail?: (record: GmpRecord) => void;
    onEdit?: (record: GmpRecord) => void;
    presentation?: {
        title: string;
        code: string;
        fields: Field[];
        emptyMessage: string;
        renderValue: (field: Field, record: GmpRecord, index: number) => ReactNode;
    };
}) {
    const config = presentation || REGISTERS[stage];
    const { width } = layout[stage];
    const title = presentation ? undefined : layout[stage].title;
    const actions = Boolean(onDetail || onEdit);
    const groups = Array.from(new Set(config.fields.filter(f => !f.internal && f.group).map(f => f.group!)));
    const fields: Field[] = config.fields.filter(field => !field.internal);
    const columnWidth = (field: Field) => {
        if (!presentation) return getColumnWidth(field, stage);
        if (/^(inputWeight|outputWeight)(1|2|3|Other)$/.test(field.key)) return GMP_GRADE_COLUMN_WIDTH;
        if (field.type === 'datetime-local') return 210;
        if (field.key === 'serial') return 65;
        if (field.key === 'correction' || field.key === 'customer') return 230;
        if (field.key === 'lotCode') return 180;
        if (field.type === 'number') return 115;
        if (field.type === 'check') return field.label.length > 45 ? 230 : field.group ? 165 : 140;
        return 180;
    };
    const activeHeaderClass = `${headerClass}${presentation ? ' !whitespace-normal break-words [overflow-wrap:anywhere]' : ''}`;
    if (stage === 'receiving') fields.splice(1, 0, { key: 'purchaseCode', label: 'Mã hồ sơ thu mua' });
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
        <div role="region" aria-label={`Bảng ${config.code}`} tabIndex={0} className="w-full min-w-0 max-w-full overflow-x-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500">
            <table className="w-full table-fixed border-collapse text-sm" style={presentation ? { minWidth: '100%', width: fields.reduce((sum, field) => sum + columnWidth(field), actions ? 120 : 0) } : { width: stage === 'receiving' ? fields.reduce((sum, field) => sum + getColumnWidth(field, stage), 110) : undefined, minWidth: stage === 'receiving' ? undefined : Math.max(width, fields.length * 100) }}>
                <caption className="sr-only">{config.title} — {config.code}</caption>
                <colgroup>
                    {fields.map(field => (
                        <col key={field.key} style={{ width: columnWidth(field) }} />
                    ))}
                    {actions && <col style={{ width: stage === 'receiving' ? 110 : 120 }} />}
                </colgroup>
                <thead className="bg-slate-50">
                    {title && <tr>
                        {fields.slice(0, 2).map(field => <th key={field.key} scope="col" rowSpan={3} className={headerClass}>{field.label}</th>)}
                        <th scope="colgroup" colSpan={fields.length - 2} className={`${headerClass} bg-emerald-50 !text-sm !text-emerald-900`}>{title}</th>
                        {actions && <th scope="col" rowSpan={3} className={headerClass}>Thao tác</th>}
                    </tr>}
                    <tr>
                        {headings.map(heading => <th key={heading.fields[0].key} scope={heading.grouped ? 'colgroup' : 'col'} colSpan={heading.fields.length} rowSpan={heading.grouped || !groups.length ? 1 : 2} className={`${activeHeaderClass} ${['lotCode', 'rejected'].includes(heading.fields[0].key) ? '!whitespace-normal' : ''} ${heading.fields[0].key === 'rejected' ? '!px-1' : ''}`}>{heading.label}</th>)}
                        {!title && actions && <th scope="col" rowSpan={groups.length ? 2 : 1} className={headerClass}>Thao tác</th>}
                    </tr>
                    {groups.length > 0 && <tr>{headings.filter(heading => heading.grouped).flatMap(heading => heading.fields).map(field => <th key={field.key} scope="col" className={`${activeHeaderClass} font-semibold ${(field.group === 'Khối lượng tiếp nhận (kg)' || field.key.startsWith('grade')) ? '!px-1' : ''}`}>{field.label}</th>)}</tr>}
                </thead>
                <tbody>{rows.map((record, index) => (
                    <tr key={record.id} className="hover:bg-emerald-50/30">
                        {fields.map(field => {
                            const isOrigin = field.key === 'origin';
                            const isCenter = ['check', 'time', 'date'].includes(field.type || '') || ['puc', 'rejected', 'purchaseCode', 'lotCode', 'variety'].includes(field.key);
                            const isRight = field.type === 'number' && !['rejected'].includes(field.key);
                            const isCompact = field.group === 'Khối lượng tiếp nhận (kg)' || field.key.startsWith('grade') || field.key === 'rejected';
                            return (
                                <td
                                    key={field.key}
                                    className={`border border-slate-200 ${isCompact ? 'px-1.5 py-2.5' : 'px-3 py-2.5'} align-middle leading-snug ${
                                        isOrigin
                                            ? 'text-left min-w-[240px] max-w-sm whitespace-normal'
                                            : `${presentation ? 'whitespace-normal break-words' : 'whitespace-nowrap'} ${isRight ? 'text-right' : isCenter ? 'text-center' : 'text-left'}`
                                    }`}
                                >
                                    {presentation ? presentation.renderValue(field, record, index) : field.key === 'purchaseCode' ? (() => {
                                        const purchase = purchases.find(item => item.id === record.sourceId);
                                        const code = purchase
                                            ? (/^TM-\d{4}-\d{4}(?:-\d{2})?$/.test(purchase.lotCode) ? purchase.lotCode : formatPurchaseLotCode(purchase.values.date || purchase.lotCode))
                                            : '?';
                                        return <span className="font-mono font-semibold text-slate-700">{code}</span>;
                                    })() : <RecordValue field={field} record={record} regions={regions} onDetail={onDetail || (() => {})} />}
                                </td>
                            );
                        })}
                        {actions && <td className="border border-slate-200 px-3 py-2.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                                {onDetail && <button type="button" className="font-semibold text-emerald-700 hover:underline" onClick={() => onDetail(record)}>Chi tiết</button>}
                                {onEdit && <button type="button" className="font-semibold text-slate-500 hover:underline" onClick={() => onEdit(record)}>Sửa</button>}
                            </div>
                        </td>}
                    </tr>
                ))}{!rows.length && <tr><td colSpan={fields.length + Number(actions)} className="border border-slate-200 p-10 text-center text-slate-500">{presentation?.emptyMessage || 'Chưa có bản ghi phù hợp. Điều chỉnh bộ lọc hoặc thêm bản ghi mới.'}</td></tr>}</tbody>
            </table>
        </div>
    </>;
}
