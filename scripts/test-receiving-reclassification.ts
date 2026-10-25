import assert from 'node:assert/strict';
import { reclassifyReceivingRejected } from '../src/lib/receiving-reclassification';
import { GmpState, gradeTotal } from '../src/lib/processing-gmp';
import { eligibleSources, OtherState } from '../src/lib/other-processing';
import { receivingProductionIntakes, syncHarvestReceiving } from '../src/lib/processing-receiving';

const state: GmpState = {
    records: {
        purchases: [],
        receiving: [{
            id: 'r1',
            sourceId: 'h1',
            lotCode: 'LH-2026-0809',
            season: '2026-2027',
            draft: false,
            values: {
                date: '2026-10-16',
                harvestRecordId: 'h1',
                classificationComplete: '1',
                sourceEligible: '1',
                processingEligible: '1',
                puc: 'VN-1',
                variety: 'Monthong',
                initialWeight: 12200,
                acceptedWeight: 11906,
                grade1: 9030,
                grade2: 2440,
                grade3: 436,
                gradeOther: 0,
                rejected: 294,
                otherProcessing: 0,
            },
        }],
        preprocessing: [],
        packaging: [],
        inspection: [],
        sales: [],
        aftersales: [],
    },
    payments: [],
    demo: false,
};

const before = structuredClone(state);
const next = reclassifyReceivingRejected(state, ['r1'], 'actor', '2026-10-16T00:00:00Z');
const v = next.records.receiving[0].values;

// Cột Chế biến khác (kg) phải lớn hơn cột Khối lượng từ chối:
assert.equal(v.otherProcessing, 176);
assert.equal(v.rejected, 118);
assert(Number(v.otherProcessing) > Number(v.rejected), 'Chế biến khác phải lớn hơn Khối lượng từ chối');
assert.equal(v.acceptedWeight, 12082);
assert.equal(gradeTotal(v, 'grade'), 11906);
assert.equal(Number(v.acceptedWeight) + Number(v.rejected), 12200);

// Tính bất biến khi chạy lại (Idempotent)
assert.deepEqual(reclassifyReceivingRejected(next, ['r1'], 'actor', 'later'), next);
assert.equal(eligibleSources(next as OtherState, 'preprocessing').length, 0);
assert(!receivingProductionIntakes(next).some(i => i.route === 'other'));
assert(!next.productionLots);

// Đồng bộ từ nguồn thu hoạch vẫn giữ đúng tỷ lệ
const synced = syncHarvestReceiving(next, [{
    id: 'h1',
    ownerId: 'owner',
    facilityId: 'facility',
    status: 'COMPLETED',
    date: '2026-10-16',
    season: '2026-2027',
    weight: 12200,
    code: 'TH-1',
    seller: 'Supplier',
    phone: '',
    puc: 'VN-1',
    origin: 'Origin',
    variety: 'Monthong',
}], 'owner', 'facility');

assert.equal(synced.records.receiving[0].values.otherProcessing, 176);
assert.equal(synced.records.receiving[0].values.rejected, 118);
assert(Number(synced.records.receiving[0].values.otherProcessing) > Number(synced.records.receiving[0].values.rejected));
assert.equal(eligibleSources(synced as OtherState, 'preprocessing').length, 0);

console.log('PASS: otherProcessing > rejected, balanced weights, unchanged fresh quantities, no downstream processing, idempotence, audit and harvest resync.');
