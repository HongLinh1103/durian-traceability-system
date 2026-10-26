import { GmpRecord, GmpState, GMP_GRADES, Values, gradeTotal } from './processing-gmp';
import { freshReceivingCode } from './fresh-lot-code';
export type ProductionRoute = 'DG' | 'CB';
export interface LotAllocation {
    id: string;
    receivingId: string;
    weight: number;
    grades: Values;
    harvestId: string;
    harvestCode: string;
    puc: string;
    variety: string;
    receivedAt: string;
    receiver: string;
    actor: string;
    at: string;
    active: boolean;
}
export interface ProductionLot {
    id: string;
    ownerId: string;
    code: string;
    route: ProductionRoute;
    puc: string;
    variety: string;
    createdAt: string;
    status: 'OPEN' | 'LOCKED' | 'CLOSED';
    allocations: LotAllocation[];
    history: {
        actor: string;
        at: string;
        action: string;
        receivingId?: string;
        weight?: number;
    }[];
}
export function lots(state: GmpState): ProductionLot[] { return state.productionLots || []; }
export function lotLocked(state: GmpState, lot: ProductionLot) { return lot.status !== 'OPEN' || (lot.route === 'DG' ? state.records.preprocessing.some(r => r.sourceId === lot.id) : ((state as GmpState & {
    otherProcessing?: {
        book: string;
        sourceId: string;
    }[];
}).otherProcessing || []).some(r => r.book === 'preprocessing' && r.sourceId === lot.id)); }
export function allocated(state: GmpState, receivingId: string, route: ProductionRoute) { return lots(state).filter(l => l.route === route).flatMap(l => l.allocations).filter(a => a.active && a.receivingId === receivingId); }
export function candidates(state: GmpState, r: GmpRecord, route: ProductionRoute) { return lots(state).filter(l => l.route === route && l.puc === String(r.values.puc).trim().toUpperCase() && l.variety === String(r.values.variety).trim().toLocaleLowerCase('vi') && !lotLocked(state, l)); }
export function allocateProduction(state: GmpState, input: {
    receivingId: string;
    route: ProductionRoute;
    targetId?: string;
    grades?: Values;
    weight?: number;
    cancelId?: string;
    closeId?: string;
}, actor: string, id: string, now = new Date().toISOString()): GmpState {
    const next = structuredClone(state);
    next.productionLots ??= [];
    const r = next.records.receiving.find(r => r.id === input.receivingId);
    if (!r || r.draft || r.values.sourceEligible !== '1' || r.values.sourceConflict === '1' || !r.values.harvestRecordId)
        throw Error('Nguồn nhập hàng chưa xác nhận hoặc không hợp lệ.');
    const route = input.route;
    if (!['DG', 'CB'].includes(route))
        throw Error('Hướng sản xuất không hợp lệ.');
    const legacyUsed = route === 'DG' ? next.records.preprocessing.some(x => x.sourceId === r.id) : ((next as GmpState & {
        otherProcessing?: {
            book: string;
            sourceId: string;
        }[];
    }).otherProcessing || []).some(x => x.book === 'preprocessing' && x.sourceId === r.id);
    if (legacyUsed)
        throw Error('Nguồn đã chuyển sản xuất theo mã cũ; không thể phân bổ lại.');
    if (input.cancelId) {
        const lot = lots(next).find(l => l.ownerId === actor && l.route === route && l.allocations.some(a => a.id === input.cancelId && a.receivingId === r.id && a.active));
        if (!lot || lotLocked(next, lot))
            throw Error('Không thể hủy phân bổ của lô đã khóa hoặc chuyển công đoạn.');
        const a = lot.allocations.find(a => a.id === input.cancelId)!;
        a.active = false;
        lot.history.push({ actor, at: now, action: 'Hủy phân bổ', receivingId: r.id, weight: a.weight });
        return next;
    }
    if (input.closeId) {
        const lot = lots(next).find(l => l.id === input.closeId && l.ownerId === actor && l.route === route && l.allocations.some(a => a.receivingId === r.id));
        if (!lot)
            throw Error('Không tìm thấy lô.');
        lot.status = 'LOCKED';
        lot.history.push({ actor, at: now, action: 'Đóng lô' });
        return next;
    }
    if (!r.values.puc || !r.values.variety)
        throw Error('Thiếu mã vùng trồng hoặc chủng loại.');
    const existing = allocated(next, r.id, route);
    const grades: Values = {};
    let weight = Number(input.weight);
    if (route === 'DG') {
        for (const g of GMP_GRADES) {
            const n = Number(input.grades?.['grade' + g.key] ?? 0);
            if (!Number.isFinite(n) || n < 0)
                throw Error('Khối lượng phân loại không hợp lệ.');
            if (n + existing.reduce((s, a) => s + Number(a.grades['grade' + g.key] || 0), 0) > Number(r.values['grade' + g.key] || 0) + .001)
                throw Error('Phân bổ vượt khối lượng từng loại.');
            grades['grade' + g.key] = n;
        }
        weight = gradeTotal(grades, 'grade');
    }
    else if (r.values.processingEligible !== '1')
        throw Error('Nguyên liệu chưa đủ điều kiện chế biến.');
    const capacity = route === 'DG' ? gradeTotal(r.values, 'grade') : Number(r.values.otherProcessing || 0);
    if (!Number.isFinite(weight) || weight <= 0 || weight + existing.reduce((s, a) => s + a.weight, 0) > capacity + .001)
        throw Error('Phân bổ vượt khối lượng còn lại.');
    let lot = input.targetId ? lots(next).find(l => l.id === input.targetId) : undefined;
    if (input.targetId && (!lot || lot.ownerId !== actor || !candidates(next, r, route).some(l => l.id === lot!.id)))
        throw Error('Lô không cùng cơ sở, hướng sản xuất, vùng trồng, chủng loại hoặc đã khóa.');
    if (!lot) {
        const year = now.slice(0, 4);
        const seq = lots(next).filter(l => l.route === route && l.createdAt.startsWith(year)).length + 1;
        lot = { id, ownerId: actor, code: route + '-' + year + '-' + String(seq).padStart(4, '0') + '-' + actor, route, puc: String(r.values.puc).trim().toUpperCase(), variety: String(r.values.variety).trim().toLocaleLowerCase('vi'), createdAt: now, status: 'OPEN', allocations: [], history: [] };
        next.productionLots.push(lot);
    }
    if(route==='CB' && r.values.processingAllocationHold==='1')r.values.processingAllocationHold='0';
    lot.allocations.push({ id: id + '-allocation', receivingId: r.id, weight, grades, harvestId: String(r.values.harvestRecordId), harvestCode: String(r.values.harvestCode || ''), puc: String(r.values.puc), variety: String(r.values.variety), receivedAt: String(r.values.date), receiver: String(r.values.receiver || ''), actor, at: now, active: true });
    lot.history.push({ actor, at: now, action: input.targetId ? 'Xác nhận gom lô' : 'Tạo lô và phân bổ', receivingId: r.id, weight });
    return next;
}
export function productionSources(state: GmpState, route: ProductionRoute): GmpRecord[] {
    const grouped = lots(state).filter(l => l.route === route && l.status !== 'CLOSED').flatMap(l => {
        const active = l.allocations.filter(a => a.active);
        if (!active.length)
            return [];
        const parents = active.map(a => state.records.receiving.find(r => r.id === a.receivingId));
        if (parents.some(r => !r || r.draft || r.values.sourceEligible !== '1' || r.values.sourceConflict === '1'))
            return [];
        const first = parents[0]!;
        const values: Values = { ...first.values, productionLotId: l.id, productionRoute: route, sourceLot: l.code, otherProcessing: route === 'CB' ? active.reduce((s, a) => s + a.weight, 0) : 0, harvestRecordId: active.map(a => a.harvestId).join(', '), harvestCode: active.map(a => a.harvestCode).join(', '), date: parents.map(r => String(r!.values.date)).sort().at(-1) || '', productionOrigins: JSON.stringify(active) };
        for (const g of GMP_GRADES)
            values['grade' + g.key] = active.reduce((s, a) => s + Number(a.grades['grade' + g.key] || 0), 0);
        return [{ ...first, id: l.id, lotCode: l.code, values }];
    });
    // Historical production records retain their existing lot identities.
    const legacy = state.records.receiving.filter(r => !lots(state).some(l => l.route === route && l.allocations.some(a => a.receivingId === r.id)));
    return [...legacy.map(r=>route==='DG' ? {...r,lotCode:freshReceivingCode(state,r) || r.lotCode} : r), ...grouped];
}
export function productionOrigins(values: Values): LotAllocation[] { try {
    return JSON.parse(String(values.productionOrigins || '[]'));
}
catch {
    return [];
} }
