import type { Prisma } from "@prisma/client";
import { lockFarmerStock } from "@/lib/farmer-material-fifo";
export async function prepareStockMovement(tx: Prisma.TransactionClient, input: { farmerId: string; supplyId: string; quantity: number; type: "IN" | "OUT" | "ADJUSTMENT"; actionDate: Date; disposal?: boolean }) {
    await lockFarmerStock(tx, input.farmerId);
    if (!Number.isFinite(input.quantity) || input.quantity <= 0 || !Number.isFinite(input.actionDate.getTime())) throw new Error("Số lượng hoặc ngày giao dịch không hợp lệ");
    const supply = await tx.farmerSupply.findFirst({ where: { id: input.supplyId, farmerId: input.farmerId }, include: { productBatch: true } });
    if (!supply) throw new Error("Không tìm thấy vật tư trong kho của bạn");
    return supply;
}
