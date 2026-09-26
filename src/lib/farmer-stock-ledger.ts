type Movement = { type: string; quantity: number; actionDate: Date; createdAt?: Date; farmerId?: string };

export function stockLedger(movements: Movement[]) {
    let totalIn = 0, totalOut = 0, balance = 0, invalidHistory = false;
    const sorted = [...movements].sort((a, b) => {
        const timeA = a.actionDate instanceof Date ? a.actionDate.getTime() : new Date(a.actionDate).getTime();
        const timeB = b.actionDate instanceof Date ? b.actionDate.getTime() : new Date(b.actionDate).getTime();
        const diff = timeA - timeB;
        if (diff !== 0) return diff;
        // Nếu cùng ngày, ưu tiên xử lý nhập kho (IN) trước xuất kho (OUT)
        if (a.type === "IN" && b.type !== "IN") return -1;
        if (a.type !== "IN" && b.type === "IN") return 1;
        const createdA = a.createdAt ? (a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime()) : 0;
        const createdB = b.createdAt ? (b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime()) : 0;
        return createdA - createdB;
    });
    for (const tx of sorted) {
        if (tx.type === "IN") { totalIn += tx.quantity; balance += tx.quantity; }
        else if (tx.type === "OUT") { totalOut += tx.quantity; balance -= tx.quantity; }
        else if (tx.type === "ADJUSTMENT") balance = tx.quantity;
        if (balance < -0.000001) invalidHistory = true;
    }
    return { totalIn, totalOut, balance: Math.round(balance * 1e6) / 1e6, invalidHistory };
}

/** Disposals reduce physical stock, but are not cultivation usage costs. */
export function isSupplyUsage(tx: { type: string; purpose?: string | null; notes?: string | null }) {
    if (tx.type !== "OUT") return false;
    const normalize = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
    const purpose = normalize(tx.purpose || "");
    const notes = normalize(tx.notes || "");
    return !notes.includes("[disposal]") && !/\b(xuat huy|tieu huy|huy bo|huy do het han)\b/.test(notes) && !/\b(huy|het han|tra hang|dispose|disposal|expired)\b/.test(purpose);
}
