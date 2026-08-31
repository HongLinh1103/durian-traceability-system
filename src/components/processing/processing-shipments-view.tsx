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
    carrierName?: string;
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
    facilityName = "Cơ sở Chế biến & Đóng gói Xuất khẩu",
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
    const [carrierName, setCarrierName] = useState("Công ty Vận tải Quốc tế Á Châu");
    const [exportDate, setExportDate] = useState(new Date().toISOString().slice(0, 10));
    const [destinationCountry, setDestinationCountry] = useState("Trung Quốc");
    const [portOfDestination, setPortOfDestination] = useState("Côn Minh, Vân Nam");
    const [portOfLoading, setPortOfLoading] = useState("Cửa khẩu Quốc tế Hữu Nghị");
    const [exportNote, setExportNote] = useState("");

    // Selected lot details for live preview
    const selectedLot = useMemo(() => {
        return availableFinishedLots.find((l) => l.id === selectedFinishedLotId) || availableFinishedLots[0] || null;
    }, [availableFinishedLots, selectedFinishedLotId]);

    // Validation for live QR generation
    const isFormReadyForQr = useMemo(() => {
        const hasLot = Boolean(selectedFinishedLotId);
        const hasWeight = Number(weightInput) > 0;
        const hasContainer = Boolean(containerNumber.trim());
        const hasDestination = Boolean(portOfDestination.trim() || destinationCountry.trim());
        return hasLot && hasWeight && hasContainer && hasDestination;
    }, [selectedFinishedLotId, weightInput, containerNumber, portOfDestination, destinationCountry]);

    // Live Trace URL for form preview
    const liveTraceUrl = useMemo(() => {
        if (typeof window === "undefined") return `/trace/${shipmentCode || "EXP"}`;
        return `${window.location.origin}/trace/${encodeURIComponent(shipmentCode || "EXP")}`;
    }, [shipmentCode]);

    const liveQrImage = useMemo(() => {
        return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(liveTraceUrl)}`;
    }, [liveTraceUrl]);

    // KPIs
    const kpis = useMemo(() => {
        const readyCount = shipments.filter((s) => s.status === "READY" || s.hasQrCode).length;
        const dispatchedCount = shipments.filter((s) => s.status === "DISPATCHED").length;
        const totalWeightMonth = shipments.reduce((sum, s) => sum + (s.weight || 0), 0);
        return { readyCount, dispatchedCount, totalWeightMonth };
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
            setBoxCountInput(Math.max(1, Math.round(first.remainingWeight / 18)));
        } else {
            setSelectedFinishedLotId("");
            setProductName("Sầu riêng tươi xuất khẩu");
            setWeightInput("");
            setBoxCountInput("");
        }
        setTruckPlate("51D-999.88");
        setContainerNumber("TEMU-882910-2");
        setSealNumber("SL-VN-88219");
        setCarrierName("Công ty Vận tải Quốc tế Á Châu");
        setExportDate(new Date().toISOString().slice(0, 10));
        setDestinationCountry("Trung Quốc");
        setPortOfDestination("Côn Minh, Vân Nam");
        setPortOfLoading("Cửa khẩu Quốc tế Hữu Nghị");
        setExportNote("");
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
                    status: "DISPATCHED",
                    note: `${carrierName ? `ĐVVC: ${carrierName} | ` : ""}${exportNote}`,
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
                carrierName,
                weight: w,
                boxCount: Number(boxCountInput) || undefined,
                destinationCountry,
                portOfDestination,
                portOfLoading,
                dispatchDate: exportDate,
                status: "DISPATCHED",
                hasQrCode: true,
                qrPublicToken: token,
                farmName: selectedLot?.farmName || "Vườn sầu riêng liên kết",
                regionCode: selectedLot?.regionCode || "MSVT-VN-DL",
                rawLotCode: selectedLot?.rawLotCode || "NVL-001",
                facilityName,
            };

            setShipments((prev) => [newRow, ...prev]);
            toast({
                title: "Tạo lô & Phát hành QR thành công",
                description: `Lô xuất hàng ${shipmentCode} đã được tạo và kích hoạt mã QR truy xuất nguồn gốc.`,
                variant: "success",
            });
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

    const handlePrintQr = (s: ShipmentItemRow) => {
        setViewQrShipment(s);
        setTimeout(() => {
            window.print();
        }, 300);
    };

    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <span>Cơ sở chế biến</span>
                <span>/</span>
                <span className="text-emerald-700 font-bold">4. Xuất hàng</span>
            </nav>

            {/* Header + Actions */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">4. Xuất hàng</h1>
                        <p className="mt-1 text-xs sm:text-sm text-slate-500">
                            Quản lý hồ sơ xuất khẩu, liên kết phương tiện vận chuyển, container/seal và phát hành tem QR truy xuất nguồn gốc toàn chuỗi.
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
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                        <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold uppercase tracking-wider">
                            <QrCode className="h-4 w-4 shrink-0" />
                            <span>Đã phát hành QR</span>
                        </div>
                        <p className="mt-2 text-2xl font-black text-emerald-900">{kpis.readyCount}</p>
                    </div>

                    <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4">
                        <div className="flex items-center gap-2 text-sky-700 text-xs font-bold uppercase tracking-wider">
                            <Truck className="h-4 w-4 shrink-0" />
                            <span>Lô đã xuất cảng</span>
                        </div>
                        <p className="mt-2 text-2xl font-black text-sky-900">{kpis.dispatchedCount}</p>
                    </div>

                    <div className="rounded-2xl border border-emerald-200 bg-emerald-600 text-white p-4 shadow-soft">
                        <div className="flex items-center gap-2 text-emerald-100 text-xs font-bold uppercase tracking-wider">
                            <Boxes className="h-4 w-4 shrink-0" />
                            <span>Tổng khối lượng xuất</span>
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
                            placeholder="Tìm mã lô xuất / Container / Seal / Biển số xe..."
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
                            <option value="DISPATCHED">Đã xuất hàng (Có QR)</option>
                            <option value="READY">Sẵn sàng xuất</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* BẢNG CHÍNH: Mã lô xuất | Sản phẩm | Khối lượng | Số thùng | Container | Seal | Ngày xuất | Trạng thái QR | Thao tác */}
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-600">
                            <tr>
                                <th className="px-5 py-4 whitespace-nowrap">Mã lô xuất</th>
                                <th className="px-5 py-4 whitespace-nowrap">Sản phẩm</th>
                                <th className="px-5 py-4 whitespace-nowrap text-right">Khối lượng</th>
                                <th className="px-5 py-4 text-center whitespace-nowrap">Số thùng</th>
                                <th className="px-5 py-4 whitespace-nowrap">Container</th>
                                <th className="px-5 py-4 whitespace-nowrap">Seal</th>
                                <th className="px-5 py-4 whitespace-nowrap">Ngày xuất</th>
                                <th className="px-5 py-4 text-center whitespace-nowrap">Trạng thái QR</th>
                                <th className="px-5 py-4 text-right whitespace-nowrap">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                            {filteredShipments.map((s) => {
                                const token = s.qrPublicToken || s.shipmentCode;
                                const traceUrl = `/trace/${encodeURIComponent(token)}`;

                                return (
                                    <tr key={s.id} className="h-14 hover:bg-slate-50/70 transition">
                                        {/* Mã lô xuất */}
                                        <td className="px-5 py-3 whitespace-nowrap">
                                            <span className="font-mono font-bold text-slate-900 text-xs">{s.shipmentCode}</span>
                                        </td>

                                        {/* Sản phẩm */}
                                        <td className="px-5 py-3 whitespace-nowrap">
                                            <p className="font-bold text-slate-800 text-xs sm:text-sm">{s.productName}</p>
                                            <p className="text-[11px] text-slate-500">{s.portOfDestination || s.destinationCountry}</p>
                                        </td>

                                        {/* Khối lượng */}
                                        <td className="px-5 py-3 whitespace-nowrap text-right font-black text-slate-900 text-xs sm:text-sm">
                                            {s.weight >= 1000 ? `${(s.weight / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tấn` : `${s.weight.toLocaleString("vi-VN")} kg`}
                                        </td>

                                        {/* Số thùng */}
                                        <td className="px-5 py-3 text-center whitespace-nowrap font-bold text-slate-700 text-xs">
                                            {s.boxCount ? `${s.boxCount.toLocaleString("vi-VN")}` : "—"}
                                        </td>

                                        {/* Container */}
                                        <td className="px-5 py-3 whitespace-nowrap font-mono text-xs font-bold text-slate-700">
                                            {s.containerNumber || "—"}
                                        </td>

                                        {/* Seal */}
                                        <td className="px-5 py-3 whitespace-nowrap font-mono text-xs text-slate-600">
                                            {s.sealNumber || "—"}
                                        </td>

                                        {/* Ngày xuất */}
                                        <td className="px-5 py-3 whitespace-nowrap text-xs text-slate-600">
                                            {s.dispatchDate ? new Date(s.dispatchDate).toLocaleDateString("vi-VN") : "—"}
                                        </td>

                                        {/* Trạng thái QR */}
                                        <td className="px-5 py-3 text-center whitespace-nowrap">
                                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                Đã phát hành
                                            </span>
                                        </td>

                                        {/* Thao tác: Xem QR | In QR | Xem truy xuất */}
                                        <td className="px-5 py-3 text-right whitespace-nowrap">
                                            <div className="inline-flex items-center gap-1">
                                                <Button
                                                    size="sm"
                                                    onClick={() => setViewQrShipment(s)}
                                                    className="h-8 rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700 shadow-soft"
                                                >
                                                    <QrCode className="mr-1 h-3.5 w-3.5" />
                                                    Xem QR
                                                </Button>

                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handlePrintQr(s)}
                                                    className="h-8 rounded-xl border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                                >
                                                    <Printer className="mr-1 h-3.5 w-3.5" />
                                                    In QR
                                                </Button>

                                                <a
                                                    href={traceUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex h-8 items-center justify-center rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                                >
                                                    <ExternalLink className="mr-1 h-3.5 w-3.5" />
                                                    Xem truy xuất
                                                </a>
                                            </div>
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

            {/* MODAL 1: TẠO LÔ XUẤT HÀNG (4 Grouped Sections + Live Preview & Simultaneous QR Issuance) */}
            {openCreateModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
                    <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-150">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 p-5 sm:p-6">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Hồ sơ xuất khẩu</span>
                                <h2 className="text-xl font-black text-slate-900">TẠO LÔ XUẤT HÀNG & PHÁT HÀNH QR</h2>
                            </div>
                            <button type="button" onClick={() => setOpenCreateModal(false)} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="overflow-y-auto p-5 sm:p-6 space-y-5">
                            {/* PHẦN 1: THÔNG TIN HÀNG HÓA */}
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                                <h3 className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                                    <Boxes className="h-4 w-4" />
                                    1. THÔNG TIN HÀNG HÓA
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
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Lô thành phẩm đủ điều kiện xuất</label>
                                        <select
                                            value={selectedFinishedLotId}
                                            onChange={(e) => {
                                                const id = e.target.value;
                                                setSelectedFinishedLotId(id);
                                                const found = availableFinishedLots.find((l) => l.id === id);
                                                if (found) {
                                                    setProductName(found.productName);
                                                    setWeightInput(found.remainingWeight);
                                                    setBoxCountInput(Math.max(1, Math.round(found.remainingWeight / 18)));
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
                                                <option value="">Không có lô sẵn sàng</option>
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
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Khối lượng xuất (kg) <span className="text-rose-500">*</span></label>
                                            <input
                                                type="number"
                                                value={weightInput}
                                                onChange={(e) => {
                                                    setWeightInput(e.target.value);
                                                    const w = Number(e.target.value);
                                                    if (w > 0) setBoxCountInput(Math.max(1, Math.round(w / 18)));
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

                            {/* PHẦN 2: THÔNG TIN VẬN CHUYỂN */}
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                                <h3 className="text-xs font-black uppercase tracking-wider text-sky-800 flex items-center gap-1.5">
                                    <Truck className="h-4 w-4" />
                                    2. THÔNG TIN VẬN CHUYỂN
                                </h3>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Biển số xe</label>
                                        <input
                                            type="text"
                                            value={truckPlate}
                                            onChange={(e) => setTruckPlate(e.target.value)}
                                            placeholder="51D-999.88"
                                            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 font-mono text-xs font-semibold text-slate-900 focus:border-sky-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Số container</label>
                                        <input
                                            type="text"
                                            value={containerNumber}
                                            onChange={(e) => setContainerNumber(e.target.value)}
                                            placeholder="TEMU-882910-2"
                                            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 font-mono text-xs font-bold text-slate-900 focus:border-sky-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Số seal</label>
                                        <input
                                            type="text"
                                            value={sealNumber}
                                            onChange={(e) => setSealNumber(e.target.value)}
                                            placeholder="SL-VN-88219"
                                            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 font-mono text-xs font-bold text-slate-900 focus:border-sky-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Đơn vị vận chuyển</label>
                                        <input
                                            type="text"
                                            value={carrierName}
                                            onChange={(e) => setCarrierName(e.target.value)}
                                            placeholder="Công ty Vận tải Quốc tế Á Châu"
                                            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 focus:border-sky-500 focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* PHẦN 3: THÔNG TIN XUẤT HÀNG */}
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                                <h3 className="text-xs font-black uppercase tracking-wider text-indigo-800 flex items-center gap-1.5">
                                    <Globe className="h-4 w-4" />
                                    3. THÔNG TIN XUẤT HÀNG
                                </h3>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Ngày giờ xuất</label>
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
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Quốc gia nhập khẩu</label>
                                        <input
                                            type="text"
                                            value={destinationCountry}
                                            onChange={(e) => setDestinationCountry(e.target.value)}
                                            placeholder="Trung Quốc"
                                            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú xuất hàng</label>
                                    <input
                                        type="text"
                                        value={exportNote}
                                        onChange={(e) => setExportNote(e.target.value)}
                                        placeholder="Nhập ghi chú hoặc yêu cầu kiểm dịch đặc biệt..."
                                        className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs focus:border-emerald-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* PHẦN 4: KHU VỰC QR TRUY XUẤT (LIVE PREVIEW & ĐỒNG THỜI PHÁT HÀNH) */}
                            <div className={`rounded-2xl border-2 p-4 space-y-3 transition ${isFormReadyForQr ? "border-emerald-400 bg-emerald-50/40" : "border-slate-300 bg-slate-50/60"}`}>
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                                        <QrCode className="h-4 w-4 text-emerald-600" />
                                        4. KHU VỰC QR TRUY XUẤT NGUỒN GỐC
                                    </h3>
                                    {isFormReadyForQr ? (
                                        <span className="rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 flex items-center gap-1">
                                            <CheckCircle2 className="h-3 w-3" /> Đủ thông tin · Sẵn sàng phát hành
                                        </span>
                                    ) : (
                                        <span className="rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                                            Chưa phát hành (Cần chọn lô & nhập thông tin)
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-3 items-center">
                                    {/* Cột trái: QR Code Preview */}
                                    <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3 text-center">
                                        <img
                                            src={liveQrImage}
                                            alt={`QR Preview ${shipmentCode}`}
                                            className="h-32 w-32 rounded-lg object-contain"
                                        />
                                        <span className="mt-2 font-mono text-[11px] font-black text-slate-900">{shipmentCode}</span>
                                        <span className="text-[10px] text-slate-400">Tem truy xuất điện tử</span>
                                    </div>

                                    {/* Cột phải: Chuỗi truy xuất liên kết */}
                                    <div className="md:col-span-2 space-y-2 text-xs">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="rounded-xl bg-white p-2.5 border border-slate-200">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1"><Trees className="h-3 w-3 text-emerald-600" /> Farm / Vùng trồng</p>
                                                <p className="font-bold text-slate-900 mt-0.5">{selectedLot?.farmName || "Vườn sầu riêng liên kết"}</p>
                                                <p className="text-[10px] text-emerald-700 font-semibold">{selectedLot?.regionCode || "MSVT-VN-DL-0089"}</p>
                                            </div>

                                            <div className="rounded-xl bg-white p-2.5 border border-slate-200">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1"><Building2 className="h-3 w-3 text-emerald-600" /> Cơ sở chế biến & đóng gói</p>
                                                <p className="font-bold text-slate-900 mt-0.5">{facilityName}</p>
                                                <p className="text-[10px] text-slate-500">Mã CS: CS-TV-001</p>
                                            </div>
                                        </div>

                                        <div className="rounded-xl bg-white p-2.5 border border-slate-200 space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Tóm tắt lô xuất</p>
                                            <p className="font-medium text-slate-800">
                                                Container: <span className="font-mono font-bold text-slate-900">{containerNumber || "TEMU-..."}</span> · Seal: <span className="font-mono font-bold text-slate-900">{sealNumber || "SL-..."}</span> · Xe: <span className="font-mono font-bold text-slate-900">{truckPlate || "51D-..."}</span>
                                            </p>
                                            <p className="text-[11px] text-emerald-700 font-bold">
                                                {isFormReadyForQr ? "✅ Chuỗi truy xuất hợp lệ: Farm ➔ Tiếp nhận ➔ Đóng gói ➔ Xuất khẩu." : "⚠️ Vui lòng điền đủ container và đích xuất để phát hành QR."}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer: [Tạo lô & Phát hành QR] */}
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
                                disabled={submitting || !isFormReadyForQr}
                                className="flex-1 rounded-2xl h-11 bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700 shadow-soft disabled:opacity-50"
                            >
                                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tạo lô & Phát hành QR"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 2: XEM MÃ QR & HỒ SƠ TRUY XUẤT NGUỒN GỐC (KHI BẤM "XEM QR") */}
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
                                                        Container: <span className="font-mono font-bold text-slate-900">{viewQrShipment.containerNumber || "—"}</span> · Seal: <span className="font-mono font-bold text-slate-900">{viewQrShipment.sealNumber || "—"}</span>
                                                    </p>
                                                    <p className="text-slate-800">
                                                        Xe: <span className="font-mono font-bold text-slate-900">{viewQrShipment.truckPlate || "—"}</span>
                                                    </p>
                                                    <p className="text-[11px] text-slate-500">
                                                        {viewQrShipment.portOfLoading || "Cửa khẩu Hữu Nghị"} ➔ {viewQrShipment.portOfDestination || viewQrShipment.destinationCountry || "Trung Quốc"}
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

