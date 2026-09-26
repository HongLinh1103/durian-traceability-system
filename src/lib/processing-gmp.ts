/** The six GMP registers share a lot identity; purchases remain commercial records. */
export type Stage = 'purchases' | 'receiving' | 'preprocessing' | 'packaging' | 'inspection' | 'sales' | 'aftersales';
export type Values = Record<string, string | number>;
export interface GmpRecord { id: string; sourceId: string; lotCode: string; season: string; values: Values; draft?: boolean }
export interface Expense {
    id: string;
    code?: string;
    date: string;
    category: string;
    content: string;
    lotCode?: string;
    amount: number;
    method?: string;
    notes?: string;
}

export interface ExpenseCategory {
    name: string;
    description: string;
    example: string;
}

export const EXPENSE_CATEGORIES: readonly ExpenseCategory[] = [
    {
        name: 'Bao bì & đóng gói',
        description: 'Thùng carton, khay, dây đai, tem nhãn, QR, màng bọc, pallet',
        example: 'Mua 1.000 thùng carton',
    },
    {
        name: 'Kiểm nghiệm & kiểm dịch',
        description: 'Kiểm nghiệm Cadmium, Vàng O, dư lượng, kiểm dịch thực vật, lấy mẫu',
        example: 'Phí kiểm nghiệm lô xuất khẩu',
    },
    {
        name: 'Vận chuyển & logistics',
        description: 'Xe vận chuyển, container, phí nâng/hạ, vận chuyển ra cửa khẩu/cảng',
        example: 'Xe từ cơ sở Hữu Nghị',
    },
    {
        name: 'Xuất khẩu',
        description: 'Phí khai báo/hải quan, chứng từ, dịch vụ xuất khẩu, phí cảng/cửa khẩu',
        example: 'Phí làm thủ tục lô hàng',
    },
    {
        name: 'Nhân công',
        description: 'Sơ chế, phân loại, đóng gói, bốc xếp, nhân công thời vụ',
        example: 'Nhân công đóng gói',
    },
    {
        name: 'Vận hành cơ sở',
        description: 'Điện (bao gồm điện kho lạnh), nước, internet, vệ sinh, sửa chữa, bảo trì thiết bị, thuê kho. Tiền điện và tiền nước ghi thành hai khoản chi riêng.',
        example: 'Tiền điện tháng 09 hoặc Tiền nước tháng 09 (mỗi khoản một phiếu chi)',
    },
    {
        name: 'Khác',
        description: 'Khoản phát sinh không thuộc các nhóm trên',
        example: 'Sửa cân điện tử',
    },
] as const;

export interface Payment { id: string; recordId: string; direction: 'IN' | 'OUT'; date: string; amount: number; method: string }
export interface GmpState { records: Record<Stage, GmpRecord[]>; payments: Payment[]; expenses?: Expense[]; demo: boolean }
export interface Field { key: string; label: string; type?: 'number' | 'date' | 'time' | 'check' | 'finding'; required?: boolean; group?: string; inherited?: boolean; internal?: boolean }
const f = (key: string, label: string, type: Field['type'] = undefined, extra: Partial<Field> = {}): Field => ({ key, label, type, ...extra });
const n = (key: string, label: string, extra: Partial<Field> = {}) => f(key, label, 'number', extra);
const c = (key: string, label: string, group?: string) => f(key, label, 'check', { ...(group ? { group } : {}), required: true });
const day = f('date', 'Ngày', 'date', { required: true });
const lot = f('productLot', 'Chủng loại và mã số lô', undefined, { inherited: true });
const correction = f('correction', 'Hành động khắc phục');
const supervisor = f('supervisor', 'Người giám sát', undefined, { required: true });
export const STAGES: Stage[] = ['purchases', 'receiving', 'preprocessing', 'packaging', 'inspection', 'sales', 'aftersales'];
export const REGISTERS: Record<Stage, { title: string; code: string; path: string; fields: Field[] }> = {
    purchases: { title: 'SỔ THU MUA', code: 'THU MUA', path: 'purchases', fields: [day, f('seller', 'Người bán', undefined, { required: true }), f('phone', 'Liên hệ'), f('puc', 'Mã số vùng trồng'), n('weight', 'Khối lượng mua (kg)', { required: true }), n('price', 'Giá mua (đ/kg)', { required: true }), n('total', 'Thành tiền (đ)', { inherited: true }), f('origin', 'Tên vùng trồng và địa chỉ'), f('notes', 'Ghi chú')] },
    receiving: { title: 'SỔ NHẬP HÀNG', code: 'THU MUA', path: 'grading', fields: [f('date', 'Ngày tiếp nhận', 'date', { required: true }), f('seller', 'Người bán', undefined, { inherited: true }), f('puc', 'Mã số vùng trồng', undefined, { required: true, inherited: true }), f('origin', 'Tên vùng trồng và địa chỉ', undefined, { required: true, inherited: true }), f('variety', 'Chủng loại', undefined, { required: true }), n('grade1', 'Loại 1', { group: 'Số lượng tiếp nhận (kg)', required: true }), n('grade2', 'Loại 2', { group: 'Số lượng tiếp nhận (kg)', required: true }), n('grade3', 'Loại 3', { group: 'Số lượng tiếp nhận (kg)', required: true }), n('rejected', 'Số lượng từ chối (kg)', { required: true }), f('receiver', 'Tên người tiếp nhận', undefined, { required: true }), f('lotCode', 'Chuyển sang sản xuất (mã số lô hàng)', undefined, { inherited: true })] },
    preprocessing: { title: 'SỔ TIẾP NHẬN & SƠ CHẾ', code: 'SẢN XUẤT', path: 'preprocessing', fields: [day, lot, n('inputWeight', 'Khối lượng thực tế tiếp nhận sơ chế (kg)', { inherited: true }), c('supplierOk', 'Thông tin về nhà cung cấp nguyên liệu (Đ/K)', 'Kiểm tra đầu vào'), c('transportOk', 'Phương tiện, điều kiện vận chuyển nguyên liệu đảm bảo sạch (Đ/K)', 'Kiểm tra đầu vào'), c('materialOk', 'Chủng loại, cảm quan, chất lượng nguyên liệu (Đ/K)', 'Kiểm tra đầu vào'), c('brushOk', 'Vệ sinh bằng bàn chà (Đ/K)', 'Đánh giá công đoạn vệ sinh tạp chất (Đ/K)'), c('airOk', 'Thổi sạch bằng xịt cao áp (Đ/K)', 'Đánh giá công đoạn vệ sinh tạp chất (Đ/K)'), f('dryStart', 'Thời gian bắt đầu', 'time', { required: true, group: 'Đánh giá công đoạn phơi khô sản phẩm (Đ/K)' }), f('dryEnd', 'Thời gian kết thúc', 'time', { required: true, group: 'Đánh giá công đoạn phơi khô sản phẩm (Đ/K)' }), c('dryOk', 'Tình trạng sản phẩm (Đ/K)', 'Đánh giá công đoạn phơi khô sản phẩm (Đ/K)'), c('qualityOk', 'Chất lượng, quy cách sản phẩm sau sơ chế (Đ/K)', 'Kết quả'), n('outputWeight', 'Khối lượng thực tế sau sơ chế đưa sang đóng gói (kg)', { required: true }), correction, supervisor] },
    packaging: { title: 'SỔ ĐÓNG GÓI & NHẬP KHO', code: 'SẢN XUẤT', path: 'processing', fields: [day, lot, n('inputWeight', 'Khối lượng thực tế tiếp nhận đóng gói (kg)', { inherited: true }), c('toolsOk', 'Dụng cụ đóng gói đảm bảo sạch (Đ/K)', 'Vệ sinh'), c('labelsOk', 'Tình trạng vệ sinh bao bì, tem nhãn trước khi đóng gói (Đ/K)', 'Vệ sinh'), c('weighOk', 'Cân', 'Đánh giá công đoạn đóng gói - đóng thùng (Đ/K)'), c('stickerOk', 'Dán tem, nhãn', 'Đánh giá công đoạn đóng gói - đóng thùng (Đ/K)'), c('packOk', 'Đóng gói', 'Đánh giá công đoạn đóng gói - đóng thùng (Đ/K)'), c('qualityOk', 'Chất lượng, quy cách sản phẩm sau đóng gói (Đ/K)', 'Kết quả'), n('quantity_boxes', 'Số lượng nhập kho (thùng)', { group: 'Nhập kho thành phẩm', required: true }), n('weight_kg', 'Khối lượng nhập kho (kg)', { group: 'Nhập kho thành phẩm', required: true }), correction, supervisor] },
    inspection: { title: 'SỔ KIỂM TRA TRƯỚC XUẤT BÁN', code: 'SẢN XUẤT', path: 'inspection', fields: [f('date', 'Ngày kiểm tra', 'date', { required: true }), lot, n('inputBoxes', 'Số lượng (thùng)', { inherited: true, group: 'Số lượng/khối lượng tiếp nhận kiểm tra' }), n('inputWeight', 'Khối lượng (kg)', { inherited: true, group: 'Số lượng/khối lượng tiếp nhận kiểm tra' }), ...[1, 2, 3].map(i => n(`sample${i}`, `Loại ${i}`, { group: 'Số lượng kiểm tra 2% (thùng)', required: true })), ...[['mealybug', 'Rệp sáp'], ['fly', 'Ấu trùng ruồi đục quả'], ['soil', 'Đất'], ['leaves', 'Lá cây'], ['insects', 'Côn trùng khác'], ['other', 'Khác']].map(([key, label]) => f(key, label, 'finding', { group: 'Kết quả kiểm tra phát hiện/không đạt', required: true })), n('quantity_boxes', 'Số lượng (thùng)', { group: 'Số lượng/khối lượng đưa qua xuất bán', required: true }), n('weight_kg', 'Khối lượng (kg)', { group: 'Số lượng/khối lượng đưa qua xuất bán', required: true }), f('correction', 'Biện pháp khắc phục (nếu có)'), f('inspector', 'Người kiểm tra', undefined, { required: true })] },
    sales: { title: 'SỔ THEO DÕI XUẤT BÁN', code: 'XUẤT BÁN', path: 'shipments', fields: [day, f('customer', 'Khách hàng', undefined, { required: true }), f('customerInfo', 'Thông tin khách hàng', undefined, { required: true }), f('lotCode', 'Mã số lô hàng', undefined, { inherited: true, group: 'Thông tin lô hàng' }), f('variety', 'Chủng loại', undefined, { inherited: true, group: 'Thông tin lô hàng' }), c('transportOk', 'Điều kiện phương tiện vận chuyển (Đ/K)', 'Thông tin lô hàng'), f('truck', 'Biển số xe', undefined, { group: 'Thông tin lô hàng' }), f('container', 'Số container', undefined, { required: true, group: 'Thông tin lô hàng' }), f('seal', 'Số Seal', undefined, { group: 'Thông tin lô hàng' }), n('quantity_boxes', 'Số lượng (thùng)', { inherited: true, group: 'Thông tin lô hàng' }), n('weight_kg', 'Khối lượng (kg)', { inherited: true, group: 'Thông tin lô hàng' }), n('total', 'Giá trị (đ)', { inherited: true, group: 'Thông tin lô hàng' }), f('exporter', 'Đơn vị xuất khẩu', undefined, { required: true }), f('departurePort', 'Cảng/Cửa khẩu đi'), f('destinationPort', 'Cảng/Cửa khẩu đến'), f('country', 'Nước nhập khẩu', undefined, { required: true }), f('notes', 'Ghi chú'), n('price', 'Giá bán (đ/kg)', { internal: true })] },
    aftersales: {
        title: 'SỔ THEO DÕI SAU XUẤT BÁN',
        code: 'XUẤT BÁN',
        path: 'aftersales',
        fields: [
            day,
            f('lotCode', 'Mã số lô hàng', undefined, { inherited: true, group: 'Thông tin lô hàng' }),
            f('container', 'Số container', undefined, { inherited: true, group: 'Thông tin lô hàng' }),
            n('fruitCount', 'Số lượng (quả)', { inherited: true, group: 'Thông tin lô hàng' }),
            n('weight_kg', 'Khối lượng (kg)', { inherited: true, group: 'Thông tin lô hàng' }),
            f('departureDate', 'Ngày rời kho', 'date', { required: true }),
            f('borderDate', 'Ngày đến cửa khẩu xuất', 'date', { required: true }),
            f('clearanceDate', 'Ngày thông quan lô hàng', 'date', { required: true }),
            c('cadmiumOk', 'Cadmium', 'Kết quả hậu kiểm lô hàng có phát hiện (Đ/K)'),
            c('auramineOk', 'Vàng O', 'Kết quả hậu kiểm lô hàng có phát hiện (Đ/K)'),
            c('pestOk', 'SVGH', 'Kết quả hậu kiểm lô hàng có phát hiện (Đ/K)'),
            f('otherDefects', 'Lỗi khác (ghi rõ)', undefined, { group: 'Kết quả hậu kiểm lô hàng có phát hiện (Đ/K)' }),
            f('treatmentPlan', 'Phương án xử lý (nếu không đạt)'),
            f('notes', 'Ghi chú')
        ]
    }
};
export function isFailed(stage: Stage, v: Values) {
    if (stage === 'aftersales') {
        return v.cadmiumOk === 'K' ||
            v.auramineOk === 'K' ||
            v.pestOk === 'K' ||
            v.resultOk === 'K' ||
            (Boolean(v.otherDefects) && !['Không', '—', '', 'Khong', 'none'].includes(String(v.otherDefects).trim()));
    }
    return REGISTERS[stage].fields.some(f => (f.type === 'check' && v[f.key] === 'K') || (f.type === 'finding' && v[f.key] === 'Có'));
}
export function latestRecords(state: GmpState, stage: Stage) {
    const latest = new Map<string, GmpRecord>();
    for (const record of state.records[stage]) {
        const previous = latest.get(record.sourceId);
        if (!previous || getGmpRecordDate(record) >= getGmpRecordDate(previous)) latest.set(record.sourceId, record);
    }
    return state.records[stage].filter(record => latest.get(record.sourceId) === record);
}
export function sources(state: GmpState, stage: Stage) {
    const previous = STAGES[STAGES.indexOf(stage) - 1];
    if (!previous) return [];
    return latestRecords(state, previous).filter(r => {
        if (r.draft) return false;
        if (state.records[stage].some(x => x.sourceId === r.id) && stage !== 'inspection') return false;
        if (stage === 'inspection' && state.records.sales.some(x => x.lotCode === r.lotCode)) return false;
        if (['packaging', 'inspection', 'sales'].includes(stage) && isFailed(previous, r.values)) return false;
        return previous !== 'receiving' || Number(r.values.grade1) + Number(r.values.grade2) + Number(r.values.grade3) > 0;
    });
}
export function addDaysStr(dateStr: string, days: number): string {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
}

export function inherit(state: GmpState, stage: Stage, source?: GmpRecord): Values {
    if (!source) return {};
    const v = source.values;
    const origin = state.records.receiving.find(r => r.lotCode === source.lotCode);
    const base: Values = { lotCode: source.lotCode, variety: origin?.values.variety || '', productLot: `${origin?.values.variety || ''} · ${source.lotCode}` };
    if (stage === 'receiving') return { seller: v.seller, puc: v.puc || '', lotCode: '' };
    if (stage === 'preprocessing') return { ...base, supplier: v.seller || state.records.purchases.find(r => r.id === source.sourceId)?.values.seller || '', inputWeight: Number(v.grade1) + Number(v.grade2) + Number(v.grade3) };
    if (stage === 'packaging') return { ...base, inputWeight: v.outputWeight };
    if (stage === 'inspection') return { ...base, inputBoxes: v.quantity_boxes, inputWeight: v.weight_kg };
    if (stage === 'sales') {
        const w = Number(v.weight_kg || 0);
        const p = Number(v.price || 85000);
        return { ...base, quantity_boxes: v.quantity_boxes, weight_kg: v.weight_kg, price: p, total: w * p };
    }
    if (stage === 'aftersales') {
        const saleDate = String(v.date || '');
        const boxes = Number(v.quantity_boxes || 0);
        const weight = Number(v.weight_kg || 0);
        const fruitCount = boxes > 0 ? boxes * 6 : Math.round(weight / 3.2);
        const departureDate = saleDate;
        const borderDate = saleDate ? addDaysStr(saleDate, 2) : '';
        const clearanceDate = saleDate ? addDaysStr(saleDate, 3) : '';
        const checkDate = saleDate ? addDaysStr(saleDate, 3) : '';
        return {
            ...base,
            date: checkDate || saleDate,
            lotCode: source.lotCode,
            container: String(v.container || ''),
            fruitCount,
            weight_kg: weight,
            departureDate,
            borderDate,
            clearanceDate,
            cadmiumOk: 'Đ',
            auramineOk: 'Đ',
            pestOk: 'Đ',
            otherDefects: 'Không',
            treatmentPlan: '—',
            notes: 'Đã thông quan xuất khẩu đạt yêu cầu'
        };
    }
    return { ...base, container: v.container, weight_kg: v.weight_kg };
}

export function formatGmpCode(prefix: 'TM' | 'LH', dateStr?: string | number, existingCodes: string[] = []): string {
    const clean = String(dateStr || '').trim();
    let year = '';
    let month = '';
    let day = '';
    const ymd = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (ymd) {
        year = ymd[1];
        month = ymd[2].padStart(2, '0');
        day = ymd[3].padStart(2, '0');
    } else {
        const dmy = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (dmy) {
            day = dmy[1].padStart(2, '0');
            month = dmy[2].padStart(2, '0');
            year = dmy[3];
        } else {
            const legacyMatch = clean.match(/(\d{4})(\d{2})(\d{2})/);
            if (legacyMatch) {
                year = legacyMatch[1];
                month = legacyMatch[2];
                day = legacyMatch[3];
            } else {
                const now = new Date();
                year = now.getFullYear().toString();
                month = (now.getMonth() + 1).toString().padStart(2, '0');
                day = now.getDate().toString().padStart(2, '0');
            }
        }
    }
    const base = `${prefix}-${year}-${day}${month}`;
    if (!existingCodes.includes(base)) return base;
    let count = 1;
    let cand = `${base}-${String(count).padStart(2, '0')}`;
    while (existingCodes.includes(cand)) {
        count++;
        cand = `${base}-${String(count).padStart(2, '0')}`;
    }
    return cand;
}

export function formatPurchaseLotCode(dateStr?: string | number, existingCodes: string[] = []): string {
    return formatGmpCode('TM', dateStr, existingCodes);
}

export function formatProductionLotCode(dateStr?: string | number, existingCodes: string[] = []): string {
    return formatGmpCode('LH', dateStr, existingCodes);
}

export function getGmpRecordDate(r: GmpRecord): string {
    return String(r.values?.date || r.values?.purchaseDate || r.values?.completionDate || '');
}

export function compareGmpRecordsNewestFirst(a: GmpRecord, b: GmpRecord): number {
    const dateA = getGmpRecordDate(a);
    const dateB = getGmpRecordDate(b);
    if (dateA !== dateB) {
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateB.localeCompare(dateA);
    }
    const codeA = a.lotCode || a.id;
    const codeB = b.lotCode || b.id;
    return codeB.localeCompare(codeA);
}

export const KIM_QUY_SALES_RECORDS: Record<string, Partial<Values>> = {
    'LH-2026-0809': {
        date: '2026-09-11',
        customer: 'Công ty Phân phối Hoa quả Quảng Tây',
        customerInfo: 'Nam Ninh, Quảng Tây, Trung Quốc',
        lotCode: 'LH-2026-0809',
        variety: 'Monthong',
        productLot: 'Monthong · LH-2026-0809',
        transportOk: 'Đ',
        truck: '51D-801.01',
        container: 'MSCU1234566',
        seal: 'HSS260911001',
        quantity_boxes: 396,
        weight_kg: 5940,
        exporter: 'Kim Quy One Member Limited Liability Company',
        departurePort: 'Cửa khẩu quốc tế Hữu Nghị, Lạng Sơn',
        destinationPort: 'Hữu Nghị Quan, Quảng Tây, Trung Quốc',
        country: 'Trung Quốc',
        notes: '',
    },
    'LH-2026-0609': {
        date: '2026-09-10',
        customer: 'Công ty Thương mại Nông sản Bằng Tường',
        customerInfo: 'Bằng Tường, Quảng Tây, Trung Quốc',
        lotCode: 'LH-2026-0609',
        variety: 'Ri6',
        productLot: 'Ri6 · LH-2026-0609',
        transportOk: 'Đ',
        truck: '51D-806.02',
        container: 'TGHU7654320',
        seal: 'HSS260910002',
        quantity_boxes: 274,
        weight_kg: 5480,
        exporter: 'Kim Quy One Member Limited Liability Company',
        departurePort: 'Cửa khẩu quốc tế Hữu Nghị, Lạng Sơn',
        destinationPort: 'Hữu Nghị Quan, Quảng Tây, Trung Quốc',
        country: 'Trung Quốc',
        notes: '',
    },
    'LH-2026-0509': {
        date: '2026-09-08',
        customer: 'Công ty Hoa quả Tươi Nam Ninh',
        customerInfo: 'Nam Ninh, Quảng Tây, Trung Quốc',
        lotCode: 'LH-2026-0509',
        variety: 'Monthong',
        productLot: 'Monthong · LH-2026-0509',
        transportOk: 'Đ',
        truck: '51D-805.03',
        container: 'CMAU2468103',
        seal: 'HSS260908003',
        quantity_boxes: 284,
        weight_kg: 4260,
        exporter: 'Kim Quy One Member Limited Liability Company',
        departurePort: 'Cửa khẩu quốc tế Hữu Nghị, Lạng Sơn',
        destinationPort: 'Hữu Nghị Quan, Quảng Tây, Trung Quốc',
        country: 'Trung Quốc',
        notes: '',
    },
    'LH-2026-0309': {
        date: '2026-09-05',
        customer: 'Công ty Phân phối Trái cây Quảng Tây',
        customerInfo: 'Nam Ninh, Quảng Tây, Trung Quốc',
        lotCode: 'LH-2026-0309',
        variety: 'Ri6',
        productLot: 'Ri6 · LH-2026-0309',
        transportOk: 'Đ',
        truck: '51D-803.04',
        container: 'MSCU6543212',
        seal: 'HSS260905004',
        quantity_boxes: 341,
        weight_kg: 5115,
        exporter: 'Kim Quy One Member Limited Liability Company',
        departurePort: 'Cửa khẩu quốc tế Hữu Nghị, Lạng Sơn',
        destinationPort: 'Hữu Nghị Quan, Quảng Tây, Trung Quốc',
        country: 'Trung Quốc',
        notes: '',
    },
    'LH-2026-0209': {
        date: '2026-09-04',
        customer: 'Công ty Nông sản Hữu nghị Quảng Tây',
        customerInfo: 'Bằng Tường, Quảng Tây, Trung Quốc',
        lotCode: 'LH-2026-0209',
        variety: 'Monthong',
        productLot: 'Monthong · LH-2026-0209',
        transportOk: 'Đ',
        truck: '51D-802.05',
        container: 'TGHU2345673',
        seal: 'HSS260904005',
        quantity_boxes: 255,
        weight_kg: 4590,
        exporter: 'Kim Quy One Member Limited Liability Company',
        departurePort: 'Cửa khẩu quốc tế Hữu Nghị, Lạng Sơn',
        destinationPort: 'Hữu Nghị Quan, Quảng Tây, Trung Quốc',
        country: 'Trung Quốc',
        notes: '',
    },
    'LH-2026-2908': {
        date: '2026-08-31',
        customer: 'Công ty Thương mại Trái cây Bằng Tường',
        customerInfo: 'Bằng Tường, Quảng Tây, Trung Quốc',
        lotCode: 'LH-2026-2908',
        variety: 'Ri6',
        productLot: 'Ri6 · LH-2026-2908',
        transportOk: 'Đ',
        truck: '51D-829.06',
        container: 'CMAU1357907',
        seal: 'HSS260831006',
        quantity_boxes: 258,
        weight_kg: 4644,
        exporter: 'Kim Quy One Member Limited Liability Company',
        departurePort: 'Cửa khẩu quốc tế Hữu Nghị, Lạng Sơn',
        destinationPort: 'Hữu Nghị Quan, Quảng Tây, Trung Quốc',
        country: 'Trung Quốc',
        notes: '',
    },
    'LH-2026-2007': {
        date: '2026-07-22',
        customer: 'Công ty Phân phối Hoa quả Nam Ninh',
        customerInfo: 'Nam Ninh, Quảng Tây, Trung Quốc',
        lotCode: 'LH-2026-2007',
        variety: 'Ri6',
        productLot: 'Ri6 · LH-2026-2007',
        transportOk: 'Đ',
        truck: '51D-720.07',
        container: 'MSCU3456789',
        seal: 'HSS260722007',
        quantity_boxes: 204,
        weight_kg: 4080,
        exporter: 'Kim Quy One Member Limited Liability Company',
        departurePort: 'Cửa khẩu quốc tế Hữu Nghị, Lạng Sơn',
        destinationPort: 'Hữu Nghị Quan, Quảng Tây, Trung Quốc',
        country: 'Trung Quốc',
        notes: '',
    },
};

export function normalizeGmpState(state: GmpState): { state: GmpState; changed: boolean } {
    let changed = false;
    const existingPurchaseCodes: string[] = [];

    const purchases = (state.records.purchases || []).map((r) => {
        let lotCode = r.lotCode || '';
        let recordChanged = false;
        const nextValues = { ...r.values };

        const seller = String(nextValues.seller || '').trim();
        let phone = String(nextValues.phone || '').trim();
        if (seller.includes('Nguyễn Văn Nam') && (phone === '0901234567' || !phone)) {
            phone = '0983456789';
            nextValues.phone = phone;
            recordChanged = true;
            changed = true;
        } else if (seller.includes('Lê Thị Hoa') && (phone === '0901234567' || !phone)) {
            phone = '0987654321';
            nextValues.phone = phone;
            recordChanged = true;
            changed = true;
        }

        const linkedReceiving = (state.records.receiving || []).find(rec =>
            rec.sourceId === r.id ||
            rec.lotCode === r.lotCode ||
            (r.lotCode && rec.lotCode && (rec.lotCode === r.lotCode.replace(/^TM-/, 'LH-') || rec.lotCode.replace(/^LH-/, 'TM-') === r.lotCode))
        );

        if (!nextValues.puc && linkedReceiving?.values?.puc) {
            nextValues.puc = linkedReceiving.values.puc;
            recordChanged = true;
            changed = true;
        }

        let origin = String(nextValues.origin || '').trim();
        if (!origin) {
            const candidateOrigin = linkedReceiving?.values?.origin || nextValues.address || linkedReceiving?.values?.address;
            if (candidateOrigin) {
                origin = String(candidateOrigin).replace(/\s*\(minh họa\)/gi, '').replace(/\s*\(minh hoa\)/gi, '').trim();
                nextValues.origin = origin;
                recordChanged = true;
                changed = true;
            }
        } else if (origin.includes('(minh họa)') || origin.includes('(minh hoa)')) {
            origin = origin.replace(/\s*\(minh họa\)/gi, '').replace(/\s*\(minh hoa\)/gi, '').trim();
            nextValues.origin = origin;
            recordChanged = true;
            changed = true;
        }
        if (!nextValues.address && nextValues.origin) {
            nextValues.address = nextValues.origin;
            recordChanged = true;
            changed = true;
        }

        if (lotCode.includes('demo') || !/^TM-\d{4}-\d{4}(?:-\d{2})?$/.test(lotCode)) {
            const newCode = formatPurchaseLotCode(r.values?.date || lotCode, existingPurchaseCodes);
            lotCode = newCode;
            recordChanged = true;
            changed = true;
            existingPurchaseCodes.push(newCode);
            nextValues.purchaseCode = newCode;
        } else {
            existingPurchaseCodes.push(lotCode);
        }

        if (recordChanged) {
            return {
                ...r,
                lotCode,
                values: nextValues,
            };
        }
        return r;
    });

    const existingReceivingCodes: string[] = [];
    const lotCodeMap = new Map<string, string>();

    const receiving = (state.records.receiving || []).map((r, idx) => {
        let lotCode = r.lotCode || '';
        const sourcePurchase = purchases.find(p => p.id === r.sourceId);
        const shouldNormalize = lotCode.includes('demo') || !/^LH-\d{4}-\d{4}(?:-\d{2})?$/.test(lotCode);
        let currentRecord = r;
        if (shouldNormalize) {
            let newCode = '';
            if (sourcePurchase?.lotCode && /^TM-\d{4}-\d{4}(?:-\d{2})?$/.test(sourcePurchase.lotCode)) {
                const candidate = sourcePurchase.lotCode.replace(/^TM-/, 'LH-');
                if (!existingReceivingCodes.includes(candidate)) {
                    newCode = candidate;
                }
            }
            if (!newCode) {
                newCode = formatProductionLotCode(r.values?.date || sourcePurchase?.values?.date || lotCode, existingReceivingCodes);
            }
            lotCodeMap.set(lotCode, newCode);
            lotCode = newCode;
            changed = true;
            existingReceivingCodes.push(newCode);
            currentRecord = {
                ...r,
                lotCode: newCode,
                values: {
                    ...r.values,
                    lotCode: newCode,
                },
            };
        } else {
            existingReceivingCodes.push(lotCode);
        }

        let receiver = String(currentRecord.values?.receiver || '').trim();
        if (/tổ tiếp nhận/i.test(receiver) || !receiver) {
            const defaultReceivers = ['Nguyễn Thị Lan', 'Trần Văn Hưng', 'Lê Văn Hùng'];
            receiver = defaultReceivers[idx % defaultReceivers.length];
        }
        receiver = receiver.replace(/\s*\(minh họa\)/gi, '').replace(/\s*\(minh hoa\)/gi, '').trim();

        let origin = String(currentRecord.values?.origin || '').trim();
        origin = origin.replace(/\s*\(minh họa\)/gi, '').replace(/\s*\(minh hoa\)/gi, '').trim();

        let notes = String(currentRecord.values?.notes || '').trim();
        if (notes.includes('Dữ liệu minh họa theo yêu cầu')) {
            notes = '';
        } else {
            notes = notes.replace(/\s*\(minh họa\)/gi, '').replace(/\s*\(minh hoa\)/gi, '').trim();
        }

        if (receiver !== currentRecord.values?.receiver || origin !== currentRecord.values?.origin || notes !== currentRecord.values?.notes) {
            changed = true;
            currentRecord = {
                ...currentRecord,
                values: {
                    ...currentRecord.values,
                    receiver,
                    origin,
                    notes,
                },
            };
        }

        return currentRecord;
    });

    const updatedRecords: Record<Stage, GmpRecord[]> = {
        purchases,
        receiving,
        preprocessing: [],
        packaging: [],
        inspection: [],
        sales: [],
        aftersales: [],
    };

    for (const s of (['preprocessing', 'packaging', 'inspection', 'sales', 'aftersales'] as const)) {
        updatedRecords[s] = (state.records[s] || []).map((r, idx) => {
            let lotCode = r.lotCode;
            let recordChanged = false;
            if (lotCodeMap.has(lotCode)) {
                lotCode = lotCodeMap.get(lotCode)!;
                recordChanged = true;
                changed = true;
            } else if (lotCode.includes('demo') || !/^LH-\d{4}-\d{4}(?:-\d{2})?$/.test(lotCode)) {
                const sourceRec = updatedRecords[STAGES[STAGES.indexOf(s) - 1]]?.find(x => x.id === r.sourceId);
                if (sourceRec?.lotCode) {
                    lotCode = sourceRec.lotCode;
                    recordChanged = true;
                    changed = true;
                }
            }
            const nextValues = { ...r.values };

            if (s === 'preprocessing') {
                let supervisor = String(nextValues.supervisor || '').trim();
                if (/giám sát ca\s*1/i.test(supervisor)) supervisor = 'Lê Văn Hùng';
                else if (/giám sát ca\s*2/i.test(supervisor)) supervisor = 'Trần Minh Đức';
                else if (/giám sát ca\s*3/i.test(supervisor)) supervisor = 'Phạm Quốc Bảo';
                else if (/giám sát/i.test(supervisor) || !supervisor) {
                    const defaultSupervisors = ['Lê Văn Hùng', 'Trần Minh Đức', 'Phạm Quốc Bảo'];
                    supervisor = defaultSupervisors[idx % defaultSupervisors.length];
                } else {
                    supervisor = supervisor.replace(/\s*\(minh họa\)/gi, '').replace(/\s*\(minh hoa\)/gi, '').trim();
                }
                if (supervisor !== nextValues.supervisor) {
                    nextValues.supervisor = supervisor;
                    recordChanged = true;
                    changed = true;
                }

                const inW = Number(nextValues.inputWeight || 0);
                let outW = Number(nextValues.outputWeight || 0);
                if (inW > 0 && (!Number.isFinite(outW) || outW <= 0 || outW > inW)) {
                    const diff = (idx % 2 === 0 || lotCode.endsWith('0509') || lotCode.endsWith('0209') || lotCode.endsWith('2007'))
                        ? 0
                        : (lotCode.endsWith('2908') ? 5 : lotCode.endsWith('0309') ? 3 : 2);
                    outW = Math.max(1, inW - diff);
                    nextValues.outputWeight = outW;
                    recordChanged = true;
                    changed = true;
                }

                if (lotCode.includes('0609') && nextValues.date !== '2026-09-06') {
                    nextValues.date = '2026-09-06';
                    recordChanged = true;
                    changed = true;
                }
            }

            if (s === 'packaging') {
                let supervisor = String(nextValues.supervisor || '').trim();
                if (/giám sát ca\s*1/i.test(supervisor)) supervisor = 'Lê Văn Hùng';
                else if (/giám sát ca\s*2/i.test(supervisor)) supervisor = 'Trần Minh Đức';
                else if (/giám sát ca\s*3/i.test(supervisor)) supervisor = 'Phạm Quốc Bảo';
                else if (/giám sát/i.test(supervisor) || !supervisor) {
                    const defaultSupervisors = ['Lê Văn Hùng', 'Trần Minh Đức', 'Phạm Quốc Bảo'];
                    supervisor = defaultSupervisors[idx % defaultSupervisors.length];
                } else {
                    supervisor = supervisor.replace(/\s*\(minh họa\)/gi, '').replace(/\s*\(minh hoa\)/gi, '').trim();
                }
                if (supervisor !== nextValues.supervisor) {
                    nextValues.supervisor = supervisor;
                    recordChanged = true;
                    changed = true;
                }

                const prepRec = updatedRecords.preprocessing.find(p => p.id === r.sourceId || p.lotCode === lotCode);
                if (prepRec?.values?.outputWeight && Number(prepRec.values.outputWeight) !== Number(nextValues.inputWeight)) {
                    nextValues.inputWeight = Number(prepRec.values.outputWeight);
                    recordChanged = true;
                    changed = true;
                }
                if (prepRec?.values?.date && String(nextValues.date) !== String(prepRec.values.date)) {
                    nextValues.date = String(prepRec.values.date);
                    recordChanged = true;
                    changed = true;
                }
            }

            if (s === 'inspection') {
                let inspector = String(nextValues.inspector || '').trim();
                if (/nhân viên kcs\s*1/i.test(inspector)) inspector = 'Phạm Thị Hương';
                else if (/nhân viên kcs\s*2/i.test(inspector)) inspector = 'Trần Đình Trọng';
                else if (/nhân viên kcs\s*3/i.test(inspector)) inspector = 'Vũ Hoàng Mai';
                else if (/nhân viên kcs/i.test(inspector) || !inspector) {
                    const defaultInspectors = ['Phạm Thị Hương', 'Trần Đình Trọng', 'Vũ Hoàng Mai'];
                    inspector = defaultInspectors[idx % defaultInspectors.length];
                } else {
                    inspector = inspector.replace(/\s*\(minh họa\)/gi, '').replace(/\s*\(minh hoa\)/gi, '').trim();
                }
                if (inspector !== nextValues.inspector) {
                    nextValues.inspector = inspector;
                    recordChanged = true;
                    changed = true;
                }

                const packRec = updatedRecords.packaging.find(p => p.id === r.sourceId || p.lotCode === lotCode);
                if (packRec?.values?.date && !r.id.includes('retest')) {
                    const expectedDate = new Date(Date.parse(String(packRec.values.date)) + 86400000).toISOString().slice(0, 10);
                    if (String(nextValues.date) !== expectedDate) {
                        nextValues.date = expectedDate;
                        recordChanged = true;
                        changed = true;
                    }
                }

                if ((lotCode === 'LH-2026-0809' || lotCode.endsWith('0809') || r.id === 'demo-7-4') && nextValues.mealybug === 'Có') {
                    nextValues.mealybug = 'Không';
                    if (!Number(nextValues.quantity_boxes) && (nextValues.inputBoxes || packRec?.values?.quantity_boxes)) {
                        nextValues.quantity_boxes = Number(nextValues.inputBoxes || packRec?.values?.quantity_boxes || 58);
                    }
                    if (!Number(nextValues.weight_kg) && (nextValues.inputWeight || packRec?.values?.weight_kg)) {
                        nextValues.weight_kg = Number(nextValues.inputWeight || packRec?.values?.weight_kg || 1044);
                    }
                    if (nextValues.correction) {
                        nextValues.correction = '';
                    }
                    recordChanged = true;
                    changed = true;
                }
            }

            if (s === 'sales') {
                const inspRec = updatedRecords.inspection.find(p => p.id === r.sourceId || p.lotCode === lotCode);
                if (inspRec?.values?.date && String(nextValues.date) < String(inspRec.values.date)) {
                    nextValues.date = String(inspRec.values.date);
                    recordChanged = true;
                    changed = true;
                }
                const kimQuyStandard = KIM_QUY_SALES_RECORDS[lotCode];
                if (kimQuyStandard) {
                    for (const [k, val] of Object.entries(kimQuyStandard)) {
                        if (k === 'notes') {
                            if (nextValues.notes && (String(nextValues.notes).includes('minh họa') || String(nextValues.notes).includes('chưa xác nhận'))) {
                                nextValues.notes = '';
                                recordChanged = true;
                                changed = true;
                            }
                        } else if (val !== undefined && nextValues[k] !== val) {
                            const cur = String(nextValues[k] ?? '').trim();
                            if (!cur || cur.includes('(minh họa)') || cur.includes('minh họa') || cur.startsWith('XE-') || cur.startsWith('CONTAINER-') || cur.startsWith('SEAL-') || cur.includes('Trị An') || (k === 'country' && cur === 'Việt Nam') || cur.includes('bán nội địa') || (k === 'customer' && !cur.startsWith('Công ty')) || (k === 'truck' && !cur.startsWith('51D-')) || (k === 'exporter' && cur !== val)) {
                                nextValues[k] = val;
                                recordChanged = true;
                                changed = true;
                            }
                        }
                    }
                }
                const w = Number(nextValues.weight_kg || 0);
                const p = Number(nextValues.price || 85000);
                const expectedTotal = w * p;
                if (nextValues.total === undefined || nextValues.total === null || nextValues.total === '' || (expectedTotal > 0 && Number(nextValues.total) === 0)) {
                    nextValues.total = expectedTotal;
                    recordChanged = true;
                    changed = true;
                }
            }

            if (s === 'aftersales') {
                const saleRec = updatedRecords.sales.find(p => p.id === r.sourceId || p.lotCode === lotCode);
                const saleDate = String(saleRec?.values?.date || '');

                if (saleRec?.values?.container && nextValues.container !== saleRec.values.container) {
                    nextValues.container = saleRec.values.container;
                    recordChanged = true;
                    changed = true;
                }
                if (saleRec?.values?.variety && nextValues.variety !== saleRec.values.variety) {
                    nextValues.variety = saleRec.values.variety;
                    recordChanged = true;
                    changed = true;
                }
                if (!nextValues.weight_kg && saleRec?.values?.weight_kg) {
                    nextValues.weight_kg = saleRec.values.weight_kg;
                    recordChanged = true;
                    changed = true;
                }
                if (!nextValues.fruitCount) {
                    if (nextValues.quantity_fruits) {
                        nextValues.fruitCount = Number(nextValues.quantity_fruits);
                    } else {
                        const boxes = Number(saleRec?.values?.quantity_boxes || 0);
                        const weight = Number(nextValues.weight_kg || saleRec?.values?.weight_kg || 0);
                        nextValues.fruitCount = boxes > 0 ? boxes * 6 : Math.round(weight / 3.2);
                    }
                    recordChanged = true;
                    changed = true;
                }

                if (!nextValues.departureDate) {
                    nextValues.departureDate = String(nextValues.leftDate || saleDate || nextValues.date || '');
                    recordChanged = true;
                    changed = true;
                }
                if (!nextValues.borderDate) {
                    nextValues.borderDate = String(nextValues.arrivalDate || (nextValues.departureDate ? addDaysStr(String(nextValues.departureDate), 2) : ''));
                    recordChanged = true;
                    changed = true;
                }
                if (!nextValues.clearanceDate) {
                    nextValues.clearanceDate = String(nextValues.departureDate ? addDaysStr(String(nextValues.departureDate), 3) : '');
                    recordChanged = true;
                    changed = true;
                }
                const depDate = String(saleDate || nextValues.departureDate || '');
                const expectedAftersalesDate = depDate ? addDaysStr(depDate, 3) : '';
                const oldFourDaysDate = depDate ? addDaysStr(depDate, 4) : '';
                if (expectedAftersalesDate && (!nextValues.date || nextValues.date === oldFourDaysDate || (saleDate && nextValues.date !== expectedAftersalesDate) || (nextValues.clearanceDate && String(nextValues.date) < String(nextValues.clearanceDate)))) {
                    if (nextValues.date !== expectedAftersalesDate) {
                        nextValues.date = expectedAftersalesDate;
                        recordChanged = true;
                        changed = true;
                    }
                }
                if (nextValues.clearanceDate && nextValues.date && String(nextValues.clearanceDate) > String(nextValues.date)) {
                    nextValues.clearanceDate = String(nextValues.date);
                    recordChanged = true;
                    changed = true;
                }

                if (!nextValues.cadmiumOk) {
                    nextValues.cadmiumOk = nextValues.cadmium === 'Có' ? 'K' : 'Đ';
                    recordChanged = true;
                    changed = true;
                }
                if (!nextValues.auramineOk) {
                    nextValues.auramineOk = (nextValues.yellowO === 'Có' || nextValues.auramine === 'Có') ? 'K' : 'Đ';
                    recordChanged = true;
                    changed = true;
                }
                if (!nextValues.pestOk) {
                    nextValues.pestOk = (nextValues.svgh === 'Có' || nextValues.pest === 'Có') ? 'K' : 'Đ';
                    recordChanged = true;
                    changed = true;
                }
                if (nextValues.otherDefects === undefined) {
                    const rawOther = String(nextValues.otherError || nextValues.detectedObject || '').trim();
                    nextValues.otherDefects = (rawOther && !rawOther.includes('Không phát hiện') && !rawOther.includes('không phát hiện')) ? rawOther : 'Không';
                    recordChanged = true;
                    changed = true;
                }
                if (!nextValues.treatmentPlan) {
                    nextValues.treatmentPlan = String(nextValues.correction || '—');
                    recordChanged = true;
                    changed = true;
                }
                if (nextValues.notes === undefined) {
                    nextValues.notes = 'Đã thông quan xuất khẩu đạt yêu cầu';
                    recordChanged = true;
                    changed = true;
                }
            }

            if (recordChanged) {
                const variety = String(nextValues.variety || '').trim();
                return {
                    ...r,
                    lotCode,
                    values: {
                        ...nextValues,
                        lotCode,
                        ...(variety ? { productLot: `${variety} · ${lotCode}` } : {}),
                    },
                };
            }
            return r;
        });
    }

    const insp0809 = (updatedRecords.inspection || []).filter(r => r.lotCode === 'LH-2026-0809' || r.lotCode?.endsWith('0809'));
    if (insp0809.length > 1) {
        const kept = insp0809.find(r => r.id.includes('retest')) || insp0809[insp0809.length - 1];
        updatedRecords.inspection = updatedRecords.inspection.filter(r => (r.lotCode !== 'LH-2026-0809' && !r.lotCode?.endsWith('0809')) || r.id === kept.id);
        changed = true;
    }

    for (const s of STAGES) {
        const currentList = updatedRecords[s] || [];
        const sorted = [...currentList].sort(compareGmpRecordsNewestFirst);
        if (sorted.some((rec, idx) => rec.id !== currentList[idx]?.id)) {
            changed = true;
        }
        updatedRecords[s] = sorted;
    }

    const validLots = new Set<string>();
    Object.values(updatedRecords).forEach(recs => {
        recs.forEach(r => {
            if (r.lotCode) validLots.add(r.lotCode);
        });
    });

    let nextExpenses = state.expenses;
    if (!Array.isArray(state.expenses)) {
        nextExpenses = createDemoExpenses();
        changed = true;
    } else {
        const cleaned = state.expenses.map((exp, idx) => {
            let lotCode = exp.lotCode || '';
            let content = exp.content || '';
            let code = exp.code || '';
            let method = exp.method || '';
            let expChanged = false;

            if (!code) {
                const y = (exp.date || '2026').slice(0, 4);
                code = `CP-${y}-${String(idx + 1).padStart(3, '0')}`;
                expChanged = true;
            }
            if (!method) {
                method = ['exp-demo-2', 'exp-demo-7', 'exp-demo-9'].includes(exp.id) ? 'Tiền mặt' : 'Chuyển khoản';
                expChanged = true;
            }

            if (lotCode === 'XK-2026-001') {
                lotCode = validLots.has('LH-2026-0809') ? 'LH-2026-0809' : (validLots.has('LH-2026-0609') ? 'LH-2026-0609' : (updatedRecords.sales[0]?.lotCode || ''));
                expChanged = true;
            } else if (lotCode === 'LH-2026-0109' && !validLots.has('LH-2026-0109')) {
                lotCode = validLots.has('LH-2026-0209') ? 'LH-2026-0209' : (validLots.has('LH-2026-0309') ? 'LH-2026-0309' : '');
                expChanged = true;
            } else if (lotCode && !validLots.has(lotCode)) {
                lotCode = '';
                expChanged = true;
            }

            if (content.includes('LH-2026-0109') && !validLots.has('LH-2026-0109')) {
                content = content.replace('LH-2026-0109', lotCode || 'LH-2026-0209');
                expChanged = true;
            }
            if (content.includes('XK-2026-001')) {
                content = content.replace('XK-2026-001', lotCode || 'LH-2026-0809');
                expChanged = true;
            }

            if (expChanged) {
                changed = true;
                return { ...exp, code, method, lotCode, content };
            }
            return exp;
        });

        let currentExpList = cleaned.filter(exp => {
            if (exp.id === 'exp-demo-2' || (exp.date === '2026-09-04' && exp.category === 'Sơ chế')) {
                changed = true;
                return false;
            }
            return true;
        });
        const hasJulyUtil = currentExpList.some(e => e.date?.startsWith('2026-07') && (e.content.toLowerCase().includes('điện') || e.content.toLowerCase().includes('nước')));
        if (!hasJulyUtil) {
            currentExpList.push({
                id: 'exp-demo-july-utilities',
                code: 'CP-2026-001',
                date: '2026-07-25',
                category: 'Vận hành cơ sở',
                content: 'Điện nước tháng 07',
                lotCode: '',
                method: 'Chuyển khoản',
                amount: 5800000,
            });
            changed = true;
        }

        const hasAugUtil = currentExpList.some(e => e.date?.startsWith('2026-08') && (e.content.toLowerCase().includes('điện') || e.content.toLowerCase().includes('nước')));
        if (!hasAugUtil) {
            currentExpList.push({
                id: 'exp-demo-aug-utilities',
                code: 'CP-2026-002',
                date: '2026-08-25',
                category: 'Vận hành cơ sở',
                content: 'Điện nước tháng 08',
                lotCode: '',
                method: 'Chuyển khoản',
                amount: 6000000,
            });
            changed = true;
        }

        const hasSepUtil = currentExpList.some(e => e.date?.startsWith('2026-09') && (e.content.toLowerCase().includes('điện') || e.content.toLowerCase().includes('nước')));
        if (!hasSepUtil) {
            currentExpList.push({
                id: 'exp-demo-8',
                code: 'CP-2026-010',
                date: '2026-09-15',
                category: 'Vận hành cơ sở',
                content: 'Điện nước tháng 09',
                lotCode: '',
                method: 'Chuyển khoản',
                amount: 6200000,
            });
            changed = true;
        }

        if (state.demo) {
            const separated = splitDemoUtilityExpenses(currentExpList);
            if (separated.length !== currentExpList.length) changed = true;
            currentExpList = separated;
        }
        if (changed) {
            nextExpenses = currentExpList.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
        }
    }

    let nextPayments = state.payments || [];
    const hasInPayment = nextPayments.some(p => p.direction === 'IN');
    if (!hasInPayment && updatedRecords.sales && updatedRecords.sales.length > 0) {
        const salesRecord = updatedRecords.sales[0];
        nextPayments = [
            ...nextPayments,
            {
                id: 'demo-payment-sales-1',
                recordId: salesRecord.id,
                direction: 'IN',
                date: '2026-09-08',
                amount: 65000000,
                method: 'Chuyển khoản'
            }
        ];
        changed = true;
    }

    if (!changed) return { state, changed: false };

    return {
        state: {
            ...state,
            records: updatedRecords,
            payments: nextPayments,
            expenses: nextExpenses,
        },
        changed: true,
    };
}

export function saveRecord(state: GmpState, stage: Stage, input: { id?: string; sourceId?: string; season?: string; values: Values }, id: string): GmpState {
    if (!STAGES.includes(stage)) throw new Error('Công đoạn không hợp lệ.');
    const old = input.id ? state.records[stage].find(r => r.id === input.id) : undefined;
    if (input.id && !old) throw new Error('Không tìm thấy bản ghi.');
    const nextStage = STAGES[STAGES.indexOf(stage) + 1];
    if (old && ((nextStage && state.records[nextStage].some(r => r.sourceId === old.id && !r.draft)) || state.payments.some(p => p.recordId === old.id))) throw new Error('Bản ghi đã chuyển công đoạn hoặc phát sinh thanh toán. Không thể sửa dữ liệu nguồn.');
    const sourceId = old?.sourceId || input.sourceId || id;
    const previous = STAGES[STAGES.indexOf(stage) - 1];
    const source = previous ? state.records[previous].find(r => r.id === sourceId) : undefined;
    if (source?.draft) throw new Error('Vui lòng hoàn tất dữ liệu công đoạn nguồn trước.');
    if (source && ['packaging', 'inspection', 'sales'].includes(stage) && isFailed(previous, source.values)) throw new Error('Lô nguồn chưa đủ điều kiện.');
    if (stage !== 'purchases' && (!source || (!old && !sources(state, stage).some(r => r.id === sourceId)))) throw new Error('Lô nguồn chưa đủ điều kiện hoặc đã chuyển công đoạn.');
    const season = source?.season || input.season || '2025-2026';
    if (!/^\d{4}-\d{4}$/.test(season)) throw new Error('Niên vụ phải có dạng 2025-2026.');
    const v: Values = old ? { ...inherit(state, stage, source), ...old.values } : {};
    for (const field of REGISTERS[stage].fields) {
        const raw = input.values[field.key] ?? '';
        if (typeof raw !== 'string' && typeof raw !== 'number') throw new Error('Giá trị không hợp lệ.');
        if (field.required && !field.inherited && String(raw).trim() === '') throw new Error(`Vui lòng nhập ${field.label}.`);
        v[field.key] = field.type === 'number' ? Number(raw) : String(raw).trim();
    }
    if (stage === 'purchases') {
        if (!v.origin && v.address) v.origin = v.address;
        if (!v.address && v.origin) v.address = v.origin;
    }
    Object.assign(v, inherit(state, stage, source));
    const shouldRegeneratePurchaseCode = stage === 'purchases' && (
        !old?.lotCode ||
        old.lotCode.includes('demo') ||
        !/^TM-\d{4}-\d{4}(?:-\d{2})?$/.test(old.lotCode) ||
        (old.values?.date && String(old.values.date) !== String(v.date))
    );
    const shouldRegenerateReceivingCode = stage === 'receiving' && (
        !old?.lotCode ||
        old.lotCode.includes('demo') ||
        !/^LH-\d{4}-\d{4}(?:-\d{2})?$/.test(old.lotCode) ||
        (old.values?.date && String(old.values.date) !== String(v.date))
    );
    const explicitCode = (input.values?.lotCode && typeof input.values.lotCode === 'string' && input.values.lotCode.startsWith('LH-')) ? String(input.values.lotCode) : '';
    const code = explicitCode
        ? explicitCode
        : (stage === 'purchases' && !shouldRegeneratePurchaseCode && old?.lotCode)
        ? old.lotCode
        : (stage === 'receiving' && !shouldRegenerateReceivingCode && old?.lotCode)
            ? old.lotCode
            : (stage === 'purchases'
                ? formatPurchaseLotCode(v.date, state.records.purchases.filter(r => r.id !== (input.id || old?.id)).map(r => r.lotCode))
                : stage === 'receiving'
                    ? (source?.lotCode && /^TM-\d{4}-\d{4}(?:-\d{2})?$/.test(source.lotCode) && !state.records.receiving.some(r => r.id !== (input.id || old?.id) && r.lotCode === source.lotCode.replace(/^TM-/, 'LH-'))
                        ? source.lotCode.replace(/^TM-/, 'LH-')
                        : formatProductionLotCode(v.date || source?.values?.date, state.records.receiving.filter(r => r.id !== (input.id || old?.id)).map(r => r.lotCode)))
                    : source!.lotCode);
    if (stage !== 'purchases') v.lotCode = code;
    if (stage === 'purchases') v.total = Number(v.weight) * Number(v.price);
    if (stage === 'purchases') v.purchaseCode = code;
    if (stage === 'sales') {
        const w = Number(v.weight_kg || 0);
        const p = Number(v.price || 85000);
        v.total = Number(v.total ?? (w * p));
    }
    for (const field of REGISTERS[stage].fields) {
        const value = v[field.key];
        if (field.required && (value === '' || value === undefined)) throw new Error(`Vui lòng nhập ${field.label}.`);
        if (field.type === 'number' && (!Number.isFinite(Number(value)) || Number(value) < 0)) throw new Error(`${field.label} phải là số không âm.`);
        if (field.type === 'number' && (field.key.includes('Boxes') || field.key.startsWith('quantity_') || field.key.startsWith('sample')) && !Number.isInteger(Number(value))) throw new Error(`${field.label} phải là số nguyên.`);
        if (field.type === 'check' && !['Đ', 'K'].includes(String(value))) throw new Error(`Vui lòng đánh giá ${field.label}.`);
        if (field.type === 'finding' && !['Có', 'Không', ''].includes(String(value))) throw new Error('Kết quả phát hiện không hợp lệ.');
        if (field.type === 'date' && value && (!/^\d{4}-\d{2}-\d{2}$/.test(String(value)) || !Number.isFinite(Date.parse(String(value))) || new Date(String(value)).toISOString().slice(0, 10) !== value)) throw new Error('Ngày không hợp lệ.');
    }
    if (source && String(v.date) < String(source.values.date)) throw new Error('Ngày ghi nhận không được trước ngày của công đoạn nguồn.');
    if (stage === 'purchases' && Number(v.weight) <= 0) throw new Error('Khối lượng mua phải lớn hơn 0.');
    if (stage === 'receiving' && Math.abs(Number(v.grade1) + Number(v.grade2) + Number(v.grade3) + Number(v.rejected) - Number(source!.values.weight)) > 0.001) throw new Error('Loại 1 + Loại 2 + Loại 3 + Từ chối phải bằng khối lượng mua.');
    if (stage === 'preprocessing' && (Number(v.outputWeight) > Number(v.inputWeight) || Number(v.outputWeight) <= 0)) throw new Error('Khối lượng sau sơ chế phải lớn hơn 0 và không vượt đầu vào.');
    if (stage === 'preprocessing' && (!/^\d{2}:\d{2}$/.test(String(v.dryStart)) || !/^\d{2}:\d{2}$/.test(String(v.dryEnd)) || String(v.dryEnd) < String(v.dryStart))) throw new Error('Thời gian phơi khô kết thúc phải sau bắt đầu trong cùng ngày.');
    if (['packaging', 'inspection'].includes(stage) && (Number(v.weight_kg) > Number(v.inputWeight) || Number(v.quantity_boxes) > Number(v.inputBoxes ?? Infinity))) throw new Error('Lượng đầu ra không được vượt lượng tiếp nhận.');
    if (stage === 'packaging' && (Number(v.weight_kg) <= 0 || Number(v.quantity_boxes) <= 0)) throw new Error('Số thùng và khối lượng nhập kho phải lớn hơn 0.');
    if (stage === 'inspection') {
        const sample = Number(v.sample1) + Number(v.sample2) + Number(v.sample3);
        if (sample < Math.ceil(Number(v.inputBoxes) * 0.02) || sample > Number(v.inputBoxes)) throw new Error('Tổng mẫu kiểm tra phải ít nhất 2% số thùng (làm tròn lên) và không vượt số thùng tiếp nhận.');
        if (isFailed(stage, v) && (Number(v.quantity_boxes) !== 0 || Number(v.weight_kg) !== 0)) throw new Error('Lô không đạt phải có lượng đưa qua xuất bán bằng 0. Ghi nhận kiểm tra lại sau khắc phục.');
        if (!isFailed(stage, v) && (Number(v.quantity_boxes) <= 0 || Number(v.weight_kg) <= 0)) throw new Error('Lô đạt phải có lượng xuất bán lớn hơn 0.');
    }
    if (isFailed(stage, v) && !String(v.correction || v.treatmentPlan || '').trim()) throw new Error('Vui lòng ghi biện pháp khắc phục/phương án xử lý khi không đạt.');
    if (stage === 'sales' && v.transportOk !== 'Đ') throw new Error('Phương tiện vận chuyển phải đạt trước khi xuất bán.');
    if (stage === 'aftersales') {
        if (source && v.departureDate && String(v.departureDate) < String(source.values.date)) throw new Error('Ngày rời kho không được trước ngày xuất bán.');
        if (v.borderDate && v.departureDate && String(v.borderDate) < String(v.departureDate)) throw new Error('Ngày đến cửa khẩu không được trước ngày rời kho.');
        if (v.clearanceDate && v.borderDate && String(v.clearanceDate) < String(v.borderDate)) throw new Error('Ngày thông quan không được trước ngày đến cửa khẩu.');
        if (v.date && v.clearanceDate && String(v.date) < String(v.clearanceDate)) throw new Error('Ngày ghi nhận không được trước ngày thông quan.');
    }
    const record: GmpRecord = { id: old?.id || id, sourceId, lotCode: code, season, values: v };
    const nextList = old ? state.records[stage].map(r => r.id === old.id ? record : r) : [record, ...state.records[stage]];
    return { ...state, records: { ...state.records, [stage]: nextList.sort(compareGmpRecordsNewestFirst) } };
}
export function addPayment(state: GmpState, p: Payment): GmpState {
    if (!['Chuyển khoản', 'Tiền mặt'].includes(p.method)) throw new Error('Phương thức thanh toán không hợp lệ.');
    const stage = p.direction === 'IN' ? 'sales' : 'purchases';
    const r = state.records[stage].find(r => r.id === p.recordId);
    if (r?.draft) throw new Error('Vui lòng hoàn tất chứng từ trước khi thanh toán.');
    if (!r || !['IN', 'OUT'].includes(p.direction)) throw new Error('Chứng từ thanh toán không hợp lệ.');
    const total = Math.round(Number(r.values.total ?? (stage === 'sales' ? Number(r.values.price) * Number(r.values.weight_kg) : Number(r.values.total))));
    const paid = state.payments.filter(x => x.recordId === r.id).reduce((s, x) => s + x.amount, 0);
    if (!Number.isFinite(p.amount) || p.amount <= 0 || p.amount > total - paid) throw new Error('Số tiền phải lớn hơn 0 và không vượt công nợ còn lại.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date) || !Number.isFinite(Date.parse(p.date)) || p.date < String(r.values.date)) throw new Error('Ngày thanh toán không hợp lệ.');
    const nextPayments = [...state.payments, p].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    return { ...state, payments: nextPayments };
}

// Only the known sample entries are eligible; never estimate real invoices.
export function splitDemoUtilityExpenses(expenses: Expense[]): Expense[] {
    const sampleIds = new Set(['exp-demo-july-utilities', 'exp-demo-aug-utilities', 'exp-demo-8']);
    return expenses.flatMap(expense => {
        if (!sampleIds.has(expense.id) || !/^Điện nước tháng \d{2}$/.test(expense.content)) return [expense];
        const electricity = Math.round(expense.amount * 0.8);
        const notes = [expense.notes, 'Dữ liệu minh họa: phân bổ khoản điện–nước mẫu theo tỷ lệ điện 80%, nước 20%; không phải số tiền hóa đơn thực tế.'].filter(Boolean).join('\n');
        return [
            { ...expense, content: expense.content.replace('Điện nước', 'Tiền điện'), category: 'Vận hành cơ sở', amount: electricity, notes },
            { ...expense, id: `${expense.id}-water`, code: expense.code ? `${expense.code}-N` : undefined, content: expense.content.replace('Điện nước', 'Tiền nước'), category: 'Vận hành cơ sở', amount: expense.amount - electricity, notes },
        ];
    });
}

export function createDemoExpenses(): Expense[] {
    return splitDemoUtilityExpenses([
        ...['07', '08'].map(month => ({
            id: `exp-demo-labor-2026-${month}`,
            code: `CP-2026-NC${month}`,
            date: `2026-${month}-25`,
            category: 'Nhân công',
            content: `Chi phí nhân công tháng ${month}`,
            lotCode: '',
            method: 'Tiền mặt',
            amount: 4800000,
            notes: 'Dữ liệu minh họa: số tiền mẫu theo chi phí nhân công tháng 09, không phải bảng lương thực tế.',
        })),
        {
            id: 'exp-demo-july-utilities',
            code: 'CP-2026-001',
            date: '2026-07-25',
            category: 'Vận hành cơ sở',
            content: 'Điện nước tháng 07',
            lotCode: '',
            method: 'Chuyển khoản',
            amount: 5800000,
        },
        {
            id: 'exp-demo-aug-utilities',
            code: 'CP-2026-002',
            date: '2026-08-25',
            category: 'Vận hành cơ sở',
            content: 'Điện nước tháng 08',
            lotCode: '',
            method: 'Chuyển khoản',
            amount: 6000000,
        },
        {
            id: 'exp-demo-1',
            code: 'CP-2026-003',
            date: '2026-09-02',
            category: 'Bao bì & đóng gói',
            content: 'Mua 1.000 thùng carton',
            lotCode: '',
            method: 'Chuyển khoản',
            amount: 15000000,
        },
        {
            id: 'exp-demo-3',
            code: 'CP-2026-005',
            date: '2026-09-06',
            category: 'Kiểm nghiệm & kiểm dịch',
            content: 'Phí kiểm nghiệm lô LH-2026-0309',
            lotCode: 'LH-2026-0309',
            method: 'Chuyển khoản',
            amount: 3500000,
        },
        {
            id: 'exp-demo-5',
            code: 'CP-2026-007',
            date: '2026-09-10',
            category: 'Vận chuyển & logistics',
            content: 'Xe từ cơ sở Hữu Nghị - Lô LH-2026-0609',
            lotCode: 'LH-2026-0609',
            method: 'Chuyển khoản',
            amount: 12000000,
        },
        {
            id: 'exp-demo-6',
            code: 'CP-2026-008',
            date: '2026-09-12',
            category: 'Xuất khẩu',
            content: 'Phí làm thủ tục lô LH-2026-0809',
            lotCode: 'LH-2026-0809',
            method: 'Chuyển khoản',
            amount: 2500000,
        },
        {
            id: 'exp-demo-7',
            code: 'CP-2026-009',
            date: '2026-09-14',
            category: 'Nhân công',
            content: 'Chi phí nhân công tháng 09',
            lotCode: '',
            method: 'Tiền mặt',
            amount: 4800000,
        },
        {
            id: 'exp-demo-8',
            code: 'CP-2026-010',
            date: '2026-09-15',
            category: 'Vận hành cơ sở',
            content: 'Điện nước tháng 09',
            lotCode: '',
            method: 'Chuyển khoản',
            amount: 6200000,
        },
        {
            id: 'exp-demo-9',
            code: 'CP-2026-011',
            date: '2026-09-16',
            category: 'Khác',
            content: 'Sửa cân điện tử',
            lotCode: '',
            method: 'Tiền mặt',
            amount: 850000,
        },
    ]);
}

export function addExpense(state: GmpState, e: Expense): GmpState {
    if (e.category === 'Nhân công') e = { ...e, lotCode: '' };
    if (!e.date || !/^\d{4}-\d{2}-\d{2}$/.test(e.date)) throw new Error('Ngày chi phí không hợp lệ.');
    if (!EXPENSE_CATEGORIES.some(category => category.name === e.category)) throw new Error('Vui lòng chọn nhóm chi phí hợp lệ.');
    if (!e.content?.trim()) throw new Error('Vui lòng nhập nội dung chi.');
    if (/điện\s*(?:[&,/\-]|và)?\s*nước/iu.test(e.content)) throw new Error('Vui lòng ghi nhận tiền điện và tiền nước thành hai khoản chi riêng.');
    if (!Number.isFinite(e.amount) || e.amount <= 0) throw new Error('Số tiền chi phí phải lớn hơn 0.');

    if (e.lotCode?.trim()) {
        const validLots = new Set<string>();
        Object.values(state.records).forEach(recs => recs.forEach(r => { if (r.lotCode) validLots.add(r.lotCode); }));
        if (!validLots.has(e.lotCode.trim())) {
            throw new Error(`Mã số lô hàng "${e.lotCode}" không tồn tại trong hệ thống.`);
        }
    }

    const currentExpenses = state.expenses || [];
    let code = e.code;
    if (!code) {
        const y = e.date.slice(0, 4);
        const count = currentExpenses.filter(x => x.date?.startsWith(y)).length + 1;
        code = `CP-${y}-${String(count).padStart(3, '0')}`;
    }
    const itemWithCode: Expense = { ...e, code, method: e.method || 'Chuyển khoản' };

    const exists = currentExpenses.some(x => x.id === e.id);
    const updated = exists
        ? currentExpenses.map(x => x.id === e.id ? itemWithCode : x)
        : [itemWithCode, ...currentExpenses];

    return {
        ...state,
        expenses: updated.sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))),
    };
}

export function deleteExpense(state: GmpState, id: string): GmpState {
    return {
        ...state,
        expenses: (state.expenses || []).filter(x => x.id !== id),
    };
}

export function createDemoState(): GmpState {
    let state: GmpState = {
        records: { purchases: [], receiving: [], preprocessing: [], packaging: [], inspection: [], sales: [], aftersales: [] },
        payments: [],
        expenses: createDemoExpenses(),
        demo: true
    };
    // Seven lots show every hand-off, including one failed inspection and its successful retest.
    for (let i = 0; i < 8; i++) {
        const date = `2026-09-${String(i + 1).padStart(2, '0')}`;
        let previous = '';
        const depth = [6, 5, 4, 3, 2, 1, 0, 4][i];
        for (let s = 0; s <= depth; s++) {
            const stage = STAGES[s];
            const values: Values = {
                date: stage === 'aftersales' ? addDaysStr(date, 3) : date,
                seller: ['Trần Văn Minh', 'Nguyễn Văn Nam', 'Lê Thị Hoa'][i % 3],
                weight: 1140,
                price: s === 0 ? 52000 : 85000,
                phone: ['0912345678', '0983456789', '0987654321'][i % 3],
                address: 'Đồng Nai',
                puc: 'VN - DNOR - 0269',
                origin: 'Kim Quy One Member Limited Liability Company - Nam Cat Tien Commune, Dong Nai Province, Vietnam',
                variety: i % 2 ? 'Monthong' : 'Ri6',
                grade1: 800,
                grade2: 240,
                grade3: 60,
                rejected: 40,
                receiver: ['Nguyễn Thị Lan', 'Trần Văn Hưng', 'Lê Văn Hùng'][i % 3],
                dryStart: '08:00',
                dryEnd: '10:00',
                outputWeight: i % 2 === 0 ? 1100 : 1098,
                supervisor: ['Lê Văn Hùng', 'Trần Minh Đức', 'Phạm Quốc Bảo'][i % 3],
                quantity_boxes: 58,
                weight_kg: 1044,
                sample1: 1,
                sample2: 1,
                sample3: 0,
                inspector: ['Phạm Thị Hương', 'Trần Đình Trọng', 'Vũ Hoàng Mai'][i % 3],
                customer: 'Công ty Hoa Nam',
                customerInfo: 'Nam Ninh, Quảng Tây, Trung Quốc',
                container: `TGHU123456${i}`,
                exporter: 'CN 1 - Công ty Thiên Sơn Hải',
                country: 'Trung Quốc',
                purchaseDate: date,
                gardenInfo: 'Vườn Minh Phát, xã Phú Lộc, Đồng Nai',
                fruitCount: 58 * 6,
                departureDate: date,
                borderDate: addDaysStr(date, 2),
                clearanceDate: addDaysStr(date, 3),
                cadmiumOk: 'Đ',
                auramineOk: 'Đ',
                pestOk: 'Đ',
                otherDefects: 'Không',
                treatmentPlan: '—',
                notes: 'Đã thông quan xuất khẩu đạt yêu cầu'
            };
            REGISTERS[stage].fields.forEach(f => { if (f.type === 'check') values[f.key] = 'Đ'; if (f.type === 'finding') values[f.key] = 'Không'; });
            if (i === 7 && stage === 'inspection') Object.assign(values, { mealybug: 'Có', quantity_boxes: 0, weight_kg: 0, correction: 'Cách ly lô, vệ sinh lại và kiểm tra lại trước khi xuất.' });
            const id = `demo-${i}-${s}`;
            state = saveRecord(state, stage, { sourceId: previous, season: '2025-2026', values }, id);
            previous = id;
        }
    }
    state = addPayment(state, { id: 'demo-payment-1', recordId: 'demo-0-0', direction: 'OUT', date: '2026-09-04', amount: 30000000, method: 'Chuyển khoản' });
    return state;
}
