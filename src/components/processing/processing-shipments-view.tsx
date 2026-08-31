'use client';

import { useMemo, useState } from "react";
import {
    Boxes,
    Building2,
    Calendar,
    Check,
    CheckCircle2,
    Clock,
    Copy,
    Download,
    ExternalLink,
    Eye,
    Globe,
    Layers,
    Loader2,
    Plus,
    Printer,
    QrCode,
    Search,
    Share2,
    Sparkles,
    Trees,
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
    farmName?: string;
    regionCode?: string;
    rawLotCode?: string;
    facilityName?: string;
};

export type AvailableFinishedLot = {
    id: string;
    lotCode: string;
    productName: string;
    remainingWeight: number;
    packaging?: string;
    farmName?: string;
    regionCode?: string;
    rawLotCode?: string;
};

interface ProcessingShipmentsViewProps {
    initialShipments: ShipmentItemRow[];
    availableFinishedLots: AvailableFinishedLot[];
    facilityName?: string;
}

export function ProcessingShipmentsView({
    initialShipments,
    availableFinishedLots,
    facilityName = "Cơ sở Chế biến Sầu riêng Trị An",
}: ProcessingShipmentsViewProps) {
    const { toast } = useToast();
    const [shipments, setShipments] = useState<ShipmentItemRow[]>(initialShipments);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");

    // Modal Create Shipment
    const [openCreateModal, setOpenCreateModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Modal View QR Code
    const [viewQrShipment, setViewQrShipment] = useState<ShipmentItemRow | null>(null);
    const [copied, setCopied] = useState(false);

    // Form fields
    const [shipmentCode, setShipmentCode] = useState("");
    const [selectedFinishedLotId, setSelectedFinishedLotId] = useState("");
    const [productName, setProductName] = useState("Sầu riêng tươi xuất khẩu");
    const [weightInput, setWeightInput] = useState<number | string>("");
    const [boxCountInput, setBoxCountInput] = useState<number | string>("");
    const [truckPlate, setTruckPlate] = useState("");
    const [containerNumber, setContainerNumber] = useState("");
    const [sealNumber, setSealNumber] = useState("");
    const [exportDate, setExportDate] = useState(new Date().toISOString().slice(0, 10));
    const [destinationCountry, setDestinationCountry] = useState("Trung Quốc");
    const [portOfDestination, setPortOfDestination] = useState("Côn Minh, Vân Nam");
    const [portOfLoading, setPortOfLoading] = useState("Cửa khẩu Quốc tế Hữu Nghị");

    // Selected lot details for live preview
    const selectedLot = useMemo(() => {
        return availableFinishedLots.find((l) => l.id === selectedFinishedLotId) || availableFinishedLots[0] || null;
    }, [availableFinishedLots, selectedFinishedLotId]);

    // Live Trace URL for form preview
    const liveTraceUrl = useMemo(() => {
        if (typeof window === "undefined") return `/trace?code=${shipmentCode || "EXP"}`;
        return `${window.location.origin}/trace?code=${encodeURIComponent(shipmentCode || "EXP")}`;
    }, [shipmentCode]);

    const liveQrImage = useMemo(() => {
        return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(liveTraceUrl)}`;
    }, [liveTraceUrl]);

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
        setOpenCreateModal(true);
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
            const token = data.data?.traceCode?.publicToken || `TRC-${shipmentCode}`;

            const newRow: ShipmentItemRow = {
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
                hasQrCode: true,
                qrPublicToken: token,
                farmName: selectedLot?.farmName || "Vườn sầu riêng liên kết",
                regionCode: selectedLot?.regionCode || "MSVT-VN-DL",
                rawLotCode: selectedLot?.rawLotCode || "NVL-001",
                facilityName,
            };

            setShipments((prev) => [newRow, ...prev]);
            toast({ title: "Tạo lô xuất hàng thành công", description: `Lô ${shipmentCode} đã được lưu và phát hành mã QR.`, variant: "success" });
            setOpenCreateModal(false);
        } catch (err: any) {
            toast({ title: "Lỗi", description: err.message || "Có lỗi xảy ra khi tạo lô.", variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };

    const handleCopyLink = (url: string) => {
        navigator.clipboard.writeText(url);
        setCopied(true);
        toast({ title: "Đã sao chép link", description: "Link truy xuất đã được lưu vào clipboard.", variant: "success" });
        setTimeout(() => setCopied(false), 2000);
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
                            Quản lý hồ sơ xuất khẩu, liên kết phương tiện, container và phát hành tem QR truy xuất nguồn gốc đến Farm.
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
                                                onClick={() => setViewQrShipment(s)}
                                                className="h-8 rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700 shadow-soft"
                                            >
                                                <QrCode className="mr-1.5 h-3.5 w-3.5" />
                                                Xem mã QR
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

            {/* MODAL 1: TẠO LÔ XUẤT HÀNG (3 Cards + Live QR Preview & Traceability Link) */}
            {openCreateModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
                    <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-150">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 p-5 sm:p-6">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Hồ sơ xuất khẩu</span>
                                <h2 className="text-xl font-black text-slate-900">TẠO LÔ XUẤT HÀNG</h2>
                            </div>
                            <button type="button" onClick={() => setOpenCreateModal(false)} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="overflow-y-auto p-5 sm:p-6 space-y-5">
                            {/* CARD 1: THÔNG TIN LÔ */}
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                                <h3 className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                                    <Boxes className="h-4 w-4" />
                                    1. THÔNG TIN LÔ
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
                                                    {lot.lotCode} — {lot.productName} ({lot.remainingWeight.toLocaleString("vi-VN")} kg) {lot.farmName ? `· ${lot.farmName}` : ""}
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
                                    2. VẬN CHUYỂN
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
                                    3. XUẤT KHẨU
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

                            {/* CARD 4: XEM TRƯỚC TEM QR & DỮ LIỆU TRUY XUẤT NGUỒN GỐC (LIVE PREVIEW) */}
                            <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50/40 p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                                        <Sparkles className="h-4 w-4 text-emerald-600" />
                                        4. XEM TRƯỚC MÃ QR VÀ TRUY XUẤT NGUỒN GỐC ĐẾN FARM
                                    </h3>
                                    <span className="rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                                        Tự động kích hoạt khi tạo
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-3 items-center">
                                    {/* Cột trái: QR Image */}
                                    <div className="flex flex-col items-center justify-center rounded-xl border border-emerald-200 bg-white p-3 text-center">
                                        <img
                                            src={liveQrImage}
                                            alt={`QR Preview ${shipmentCode}`}
                                            className="h-32 w-32 rounded-lg object-contain"
                                        />
                                        <span className="mt-2 font-mono text-[11px] font-bold text-slate-800">{shipmentCode}</span>
                                        <span className="text-[10px] text-slate-400">Tem truy xuất điện tử</span>
                                    </div>

                                    {/* Cột phải: Chi tiết chuỗi cung ứng liên kết */}
                                    <div className="md:col-span-2 space-y-2 text-xs">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="rounded-xl bg-white p-2.5 border border-emerald-100">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1"><Trees className="h-3 w-3 text-emerald-600" /> Farm nguồn</p>
                                                <p className="font-bold text-slate-900 mt-0.5">{selectedLot?.farmName || "Vườn sầu riêng Minh Phát"}</p>
                                                <p className="text-[10px] text-emerald-700 font-semibold">{selectedLot?.regionCode || "MSVT-VN-DL-0089"}</p>
                                            </div>

                                            <div className="rounded-xl bg-white p-2.5 border border-emerald-100">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1"><Building2 className="h-3 w-3 text-emerald-600" /> Cơ sở đóng gói</p>
                                                <p className="font-bold text-slate-900 mt-0.5">{facilityName}</p>
                                                <p className="text-[10px] text-slate-500">Mã CS: CS-TV-001</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="rounded-xl bg-white p-2.5 border border-emerald-100">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">Khối lượng</p>
                                                <p className="font-black text-emerald-700">{weightInput ? `${Number(weightInput).toLocaleString("vi-VN")} kg` : "—"}</p>
                                                <p className="text-[10px] text-slate-500">{boxCountInput ? `${boxCountInput} thùng` : ""}</p>
                                            </div>

                                            <div className="rounded-xl bg-white p-2.5 border border-emerald-100">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">Vận chuyển</p>
                                                <p className="font-mono font-bold text-slate-800">{truckPlate || "51D-123.45"}</p>
                                                <p className="text-[10px] text-slate-500 font-mono">Seal: {sealNumber || "SL987654"}</p>
                                            </div>

                                            <div className="rounded-xl bg-white p-2.5 border border-emerald-100">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">Cửa khẩu & Đích</p>
                                                <p className="font-bold text-slate-800 truncate">{portOfDestination || "Côn Minh"}</p>
                                                <p className="text-[10px] text-slate-500 truncate">{portOfLoading || "Hữu Nghị"}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex gap-2 border-t border-slate-100 p-5 sm:p-6">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setOpenCreateModal(false)}
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
                                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Xác nhận tạo lô xuất hàng"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 2: XEM MÃ QR & HỒ SƠ TRUY XUẤT NGUỒN GỐC (KHI BẤM "XEM MÃ QR") */}
            {viewQrShipment && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
                    <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-150">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 p-5 sm:p-6">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Mã QR truy xuất nguồn gốc</span>
                                <h2 className="text-xl font-black text-slate-900">{viewQrShipment.shipmentCode}</h2>
                            </div>
                            <button type="button" onClick={() => setViewQrShipment(null)} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="overflow-y-auto p-5 sm:p-6 space-y-5">
                            {/* QR Section */}
                            {(() => {
                                const token = viewQrShipment.qrPublicToken || viewQrShipment.shipmentCode;
                                const traceUrl = typeof window !== "undefined"
                                    ? `${window.location.origin}/trace/${encodeURIComponent(token)}`
                                    : `/trace/${token}`;
                                const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(traceUrl)}`;

                                return (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 items-center">
                                            {/* QR Box */}
                                            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-400 bg-emerald-50/50 p-5 text-center">
                                                <img
                                                    src={qrImg}
                                                    alt={`QR Code ${viewQrShipment.shipmentCode}`}
                                                    className="h-44 w-44 rounded-xl object-contain shadow-soft"
                                                />
                                                <p className="mt-3 font-mono font-black text-sm text-slate-900">{viewQrShipment.shipmentCode}</p>
                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 mt-1">
                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                    Đang hoạt động · Sẵn sàng quét
                                                </span>
                                            </div>

                                            {/* Detailed Info */}
                                            <div className="space-y-2.5 text-xs">
                                                <div className="rounded-xl bg-slate-50 p-3 space-y-1">
                                                    <span className="text-[10px] font-bold uppercase text-slate-400">Sản phẩm xuất khẩu</span>
                                                    <p className="font-bold text-slate-900 text-sm">{viewQrShipment.productName}</p>
                                                    <p className="font-black text-emerald-700">
                                                        {viewQrShipment.weight >= 1000
                                                            ? `${(viewQrShipment.weight / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tấn (${viewQrShipment.weight.toLocaleString("vi-VN")} kg)`
                                                            : `${viewQrShipment.weight.toLocaleString("vi-VN")} kg`}
                                                        {viewQrShipment.boxCount ? ` · ${viewQrShipment.boxCount.toLocaleString("vi-VN")} thùng` : ""}
                                                    </p>
                                                </div>

                                                <div className="rounded-xl bg-slate-50 p-3 space-y-1">
                                                    <span className="text-[10px] font-bold uppercase text-slate-400">Farm / Vùng trồng nguồn</span>
                                                    <p className="font-bold text-slate-900">{viewQrShipment.farmName || "Vườn sầu riêng Minh Phát"}</p>
                                                    <p className="text-[11px] text-slate-500 font-mono">MSVT: {viewQrShipment.regionCode || "VN-DL-0089"}</p>
                                                </div>

                                                <div className="rounded-xl bg-slate-50 p-3 space-y-1">
                                                    <span className="text-[10px] font-bold uppercase text-slate-400">Vận chuyển & Cửa khẩu</span>
                                                    <p className="text-slate-800">
                                                        Xe: <span className="font-mono font-bold text-slate-900">{viewQrShipment.truckPlate || "51D-123.45"}</span> · Seal: <span className="font-mono font-bold text-slate-900">{viewQrShipment.sealNumber || "SL987654"}</span>
                                                    </p>
                                                    <p className="text-[11px] text-slate-500">
                                                        {viewQrShipment.portOfLoading || "Cửa khẩu Hữu Nghị"} $ightarrow$ {viewQrShipment.portOfDestination || viewQrShipment.destinationCountry || "Trung Quốc"}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 space-y-2.5">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value={traceUrl}
                                                    className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 font-mono text-xs text-slate-700 focus:outline-none"
                                                />
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleCopyLink(traceUrl)}
                                                    variant="outline"
                                                    className="h-10 rounded-xl px-3 border-slate-200 text-xs font-bold"
                                                >
                                                    {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                                                    <span className="ml-1.5">{copied ? "Đã chép" : "Sao chép"}</span>
                                                </Button>
                                            </div>

                                            <div className="grid grid-cols-3 gap-2">
                                                <a
                                                    href={traceUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700 shadow-soft"
                                                >
                                                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                                                    Xem trang truy xuất
                                                </a>
                                                <a
                                                    href={qrImg}
                                                    download={`QR-${viewQrShipment.shipmentCode}.png`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50"
                                                >
                                                    <Download className="mr-1.5 h-3.5 w-3.5" />
                                                    Tải tem QR
                                                </a>
                                                <Button
                                                    onClick={() => window.print()}
                                                    variant="outline"
                                                    className="h-10 rounded-xl border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50"
                                                >
                                                    <Printer className="mr-1.5 h-3.5 w-3.5" />
                                                    In mã QR
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Footer */}
                        <div className="border-t border-slate-100 p-4 sm:p-5 text-right">
                            <Button
                                onClick={() => setViewQrShipment(null)}
                                className="h-10 rounded-xl px-5 text-xs font-bold bg-slate-900 text-white hover:bg-slate-800"
                            >
                                Đóng
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
