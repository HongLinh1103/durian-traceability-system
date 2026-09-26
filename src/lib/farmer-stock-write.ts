import type { Prisma } from "@prisma/client";
import { stockLedger } from "@/lib/farmer-stock-ledger";

export async function prepareStockMovement(tx: Prisma.TransactionClient, input: { farmerId: string; supplyId: string; quantity: number; type: "IN" | "OUT" | "ADJUSTMENT"; actionDate: Date; disposal?: boolean }) {
    const locked = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM farmer_supplies WHERE id = ${input.supplyId} AND "farmerId" = ${input.farmerId} FOR UPDATE`;
    if (!locked.length) throw new Error("Không tìm thấy vật tư trong kho của bạn");
    if (!Number.isFinite(input.quantity) || input.quantity <= 0 || !Number.isFinite(input.actionDate.getTime())) throw new Error("Số lượng hoặc ngày giao dịch không hợp lệ");
    const supply = await tx.farmerSupply.findUniqueOrThrow({ where: { id: input.supplyId }, include: { productBatch: true } });
    const history = await tx.farmerSupplyTransaction.findMany({ where: { supplyId: input.supplyId, farmerId: input.farmerId } });
    const before = stockLedger(history);
    if (input.type === "OUT") {
        if (before.invalidHistory) throw new Error("Lịch sử nhập–xuất chưa khớp. Cần đối chiếu chứng từ trước khi xuất thêm.");
        if (input.quantity > before.balance) throw new Error("Số lượng xuất vượt tồn kho theo lịch sử nhập–xuất");
        const expiry = supply.productBatch?.expiryDate;
        if (!input.disposal && expiry && input.actionDate.toISOString().slice(0, 10) > expiry.toISOString().slice(0, 10)) throw new Error("Vật tư đã hết hạn, không thể xuất sử dụng");
    }
    const after = stockLedger([...history, { ...input, createdAt: new Date() }]);
    if (input.type === "OUT" && after.invalidHistory) throw new Error("Ngày xuất hoặc số lượng xuất không khớp với lịch sử nhập kho");
    await tx.farmerSupply.update({ where: { id: supply.id }, data: { quantity: after.balance } });
    return supply;
}
