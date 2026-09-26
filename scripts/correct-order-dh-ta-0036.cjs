require('@next/env').loadEnvConfig(process.cwd());
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const code = 'DH-TA-0036';
const cancelledAt = new Date('2026-08-05T07:35:00+07:00');
const reason = 'Không có nhu cầu mua hàng nữa';
async function main() {
    const orders = await prisma.order.findMany({ where: { orderCode: code }, include: { histories: { orderBy: { createdAt: 'asc' } }, items: true } });
    assert.equal(orders.length, 1, 'Expected exactly one matching order');
    const order = orders[0];
    if (order.status === 'CANCELLED' && order.rejectionReason === reason && order.cancelledAt?.getTime() === cancelledAt.getTime()) {
        assert(order.histories.some(h => h.toStatus === 'CANCELLED' && h.createdAt.getTime() === cancelledAt.getTime()));
        console.log('Already corrected; no changes.'); return;
    }
    assert.equal(order.status, 'REJECTED');
    const histories = order.histories.filter(h => h.toStatus === 'REJECTED');
    assert.equal(histories.length, 1, 'Expected one rejection event');
    const folder = path.join(process.cwd(), 'scratch', 'backups'); fs.mkdirSync(folder, { recursive: true });
    const backup = path.join(folder, 'order-DH-TA-0036-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json');
    fs.writeFileSync(backup, JSON.stringify(order, null, 2));
    await prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM orders WHERE id=${order.id} FOR UPDATE`;
        const updated = await tx.order.updateMany({ where: { id: order.id, status: 'REJECTED', updatedAt: order.updatedAt }, data: { status: 'CANCELLED', rejectionReason: reason, cancelledAt } });
        assert.equal(updated.count, 1, 'Order changed since backup');
        const event = await tx.orderStatusHistory.updateMany({ where: { id: histories[0].id, orderId: order.id, toStatus: 'REJECTED', createdAt: histories[0].createdAt }, data: { toStatus: 'CANCELLED', createdAt: cancelledAt, note: 'Lý do hủy: ' + reason } });
        assert.equal(event.count, 1, 'History changed since backup');
        const after = await tx.order.findUniqueOrThrow({ where: { id: order.id }, include: { histories: true, items: true } });
        assert.equal(after.status, 'CANCELLED'); assert.equal(after.histories.filter(h => h.toStatus === 'REJECTED').length, 0);
        assert.equal(after.histories.length, order.histories.length);
        assert.equal(JSON.stringify(after.items), JSON.stringify(order.items));
        assert.equal(Number(after.subtotal), Number(order.subtotal));
        assert.equal(after.paymentStatus, order.paymentStatus);
    });
    console.log(JSON.stringify({ orderCode: code, status: 'CANCELLED', cancelledAt: '07:35 05/08/2026 (Asia/Ho_Chi_Minh)', reason, backup }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
