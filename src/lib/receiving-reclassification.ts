import { GmpState, gradeTotal, GMP_GRADES } from './processing-gmp';
import { allocated } from './production-lots';

export function upgradeReceivingGrades(state: GmpState, actor: string, reclassify = false): GmpState {
    let next = structuredClone(state);
    // Limit historical reclassification to the seven demonstration rows requested.
    const codes = new Set(['LH-2026-0809', 'LH-2026-0609', 'LH-2026-0509', 'LH-2026-0309', 'LH-2026-0209', 'LH-2026-2908', 'LH-2026-2007']);
    for (const r of next.records.receiving) {
        if (!reclassify || !codes.has(r.lotCode) || r.draft || r.values.classificationComplete !== '1') continue;
        if (!r.values.receivingGradesVersion && !allocated(next, r.id, 'CB').length) {
            const baseline = Number(r.values.initialWeight) + Number(r.values.weightAdjustment || 0);
            const pool = Math.round((baseline - gradeTotal(r.values, 'grade')) * 1000);
            if (Number.isFinite(pool) && pool >= 0) {
                const other = Math.round(pool * .6) / 1000;
                r.values.receivingGradesAudit = JSON.stringify({ actor, before: { otherProcessing: r.values.otherProcessing, rejected: r.values.rejected }, after: { otherProcessing: other, rejected: (pool - Math.round(pool * .6)) / 1000 } });
                r.values.otherProcessing = other;
                r.values.rejected = (pool - Math.round(pool * .6)) / 1000;
                r.values.acceptedWeight = gradeTotal(r.values, 'grade') + other;
            }
        }
    }
    for (const r of next.records.receiving) {
        if (r.draft || r.values.receivingGradesVersion === 'four-grades-v1') continue;
        if (GMP_GRADES.every(g => r.values['otherGrade' + g.key] !== undefined)) {
            r.values.receivingGradesVersion = 'four-grades-v1';
            continue;
        }
        const total = Math.round(Number(r.values.otherProcessing || 0) * 1000);
        if (!Number.isFinite(total) || total < 0) continue;
        const each = Math.floor(total / 4);
        GMP_GRADES.forEach((g, i) => { r.values['otherGrade' + g.key] = (each + (i < total % 4 ? 1 : 0)) / 1000; });
        r.values.receivingGradesVersion = 'four-grades-v1';
    }
    return next;
}

export function reclassifyReceivingRejected(state: GmpState, ids: string[], actor: string, at: string): GmpState {
    const next = structuredClone(state);
    for (const id of ids) {
        const r = next.records.receiving.find(r => r.id === id);
        if (!r) throw new Error('Không tìm thấy hồ sơ nhập hàng.');
        const v = r.values;
        if (v.receivingReclassificationVersion === 'processing-pending-v2') continue;
        if (r.draft || v.classificationComplete !== '1') throw new Error('Hồ sơ chưa xác nhận nhập hàng.');
        if (allocated(next, id, 'CB').length) throw new Error('Hồ sơ đã phân bổ vào lô sản xuất chế biến; không thể tự điều chỉnh.');
        const baseline = Number(v.initialWeight) + Number(v.weightAdjustment || 0);
        const fresh = gradeTotal(v, 'grade');
        const salvagePool = baseline - fresh;
        if (!Number.isFinite(baseline) || !Number.isFinite(salvagePool) || salvagePool <= 0) {
            throw new Error('Khối lượng nguồn chưa cân đối.');
        }
        // Dữ liệu cột chế biến khác (kg) phải lớn hơn cột khối lượng từ chối (tỷ lệ 60% chế biến khác, 40% từ chối)
        const moved = Math.max(Math.floor(salvagePool / 2) + 1, Math.round(salvagePool * 0.6));
        const newRejected = salvagePool - moved;
        if (moved <= newRejected) {
            throw new Error('Khối lượng chế biến khác phải lớn hơn khối lượng từ chối.');
        }
        const priorOther = Number(v.otherProcessing || 0);
        const priorRejected = Number(v.rejected || 0);
        Object.assign(v, {
            otherProcessing: moved,
            acceptedWeight: fresh + moved,
            rejected: newRejected,
            unclassifiedWeight: 0,
            processingAllocationHold: '1',
            receivingReclassificationVersion: 'processing-pending-v2',
            receivingReclassificationAudit: JSON.stringify({
                actor,
                at,
                reason: 'Chuyển khối lượng sang chế biến khác lớn hơn khối lượng từ chối theo yêu cầu (tỷ lệ 60/40); chờ phân bổ',
                before: { otherProcessing: priorOther, acceptedWeight: fresh + priorOther, rejected: priorRejected },
                after: { otherProcessing: moved, acceptedWeight: fresh + moved, rejected: newRejected },
            }),
        });
    }
    return next;
}
