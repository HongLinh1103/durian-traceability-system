const {test} = require('node:test');
const assert = require('node:assert/strict');
const {planProfiles} = require('./transfer-packing-catalog.cjs');
const source = { id: 'local-profile', ownerId: 'local-owner', code: 'VN-TEST-1', approvalCode: 'VN-TEST-1', owner: { phone: 'test-phone', email: 'test@example.invalid' } };
const target = { ...source, id: 'production-profile', ownerId: 'production-owner', code: null, approvalCode: null };
test('matches existing owner identity despite different database IDs', () => {
    assert.deepEqual(planProfiles([source], [target]), [{id: target.id, data: {code: source.code, approvalCode: source.approvalCode}}]);
});
test('does not overwrite existing codes or change already imported profiles', () => {
    assert.deepEqual(planProfiles([source], [{...target, code:'PRODUCTION-CODE', approvalCode:'PRODUCTION-APPROVAL'}]), []);
    assert.deepEqual(planProfiles([source], [{...target, code:source.code, approvalCode:source.approvalCode}]), []);
});
test('does not create a profile for an unmatched owner', () => {
    assert.deepEqual(planProfiles([source], [{...target, owner:{phone:'other',email:null}}]), []);
});
test('rejects ambiguous owner identity and codes belonging to other profiles', () => {
    assert.throws(()=>planProfiles([source],[target,{...target,id:'second'}]),/Ambiguous/);
    assert.throws(()=>planProfiles([source],[target,{...target,id:'second',owner:{phone:'other',email:null},code:source.code}]),/already belongs/);
});
