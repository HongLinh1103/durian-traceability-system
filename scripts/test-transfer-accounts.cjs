const { test } = require('node:test');
const assert = require('node:assert/strict');
const { planTransfer } = require('./transfer-accounts.cjs');
const user = { id: 'local-1', phone: 'test-phone', email: 'test@example.invalid', password: 'original-hash', isLocked: true };

test('new accounts retain original hash and locked status', () => {
    const plan = planTransfer([user], []);
    assert.deepEqual(plan.missing, [user]);
    assert.equal(plan.existing, 0);
});
test('repeated imports leave existing users and passwords unchanged', () => {
    const target = { ...user, password: 'changed-in-production' };
    const plan = planTransfer([user], [target]);
    assert.equal(plan.missing.length, 0);
    assert.equal(plan.existing, 1);
    assert.equal(plan.credentialsDiffer, 1);
    assert.equal(target.password, 'changed-in-production');
});
test('email comparison is case insensitive across different IDs', () => {
    const plan = planTransfer([user], [{ ...user, id: 'production-1', phone: 'other-phone', email: user.email.toUpperCase() }]);
    assert.equal(plan.existing, 1);
});
test('cross-account identity collisions stop the import', () => {
    assert.throws(() => planTransfer([user], [
        { ...user, id: 'production-1', email: null },
        { ...user, id: 'production-2', phone: 'other-phone' },
    ]), /Conflicting/);
});
test('an unrelated user with the same ID stops the import', () => {
    assert.throws(() => planTransfer([user], [{ ...user, phone: 'other-phone', email: null }]), /different target identity/);
});
