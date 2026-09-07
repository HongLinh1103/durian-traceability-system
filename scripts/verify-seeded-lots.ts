import { prisma } from "../src/lib/prisma";
import { getPublicTrace } from "../src/lib/traceability";

async function main() {
    console.log("--- KIỂM TRA TRUY XUẤT 2 LÔ CỦA TRỊ AN ---");
    const t1 = await getPublicTrace("EXP-20260904-001");
    console.log("Lô 1 tìm thấy:", Boolean(t1));
    if (t1) {
        console.log("Product:", t1.commercialLot?.productName);
        console.log("Token:", t1.publicToken);
        console.log("Milestones count:", t1.milestones?.length);
        for (const m of t1.milestones || []) {
            console.log(`  [${m.stepNumber}] ${m.title} (${m.type}) - ${m.dateText}`);
        }
    }

    const t2 = await getPublicTrace("DOM-20260904-001");
    console.log("\nLô 2 tìm thấy:", Boolean(t2));
    if (t2) {
        console.log("Product:", t2.commercialLot?.productName);
        console.log("Token:", t2.publicToken);
        console.log("Milestones count:", t2.milestones?.length);
        for (const m of t2.milestones || []) {
            console.log(`  [${m.stepNumber}] ${m.title} (${m.type}) - ${m.dateText}`);
        }
    }

    console.log("\n--- KIỂM TRA DỮ LIỆU TÀI CHÍNH TRỊ AN TRONG DATABASE ---");
    const facility = await prisma.partnerFacility.findFirst({
        where: { name: { contains: "Trị An" } },
    });
    if (facility) {
        const commercialLots = await prisma.commercialLot.findMany({
            where: { ownerId: facility.id },
            include: { paymentRecords: true },
        });
        console.log(`Tổng Commercial Lots trong DB: ${commercialLots.length}`);
        for (const c of commercialLots) {
            console.log(`- Mã lô: ${c.lotCode}, Tên: ${c.productName}, SL: ${c.quantity} ${c.unit}, Đơn giá: ${c.unitPrice?.toLocaleString()} đ, Tổng thu: ${c.totalAmount?.toLocaleString()} đ, Thanh toán: ${c.paymentStatus} (${c.paidAmount?.toLocaleString()} đ)`);
            console.log(`  Số phiếu thu: ${c.paymentRecords.length}`);
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
