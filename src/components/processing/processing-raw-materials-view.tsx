'use client';

import { useMemo, useState } from "react";
import {
    Boxes,
    Calendar,
    CheckCircle2,
    Clock,
    Layers,
    Loader2,
    Search,
    SlidersHorizontal,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export type RawMaterialItem = {
    id: string;
    code: string;
    sourceCode?: string;
    farmName: string;
    variety: string;
    supplierName?: string;
    receivedAt?: string | Date | null;
    actualReceivedWeight: number;
    currentWeight: number;
    status: "PENDING_RECEIPT" | "PENDING_QC" | "AVAILABLE" | "PARTIALLY_USED" | "USED" | "REJECTED";
    direction: "UNCLASSIFIED" | "FRESH_EXPORT" | "PROCESSING" | "SPLIT";
    freshExportWeight?: number;
    processingWeight?: number;
    qualityResult?: string | null;
};

export function ProcessingRawMaterialsView({ initialItems }: { initialItems: RawMaterialItem[] }) {
    const { toast } = useToast();
    const [items, setItems] = useState<RawMaterialItem[]>(initialItems);
    const [searchQuery, setSearchQuery] = useState("");
    const [dateFilter, setDateFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [varietyFilter, setVarietyFilter] = useState<string>("ALL");
    const [selectedItem, setSelectedItem] = useState<RawMaterialItem | null>(null);
    const [directionMode, setDirectionMode] = useState<"FRESH_EXPORT" | "PROCESSING" | "SPLIT">("FRESH_EXPORT");
    const [freshWeightInput, setFreshWeightInput] = useState<number | string>("");
    const [procWeightInput, setProcWeightInput] = useState<number | string>("");
    const [noteInput, setNoteInput] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const kpis = useMemo(() => {
        const waitingReceipt = items.filter((i) => i.status === "PENDING_RECEIPT").length;
        const waitingClassification = items.filter((i) => ["PENDING_QC", "AVAILABLE"].includes(i.status) && i.direction === "UNCLASSIFIED").length;
        const classified = items.filter((i) => i.direction !== "UNCLASSIFIED").length;
        const todayStr = new Date().toISOString().slice(0, 10);
        const todayWeight = items
            .filter((i) => {
                if (!i.receivedAt) return false;
                try { return new Date(i.receivedAt).toISOString().slice(0, 10) === todayStr; } catch { return false; }
            })
            .reduce((sum, i) => sum + (i.actualReceivedWeight || 0), 0);
        return { waitingReceipt, waitingClassification, classified, todayWeight };
    }, [items]);

    const filteredItems = useMemo(() => {
        return items.filter((item) => {
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchCode = item.code.toLowerCase().includes(q) || (item.sourceCode && item.sourceCode.toLowerCase().includes(q));
                const matchFarm = item.farmName.toLowerCase().includes(q) || (item.supplierName && item.supplierName.toLowerCase().includes(q));
                const matchVariety = item.variety.toLowerCase().includes(q);
                if (!matchCode && !matchFarm && !matchVariety) return false;
            }
            if (dateFilter) {
                if (!item.receivedAt) return false;
                try { if (new Date(item.receivedAt).toISOString().slice(0, 10) !== dateFilter) return false; } catch { return false; }
            }
            if (statusFilter !== "ALL") {
                if (statusFilter === "PENDING_RECEIPT" && item.status !== "PENDING_RECEIPT") return false;
                if (statusFilter === "WAITING_CLASSIFICATION" && !(["PENDING_QC", "AVAILABLE"].includes(item.status) && item.direction === "UNCLASSIFIED")) return false;
                if (statusFilter === "CLASSIFIED" && item.direction === "UNCLASSIFIED") return false;
                if (statusFilter === "REJECTED" && item.status !== "REJECTED") return false;
            }
            if (varietyFilter !== "ALL") {
                if (varietyFilter === "Ri6" && !item.variety.toLowerCase().includes("ri6")) return false;
                if (varietyFilter === "Monthong" && !item.variety.toLowerCase().includes("monthong") && !item.variety.toLowerCase().includes("dona")) return false;
                if (varietyFilter === "Khác" && (item.variety.toLowerCase().includes("ri6") || item.variety.toLowerCase().includes("monthong") || item.variety.toLowerCase().includes("dona"))) return false;
            }
            return true;
        });
    }, [items, searchQuery, dateFilter, statusFilter, varietyFilter]);

    const openClassifyDrawer = (item: RawMaterialItem) => {
        setSelectedItem(item);
        setDirectionMode(item.direction === "UNCLASSIFIED" ? "FRESH_EXPORT" : item.direction);
        const maxW = item.currentWeight || item.actualReceivedWeight || 0;
        setFreshWeightInput(item.freshExportWeight || maxW);
        setProcWeightInput(item.processingWeight || 0);
        setNoteInput("");
    };

    const handleConfirmClassification = async () => {
        if (!selectedItem) return;
        const totalAvail = selectedItem.currentWeight || selectedItem.actualReceivedWeight || 0;
        let freshW = 0;
        let procW = 0;
        if (directionMode === "FRESH_EXPORT") { freshW = totalAvail; procW = 0; }
        else if (directionMode === "PROCESSING") { freshW = 0; procW = totalAvail; }
        else {
            freshW = Number(freshWeightInput) || 0;
            procW = Number(procWeightInput) || 0;
            if (freshW + procW <= 0) { toast({ title: "Khối lượng không hợp lệ", description: "Vui lòng nhập khối lượng cho ít nhất 1 nhánh.", variant: "destructive" }); return; }
            if (freshW + procW > totalAvail + 0.01) { toast({ title: "Vượt quá khối lượng", description: `Tổng phân loại (${freshW + procW} kg) vượt quá khối lượng lô (${totalAvail} kg).`, variant: "destructive" }); return; }
        }
        setSubmitting(true);
        try {
            const res = await fetch(`/api/processing/raw-materials/${selectedItem.id}/classify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ freshExportWeight: freshW, processingWeight: procW, note: noteInput }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || "Không thể lưu phân loại.");
            toast({ title: "Phân loại thành công", description: `Đã phân loại lô ${selectedItem.code}.`, variant: "success" });
            setItems((prev) => prev.map((i) => i.id === selectedItem.id ? { ...i, direction: freshW > 0 && procW > 0 ? "SPLIT" : freshW > 0 ? "FRESH_EXPORT" : "PROCESSING", freshExportWeight: freshW, processingWeight: procW, status: procW > 0 ? "AVAILABLE" : "USED" } : i));
            setSelectedItem(null);
        } catch (err: any) { toast({ title: "Lỗi", description: err.message || "Có lỗi xảy ra.", variant: "destructive" }); }
        finally { setSubmitting(false); }
    };

    return (
        <div className="space-y-6">
            <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <span>Cơ sở chế biến</span>
                <span>/</span>
                <span className="text-emerald-700 font-bold">Tiếp nhận & Phân loại</span>
            </nav>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-5">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Tiếp nhận & Phân loại</h1>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500">Quản lý đầu vào từ Farm, kiểm tra tiếp nhận và phân chia nhánh Trái tươi xuất khẩu hoặc Chuyển chế biến.</p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                        <div className="flex items-center gap-2 text-amber-700 text-xs font-bold uppercase tracking-wider"><Clock className="h-4 w-4 shrink-0" /><span>Chờ tiếp nhận</span></div>
                        <p className="mt-2 text-2xl font-black text-amber-900">{kpis.waitingReceipt}</p>
                    </div>
                    <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4">
                        <div className="flex items-center gap-2 text-sky-700 text-xs font-bold uppercase tracking-wider"><SlidersHorizontal className="h-4 w-4 shrink-0" /><span>Chờ phân loại</span></div>
                        <p className="mt-2 text-2xl font-black text-sky-900">{kpis.waitingClassification}</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                        <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold uppercase tracking-wider"><CheckCircle2 className="h-4 w-4 shrink-0" /><span>Đã phân loại</span></div>
                        <p className="mt-2 text-2xl font-black text-emerald-900">{kpis.classified}</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-500 text-white p-4 shadow-soft">
                        <div className="flex items-center gap-2 text-emerald-100 text-xs font-bold uppercase tracking-wider"><Boxes className="h-4 w-4 shrink-0" /><span>Tổng nhận hôm nay</span></div>
                        <p className="mt-2 text-2xl font-black text-white">{kpis.todayWeight.toLocaleString("vi-VN")} kg</p>
                    </div>
                </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Tìm mã lô / Farm..." className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 text-xs font-semibold focus:border-emerald-500 focus:bg-white focus:outline-none" /></div>
                    <div className="relative"><Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 text-xs font-semibold focus:border-emerald-500 focus:bg-white focus:outline-none" /></div>
                    <div><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-semibold focus:border-emerald-500 focus:bg-white focus:outline-none"><option value="ALL">Tất cả trạng thái</option><option value="PENDING_RECEIPT">Chờ tiếp nhận</option><option value="WAITING_CLASSIFICATION">Chờ phân loại</option><option value="CLASSIFIED">Đã phân loại</option><option value="REJECTED">Không đạt</option></select></div>
                    <div><select value={varietyFilter} onChange={(e) => setVarietyFilter(e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-semibold focus:border-emerald-500 focus:bg-white focus:outline-none"><option value="ALL">Tất cả loại hàng</option><option value="Ri6">Sầu riêng Ri6</option><option value="Monthong">Sầu riêng Monthong / Dona</option><option value="Khác">Giống khác</option></select></div>
                </div>
            </div>
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-600">
                            <tr>
                                <th className="px-5 py-4 whitespace-nowrap">Mã lô</th>
                                <th className="px-5 py-4 whitespace-nowrap">Farm / Vùng trồng</th>
                                <th className="px-5 py-4 whitespace-nowrap">Ngày nhận</th>
                                <th className="px-5 py-4 whitespace-nowrap text-right">Khối lượng</th>
                                <th className="px-5 py-4 text-center whitespace-nowrap">Trạng thái</th>
                                <th className="px-5 py-4 text-center whitespace-nowrap">Phân loại</th>
                                <th className="px-5 py-4 text-right whitespace-nowrap">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                            {filteredItems.map((item) => {
                                const isUnclassified = item.direction === "UNCLASSIFIED";
                                const isWaitingReceipt = item.status === "PENDING_RECEIPT";
                                const isRejected = item.status === "REJECTED" || item.qualityResult === "REJECTED";
                                return (
                                    <tr key={item.id} className="h-14 hover:bg-slate-50/70 transition">
                                        <td className="px-5 py-3 whitespace-nowrap"><span className="font-mono font-bold text-slate-900 text-xs">{item.code}</span>{item.sourceCode && item.sourceCode !== item.code && (<span className="block text-[10px] text-slate-400 font-mono">Nguồn: {item.sourceCode}</span>)}</td>
                                        <td className="px-5 py-3 whitespace-nowrap"><p className="font-bold text-slate-800 text-xs sm:text-sm">{item.farmName}</p><p className="text-[11px] text-slate-500">{item.variety}</p></td>
                                        <td className="px-5 py-3 whitespace-nowrap text-xs text-slate-600">{item.receivedAt ? new Date(item.receivedAt).toLocaleDateString("vi-VN") : "—"}</td>
                                        <td className="px-5 py-3 whitespace-nowrap text-right font-black text-slate-900 text-xs sm:text-sm">{(item.actualReceivedWeight || item.currentWeight || 0).toLocaleString("vi-VN")} kg</td>
                                        <td className="px-5 py-3 text-center whitespace-nowrap">{isWaitingReceipt ? (<span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">Chờ tiếp nhận</span>) : isRejected ? (<span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700">Không đạt</span>) : isUnclassified ? (<span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-700">Chờ phân loại</span>) : (<span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">Đã phân loại</span>)}</td>
                                        <td className="px-5 py-3 text-center whitespace-nowrap">{item.direction === "FRESH_EXPORT" ? (<span className="inline-flex items-center gap-1 font-bold text-emerald-700 text-xs">📦 Trái tươi xuất khẩu</span>) : item.direction === "PROCESSING" ? (<span className="inline-flex items-center gap-1 font-bold text-indigo-700 text-xs">⚙️ Chuyển chế biến</span>) : item.direction === "SPLIT" ? (<span className="inline-flex items-center gap-1 font-bold text-amber-700 text-xs">🔀 Hỗn hợp ({item.freshExportWeight} / {item.processingWeight} kg)</span>) : (<span className="text-slate-400 text-xs">—</span>)}</td>
                                        <td className="px-5 py-3 text-right whitespace-nowrap"><Button size="sm" onClick={() => openClassifyDrawer(item)} variant={isUnclassified ? "default" : "outline"} className={`h-8 rounded-xl text-xs font-bold ${isUnclassified ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-soft" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}>{isUnclassified ? "Phân loại" : "Đổi phân loại"}</Button></td>
                                    </tr>
                                );
                            })}
                            {filteredItems.length === 0 && (<tr><td colSpan={7} className="py-12 text-center text-xs text-slate-400">Không tìm thấy lô nguyên liệu nào phù hợp với bộ lọc.</td></tr>)}
                        </tbody>
                    </table>
                </div>
            </div>
            {selectedItem && (
                <div className="fixed inset-0 z-[120] flex justify-end bg-slate-950/40 backdrop-blur-sm transition">
                    <div className="relative flex h-full w-full max-w-md flex-col justify-between border-l border-slate-200 bg-white p-6 shadow-2xl animate-in slide-in-from-right duration-200">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div><span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Quy trình xưởng</span><h2 className="text-xl font-black text-slate-900">PHÂN LOẠI LÔ</h2></div>
                                <button type="button" onClick={() => setSelectedItem(null)} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button>
                            </div>
                            <div className="rounded-2xl bg-slate-50 p-4 space-y-1.5 text-xs text-slate-700">
                                <p className="flex justify-between"><span className="text-slate-500">Mã lô:</span><span className="font-mono font-bold text-slate-900">{selectedItem.code}</span></p>
                                <p className="flex justify-between"><span className="text-slate-500">Farm:</span><span className="font-bold text-slate-800">{selectedItem.farmName}</span></p>
                                <p className="flex justify-between"><span className="text-slate-500">Khối lượng:</span><span className="font-black text-emerald-700 text-sm">{(selectedItem.currentWeight || selectedItem.actualReceivedWeight || 0).toLocaleString("vi-VN")} kg</span></p>
                            </div>
                            <div className="space-y-3 pt-2">
                                <label className="block text-xs font-bold uppercase tracking-wide text-slate-700">Hướng xử lý</label>
                                <div className="space-y-2">
                                    <label className={`flex cursor-pointer items-center justify-between rounded-2xl border p-3.5 transition ${directionMode === "FRESH_EXPORT" ? "border-emerald-500 bg-emerald-50/70 text-emerald-950 font-bold ring-2 ring-emerald-500/20" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
                                        <div className="flex items-center gap-3"><input type="radio" name="directionMode" checked={directionMode === "FRESH_EXPORT"} onChange={() => setDirectionMode("FRESH_EXPORT")} className="h-4 w-4 text-emerald-600 focus:ring-emerald-500" /><div><p className="text-xs font-bold text-slate-900">Trái tươi xuất khẩu</p><p className="text-[11px] text-slate-500">Toàn bộ lô chuyển sang đóng gói thùng xuất</p></div></div><span className="text-xs font-bold text-emerald-700">100%</span>
                                    </label>
                                    <label className={`flex cursor-pointer items-center justify-between rounded-2xl border p-3.5 transition ${directionMode === "PROCESSING" ? "border-indigo-500 bg-indigo-50/70 text-indigo-950 font-bold ring-2 ring-indigo-500/20" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
                                        <div className="flex items-center gap-3"><input type="radio" name="directionMode" checked={directionMode === "PROCESSING"} onChange={() => setDirectionMode("PROCESSING")} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500" /><div><p className="text-xs font-bold text-slate-900">Chuyển chế biến</p><p className="text-[11px] text-slate-500">Bóc múi, sấy, cấp đông</p></div></div><span className="text-xs font-bold text-indigo-700">100%</span>
                                    </label>
                                    <label className={`flex cursor-pointer items-center justify-between rounded-2xl border p-3.5 transition ${directionMode === "SPLIT" ? "border-amber-500 bg-amber-50/70 text-amber-950 font-bold ring-2 ring-amber-500/20" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
                                        <div className="flex items-center gap-3"><input type="radio" name="directionMode" checked={directionMode === "SPLIT"} onChange={() => setDirectionMode("SPLIT")} className="h-4 w-4 text-amber-600 focus:ring-amber-500" /><div><p className="text-xs font-bold text-slate-900">Chia lô</p><p className="text-[11px] text-slate-500">Tách phần xuất trái tươi và phần chế biến</p></div></div><span className="text-xs font-bold text-amber-700">Tùy chỉnh</span>
                                    </label>
                                </div>
                                {directionMode === "SPLIT" && (
                                    <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-3.5 space-y-3 animate-in fade-in duration-150">
                                        <div><label className="block text-xs font-bold text-slate-700 mb-1">Trái tươi xuất khẩu (kg)</label><input type="number" value={freshWeightInput} onChange={(e) => setFreshWeightInput(e.target.value)} className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-none" /></div>
                                        <div><label className="block text-xs font-bold text-slate-700 mb-1">Chuyển chế biến (kg)</label><input type="number" value={procWeightInput} onChange={(e) => setProcWeightInput(e.target.value)} className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 focus:border-indigo-500 focus:outline-none" /></div>
                                    </div>
                                )}
                                <div><label className="block text-xs font-bold text-slate-600 mb-1">Ghi chú</label><textarea rows={2} value={noteInput} onChange={(e) => setNoteInput(e.target.value)} placeholder="Nhập ghi chú nếu có..." className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-emerald-500 focus:outline-none" /></div>
                            </div>
                        </div>
                        <div className="flex gap-2 border-t border-slate-100 pt-4">
                            <Button type="button" variant="outline" onClick={() => setSelectedItem(null)} className="flex-1 rounded-2xl h-11 text-xs font-bold border-slate-200">Hủy</Button>
                            <Button type="button" onClick={handleConfirmClassification} disabled={submitting} className="flex-1 rounded-2xl h-11 bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700 shadow-soft">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Xác nhận"}</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
