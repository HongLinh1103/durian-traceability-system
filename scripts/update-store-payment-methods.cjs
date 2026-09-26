const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const updatedOrders = await prisma.order.updateMany({
        data: { paymentMethod: 'COD' }
    });
    console.log(`Updated ${updatedOrders.count} orders paymentMethod to COD`);

    const updatedExpenses = await prisma.storeExpense.updateMany({
        data: { paymentMethod: 'CASH' }
    });
    console.log(`Updated ${updatedExpenses.count} store expenses paymentMethod to CASH`);

    await prisma.$disconnect();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
