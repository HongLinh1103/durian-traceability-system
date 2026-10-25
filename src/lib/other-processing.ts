import {productionSources,productionOrigins} from './production-lots';
import { cbSources } from './other-monitoring';
import { GmpState, Values } from './processing-gmp';
export const METHODS = ['Bóc múi cấp đông nguyên hạt', 'Bóc múi cấp đông tách hạt', 'Sấy thăng hoa', 'Chế biến khác'];
export const BOOKS = ['preprocessing', 'processing', 'packaging', 'inspection', 'sales'] as const;
export type OtherBook = typeof BOOKS[number];
export type OtherRecord = {
    id: string;
    book: OtherBook;
    sourceId: string;
    inputs?: {
        sourceId: string;
        weight: number;
    }[];
    lotCode: string;
    values: Values;
    confirmed: boolean;
    history: {
        actor: string;
        at: string;
    }[];
};
export type OtherState = GmpState & {
    otherProcessing?: OtherRecord[];
};
export function contributions(record: OtherRecord): {
    sourceId: string;
    weight: number;
    lotCode: string;
    harvestCode: string;
    puc: string;
    origin: string;
}[] {
    try {
        return JSON.parse(String(record.values.contributions || '[]'));
    }
    catch {
        return [];
    }
}
type Field = [
    string,
    string,
    'number' | 'date' | 'time' | 'check' | 'text'
];
const f = (key: string, label: string, type: Field[2] = 'text'): Field => [key, label, type];
const common = [f('date', 'Ngày', 'date'), f('operator', 'Người thực hiện')];
export const FIELDS: Record<OtherBook, Field[]> = {
    preprocessing: [...common, f('materialOk', 'Tình trạng nguyên liệu', 'check'), f('hygieneOk', 'Điều kiện vệ sinh', 'check'), f('start', 'Bắt đầu', 'time'), f('end', 'Kết thúc', 'time'), f('qualityOk', 'Đánh giá sơ chế', 'check'), f('output', 'Khối lượng sau sơ chế (kg)', 'number'), f('removed', 'Khối lượng loại bỏ (kg)', 'number')],
    processing: [...common, f('product', 'Tên sản phẩm'), f('criteria', 'Quy trình và ngưỡng chất lượng áp dụng'), f('start', 'Bắt đầu', 'time'), f('end', 'Kết thúc', 'time'), f('toolsOk', 'Vệ sinh thiết bị', 'check'), f('conditionsOk', 'Điều kiện chế biến', 'check'), f('qualityOk', 'Chất lượng sau chế biến', 'check'), f('output', 'Sản phẩm đạt (kg)', 'number'), f('byproduct', 'Phụ phẩm (kg)', 'number'), f('loss', 'Hao hụt (kg)', 'number')],
    packaging: [...common, f('packaging', 'Loại bao bì / quy cách'), f('net', 'Khối lượng tịnh/đơn vị (kg)', 'number'), f('quantity', 'Số lượng đóng gói / nhập kho', 'number'), f('unit', 'Đơn vị tính'), f('output', 'Khối lượng đạt sau đóng gói (kg)', 'number'), f('toolsOk', 'Vệ sinh dụng cụ', 'check'), f('labelsOk', 'Bao bì và tem nhãn', 'check'), f('qualityOk', 'Chất lượng đóng gói', 'check'), f('manufactured', 'Ngày sản xuất', 'date'), f('expiry', 'Hạn sử dụng', 'date'), f('storage', 'Điều kiện bảo quản'), f('warehouseReceipt', 'Mã phiếu nhập kho'), f('warehouse', 'Kho nhập')],
    inspection: [...common, f('criteria', 'Tiêu chí kiểm tra theo phương pháp'), f('quantity', 'Số lượng kiểm tra', 'number'), f('appearanceOk', 'Ngoại quan', 'check'), f('packagingOk', 'Bao bì', 'check'), f('labelsOk', 'Tem nhãn', 'check'), f('storageOk', 'Bảo quản', 'check'), f('expiryOk', 'Hạn sử dụng', 'check'), f('qualityOk', 'Kết quả tổng thể', 'check'), f('passed', 'Số lượng đạt', 'number'), f('failed', 'Số lượng không đạt', 'number'), f('evidence', 'Tài liệu chứng minh (đường dẫn)'), f('treatment', 'Xử lý thành phẩm không đạt')],
    sales: [...common, f('order', 'Mã đơn hàng'), f('customer', 'Tên khách hàng'), f('recipient', 'Đơn vị nhận hàng'), f('quantity', 'Số lượng xuất', 'number'), f('price', 'Đơn giá', 'number'), f('carrier', 'Đơn vị vận chuyển'), f('delivery', 'Ngày giao hàng', 'date'), f('storage', 'Điều kiện bảo quản / vận chuyển')]
};
export const TECHNICAL: Record<string, Field[]> = {
    [METHODS[0]]: [f('pulp', 'Cơm sầu riêng nguyên hạt (kg)', 'number'), f('temperature', 'Nhiệt độ cấp đông', 'number'), f('freezeStart', 'Bắt đầu cấp đông'), f('freezeEnd', 'Kết thúc cấp đông'), f('storageTemperature', 'Nhiệt độ bảo quản', 'number'), f('technicalQuality', 'Kết quả chất lượng')],
    [METHODS[1]]: [f('beforeSeed', 'Cơm trước tách hạt (kg)', 'number'), f('seed', 'Hạt tách ra (kg)', 'number'), f('afterSeed', 'Cơm sau tách hạt (kg)', 'number'), f('temperature', 'Nhiệt độ cấp đông', 'number'), f('freezeStart', 'Bắt đầu cấp đông'), f('freezeEnd', 'Kết thúc cấp đông'), f('technicalQuality', 'Kết quả chất lượng')],
    [METHODS[2]]: [f('dryInput', 'Nguyên liệu đưa vào sấy (kg)', 'number'), f('phases', 'Nhiệt độ / áp suất từng giai đoạn'), f('moisture', 'Độ ẩm sau sấy (%)', 'number'), f('dryOutput', 'Sản phẩm sau sấy (kg)', 'number'), f('technicalQuality', 'Kết quả chất lượng')],
    [METHODS[3]]: [f('customMethod', 'Tên phương pháp'), f('parameters', 'Thông số kỹ thuật'), f('technicalQuality', 'Kết quả chất lượng')]
};
function validOrigin(state: OtherState, record: OtherRecord, seen = new Set<string>()): boolean {
    if (seen.has(record.id))
        return false;
    seen.add(record.id);
    if (record.book === 'preprocessing')
        return productionSources(state,'CB').some(r => r.id === record.sourceId && !r.draft && r.values.sourceEligible === '1' && r.values.sourceConflict !== '1');
    return (record.inputs || [{ sourceId: record.sourceId }]).every(i => { const parent = state.otherProcessing?.find(r => r.id === i.sourceId); return Boolean(parent && validOrigin(state, parent, new Set(seen))); });
}
export function eligibleSources(state: OtherState, book: OtherBook): {
    id: string;
    lotCode: string;
    values: Values;
    sourceId?: string;
}[] {
    const records = state.otherProcessing || [];
    if (book === 'preprocessing')
        return cbSources(state).filter(r => r.values.classificationComplete === '1' && r.values.processingAllocationHold !== '1').map(r => ({ id: r.id, lotCode: r.lotCode, values: { ...r.values, input: r.values.otherProcessing } }));
    const previous = BOOKS[BOOKS.indexOf(book) - 1];
    return records.filter(r => r.book === previous && r.confirmed && validOrigin(state, r) && !FIELDS[r.book].some(([k, , t]) => t === 'check' && r.values[k] === 'K') && (book !== 'sales' || Number(r.values.passed) > 0)).map(r => ({ ...r, values: { ...r.values, input: book === 'packaging' ? r.values.output : book === 'processing' ? r.values.output : r.values.input } }));
}
export function saveOther(state: OtherState, book: OtherBook, submitted: {
    id?: string;
    sourceId: string;
    inputs?: {
        sourceId: string;
        weight: number;
    }[];
    values: Values;
    confirmed: boolean;
}, id: string, actor: string): OtherState {
    if (!BOOKS.includes(book))
        throw Error('Sổ không hợp lệ.');
    const rows = state.otherProcessing || [], old = rows.find(r => r.id === submitted.id);
    if (submitted.id && !old)
        throw Error('Không tìm thấy bản ghi.');
    if (old && (old.book !== book || old.confirmed))
        throw Error('Bản ghi đã xác nhận không thể sửa.');
    const source = eligibleSources(state, book).find(r => r.id === submitted.sourceId);
    if (!source)
        throw Error('Nguồn chưa đạt điều kiện.');
    const inputs = book === 'processing' ? (submitted.inputs?.length ? submitted.inputs : [{ sourceId: source.id, weight: Number(source.values.input) }]) : undefined;
    if (inputs) {
        if (new Set(inputs.map(i => i.sourceId)).size !== inputs.length)
            throw Error('Lô nguồn bị lặp.');
        for (const contribution of inputs) {
            const origin = eligibleSources(state, book).find(r => r.id === contribution.sourceId);
            if (!origin || !Number.isFinite(contribution.weight) || contribution.weight <= 0)
                throw Error('Khối lượng đóng góp không hợp lệ.');
            const consumed = rows.filter(r => r.book === book && r.confirmed && r.id !== old?.id).flatMap(r => r.inputs || [{ sourceId: r.sourceId, weight: Number(r.values.input) }]).filter(i => i.sourceId === origin.id).reduce((n, i) => n + i.weight, 0);
            if (contribution.weight + consumed > Number(origin.values.input) + .001)
                throw Error('Khối lượng sử dụng vượt nguyên liệu còn lại.');
        }
    }
    const v: Values = {};
    for (const [key, , type] of [...FIELDS[book], ...(book === 'processing' ? TECHNICAL[String(submitted.values.method)] || [] : [])]) {
        const value = submitted.values[key];
        if (submitted.confirmed && (value === undefined || value === '') && !['evidence', 'treatment'].includes(key))
            throw Error('Vui lòng hoàn tất thông tin bắt buộc.');
        if (type === 'number' && value !== undefined && value !== '' && (!Number.isFinite(Number(value)) || (!['temperature', 'storageTemperature'].includes(key) && Number(value) < 0)))
            throw Error('Số liệu không hợp lệ.');
        if (type === 'check' && value !== undefined && value !== '' && !['Đ', 'K'].includes(String(value)))
            throw Error('Kết quả kiểm tra không hợp lệ.');
        v[key] = value ?? '';
        if (submitted.confirmed && type === 'date' && (!/^\d{4}-\d{2}-\d{2}$/.test(String(value)) || !Number.isFinite(Date.parse(String(value)))))
            throw Error('Ngày không hợp lệ.');
        if (submitted.confirmed && type === 'time' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(value)))
            throw Error('Thời gian không hợp lệ.');
    }
    Object.assign(v, { ...(source.values.productionOrigins?{productionOrigins:source.values.productionOrigins,productionLotId:source.values.productionLotId||''}:{}), input: source.values.input, harvestRecordId: source.values.harvestRecordId || '', harvestCode: source.values.harvestCode || '', puc: source.values.puc || '', origin: source.values.origin || '', variety: source.values.variety || '', sourceLot: source.lotCode, product: book === 'processing' ? submitted.values.product : source.values.product || '', method: book === 'processing' ? submitted.values.method : source.values.method || '' });
    if (inputs) {
        v.input = inputs.reduce((n, i) => n + i.weight, 0);
        const origins=inputs.flatMap(i=>productionOrigins(eligibleSources(state,book).find(r=>r.id===i.sourceId)!.values));
        if(origins.length)v.productionOrigins=JSON.stringify([...new Map(origins.map(a=>[a.id,a])).values()]);
        v.contributions = JSON.stringify(inputs.map(i => { const r = eligibleSources(state, book).find(s => s.id === i.sourceId)!; return { ...i, lotCode: r.lotCode, harvestCode: r.values.harvestCode, puc: r.values.puc, origin: r.values.origin }; }));
    }
    else if (source.values.contributions)
        v.contributions = source.values.contributions;
    if (book === 'processing' && !METHODS.includes(String(v.method)))
        throw Error('Chọn phương pháp chế biến.');
    const used = rows.filter(r => r.book === book && r.sourceId === source.id && r.confirmed && r.id !== old?.id);
    if (submitted.confirmed) {
        if (String(v.date) < String(source.values.date))
            throw Error('Ngày thực hiện trước ngày công đoạn nguồn.');
        if (['preprocessing', 'processing', 'packaging'].includes(book) && Number(v.output) <= 0 && !FIELDS[book].some(([k, , t]) => t === 'check' && v[k] === 'K'))
            throw Error('Khối lượng sản phẩm đạt phải lớn hơn 0.');
        if (['preprocessing', 'packaging'].includes(book) && used.length)
            throw Error('Nguồn đã được sử dụng.');
        const input = Number(v.input);
        if (book === 'preprocessing' && Math.abs(Number(v.output) + Number(v.removed) - input) > .001)
            throw Error('Khối lượng sau sơ chế và loại bỏ phải bằng đầu vào.');
        if (book === 'processing') {
            if (Math.abs(Number(v.output) + Number(v.byproduct) + Number(v.loss) - input) > .001)
                throw Error('Sản phẩm, phụ phẩm và hao hụt phải bằng đầu vào.');
            v.recovery = input ? Number(v.output) / input * 100 : 0;
        }
        if (book === 'packaging') {
            if (Number(v.output) > input + .001 || Math.abs(Number(v.net) * Number(v.quantity) - Number(v.output)) > .001)
                throw Error('Khối lượng đóng gói không hợp lệ.');
            if (String(v.expiry) < String(v.manufactured))
                throw Error('Hạn sử dụng trước ngày sản xuất.');
        }
        if (book === 'inspection') {
            const capacity = Number(source.values.quantity);
            if (Number(v.quantity) + used.reduce((n, r) => n + Number(r.values.quantity), 0) > capacity || Math.abs(Number(v.passed) + Number(v.failed) - Number(v.quantity)) > .001)
                throw Error('Số lượng kiểm tra không hợp lệ.');
            if (FIELDS.inspection.some(([k, , t]) => t === 'check' && v[k] === 'K') && Number(v.passed) > 0)
                throw Error('Lô không đạt phải giữ lại xử lý.');
        }
        if (book === 'sales') {
            if (Number(v.quantity) <= 0 || Number(v.quantity) + used.reduce((n, r) => n + Number(r.values.quantity), 0) > Number(source.values.passed))
                throw Error('Số lượng xuất vượt tồn kho đạt kiểm tra.');
            const packaging = rows.find(r => r.id === ('sourceId' in source ? source.sourceId : ''));
            if (!packaging || String(packaging.values.expiry) < String(v.date))
                throw Error('Thành phẩm hết hạn.');
            Object.assign(v, { packaging: packaging.values.packaging, unit: packaging.values.unit, net: packaging.values.net, total: Number(v.quantity) * Number(v.price), totalWeight: Number(v.quantity) * Number(packaging.values.net) });
        }
    }
    const record: OtherRecord = { id: old?.id || id, book, sourceId: source.id, ...(inputs ? { inputs } : {}), lotCode: old?.lotCode || (book==='preprocessing' ? source.lotCode : ('CB-' + book.toUpperCase() + '-' + id)), values: v, confirmed: submitted.confirmed, history: [...(old?.history || []), { actor, at: new Date().toISOString() }] };
    return { ...state, otherProcessing: [...rows.filter(r => r.id !== record.id), record] };
}
export function inventory(state: OtherState, packagingId: string) {
    const rows = state.otherProcessing || [], pack = rows.find(r => r.id === packagingId && r.book === 'packaging' && r.confirmed);
    if (!pack || FIELDS.packaging.some(([k, , t]) => t === 'check' && pack.values[k] === 'K'))
        return { stock: 0, available: 0 };
    const inspections = rows.filter(r => r.book === 'inspection' && r.sourceId === pack.id && r.confirmed);
    const sold = rows.filter(r => r.book === 'sales' && r.confirmed && inspections.some(i => i.id === r.sourceId)).reduce((n, r) => n + Number(r.values.quantity), 0);
    return { stock: Number(pack.values.quantity) - sold, available: inspections.reduce((n, r) => n + Number(r.values.passed), 0) - sold };
}
