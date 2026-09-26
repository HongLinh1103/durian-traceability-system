const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const lots = [
    {
      harvestId: 'cmtkynizj0002vvz0n81fzvkp',
      code: 'TH-2526-2908',
      amount: 264000000,
      receivedAt: new Date('2026-08-29T00:00:00+07:00'),
      receiptId: 'rcpt-kimquy-2908-full'
    },
    {
      harvestId: 'cmts8avyg002x4xgekv2f47ot',
      code: 'TH-2526-2007',
      amount: 218400000,
      receivedAt: new Date('2026-07-20T00:00:00+07:00'),
      receiptId: 'rcpt-kimquy-2007-full'
    }
  ];

  for (const lot of lots) {
    const harvest = await prisma.harvestRecord.findUnique({
      where: { id: lot.harvestId },
      include: { buyerFacility: true }
    });
    if (!harvest) {
      throw new Error(`Harvest ${lot.harvestId} not found`);
    }
    console.log(`Processing harvest ${harvest.code} (Buyer: ${harvest.buyerFacility?.name})...`);

    // Delete any existing receipts for this harvest if re-running
    await prisma.$executeRaw`DELETE FROM farmer_harvest_receipts WHERE "harvestId" = ${lot.harvestId}`;

    // Insert payment receipt
    await prisma.$executeRaw`
      INSERT INTO farmer_harvest_receipts (id, "harvestId", amount, "receivedAt", "createdAt")
      VALUES (${lot.receiptId}, ${lot.harvestId}, ${lot.amount}, ${lot.receivedAt}, NOW())
    `;

    console.log(`Paid harvest ${lot.code}: ${lot.amount.toLocaleString('vi-VN')} đ on ${lot.receivedAt.toISOString()}`);
  }

  const receipts = await prisma.$queryRaw`
    SELECT r."harvestId", h.code, r.amount::text, r."receivedAt"
    FROM farmer_harvest_receipts r
    JOIN harvest_records h ON h.id = r."harvestId"
    WHERE r."harvestId" IN (${lots[0].harvestId}, ${lots[1].harvestId})
  `;
  console.log('Verified receipts in DB:', receipts);
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
