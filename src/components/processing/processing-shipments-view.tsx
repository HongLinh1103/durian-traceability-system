'use client';

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Boxes,
    Calendar,
    CheckCircle2,
    Clock,
    FileText,
    Globe,
    Layers,
    Loader2,
    Plus,
    QrCode,
    Search,
    Truck,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export type ShipmentItemRow = {
    id: string;
    shipmentCode: string;
    productName: string;
    containerNumber?: string;
    sealNumber?: string;
    truckPlate?: string;
    weight: number;
    boxCount?: number;
    destinationCountry?: string;
    portOfLoading?: string;
    portOfDestination?: string;
    dispatchDate?: string | Date | null;
    status: "DRAFT" | "READY" | "DISPATCHED";
    hasQrCode?: boolean;
    qrPublicToken?: string;
};

export type AvailableFinishedLot = {
    id: string;
    lotCode: string;
    productName: string;
    remainingWeight: number;
    packaging?: string;
};

interface ProcessingShipmentsViewProps {
    initialShipments: ShipmentItemRow[];
    availableFinishedLots: AvailableFinishedLot[];
}

export function ProcessingShipmentsView({
    initialShipments,
    availableFinishedLots,
}: ProcessingShipmentsViewProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [shipments, setShipments] = useState<ShipmentItemRow[]>(initialShipments);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");

    // Modal Create Shipment
    const [openModal, setOpenModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form fields (3 Cards)
    // Card 1: Thông tin lô
    const [shipmentCode, setShipmentCode] = useState("");
    const [selectedFinishedLotId, setSelectedFinishedLotId] = useState("");
    const [productName, setProductName] = useState("Sầu riêng tươi xuất khẩu");
    const [weightInput, setWeightInput] = useState<number | string>("");
    const [boxCountInput, setBoxCountInput] = useState<number | string>("");

    // Card 2: Vận chuyển
    const [truckPlate, setTruckPlate] = useState("");
    const [containerNumber, setContainerNumber] = useState("");
    const [sealNumber, setSealNumber] = useState("");

    // Card 3: Xuất khẩu
    const [exportDate, setExportDate] = useState(new Date().toISOString().slice(0, 10));
    const [destinationCountry, setDestinationCountry] = useState("Trung Quốc");
    const [portOfDestination, setPortOfDestination] = useState("Côn Minh, Vân Nam");
    const [portOfLoading, setPortOfLoading] = useState("Cửa khẩu Quốc tế Hữu Nghị");

    // KPIs
    const kpis = useMemo(() => {
        const draftCount = shipments.filter((s) => s.status === "DRAFT").length;
        const readyCount = shipments.filter((s) => s.status === "READY").length;
        const dispatchedCount = shipments.filter((s) => s.status === "DISPATCHED").length;
        const totalWeightMonth = shipments.reduce((sum, s) => sum + (s.weight || 0), 0);
        return { draftCount, readyCount, ready: readyCount, dispatchedCount, totalWeightMonth };
    }, [shipments]);

    const filteredShipments = useMemo(() => {
        return shipments.filter((s) => {
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchCode = s.shipmentCode.toLowerCase().includes(q);
                const matchProduct = s.productName.toLowerCase().includes(q);
                const matchContainer = s.containerNumber?.toLowerCase().includes(q);
                const matchSeal = s.sealNumber?.toLowerCase().includes(q);
                const matchTruck = s.truckPlate?.toLowerCase().includes(q);
                if (!matchCode && !matchProduct && !matchContainer && !matchSeal && !matchTruck) return false;
            }
            if (statusFilter !== "ALL" && s.status !== statusFilter) return false;
            return true;
        });
    }, [shipments, searchQuery, statusFilter]);

    const handleOpenCreateModal = () => {
        const todayStr = new Date().toISOString().slice(0, 10).replaceAll("-", "");
        const rand = Math.floor(100 + Math.random() * 900);
        setShipmentCode(`EXP-${todayStr}-${rand}`);
        if (availableFinishedLots.length > 0) {
            const first = availableFinishedLots[0];
            setSelectedFinishedLotId(first.id);
            setProductName(first.productName || "Sầu riêng tươi xuất khẩu");
            setWeightInput(first.remainingWeight);
            setBoxCountInput(Math.round(first.remainingWeight / 18));
        } else {
            setSelectedFinishedLotId("");
            setProductName("Sầu riêng tươi xuất khẩu");
            setWeightInput("");
            setBoxCountInput("");
        }
        setTruckPlate("51D-123.45");
        setContainerNumber("TGHU1234567");
        setSealNumber("SL987654");
        setExportDate(new Date().toISOString().slice(0, 10));
        setDestinationCountry("Trung Quốc");
        setPortOfDestination("Côn Minh, Vân Nam");
        setPortOfLoading("Cửa khẩu Quốc tế Hữu Nghị");
        setOpenModal(true);
    };

    const handleCreateShipment = async () => {
        const w = Number(weightInput);
        if (!w || w <= 0) {
            toast({ title: "Khối lượng không hợp lệ", description: "Vui lòng nhập khối lượng lô xuất.", variant: "destructive" });
            return;
        }
        if (!selectedFinishedLotId) {
            toast({ title: "Chưa chọn lô thành phẩm", description: "Vui lòng chọn một lô thành phẩm nguồn.", variant: "destructive" });
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch("/api/processing/shipments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    shipmentCode,
                    finishedProductLotId: selectedFinishedLotId,
                    productName,
                    weight: w,
                    boxCount: Number(boxCountInput) || undefined,
                    truckPlate,
                    containerNumber,
                    sealNumber,
                    exportDate,
                    destinationCountry,
                    portOfLoading,
                    portOfDestination,
                    status: "READY",
                }),
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || "Không thể tạo lô xuất hàng.");
            }

            const created = data.data.shipment;
            setShipments((prev) => [
                {
                    id: created.id,
                    shipmentCode: created.shipmentCode,
                    productName,
                    containerNumber,
                    sealNumber,
                    truckPlate,
                    weight: w,
                    boxCount: Number(boxCountInput) || undefined,
                    destinationCountry,
                    portOfDestination,
                    portOfLoading,
                    dispatchDate: exportDate,
                    status: "READY",
                },
                ...prev,
            ]);

            toast({ title: "Tạo lô xuất hàng thành công", description: `Lô ${shipmentCode} đã sẵn sàng tạo mã QR.`, variant: "success" });
            setOpenModal(false);
        } catch (err: any) {
            toast({ title: "Lỗi", description: err.message || "Có lỗi xảy ra.", variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <span>Cơ sở chế biến</span>
                <span>/</span>
                <span className="text-emerald-700 font-bold">Xuất hàng</span>
            </nav>

            {/* Header + Actions */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">XUẤT HÀNG</h1>
                        <p className="mt-1 text-xs sm:text-sm text-slate-500">
                            Quản lý thông tin lô xuất khẩu, phương tiện vận chuyển, container và seal hải quan.
                        </p>
                    </div>
                    <Button
                        onClick={handleOpenCreateModal}
                        className="h-11 rounded-2xl bg-emerald-600 px-5 text-xs font-black text-white hover:bg-emerald-700 shadow-soft"
                    >
                        <Plus className="mr-1.5 h-4 w-4" />
                        Tạo lô xuất hàng
                    </Button>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center gap-2 text-slate-600 text-xs font-bold uppercase tracking-wider">
                            <Clock className="h-4 w-4 shrink-0" />
                            <span>Chờ xuất (Nháp)</span>
                        </div>
                        <p className="mt-2 text-2xl font-black text-slate-800">{kpis.draftCount}</p>
                    </div>

                    <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4">
                        <div className="flex items-center gap-2 text-sky-700 text-xs font-bold uppercase tracking-wider">
                            <Truck className="h-4 w-4 shrink-0" />
                            <span>Sẵn sàng xuất</span>
                        </div>
                        <p className="mt-2 text-2xl font-black text-sky-900">{kpis.readyCount}</p>
                    </div>

                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                        <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold uppercase tracking-wider">
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            <span>Đã xuất hàng</span>
                        </div>
                        <p className="mt-2 text-2xl font-black text-emerald-900">{kpis.dispatchedCount}</p>
                    </div>

                    <div className="rounded-2xl border border-emerald-200 bg-emerald-500 text-white p-4 shadow-soft">
                        <div className="flex items-center gap-2 text-emerald-100 text-xs font-bold uppercase tracking-wider">
                            <Boxes className="h-4 w-4 shrink-0" />
                            <span>Tổng khối lượng</span>
                        </div>
                        <p className="mt-2 text-2xl font-black text-white">
                            {(kpis.totalWeightMonth / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tấn
                        </p>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Tìm mã lô xuất / Container / Seal / Xe..."
                            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 text-xs font-semibold focus:border-emerald-500 focus:bg-white focus:outline-none"
                        />
                    </div>
                    <div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-semibold focus:border-emerald-500 focus:bg-white focus:outline-none"
                        >
                            <option value="ALL">Tất cả trạng thái</option>
                            <option value="DRAFT">Nháp</option>
                            <option value="READY">Sẵn sàng xuất</option>
                            <option value="DISPATCHED">Đã xuất</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Main Table */}
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-600">
                            <tr>
                                <th className="px-5 py-4 whitespace-nowrap">Mã lô xuất</th>
                                <th className="px-5 py-4 whitespace-nowrap">Sản phẩm</th>
                                <th className="px-5 py-4 whitespace-nowrap">Container</th>
                                <th className="px-5 py-4 whitespace-nowrap">Seal</th>
                                <th className="px-5 py-4 whitespace-nowrap">Xe</th>
                                <th className="px-5 py-4 whitespace-nowrap text-right">Khối lượng</th>
                                <th className="px-5 py-4 text-center whitespace-nowrap">Số thùng</th>
                                <th className="px-5 py-4 text-center whitespace-nowrap">Trạng thái</th>
                                <th className="px-5 py-4 text-right whitespace-nowrap">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                            {filteredShipments.map((s) => {
                                const isDispatched = s.status === "DISPATCHED";
                                const isReady = s.status === "READY";
                                return (
                                    <tr key={s.id} className="h-14 hover:bg-slate-50/70 transition">
                                        <td className="px-5 py-3 whitespace-nowrap">
                                            <span className="font-mono font-bold text-slate-900 text-xs">{s.shipmentCode}</span>
                                            {s.dispatchDate && (
                                                <span className="block text-[10px] text-slate-400">
                                                    {new Date(s.dispatchDate).toLocaleDateString("vi-VN")}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3 whitespace-nowrap">
                                            <p className="font-bold text-slate-800 text-xs sm:text-sm">{s.productName}</p>
                                            <p className="text-[11px] text-slate-500">{s.portOfDestination || s.destinationCountry}</p>
                                        </td>
                                        <td className="px-5 py-3 whitespace-nowrap font-mono text-xs font-bold text-slate-700">
                                            {s.containerNumber || "—"}
                                        </td>
                                        <td className="px-5 py-3 whitespace-nowrap font-mono text-xs text-slate-600">
                                            {s.sealNumber || "—"}
                                        </td>
                                        <td className="px-5 py-3 whitespace-nowrap font-mono text-xs text-slate-600">
                                            {s.truckPlate || "—"}
                                        </td>
                                        <td className="px-5 py-3 whitespace-nowrap text-right font-black text-slate-900 text-xs sm:text-sm">
                                            {s.weight >= 1000 ? `${(s.weight / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tấn` : `${s.weight.toLocaleString("vi-VN")} kg`}
                                        </td>
                                        <td className="px-5 py-3 text-center whitespace-nowrap font-bold text-slate-700 text-xs">
                                            {s.boxCount ? `${s.boxCount.toLocaleString("vi-VN")}` : "—"}
                                        </td>
                                        <td className="px-5 py-3 text-center whitespace-nowrap">
                                            {isDispatched ? (
                                                <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                                                    Đã xuất
                                                </span>
                                            ) : isReady ? (
                                                <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-700">
                                                    Sẵn sàng
                                                </span>
                                            ) : (
                                                <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                                                    Nháp
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3 text-right whitespace-nowrap">
                                            <Button
                                                size="sm"
                                                onClick={() => router.push(`/dashboard/processing/traceability?shipmentCode=${encodeURIComponent(s.shipmentCode)}`)}
                                                className="h-8 rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700 shadow-soft"
                                            >
                                                <QrCode className="mr-1 h-3.5 w-3.5" />
                                                Tạo QR
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredShipments.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="py-12 text-center text-xs text-slate-400">
                                        Không tìm thấy lô xuất hàng nào. Bấm <b>"Tạo lô xuất hàng"</b> để bắt đầu.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL TẠO LÔ XUẤT HÀNG (3 Cards) */}
            {openModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
                    <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-150">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 p-5 sm:p-6">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Hồ sơ xuất khẩu</span>
                                <h2 className="text-xl font-black text-slate-900">TẠO LÔ XUẤT HÀNG</h2>
                            </div>
                            <button type="button" onClick={() => setOpenModal(false)} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* 3 Cards Content */}
                        <div className="overflow-y-auto p-5 sm:p-6 space-y-5">
                            {/* CARD 1: THÔNG TIN LÔ */}
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                                <h3 className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                                    <Boxes className="h-4 w-4" />
                                    THÔNG TIN LÔ
                                </h3>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Mã lô xuất</label>
                                        <input
                                            type="text"
                                            value={shipmentCode}
                                            onChange={(e) => setShipmentCode(e.target.value)}
                                            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 font-mono text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Lô thành phẩm nguồn</label>
                                        <select
                                            value={selectedFinishedLotId}
                                            onChange={(e) => {
                                                const id = e.target.value;
                                                setSelectedFinishedLotId(id);
                                                const found = availableFinishedLots.find((l) => l.id === id);
                                                if (found) {
                                                    setProductName(found.productName);
                                                    setWeightInput(found.remainingWeight);
                                                    setBoxCountInput(Math.round(found.remainingWeight / 18));
                                                }
                                            }}
                                            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none"
                                        >
                                            {availableFinishedLots.map((lot) => (
                                                <option key={lot.id} value={lot.id}>
                                                    {lot.lotCode} — {lot.productName} ({lot.remainingWeight.toLocaleString("vi-VN")} kg)
                                                </option>
                                            ))}
                                            {availableFinishedLots.length === 0 && (
                                                <option value="">Không có lô sẵn sàng (tạo thủ công)</option>
                                            )}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Tên sản phẩm xuất khẩu</label>
                                        <input
                                            type="text"
                                            value={productName}
                                            onChange={(e) => setProductName(e.target.value)}
                                            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 focus:border-emerald-500 focus:outline-none"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Khối lượng (kg)</label>
                                            <input
                                                type="number"
                                                value={weightInput}
                                                onChange={(e) => {
                                                    setWeightInput(e.target.value);
                                                    const w = Number(e.target.value);
                                                    if (w > 0) setBoxCountInput(Math.round(w / 18));
                                                }}
                                                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Số thùng</label>
                                            <input
                                                type="number"
                                                value={boxCountInput}
                                                onChange={(e) => setBoxCountInput(e.target.value)}
                                                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* CARD 2: VẬN CHUYỂN */}
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                                <h3 className="text-xs font-black uppercase tracking-wider text-sky-800 flex items-center gap-1.5">
                                    <Truck className="h-4 w-4" />
                                    VẬN CHUYỂN
                                </h3>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Biển số xe</label>
                                        <input
                                            type="text"
                                            value={truckPlate}
                                            onChange={(e) => setTruckPlate(e.target.value)}
                                            placeholder="51D-123.45"
                                            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 font-mono text-xs font-semibold text-slate-900 focus:border-sky-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Số container</label>
                                        <input
                                            type="text"
                                            value={containerNumber}
                                            onChange={(e) => setContainerNumber(e.target.value)}
                                            placeholder="TGHU1234567"
                                            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 font-mono text-xs font-bold text-slate-900 focus:border-sky-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Số seal</label>
                                        <input
                                            type="text"
                                            value={sealNumber}
                                            onChange={(e) => setSealNumber(e.target.value)}
                                            placeholder="SL987654"
                                            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 font-mono text-xs font-bold text-slate-900 focus:border-sky-500 focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* CARD 3: XUẤT KHẨU */}
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                                <h3 className="text-xs font-black uppercase tracking-wider text-indigo-800 flex items-center gap-1.5">
                                    <Globe className="h-4 w-4" />
                                    XUẤT KHẨU
                                </h3>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Ngày xuất</label>
                                        <input
                                            type="date"
                                            value={exportDate}
                                            onChange={(e) => setExportDate(e.target.value)}
                                            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Điểm đến</label>
                                        <input
                                            type="text"
                                            value={portOfDestination}
                                            onChange={(e) => setPortOfDestination(e.target.value)}
                                            placeholder="Côn Minh, Vân Nam"
                                            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Cửa khẩu / Cảng</label>
                                        <input
                                            type="text"
                                            value={portOfLoading}
                                            onChange={(e) => setPortOfLoading(e.target.value)}
                                            placeholder="Cửa khẩu Quốc tế Hữu Nghị"
                                            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex gap-2 border-t border-slate-100 p-5 sm:p-6">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setOpenModal(false)}
                                className="flex-1 rounded-2xl h-11 text-xs font-bold border-slate-200"
                            >
                                Hủy
                            </Button>
                            <Button
                                type="button"
                                onClick={handleCreateShipment}
                                disabled={submitting}
                                className="flex-1 rounded-2xl h-11 bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700 shadow-soft"
                            >
                                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tạo lô xuất hàng"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
