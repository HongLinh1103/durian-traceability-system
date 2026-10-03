import type { Prisma } from "@prisma/client";
import { materialKey, groupMaterials, exportPurposeLabels, type ExportPurpose, type FifoAllocation } from "@/lib/material-fifo";
import Link from "next/link";
import { Boxes, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supplyPackaging } from "@/lib/supply-packaging";
import { stockLedger } from "@/lib/farmer-stock-ledger";
import { FarmerInventoryActionModal } from "@/components/farmer/farmer-inventory-action-modal";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kho vật tư của tôi | TriViet" };
const labels: Record<string, string> = { FERTILIZER: "Phân bón", PESTICIDE: "Thuốc BVTV", EQUIPMENT: "Thiết bị", OTHER: "Khác" };
const activityLabels: Record<string, string> = {
    FERTILIZE: "Bón phân",
    SPRAY_PESTICIDE: "Phun thuốc BVTV",
    GARDEN_SANITATION: "Vệ sinh vườn",
    BASE_FERTILIZING: "Bón phân gốc",
    FOLIAR_FERTILIZING: "Bón phân qua lá",
    OTHER: "Khác",
};
const number = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 });
const money = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });
const date = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

export default async function FarmerInventoryPage({ searchParams }: { searchParams: { tab?: string; page?: string; season?: string; purpose?: string; kind?: string; q?: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/login?callbackUrl=/materials/inventory");
    if (session.user.role !== "FARMER") redirect("/");
    const type = searchParams.tab === "OUT" ? "OUT" : searchParams.tab === "IN" ? "IN" : "STOCK";
    const where: Prisma.FarmerSupplyTransactionWhereInput = { farmerId: session.user.id, type: type === "OUT" ? "OUT" : "IN" };
    if (type === "OUT") {
        if (searchParams.season) where.cropSeasonId = searchParams.season;
        if (searchParams.purpose && searchParams.purpose in exportPurposeLabels) where.exportPurpose = searchParams.purpose;
        const supplyFilter: Prisma.FarmerSupplyWhereInput = {};
        if (["FERTILIZER", "PESTICIDE", "EQUIPMENT", "OTHER"].includes(searchParams.kind || "")) supplyFilter.type = searchParams.kind as any;
        if (searchParams.q?.trim()) supplyFilter.name = { contains: searchParams.q.trim(), mode: "insensitive" };
        where.supply = supplyFilter;
    }
    const rawSupplies = type !== "STOCK" ? [] : await prisma.farmerSupply.findMany({
        where: { farmerId: session.user.id }, orderBy: [{ name: "asc" }, { id: "asc" }],
        include: { transactions: true, productBatch: { select: { expiryDate: true } }, orderItem: { select: { product: { select: { packaging: true } } } } },
    });
    const grouped = new Map<string, typeof rawSupplies[number]>();
    for (const supply of rawSupplies) {
        const key = materialKey(supply), existing = grouped.get(key);
        if (existing) { existing.quantity += supply.quantity; existing.transactions.push(...supply.transactions); }
        else grouped.set(key, { ...supply, transactions: [...supply.transactions] });
    }
    const count = type === "STOCK" ? grouped.size : await prisma.farmerSupplyTransaction.count({ where });
    const pages = Math.max(1, Math.ceil(count / 15));
    const requested = Number(searchParams.page || 1);
    const page = Number.isSafeInteger(requested) ? Math.min(pages, Math.max(1, requested)) : 1;
    const supplies = [...grouped.values()].slice((page - 1) * 15, page * 15);
    const transactions = type === "STOCK" ? [] : await prisma.farmerSupplyTransaction.findMany({
        where, take: 15, skip: (page - 1) * 15,
        orderBy: [{ actionDate: "desc" }, { createdAt: "desc" }, { id: "desc" }],
        include: { farm: { select: { farmName: true } }, cropSeason: { select: { name: true } }, supply: { select: { name: true, type: true, unit: true, productBatch: { select: { expiryDate: true } }, orderItem: { select: { product: { select: { packaging: true } } } } } } },
    });
    const pageLink = (target: number) => "/materials/inventory?" + new URLSearchParams({ ...Object.fromEntries(Object.entries(searchParams).filter(([, value]) => value !== undefined)) as Record<string, string>, tab: type, page: String(target) }).toString();
    const allSupplies = (type === "IN" || type === "OUT") ? await prisma.farmerSupply.findMany({
        where: { farmerId: session.user.id },
        select: { id: true, name: true, type: true, unit: true, quantity: true, unitPrice: true, productId: true, orderItem: { select: { product: { select: { packaging: true } } } } },
        orderBy: { name: "asc" },
    }) : [];

    const farms = (type === "OUT") ? await prisma.farm.findMany({
        where: { farmerId: session.user.id, isActive: true },
        select: {
            id: true,
            farmName: true,
            cropSeasons: {
                select: { id: true, name: true, year: true, status: true },
                orderBy: { startedAt: "desc" },
            },
        },
        orderBy: { farmName: "asc" },
    }) : [];

    const columns = type === "STOCK"
        ? ["Loại vật tư", "Tên vật tư", "Đơn vị tính", "Quy cách đóng gói", "Tổng nhập", "Tổng xuất", "Tồn kho"]
        : type === "OUT"
        ? ["Ngày", "Loại vật tư", "Tên vật tư", "Nội dung", "Mục đích xuất", "Vườn", "Niên vụ", "Số lượng", "ĐVT", "Quy cách", "Khối lượng (kg)", "Thành tiền (đ)", "Thao tác"]
        : ["Ngày", "Loại vật tư", "Tên vật tư", "Số lượng", "Đơn vị tính", "Quy cách đóng gói", "Khối lượng (kg)", "Đơn giá (đ)", "Thành tiền (đ)", "Ngày hết hạn"];

    return (
        <main className="mx-auto min-h-[calc(100vh-64px)] w-full max-w-[1650px] space-y-6 px-4 py-7 sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">KHO VẬT TƯ CỦA TÔI</h1>
                    <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                        {type === "STOCK" && "Theo dõi số lượng tồn kho và hạn sử dụng của từng loại vật tư nông nghiệp."}
                        {type === "IN" && "Lịch sử các đợt nhập phân bón, thuốc BVTV, thiết bị vào kho lưu trữ."}
                        {type === "OUT" && "Theo dõi lịch sử xuất kho và mục đích sử dụng vật tư."}
                    </p>
                </div>
                {type === "IN" && (
                    <FarmerInventoryActionModal
                        mode="IN"
                        supplies={JSON.parse(JSON.stringify(groupMaterials(allSupplies.map(s => {
                            const info = supplyPackaging(s.unit, s.orderItem?.product?.packaging || null, s.quantity);
                            return { ...s, unit: info.unit, packaging: info.packaging };
                        }))))}
                        farms={[]}
                    />
                )}
                {type === "OUT" && (
                    <FarmerInventoryActionModal
                        mode="OUT"
                        supplies={JSON.parse(JSON.stringify(allSupplies.map(s => {
                            const info = supplyPackaging(s.unit, s.orderItem?.product?.packaging || null, s.quantity);
                            return { ...s, unit: info.unit, packaging: info.packaging };
                        })))}
                        farms={JSON.parse(JSON.stringify(farms))}
                    />
                )}
            </div>

            <nav aria-label="Nhập xuất kho vật tư" className="grid grid-cols-3 gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm sm:gap-2 sm:rounded-3xl sm:p-2">
                {([ ["STOCK", "Tồn kho", Boxes], ["IN", "Nhập", ArrowDownToLine], ["OUT", "Xuất", ArrowUpFromLine] ] as const).map(([key, label, Icon]) => (
                    <Link
                        key={key}
                        href={`/materials/inventory?tab=${key}`}
                        aria-current={type === key ? "page" : undefined}
                        className={`flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-center text-xs font-bold leading-tight transition sm:min-h-12 sm:flex-row sm:gap-2 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm ${
                            type === key ? "bg-brand-600 text-white shadow-soft" : "text-slate-600 hover:bg-brand-50 hover:text-brand-700"
                        }`}
                    >
                        <Icon aria-hidden="true" className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
                        <span className="whitespace-nowrap">{label}</span>
                    </Link>
                ))}
            </nav>

            {type === "OUT" && <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-5">
                <input type="hidden" name="tab" value="OUT" />
                <label className="text-sm">Niên vụ<select name="season" defaultValue={searchParams.season || ""} className="mt-1 h-10 w-full rounded-xl border px-2"><option value="">Tất cả niên vụ</option>{farms.flatMap(f => f.cropSeasons.map(c => <option key={c.id} value={c.id}>{f.farmName} · {c.name}</option>))}</select></label>
                <label className="text-sm">Mục đích xuất<select name="purpose" defaultValue={searchParams.purpose || ""} className="mt-1 h-10 w-full rounded-xl border px-2"><option value="">Tất cả</option>{Object.entries(exportPurposeLabels).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>
                <label className="text-sm">Loại vật tư<select name="kind" defaultValue={searchParams.kind || ""} className="mt-1 h-10 w-full rounded-xl border px-2"><option value="">Tất cả loại</option>{Object.entries(labels).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>
                <label className="text-sm">Tìm kiếm<input name="q" defaultValue={searchParams.q || ""} placeholder="Tên vật tư..." className="mt-1 h-10 w-full rounded-xl border px-3" /></label>
                <button type="submit" className="self-end rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Lọc</button>
            </form>}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className={`w-full border-collapse text-sm ${type === "OUT" ? "min-w-[1200px]" : "min-w-[1050px]"}`}>
                        <thead className="bg-slate-50 text-slate-700">
                            <tr>
                                {columns.map((label) => (
                                    <th key={label} scope="col" className="border border-slate-200 px-4 py-4 text-center font-semibold">
                                        {label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {supplies.map((supply) => {
                                const ledger = stockLedger(supply.transactions);
                                const info = supplyPackaging(supply.unit, supply.orderItem?.product?.packaging ?? null, ledger.balance);
                                return (
                                    <tr key={supply.id} className="hover:bg-slate-50/70 transition">
                                        {[
                                            labels[supply.type],
                                            supply.name,
                                            info.unit,
                                            info.packaging || "Chưa cập nhật",
                                            number.format(ledger.totalIn),
                                            number.format(ledger.totalOut),
                                            number.format(ledger.balance),
                                        ].map((value, index) => (
                                            <td
                                                key={index}
                                                className={`border border-slate-200 px-4 py-4 ${index === 1 ? "text-left font-semibold text-slate-900" : "text-center"} ${
                                                    index === 6 && ledger.balance <= 2 ? "font-semibold text-red-600" : ""
                                                }`}
                                            >
                                                {value}
                                                {index === 6 && ledger.invalidHistory && (
                                                    <span className="mt-1 block text-xs text-amber-700">Lịch sử nhập–xuất chưa khớp</span>
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}
                            {transactions.map((tx) => {
                                const info = supplyPackaging(tx.supply.unit, tx.supply.orderItem?.product?.packaging ?? null, tx.quantity);
                                const purposeText = tx.purpose || (tx.activityType ? activityLabels[tx.activityType] : null) || tx.notes || "—";
                                const exportPurpose = (tx.exportPurpose || (tx.farmId && tx.cropSeasonId ? "CULTIVATION" : "OTHER")) as ExportPurpose;
                                const allocations = Array.isArray(tx.fifoAllocations) ? tx.fifoAllocations as unknown as FifoAllocation[] : [];
                                const badge = <span className={"inline-block whitespace-nowrap rounded-full px-2 py-1 text-xs font-semibold " + (exportPurpose === "CULTIVATION" ? "bg-green-50 text-green-700" : exportPurpose === "DISPOSAL" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600")}>{exportPurposeLabels[exportPurpose]}</span>;
                                const detail = <details><summary className="cursor-pointer whitespace-nowrap text-brand-700">Chi tiết FIFO</summary>{allocations.length ? <table className="mt-2 min-w-[430px] text-xs"><thead><tr>{["Ngày nhập", "Số lượng lấy", "Đơn giá", "HSD"].map(label => <th key={label} className="p-2">{label}</th>)}</tr></thead><tbody>{allocations.map((a, i) => <tr key={i}><td className="p-2">{date.format(new Date(a.actionDate))}</td><td className="p-2">{number.format(a.quantity)} {info.unit}</td><td className="p-2">{money.format(a.unitPrice)} đ</td><td className="p-2">{a.expiryDate ? date.format(new Date(a.expiryDate)) : "—"}</td></tr>)}</tbody></table> : <p className="mt-2 text-xs text-slate-500">Giao dịch cũ chưa có phân bổ FIFO.</p>}</details>;
                                const cells = type === "OUT"
                                    ? [
                                        { value: date.format(tx.actionDate), className: "text-center" },
                                        { value: labels[tx.supply.type] || "Khác", className: "text-center" },
                                        { value: tx.supply.name, className: "text-left font-medium text-slate-900" },
                                        { value: tx.notes || purposeText, className: "text-left text-slate-700" },
                                        { value: badge, className: "text-center" },
                                        { value: exportPurpose === "CULTIVATION" ? tx.farm?.farmName || "—" : "—", className: "text-center" },
                                        { value: exportPurpose === "CULTIVATION" ? tx.cropSeason?.name || "—" : "—", className: "text-center" },
                                        { value: number.format(tx.quantity), className: "text-center" },
                                        { value: info.unit, className: "text-center" },
                                        { value: info.packaging || "Chưa cập nhật", className: "text-center" },
                                        { value: info.weightKg === null ? "—" : number.format(info.weightKg), className: "text-center" },
                                        { value: money.format(Number(tx.totalAmount)), className: "text-center" },
                                        { value: detail, className: "text-left" },
                                    ]
                                    : [
                                        { value: date.format(tx.actionDate), className: "text-center" },
                                        { value: labels[tx.supply.type] || "Khác", className: "text-center" },
                                        { value: tx.supply.name, className: "text-left font-medium text-slate-900" },
                                        { value: number.format(tx.quantity), className: "text-center" },
                                        { value: info.unit, className: "text-center" },
                                        { value: info.packaging || "Chưa cập nhật", className: "text-center" },
                                        { value: info.weightKg === null ? "—" : number.format(info.weightKg), className: "text-center" },
                                        { value: money.format(Number(tx.unitPrice)), className: "text-center" },
                                        { value: money.format(Number(tx.totalAmount)), className: "text-center" },
                                        { value: tx.expiryDate ? date.format(tx.expiryDate) : tx.supply.productBatch?.expiryDate ? date.format(tx.supply.productBatch.expiryDate) : "Chưa cập nhật", className: "text-center" },
                                    ];

                                return (
                                    <tr key={tx.id} className="hover:bg-slate-50/70 transition">
                                        {cells.map((cell, index) => (
                                            <td
                                                key={index}
                                                className={`border border-slate-200 px-4 py-4 ${cell.className}`}
                                            >
                                                {cell.value}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}
                            {!count && (
                                <tr>
                                    <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-500">
                                        Chưa có dữ liệu {type === "STOCK" ? "tồn" : type === "IN" ? "nhập" : "xuất"} kho.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <footer className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm text-slate-600 border-t border-slate-200 bg-slate-50/50">
                    <span>
                        {count} {type === "STOCK" ? "vật tư" : "giao dịch"} · Trang {page}/{pages}
                    </span>
                    <div className="flex gap-3">
                        {page > 1 && (
                            <Link className="rounded-lg border border-slate-200 bg-white px-4 py-2 hover:bg-slate-50 font-medium" href={pageLink(page - 1)}>
                                Trước
                            </Link>
                        )}
                        {page < pages && (
                            <Link className="rounded-lg border border-slate-200 bg-white px-4 py-2 hover:bg-slate-50 font-medium" href={pageLink(page + 1)}>
                                Sau
                            </Link>
                        )}
                    </div>
                </footer>
            </section>
        </main>
    );
}
