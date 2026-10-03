import { supplyPackaging } from "@/lib/supply-packaging";

export const exportPurposeLabels = { CULTIVATION: "Phục vụ canh tác", DISPOSAL: "Hủy vật tư", OTHER: "Khác" } as const;
export type ExportPurpose = keyof typeof exportPurposeLabels;
export type FifoAllocation = { transactionId: string; supplyId: string; actionDate: string; quantity: number; unitPrice: number; expiryDate: string | null };
type SupplyIdentity = { name: string; type: string; unit: string; productId?: string | null; packaging?: string | null; orderItem?: { product?: { packaging?: string | null } | null } | null };
export function materialKey(s: SupplyIdentity) {
    const normalize = (v: string) => v.trim().toLocaleLowerCase("vi").replace(/\s+/g, " ");
    const info = supplyPackaging(s.unit, s.packaging || s.orderItem?.product?.packaging || null, 0);
    return JSON.stringify([normalize(s.name), s.type, normalize(info.unit), normalize(info.packaging || "")]);
}
export function groupMaterials<T extends SupplyIdentity & { id: string; quantity: number }>(supplies: T[]) {
    const groups = new Map<string, T & { memberIds: string[] }>();
    for (const s of supplies) {
        const key = materialKey(s), existing = groups.get(key);
        if (existing) { existing.quantity += s.quantity; existing.memberIds.push(s.id); }
        else groups.set(key, { ...s, memberIds: [s.id] });
    }
    return [...groups.values()];
}
export type FifoMovement = { id: string; supplyId: string; type: string; quantity: number; unitPrice: number; actionDate: Date; createdAt: Date; expiryDate?: Date | null };
/** Replay the complete ledger so backdated edits also revalue subsequent exports. */
export function allocateFifo(movements: FifoMovement[]) {
    const lots: Array<FifoMovement & { remaining: number }> = [];
    const exports = new Map<string, { allocations: FifoAllocation[]; totalAmount: number }>();
    const ordered = [...movements].sort((a, b) => a.actionDate.getTime() - b.actionDate.getTime() ||
        (a.type === "IN" ? -1 : 0) - (b.type === "IN" ? -1 : 0) || a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));
    for (const m of ordered) {
        if (!Number.isFinite(m.quantity) || m.quantity < 0 || !Number.isFinite(m.unitPrice)) throw new Error("Lịch sử kho có số lượng hoặc đơn giá không hợp lệ");
        if (m.type === "IN") lots.push({ ...m, remaining: m.quantity });
        else if (m.type === "ADJUSTMENT") {
            for (const lot of lots) lot.remaining = 0;
            lots.push({ ...m, remaining: m.quantity });
        } else if (m.type === "OUT") {
            let needed = m.quantity, totalAmount = 0;
            const allocations: FifoAllocation[] = [];
            for (const lot of lots) {
                const quantity = Math.min(needed, lot.remaining);
                if (quantity <= 0) continue;
                lot.remaining -= quantity; needed -= quantity;
                totalAmount += quantity * lot.unitPrice;
                allocations.push({ transactionId: lot.id, supplyId: lot.supplyId, actionDate: lot.actionDate.toISOString(), quantity, unitPrice: lot.unitPrice, expiryDate: lot.expiryDate?.toISOString() || null });
                if (needed < 1e-6) break;
            }
            if (needed > 1e-6) throw new Error("Số lượng sử dụng vượt quá số lượng tồn tại ngày xuất. Vui lòng kiểm tra số lượng và ngày nhập kho.");
            exports.set(m.id, { allocations, totalAmount: Math.round(totalAmount * 100) / 100 });
        }
    }
    const balances = new Map<string, number>();
    for (const lot of lots) balances.set(lot.supplyId, (balances.get(lot.supplyId) || 0) + lot.remaining);
    return { exports, balances };
}
