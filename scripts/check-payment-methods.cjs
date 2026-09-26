const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const orders = await prisma.order.findMany({ select: { id: true, orderCode: true, paymentMethod: true } });
    console.log('Orders paymentMethods:', [...new Set(orders.map(o => o.paymentMethod))]);
    console.log('Sample orders:', orders.slice(0, 10));
    const expenses = await prisma.storeExpense.findMany({ select: { id: true, title: true, paymentMethod: true } });
    console.log('Expenses paymentMethods:', [...new Set(expenses.map(e => e.paymentMethod))]);
    await prisma.$disconnect();
}
main().catch(console.error);
