import Link from "next/link";
import { Boxes, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supplyPackaging } from "@/lib/supply-packaging";
import { stockLedger } from "@/lib/farmer-stock-ledger";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kho vật tư của tôi | TriViet" };
const labels: Record<string, string> = { FERTILIZER: "Phân bón", PESTICIDE: "Thuốc BVTV", EQUIPMENT: "Thiết bị", OTHER: "Khác" };
const number = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 });
const money = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });
const date = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

export default async function FarmerInventoryPage({ searchParams }: { searchParams: { tab?: string; page?: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/login?callbackUrl=/materials/inventory");
    if (session.user.role !== "FARMER") redirect("/");
    const type = searchParams.tab === "OUT" ? "OUT" : searchParams.tab === "IN" ? "IN" : "STOCK";
    const where = { farmerId: session.user.id, type: type === "OUT" ? "OUT" : "IN" } as const;
    const count = type === "STOCK" ? await prisma.farmerSupply.count({ where: { farmerId: session.user.id } }) : await prisma.farmerSupplyTransaction.count({ where });
    const pages = Math.max(1, Math.ceil(count / 15));
    const requested = Number(searchParams.page || 1);
    const page = Number.isSafeInteger(requested) ? Math.min(pages, Math.max(1, requested)) : 1;
    const transactions = type === "STOCK" ? [] : await prisma.farmerSupplyTransaction.findMany({
        where, take: 15, skip: (page - 1) * 15,
        orderBy: [{ actionDate: "desc" }, { createdAt: "desc" }, { id: "desc" }],
        include: { supply: { select: { name: true, type: true, unit: true, productBatch: { select: { expiryDate: true } }, orderItem: { select: { product: { select: { packaging: true } } } } } } },
    });
    const supplies = type !== "STOCK" ? [] : await prisma.farmerSupply.findMany({
        where: { farmerId: session.user.id }, take: 15, skip: (page - 1) * 15, orderBy: [{ name: "asc" }, { id: "asc" }],
        include: { transactions: { where: { farmerId: session.user.id } }, productBatch: { select: { expiryDate: true } }, orderItem: { select: { product: { select: { packaging: true } } } } },
    });
    const columns = type === "STOCK"
        ? ["Loại vật tư", "Tên vật tư", "Đơn vị tính", "Quy cách đóng gói", "Tổng nhập", "Tổng xuất", "Tồn kho", "Ngày hết hạn"]
        : ["Ngày", "Loại vật tư", "Tên vật tư", "Số lượng", "Đơn vị tính", "Quy cách đóng gói", "Khối lượng (kg)", "Đơn giá (đ)", "Thành tiền (đ)", "Ngày hết hạn"];
    return <main className="mx-auto min-h-[calc(100vh-64px)] w-full max-w-[1650px] space-y-6 px-4 py-7 sm:px-6">
        <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">KHO VẬT TƯ CỦA TÔI</h1>
            <nav aria-label="Nhập xuất kho vật tư" className="grid grid-cols-3 gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm sm:gap-2 sm:rounded-3xl sm:p-2">
                {([ ["STOCK", "Tồn kho", Boxes], ["IN", "Nhập", ArrowDownToLine], ["OUT", "Xuất", ArrowUpFromLine] ] as const).map(([key, label, Icon]) => <Link key={key} href={`/materials/inventory?tab=${key}`} aria-current={type === key ? "page" : undefined} className={`flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-center text-xs font-bold leading-tight transition sm:min-h-12 sm:flex-row sm:gap-2 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm ${type === key ? "bg-brand-600 text-white shadow-soft" : "text-slate-600 hover:bg-brand-50 hover:text-brand-700"}`}><Icon aria-hidden="true" className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" /><span className="whitespace-nowrap">{label}</span></Link>)}
            </nav>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] border-collapse text-sm">
                    <thead className="bg-slate-50 text-slate-700"><tr>{columns.map(label => <th key={label} scope="col" className="border border-slate-200 px-4 py-4 text-center font-semibold">{label}</th>)}</tr></thead>
                    <tbody>{supplies.map(supply => {
                        const ledger = stockLedger(supply.transactions);
                        const info = supplyPackaging(supply.unit, supply.orderItem?.product?.packaging ?? null, ledger.balance);
                        return <tr key={supply.id}>{[labels[supply.type], supply.name, info.unit, info.packaging || "Chưa cập nhật", number.format(ledger.totalIn), number.format(ledger.totalOut), number.format(ledger.balance), supply.productBatch?.expiryDate ? date.format(supply.productBatch.expiryDate) : "Chưa cập nhật"].map((value, index) => <td key={index} className={`border border-slate-200 px-4 py-4 ${index === 1 ? "text-left" : "text-center"} ${index === 6 && ledger.balance <= 2 ? "font-semibold text-red-600" : ""}`}>{value}{index === 6 && ledger.invalidHistory && <span className="mt-1 block text-xs text-amber-700">Lịch sử nhập–xuất chưa khớp</span>}</td>)}</tr>;
                    })}{transactions.map(tx => {
                        const info = supplyPackaging(tx.supply.unit, tx.supply.orderItem?.product?.packaging ?? null, tx.quantity);
                        return <tr key={tx.id} className="hover:bg-slate-50">
                            {[date.format(tx.actionDate), labels[tx.supply.type] || "Khác", tx.supply.name, number.format(tx.quantity), info.unit, info.packaging || "Chưa cập nhật", info.weightKg === null ? "—" : number.format(info.weightKg), money.format(Number(tx.unitPrice)), money.format(Number(tx.totalAmount)), tx.supply.productBatch?.expiryDate ? date.format(tx.supply.productBatch.expiryDate) : "Chưa cập nhật"].map((value, index) => <td key={index} className={`border border-slate-200 px-4 py-4 ${index === 2 ? "text-left" : "text-center"}`}>{value}{index === 2 && tx.notes?.startsWith("[SAMPLE_STOCK_RECONCILIATION]") && <span title={tx.purpose || undefined} className="mt-1 block text-xs font-normal text-amber-700">Phiếu nhập mẫu đối soát</span>}</td>)}
                        </tr>;
                    })}{!count && <tr><td colSpan={columns.length} className="px-4 py-12 text-center text-slate-500">Chưa có dữ liệu {type === "STOCK" ? "tồn" : type === "IN" ? "nhập" : "xuất"} kho.</td></tr>}</tbody>
                </table>
            </div>
            <footer className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm text-slate-600">
                <span>{count} {type === "STOCK" ? "vật tư" : "giao dịch"} · Trang {page}/{pages}</span>
                <div className="flex gap-3">{page > 1 && <Link className="rounded-lg border px-4 py-2 hover:bg-slate-50" href={`/materials/inventory?tab=${type}&page=${page - 1}`}>Trước</Link>}{page < pages && <Link className="rounded-lg border px-4 py-2 hover:bg-slate-50" href={`/materials/inventory?tab=${type}&page=${page + 1}`}>Sau</Link>}</div>
            </footer>
        </section>
    </main>;
}
