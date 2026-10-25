import { GmpRecord, GmpState, GMP_GRADES, Values, formatProductionLotCode, formatPurchaseLotCode, formatCbLotCode, formatDgLotCode, gradeTotal } from './processing-gmp';

export function assignReceivingPurchaseCodes(state: GmpState) {
    const used: string[] = [];
    for (const r of state.records.receiving) {
        const existing = String(r.values.purchaseLotCode || '');
        const code = /^TM-\d{4}-\d{4}(?:-\d{2})?$/.test(existing) && !used.includes(existing)
            ? existing : formatPurchaseLotCode(r.values.date || r.values.harvestDate || r.lotCode, used);
        r.values.purchaseLotCode = code;
        used.push(code);
    }
    return state;
}

export type HarvestReceivingSource = {
    id: string; code: string; status: string; facilityId: string; ownerId: string;
    date: string; season: string; weight: number; seller: string; phone: string;
    puc: string; origin: string; variety: string;
};
export const RECEIVING_HARVEST_STATUSES = ['WAITING_CONFIRMATION', 'CONFIRMED', 'HARVESTING', 'HARVESTED', 'DELIVERY_CONFIRMED', 'COMPLETED'];
export function receivingProductionIntakes(state: GmpState) {
    return state.records.receiving.filter(r => r.values.harvestRecordId && !r.draft && r.values.sourceEligible === '1' && r.values.sourceConflict !== '1').flatMap(r => [
        { id: `${r.id}-fresh`, receivingId: r.id, harvestRecordId: String(r.values.harvestRecordId), harvestCode: String(r.values.harvestCode), lotCode: r.lotCode, route: 'fresh' as const, weight: gradeTotal(r.values, 'grade') },
        { id: `${r.id}-other`, receivingId: r.id, harvestRecordId: String(r.values.harvestRecordId), harvestCode: String(r.values.harvestCode), lotCode: r.lotCode, route: 'other' as const, weight: Number(r.values.otherProcessing || 0) },
    ].filter(item => item.weight > 0 && (item.route !== 'other' || r.values.processingAllocationHold !== '1')));
}
export function emptyProcessingState(): GmpState {
    return { records: { purchases: [], receiving: [], preprocessing: [], packaging: [], inspection: [], sales: [], aftersales: [] }, payments: [], expenses: [], demo: false };
}

export function syncHarvestReceiving(input: GmpState, harvests: HarvestReceivingSource[], ownerId: string, facilityId: string): GmpState {
    const state = structuredClone(input);
    const eligible = harvests.filter(h => h.ownerId === ownerId && h.facilityId === facilityId && RECEIVING_HARVEST_STATUSES.includes(h.status) && Number.isFinite(h.weight) && h.weight > 0);
    const ids = new Set(eligible.map(h => h.id));
    state.records.receiving = state.records.receiving.filter(r => !r.values.harvestRecordId || !r.draft || ids.has(String(r.values.harvestRecordId)));
    for (const h of eligible) {
        // Adopt only records with a proven harvest ID; never match names or dates.
        const historicalPurchase = state.records.purchases.find(p => p.values.harvestRecordId === h.id || p.id === `harvest-${h.id}-purchases`);
        let record = state.records.receiving.find(r => r.values.harvestRecordId === h.id || r.id === `harvest-${h.id}-receiving` || (historicalPurchase && r.sourceId === historicalPurchase.id));
        if (!record) {
            record = { id: `harvest-${h.id}-receiving`, sourceId: h.id, season: h.season, lotCode: '', draft: true, values: { date: '', grade1: '', grade2: '', grade3: '', gradeOther: '', otherProcessing: '', receiver: '', classificationComplete: '0' } };
            state.records.receiving.push(record);
        }
        const v = record.values;
        const confirmed = !record.draft && Boolean(v.date);
        const priorWeight = Number(v.initialWeight ?? (confirmed
            ? gradeTotal(v, 'grade') + Number(v.otherProcessing || 0) + Number(v.rejected || 0) - Number(v.weightAdjustment || 0)
            : h.weight));
        const originChanged=confirmed && ((Boolean(v.puc)&&String(v.puc)!==h.puc) || (Boolean(v.variety)&&String(v.variety)!==h.variety));
        if(confirmed){v.harvestRecordId=v.harvestRecordId||h.id;v.harvestCode=v.harvestCode||h.code;v.sourceEligible='1';}
        if(!confirmed) Object.assign(v, { harvestRecordId: h.id, harvestCode: h.code, seller: h.seller, phone: h.phone, puc: h.puc, origin: h.origin, variety: h.variety, harvestDate: h.date, harvestWeight: h.weight, sourceEligible: '1' });
        record.sourceId = h.id;
        if (!confirmed) {
            v.initialWeight = h.weight; record.season = h.season;
            v.acceptedWeight = gradeTotal(v, 'grade') + Number(v.otherProcessing || 0);
            v.unclassifiedWeight = Math.round((h.weight + Number(v.weightAdjustment || 0) - Number(v.acceptedWeight)) * 100) / 100;
            v.rejected = ''; v.receivingStatus = 'Chưa nhập hàng';
        }
        else {
            v.initialWeight = priorWeight;
            v.sourceEligible='1';
            v.sourceConflict = originChanged || Math.abs(priorWeight - h.weight) > 0.001 ? '1' : '0';
            v.otherProcessing = Number(v.otherProcessing || 0);
            v.acceptedWeight = gradeTotal(v, 'grade') + Number(v.otherProcessing);
            v.classificationComplete = '1';
            v.receivingStatus = 'Đã nhập hàng';
            v.rejected = Number(v.initialWeight) + Number(v.weightAdjustment || 0) - Number(v.acceptedWeight);
            if (Number(v.otherProcessing) > 0) {
                if (!v.cbLotCodes) {
                    v.cbLotCodes = record.lotCode && /^(LH|DG)-\d{4}-\d{4}(?:-\d{2})?$/.test(record.lotCode) ? record.lotCode.replace(/^(LH|DG)-/, 'CB-') : formatCbLotCode(v.date || record.lotCode);
                } else if (typeof v.cbLotCodes === 'string') {
                    v.cbLotCodes = v.cbLotCodes.replace(/\bLH-/g, 'CB-');
                }
            }
            if (gradeTotal(v, 'grade') > 0) {
                if (!v.dgLotCodes) {
                    v.dgLotCodes = record.lotCode && /^(LH|CB)-\d{4}-\d{4}(?:-\d{2})?$/.test(record.lotCode) ? record.lotCode.replace(/^(LH|CB)-/, 'DG-') : formatDgLotCode(v.date || record.lotCode);
                } else if (typeof v.dgLotCodes === 'string') {
                    v.dgLotCodes = v.dgLotCodes.replace(/\bLH-/g, 'DG-');
                }
            }
        }
    }
    for (const r of state.records.receiving) if (r.values.harvestRecordId && !ids.has(String(r.values.harvestRecordId))) r.values.sourceEligible = '0';
    for (const r of state.records.receiving) if (!r.values.harvestRecordId) { r.values.legacyReceiving = '1'; r.values.sourceEligible = r.values.sampleSourceId ? '1' : '0'; }
    for (const r of state.records.receiving) {
        const v = r.values;
        if (typeof v.dgLotCodes === 'string' && /\bLH-/.test(v.dgLotCodes)) {
            v.dgLotCodes = v.dgLotCodes.replace(/\bLH-/g, 'DG-');
        }
        if (gradeTotal(v, 'grade') > 0 && !v.dgLotCodes && !r.draft && Boolean(v.date)) {
            v.dgLotCodes = r.lotCode && /^(LH|CB)-\d{4}-\d{4}(?:-\d{2})?$/.test(r.lotCode)
                ? r.lotCode.replace(/^(LH|CB)-/, 'DG-')
                : formatDgLotCode(v.date || r.lotCode);
        }
        if (typeof v.cbLotCodes === 'string' && /\bLH-/.test(v.cbLotCodes)) {
            v.cbLotCodes = v.cbLotCodes.replace(/\bLH-/g, 'CB-');
        }
        if (Number(v.otherProcessing || 0) > 0 && !v.cbLotCodes && !r.draft && Boolean(v.date)) {
            v.cbLotCodes = r.lotCode && /^(LH|DG)-\d{4}-\d{4}(?:-\d{2})?$/.test(r.lotCode)
                ? r.lotCode.replace(/^(LH|DG)-/, 'CB-')
                : formatCbLotCode(v.date || r.lotCode);
        }
    }
    return assignReceivingPurchaseCodes(state);
}

export function saveHarvestReceiving(state: GmpState, id: string, submitted: Values, confirm: boolean, date: string): GmpState {
    if (confirm && submitted.date) {
        date = String(submitted.date);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new Error('Ngày nhập hàng không hợp lệ.');
    }
    const next = structuredClone(state);
    const r = next.records.receiving.find(r => r.id === id);
    if ((!r?.values.harvestRecordId && !r?.values.sampleSourceId) || r?.values.sourceEligible !== '1') throw new Error('Hồ sơ không có liên kết thu hoạch hợp lệ.');
    if (r.values.sourceConflict === '1') throw new Error('Khối lượng hồ sơ thu hoạch đã thay đổi. Cần đối soát lại hồ sơ nguồn trước khi tiếp nhận.');
    if (!r.draft) throw new Error('Hồ sơ đã xác nhận tiếp nhận, không thể thay đổi phân loại.');
    const v = r.values;
    if (GMP_GRADES.some(g => submitted['otherGrade' + g.key] !== undefined)) {
        for (const g of GMP_GRADES) {
            const raw = submitted['otherGrade' + g.key];
            if (confirm && (raw === '' || raw === undefined)) throw new Error('Vui lòng nhập đủ 4 phân loại chế biến khác.');
            const amount = Number(raw || 0);
            if (!Number.isFinite(amount) || amount < 0) throw new Error('Khối lượng chế biến khác phải là số không âm.');
            v['otherGrade' + g.key] = amount;
        }
        submitted = { ...submitted, otherProcessing: gradeTotal(v, 'otherGrade') };
    }
    for (const key of [...GMP_GRADES.map(g => 'grade' + g.key), 'otherProcessing', 'weightAdjustment']) {
        const raw = submitted[key];
        if (confirm && key !== 'weightAdjustment' && (raw === '' || raw === undefined)) throw new Error('Vui lòng hoàn tất tất cả các ô phân loại (nhập 0 nếu không có).');
        const n = Number(raw || 0);
        if (!Number.isFinite(n) || (key !== 'weightAdjustment' && n < 0)) throw new Error('Khối lượng phải là số hợp lệ và không âm.');
        v[key] = raw === '' || raw === undefined ? '' : n;
    }
    v.weightDifferenceReason = String(submitted.weightDifferenceReason || '').trim();
    v.receiver = String(submitted.receiver || '').trim();
    v.processingEligible = submitted.processingEligible === '1' ? '1' : '0';
    v.notes = String(submitted.notes ?? v.notes ?? '').trim() || '—';
    v.notesDisplayVersion = 'blank-default-v1';
    const adjustment = Number(v.weightAdjustment || 0);
    const baseline = Number(v.initialWeight) + adjustment;
    if (baseline <= 0) throw new Error('Khối lượng cân thực tế phải lớn hơn 0.');
    if (adjustment && !v.weightDifferenceReason) throw new Error('Vui lòng ghi lý do chênh lệch cân.');
    if (Number(v.otherProcessing) > 0 && v.processingEligible !== '1') throw new Error('Phải xác nhận nguyên liệu đủ điều kiện chất lượng và an toàn thực phẩm để chế biến.');
    v.acceptedWeight = gradeTotal(v, 'grade') + Number(v.otherProcessing || 0);
    if (Number(v.acceptedWeight) - baseline > 0.001) throw new Error('Khối lượng tiếp nhận không được vượt khối lượng ban đầu đã đối soát.');
    v.unclassifiedWeight = Math.round((baseline - Number(v.acceptedWeight)) * 100) / 100;
    v.classificationComplete = confirm ? '1' : '0';
    if (confirm) {
        if (!v.receiver) throw new Error('Vui lòng nhập người tiếp nhận.');
        v.date = date;
        v.rejected = v.unclassifiedWeight;
        v.receivingStatus = 'Đã nhập hàng';
        r.lotCode = r.lotCode || formatProductionLotCode(date, next.records.receiving.filter(item => item.id !== id).map(item => item.lotCode));
        if (gradeTotal(v, 'grade') > 0) {
            const defaultDg = r.lotCode && /^(LH|CB)-\d{4}-\d{4}(?:-\d{2})?$/.test(r.lotCode)
                ? r.lotCode.replace(/^(LH|CB)-/, 'DG-')
                : formatDgLotCode(date);
            v.dgLotCodes = v.dgLotCodes ? String(v.dgLotCodes).replace(/\bLH-/g, 'DG-') : defaultDg;
        }
        if (Number(v.otherProcessing || 0) > 0) {
            const defaultCb = r.lotCode && /^(LH|DG)-\d{4}-\d{4}(?:-\d{2})?$/.test(r.lotCode)
                ? r.lotCode.replace(/^(LH|DG)-/, 'CB-')
                : formatCbLotCode(date);
            v.cbLotCodes = v.cbLotCodes ? String(v.cbLotCodes).replace(/\bLH-/g, 'CB-') : defaultCb;
        }
        r.draft = false;
    } else { v.date = ''; v.rejected = ''; v.receivingStatus = 'Chưa nhập hàng'; r.draft = true; }
    return next;
}
