import { PrismaClient } from '@prisma/client';
import { addPayment, GmpState } from '../src/lib/processing-gmp';

const prisma = new PrismaClient();

async function main() {
    const ownerId = 'cmsogs6vi000314g3yuvld36x';
    const ws = await prisma.processingGmpWorkspace.findUniqueOrThrow({
        where: { ownerId }
    });
    let state = ws.data as unknown as GmpState;

    console.log(`Starting with ${state.payments.length} payments.`);

    // 1. Add completed sales payments (Thu tiền bán hàng)
    for (const s of state.records.sales) {
        if (s.lotCode === 'LH-2026-0809') continue; // Lô LH-2026-0809 chưa thanh toán theo yêu cầu
        const total = Number(s.values.price) * Number(s.values.weight_kg);
        const paid = state.payments.filter(p => p.recordId === s.id).reduce((sum, p) => sum + p.amount, 0);
        const remaining = total - paid;
        if (remaining > 0) {
            console.log(`Adding sales collection for ${s.lotCode}, amount: ${remaining.toLocaleString('vi-VN')} đ`);
            state = addPayment(state, {
                id: `payment-sale-${s.id}`,
                recordId: s.id,
                direction: 'IN',
                date: String(s.values.date),
                amount: remaining,
                method: 'Chuyển khoản'
            });
        }
    }

    // 2. Add completed purchases payments (Thanh toán thu mua)
    for (const p of state.records.purchases) {
        const total = Number(p.values.total);
        const paid = state.payments.filter(x => x.recordId === p.id).reduce((sum, x) => sum + x.amount, 0);
        const remaining = total - paid;
        if (remaining > 0) {
            console.log(`Adding purchase payment for ${p.lotCode}, amount: ${remaining.toLocaleString('vi-VN')} đ`);
            state = addPayment(state, {
                id: `payment-purchase-${p.id}`,
                recordId: p.id,
                direction: 'OUT',
                date: String(p.values.date),
                amount: remaining,
                method: 'Chuyển khoản'
            });
        }
    }

    console.log(`Total payments after update: ${state.payments.length}`);

    await prisma.processingGmpWorkspace.update({
        where: { ownerId },
        data: {
            data: state as any,
            revision: { increment: 1 }
        }
    });

    console.log('Successfully persisted all payments to PostgreSQL for Kim Quy facility!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
