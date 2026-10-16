import { GmpState, GMP_GRADES, gradeTotal } from './processing-gmp';
import { assignReceivingPurchaseCodes } from './processing-receiving';

export function populateReceivingSamples(input: GmpState, ownerId: string, date: string) {
    const state = structuredClone(input);
    for (const r of state.records.receiving) {
        if (r.values.harvestRecordId) continue;
        const v = r.values;
        v.sampleSourceId ||= `sample-source-${ownerId}-${r.id}`;
        v.harvestCode ||= `MAU-${r.id}`;
        v.sampleData = '1';
        v.sourceEligible = '1';
        for (const g of GMP_GRADES) v['grade' + g.key] ??= 0;
        v.otherProcessing ??= 0;
        v.acceptedWeight = gradeTotal(v, 'grade') + Number(v.otherProcessing || 0);
        v.initialWeight ??= Number(v.acceptedWeight) + Number(v.rejected || 0) - Number(v.weightAdjustment || 0);
        v.classificationComplete = r.draft ? '0' : '1';
        v.receivingStatus = r.draft ? 'Chưa nhập hàng' : 'Đã nhập hàng';
    }
    // One clearly labelled, pending sample source makes the restored form usable.
    const id = `sample-receiving-${ownerId}`;
    if (!state.records.receiving.some(r => r.id === id)) {
        const year = Number(date.slice(0, 4));
        state.records.receiving.push({ id, sourceId: `sample-source-${ownerId}`, lotCode: '', season: `${year}-${year + 1}`, draft: true, values: {
            sampleSourceId: `sample-source-${ownerId}`, sampleData: '1', sourceEligible: '1', harvestCode: `MAU-NH-${date.replaceAll('-', '')}`,
            harvestDate: date, date: '', seller: 'Nguyễn Văn An (mẫu)', puc: 'VN-DNOR-MAU', origin: 'Vùng trồng minh họa - Đồng Nai', variety: 'Ri6',
            initialWeight: 1000, acceptedWeight: 0, grade1: '', grade2: '', grade3: '', gradeOther: '', otherProcessing: '', rejected: '', unclassifiedWeight: 1000, receiver: '', classificationComplete: '0', receivingStatus: 'Chưa nhập hàng',
        } });
    }
    return assignReceivingPurchaseCodes(state);
}
