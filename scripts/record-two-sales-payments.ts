import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { addPayment, GmpState, normalizeGmpState } from '../src/lib/processing-gmp';

const prisma = new PrismaClient();

async function main() {
    const ownerId = 'cmsogs6vi000314g3yuvld36x';
    const ws = await prisma.processingGmpWorkspace.findUniqueOrThrow({
        where: { ownerId }
    });

    const { state: cleanState } = normalizeGmpState(ws.data as unknown as GmpState);
    let state = cleanState;

    console.log(`Starting with ${state.payments.length} payments.`);

    const targetLotCodes = ['LH-2026-0509', 'LH-2026-0209'];

    for (const lotCode of targetLotCodes) {
        const saleRecord = state.records.sales.find(s => s.lotCode === lotCode);
        if (!saleRecord) {
            console.error(`Sale record not found for lot ${lotCode}`);
            continue;
        }

        const total = Math.round(Number(saleRecord.values.total ?? (Number(saleRecord.values.price) * Number(saleRecord.values.weight_kg))));
        const paidBefore = state.payments
            .filter(p => p.recordId === saleRecord.id)
            .reduce((sum, p) => sum + p.amount, 0);
        const remaining = total - paidBefore;

        console.log(`Lot ${lotCode} (${saleRecord.id}): Total = ${total.toLocaleString('vi-VN')} đ, Paid = ${paidBefore.toLocaleString('vi-VN')} đ, Remaining = ${remaining.toLocaleString('vi-VN')} đ`);

        if (remaining > 0) {
            const paymentId = randomUUID();
            const paymentDate = '2026-09-23'; // current date
            const newPayment = {
                id: paymentId,
                recordId: saleRecord.id,
                direction: 'IN' as const,
                date: paymentDate,
                amount: remaining,
                method: 'Chuyển khoản'
            };

            state = addPayment(state, newPayment);
            console.log(`Added payment of ${remaining.toLocaleString('vi-VN')} đ for ${lotCode} on ${paymentDate}.`);
        } else {
            console.log(`Lot ${lotCode} is already fully paid.`);
        }
    }

    console.log(`Total payments after update: ${state.payments.length}`);

    // Verify payments for the target lots
    for (const lotCode of targetLotCodes) {
        const saleRecord = state.records.sales.find(s => s.lotCode === lotCode)!;
        const total = Math.round(Number(saleRecord.values.total ?? (Number(saleRecord.values.price) * Number(saleRecord.values.weight_kg))));
        const paidAfter = state.payments
            .filter(p => p.recordId === saleRecord.id)
            .reduce((sum, p) => sum + p.amount, 0);
        console.log(`Verification: Lot ${lotCode} -> Paid: ${paidAfter.toLocaleString('vi-VN')} / ${total.toLocaleString('vi-VN')} đ, Remaining: ${(total - paidAfter).toLocaleString('vi-VN')} đ, Status: ${paidAfter >= total ? 'ĐÃ THU ĐỦ (PAID)' : 'CHƯA THU ĐỦ'}`);
    }

    await prisma.processingGmpWorkspace.update({
        where: { ownerId },
        data: {
            data: state as any,
            revision: { increment: 1 }
        }
    });

    console.log('Successfully updated workspace in PostgreSQL database for Kim Quy facility!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
