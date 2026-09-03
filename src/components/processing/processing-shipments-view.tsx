'use client';

import { useEffect, useMemo, useState } from "react";
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
import { ModalPortal } from "@/components/ui/modal-portal";

export type ShipmentItemRow = {
    id: string;
    shipmentCode: string;
    productName: string;
    shipmentType?: "EXPORT" | "DOMESTIC";
    containerNumber?: string;
    sealNumber?: string;
    truckPlate?: string;
    carrierName?: string;
    weight: number;
    boxCount?: number;
    destinationCountry?: string;
    portOfLoading?: string;
    portOfDestination?: string;
    distributionChannel?: string;
    customerName?: string;
    customerPhone?: string;
    deliveryAddress?: string;
    transportMethod?: string;
    driverName?: string;
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
    status?: string;
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
    const [availableLots, setAvailableLots] = useState<AvailableFinishedLot[]>(availableFinishedLots);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");

    // Hydrate packaged lots from Step 3 (Chế biến & Đóng gói)
    useEffect(() => {
        try {
            const raw = localStorage.getItem("processing_packaged_lots");
            if (!raw) return;
            const packaged: any[] = JSON.parse(raw);
            if (!Array.isArray(packaged) || packaged.length === 0) return;

            setAvailableLots((prev) => {
                const existingIds = new Set(prev.map((l) => l.id));
                const newLots: AvailableFinishedLot[] = [];

                packaged.forEach((p) => {
                    if (!existingIds.has(p.id)) {
                        newLots.push({
                            id: p.id,
                            lotCode: p.lotCode,
                            productName: p.productName || "Sầu riêng tươi xuất khẩu",
                            remainingWeight: Number(p.remainingWeight || 0),
                            packaging: p.packaging || "Thùng 5-6 trái / 18kg",
                            farmName: p.farmName || "Vườn sầu riêng liên kết",
                            regionCode: p.regionCode || "MSVT-VN",
                            rawLotCode: p.rawLotCode || "TH-2026",
                            status: p.status || "READY_FOR_DISTRIBUTION",
                        });
                    }
                });

                return newLots.length > 0 ? [...newLots, ...prev] : prev;
            });
        } catch {}
    }, []);

    // Modal Create Shipment
    const [openCreateModal, setOpenCreateModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Modal View QR Code
    const [viewQrShipment, setViewQrShipment] = useState<ShipmentItemRow | null>(null);
    const [copied, setCopied] = useState(false);

    // Form fields
    const [shipmentType, setShipmentType] = useState<"EXPORT" | "DOMESTIC">("EXPORT");
    const [shipmentCode, setShipmentCode] = useState("");
    const [selectedFinishedLotId, setSelectedFinishedLotId] = useState("");
    const [productName, setProductName] = useState("");
    const [weightInput, setWeightInput] = useState<number | string>("");
    const [boxCountInput, setBoxCountInput] = useState<number | string>("");

    // Transport & Shipping fields - ALL EMPTY by default
    const [truckPlate, setTruckPlate] = useState("");
    const [containerNumber, setContainerNumber] = useState("");
    const [sealNumber, setSealNumber] = useState("");
    const [carrierName, setCarrierName] = useState("");
    const [exportDate, setExportDate] = useState(new Date().toISOString().slice(0, 10));
    const [destinationCountry, setDestinationCountry] = useState("");
    const [portOfDestination, setPortOfDestination] = useState("");
    const [portOfLoading, setPortOfLoading] = useState("");
    const [exportNote, setExportNote] = useState("");

    // Domestic specific fields - ALL EMPTY by default
    const [distributionChannel, setDistributionChannel] = useState("");
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [deliveryAddress, setDeliveryAddress] = useState("");
    const [transportMethod, setTransportMethod] = useState("");
    const [driverName, setDriverName] = useState("");

    // Selected lot details for live preview - ONLY when user explicitly selects a lot
    const selectedLot = useMemo(() => {
        if (!selectedFinishedLotId) return null;
        return availableLots.find((l) => l.id === selectedFinishedLotId) || null;
    }, [availableLots, selectedFinishedLotId]);

    // Validation for live QR generation
    const isFormReadyForQr = useMemo(() => {
        const hasLot = Boolean(selectedFinishedLotId && selectedLot);
        const hasWeight = Number(weightInput) > 0;
        if (!hasLot || !hasWeight) return false;

        if (shipmentType === "EXPORT") {
            const hasDestination = Boolean(portOfDestination.trim() || destinationCountry.trim() || containerNumber.trim());
            return hasDestination;
        } else {
            const hasReceiver = Boolean(customerName.trim() || deliveryAddress.trim() || distributionChannel.trim() || truckPlate.trim());
            return hasReceiver;
        }
    }, [
        selectedFinishedLotId,
        selectedLot,
        weightInput,
        shipmentType,
        portOfDestination,
        destinationCountry,
        containerNumber,
        customerName,
        deliveryAddress,
        distributionChannel,
        truckPlate,
    ]);

    // Live Trace URL for form preview
    const liveTraceUrl = useMemo(() => {
        if (typeof window === "undefined") return `/trace/${encodeURIComponent(shipmentCode || "EXP")}`;
        return `${window.location.origin}/trace/${encodeURIComponent(shipmentCode || "EXP")}`;
    }, [shipmentCode]);

    const liveQrImage = useMemo(() => {
        return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(liveTraceUrl)}`;
    }, [liveTraceUrl]);

    // Live background sync to Preview Store so QR can be scanned immediately
    useEffect(() => {
        if (!isFormReadyForQr || !shipmentCode) return;
        const timer = setTimeout(() => {
            fetch("/api/trace/preview", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    shipmentCode,
                    shipmentType,
                    productName: productName || selectedLot?.productName || "Sầu riêng tươi xuất khẩu",
                    lotCode: selectedLot?.lotCode,
                    weight: Number(weightInput) || 0,
                    boxCount: Number(boxCountInput) || undefined,
                    destinationCountry: shipmentType === "EXPORT" ? (destinationCountry || "Trung Quốc") : "Việt Nam",
                    portOfDestination: shipmentType === "EXPORT" ? (portOfDestination || "Côn Minh, Vân Nam") : (deliveryAddress || "Nội địa Việt Nam"),
                    portOfLoading: shipmentType === "EXPORT" ? portOfLoading : undefined,
                    containerNumber: shipmentType === "EXPORT" ? containerNumber : undefined,
                    sealNumber: shipmentType === "EXPORT" ? sealNumber : undefined,
                    truckPlate: truckPlate || undefined,
                    carrierName: shipmentType === "EXPORT" ? carrierName : transportMethod,
                    customerName: shipmentType === "DOMESTIC" ? customerName : undefined,
                    customerPhone: shipmentType === "DOMESTIC" ? customerPhone : undefined,
                    deliveryAddress: shipmentType === "DOMESTIC" ? deliveryAddress : undefined,
                    transportMethod: shipmentType === "DOMESTIC" ? transportMethod : undefined,
                    driverName: shipmentType === "DOMESTIC" ? driverName : undefined,
                    farmName: selectedLot?.farmName,
                    regionCode: selectedLot?.regionCode,
                    rawLotCode: selectedLot?.rawLotCode,
                    facilityName,
                }),
            }).catch(() => {});
        }, 300);
        return () => clearTimeout(timer);
    }, [
        isFormReadyForQr,
        shipmentCode,
        shipmentType,
        productName,
        selectedLot,
        weightInput,
        boxCountInput,
        destinationCountry,
        portOfDestination,
        portOfLoading,
        containerNumber,
        sealNumber,
        truckPlate,
        carrierName,
        customerName,
        customerPhone,
        deliveryAddress,
        transportMethod,
        driverName,
        facilityName,
    ]);

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
                const matchCustomer = s.customerName?.toLowerCase().includes(q);
                const matchDest = s.portOfDestination?.toLowerCase().includes(q) || s.destinationCountry?.toLowerCase().includes(q);
                if (!matchCode && !matchProduct && !matchContainer && !matchSeal && !matchTruck && !matchCustomer && !matchDest) return false;
            }
            if (statusFilter !== "ALL" && s.status !== statusFilter) return false;
            return true;
        });
    }, [shipments, searchQuery, statusFilter]);

    const handleOpenCreateModal = () => {
        const todayStr = new Date().toISOString().slice(0, 10).replaceAll("-", "");
        const rand = Math.floor(100 + Math.random() * 900);
        setShipmentType("EXPORT");
        setShipmentCode(`EXP-${todayStr}-${rand}`);
        // Do NOT pre-select or pre-fill any transportation or export data
        setSelectedFinishedLotId("");
        setProductName("");
        setWeightInput("");
        setBoxCountInput("");
        setTruckPlate("");
        setContainerNumber("");
        setSealNumber("");
        setCarrierName("");
        setExportDate(new Date().toISOString().slice(0, 10));
        setDestinationCountry("");
        setPortOfDestination("");
        setPortOfLoading("");
        setExportNote("");
        setDistributionChannel("");
        setCustomerName("");
        setCustomerPhone("");
        setDeliveryAddress("");
        setTransportMethod("");
        setDriverName("");
        setOpenCreateModal(true);
    };

    const handleCreateShipment = async () => {
        const w = Number(weightInput);
        if (!selectedFinishedLotId || !selectedLot) {
            toast({ title: "Chưa chọn lô thành phẩm", description: "Vui lòng chọn một lô thành phẩm từ kho để liên kết nguồn gốc.", variant: "destructive" });
            return;
        }
        if (!w || w <= 0) {
            toast({ title: "Khối lượng không hợp lệ", description: "Vui lòng nhập khối lượng lô xuất.", variant: "destructive" });
            return;
        }
        if (w > selectedLot.remainingWeight) {
            toast({
                title: "Vượt quá khối lượng khả dụng",
                description: `Khối lượng xuất (${w.toLocaleString("vi-VN")} kg) vượt quá tồn kho khả dụng (${selectedLot.remainingWeight.toLocaleString("vi-VN")} kg).`,
                variant: "destructive",
            });
            return;
        }

        if (shipmentType === "EXPORT") {
            if (!destinationCountry.trim() && !portOfDestination.trim()) {
                toast({ title: "Thiếu điểm đến", description: "Vui lòng nhập Quốc gia nhập khẩu hoặc Điểm đến xuất khẩu.", variant: "destructive" });
                return;
            }
        } else {
            if (!customerName.trim() && !deliveryAddress.trim() && !distributionChannel.trim()) {
                toast({ title: "Thiếu thông tin nhận hàng", description: "Vui lòng nhập Tên khách hàng hoặc Địa chỉ nhận hàng nội địa.", variant: "destructive" });
                return;
            }
        }

        setSubmitting(true);
        try {
            const payload: any = {
                shipmentCode,
                finishedProductLotId: selectedFinishedLotId,
                productName: productName.trim() || selectedLot.productName,
                shipmentType,
                weight: w,
                boxCount: Number(boxCountInput) || undefined,
                truckPlate: truckPlate.trim() || undefined,
                exportDate,
                status: "DISPATCHED",
                note: exportNote.trim() || undefined,
            };

            if (shipmentType === "EXPORT") {
                payload.destinationCountry = destinationCountry.trim() || "Trung Quốc";
                payload.portOfDestination = portOfDestination.trim() || undefined;
                payload.portOfLoading = portOfLoading.trim() || undefined;
                payload.containerNumber = containerNumber.trim() || undefined;
                payload.sealNumber = sealNumber.trim() || undefined;
                payload.carrierName = carrierName.trim() || undefined;
            } else {
                payload.destinationCountry = "Việt Nam";
                payload.distributionChannel = distributionChannel.trim() || undefined;
                payload.customerName = customerName.trim() || undefined;
                payload.customerPhone = customerPhone.trim() || undefined;
                payload.deliveryAddress = deliveryAddress.trim() || undefined;
                payload.transportMethod = transportMethod.trim() || undefined;
                payload.driverName = driverName.trim() || undefined;
                payload.carrierName = carrierName.trim() || undefined;
            }

            const res = await fetch("/api/processing/shipments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            const created = data?.data?.shipment;
            const token = data?.data?.traceCode?.publicToken || `TRC-${shipmentCode}`;

            const newRow: ShipmentItemRow = {
                id: created?.id || `ship-${Date.now()}`,
                shipmentCode: created?.shipmentCode || shipmentCode,
                productName: productName || selectedLot.productName,
                shipmentType,
                containerNumber: shipmentType === "EXPORT" ? containerNumber : undefined,
                sealNumber: shipmentType === "EXPORT" ? sealNumber : undefined,
                truckPlate,
                carrierName: shipmentType === "EXPORT" ? carrierName : transportMethod,
                weight: w,
                boxCount: Number(boxCountInput) || undefined,
                destinationCountry: shipmentType === "EXPORT" ? (destinationCountry || "Trung Quốc") : "Việt Nam",
                portOfDestination: shipmentType === "EXPORT" ? portOfDestination : deliveryAddress,
                portOfLoading: shipmentType === "EXPORT" ? portOfLoading : undefined,
                distributionChannel,
                customerName,
                customerPhone,
                deliveryAddress,
                transportMethod,
                driverName,
                dispatchDate: exportDate,
                status: "DISPATCHED",
                hasQrCode: true,
                qrPublicToken: token,
                farmName: selectedLot.farmName || "Vườn sầu riêng liên kết",
                regionCode: selectedLot.regionCode || "MSVT-VN-DL",
                rawLotCode: selectedLot.rawLotCode || "NVL-001",
                facilityName,
            };

            setShipments((prev) => [newRow, ...prev]);
            toast({
                title: "Tạo lô & Phát hành QR thành công",
                description: `Lô xuất hàng ${shipmentCode} (${shipmentType === "EXPORT" ? "Xuất khẩu" : "Nội địa"}) đã được kích hoạt mã QR truy xuất.`,
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
                                <th className="px-5 py-4 whitespace-nowrap">Sản phẩm & Điểm đến</th>
                                <th className="px-5 py-4 whitespace-nowrap text-right">Khối lượng</th>
                                <th className="px-5 py-4 text-center whitespace-nowrap">Số thùng</th>
                                <th className="px-5 py-4 whitespace-nowrap">Container / Xe</th>
                                <th className="px-5 py-4 whitespace-nowrap">Seal / ĐVVC</th>
                                <th className="px-5 py-4 whitespace-nowrap">Ngày xuất</th>
                                <th className="px-5 py-4 text-center whitespace-nowrap">Trạng thái QR</th>
                                <th className="px-5 py-4 text-right whitespace-nowrap">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                            {filteredShipments.map((s) => {
                                const token = s.qrPublicToken || s.shipmentCode;
                                const traceUrl = `/trace/${encodeURIComponent(token)}`;
                                const isDomestic = s.shipmentType === "DOMESTIC" || s.shipmentCode.startsWith("DOM-");

                                return (
                                    <tr key={s.id} className="h-14 hover:bg-slate-50/70 transition">
                                        {/* Mã lô xuất */}
                                        <td className="px-5 py-3 whitespace-nowrap">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-mono font-bold text-slate-900 text-xs">{s.shipmentCode}</span>
                                                {isDomestic ? (
                                                    <span className="rounded-md bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 text-[9px] font-black text-emerald-800">
                                                        Nội địa
                                                    </span>
                                                ) : (
                                                    <span className="rounded-md bg-indigo-100 border border-indigo-200 px-1.5 py-0.5 text-[9px] font-black text-indigo-800">
                                                        Xuất khẩu
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Sản phẩm & Điểm đến */}
                                        <td className="px-5 py-3 whitespace-nowrap">
                                            <p className="font-bold text-slate-800 text-xs sm:text-sm">{s.productName}</p>
                                            <p className="text-[11px] text-slate-500">
                                                {isDomestic
                                                    ? `${s.customerName ? `${s.customerName} · ` : ""}${s.deliveryAddress || "Giao nội địa"}`
                                                    : (s.portOfDestination || s.destinationCountry || "Thị trường xuất khẩu")}
                                            </p>
                                        </td>

                                        {/* Khối lượng */}
                                        <td className="px-5 py-3 whitespace-nowrap text-right font-black text-slate-900 text-xs sm:text-sm">
                                            {s.weight >= 1000 ? `${(s.weight / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tấn` : `${s.weight.toLocaleString("vi-VN")} kg`}
                                        </td>

                                        {/* Số thùng */}
                                        <td className="px-5 py-3 text-center whitespace-nowrap font-bold text-slate-700 text-xs">
                                            {s.boxCount ? `${s.boxCount.toLocaleString("vi-VN")}` : "—"}
                                        </td>

                                        {/* Container / Xe */}
                                        <td className="px-5 py-3 whitespace-nowrap font-mono text-xs text-slate-700">
                                            {s.containerNumber ? (
                                                <span className="font-bold text-indigo-900">{s.containerNumber}</span>
                                            ) : (
                                                <span>{s.truckPlate || "—"}</span>
                                            )}
                                        </td>

                                        {/* Seal / ĐVVC */}
                                        <td className="px-5 py-3 whitespace-nowrap text-xs text-slate-600">
                                            {s.sealNumber ? (
                                                <span className="font-mono text-xs">{s.sealNumber}</span>
                                            ) : (
                                                <span>{s.carrierName || "Nội bộ"}</span>
                                            )}
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
                                        Chưa có dữ liệu lô xuất hàng nào. Bấm <b>"Tạo lô xuất hàng"</b> để bắt đầu xuất lô và phát hành QR.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL 1: TẠO LÔ XUẤT HÀNG (PORTAL TO BODY - FULL VIEWPORT OVERLAY) */}
            {openCreateModal && (
                <ModalPortal>
                    <div className="fixed inset-0 z-[9999] w-screen h-screen flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
                        <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-150">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 p-5 sm:p-6">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                                    {shipmentType === "EXPORT" ? "Hồ sơ xuất khẩu" : "Hồ sơ xuất bán nội địa"}
                                </span>
                                <h2 className="text-xl font-black text-slate-900">TẠO LÔ XUẤT HÀNG & PHÁT HÀNH QR</h2>
                            </div>
                            <button type="button" onClick={() => setOpenCreateModal(false)} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="overflow-y-auto p-5 sm:p-6 space-y-5">
                            {/* LỰA CHỌN LOẠI HÌNH: XUẤT KHẨU HOẶC XUẤT BÁN TRONG NƯỚC */}
                            <div className="rounded-2xl border border-slate-200 bg-slate-100/70 p-1.5 flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShipmentType("EXPORT");
                                        if (shipmentCode.startsWith("DOM-")) {
                                            setShipmentCode(shipmentCode.replace("DOM-", "EXP-"));
                                        }
                                    }}
                                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black transition ${
                                        shipmentType === "EXPORT"
                                            ? "bg-white text-indigo-700 shadow-sm border border-slate-200"
                                            : "text-slate-600 hover:text-slate-900"
                                    }`}
                                >
                                    <Globe className="h-4 w-4" />
                                    🚢 Xuất khẩu nước ngoài
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShipmentType("DOMESTIC");
                                        if (shipmentCode.startsWith("EXP-")) {
                                            setShipmentCode(shipmentCode.replace("EXP-", "DOM-"));
                                        }
                                    }}
                                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black transition ${
                                        shipmentType === "DOMESTIC"
                                            ? "bg-white text-emerald-700 shadow-sm border border-slate-200"
                                            : "text-slate-600 hover:text-slate-900"
                                    }`}
                                >
                                    <Building2 className="h-4 w-4" />
                                    🏪 Xuất bán trong nước
                                </button>
                            </div>

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
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Lô thành phẩm đủ điều kiện xuất (Đã đóng gói) <span className="text-rose-500">*</span>
                                        </label>
                                        <select
                                            value={selectedFinishedLotId}
                                            onChange={(e) => {
                                                const id = e.target.value;
                                                setSelectedFinishedLotId(id);
                                                const found = availableLots.find((l) => l.id === id);
                                                if (found) {
                                                    setProductName(found.productName);
                                                    setWeightInput(found.remainingWeight);
                                                    setBoxCountInput(Math.max(1, Math.round(found.remainingWeight / 18)));
                                                } else {
                                                    setProductName("");
                                                    setWeightInput("");
                                                    setBoxCountInput("");
                                                }
                                            }}
                                            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none"
                                        >
                                            <option value="">-- Chọn lô thành phẩm đã đóng gói để xuất hàng --</option>
                                            {availableLots.map((lot) => (
                                                <option key={lot.id} value={lot.id}>
                                                    {lot.lotCode} — {lot.productName} ({lot.remainingWeight.toLocaleString("vi-VN")} kg · Đã đóng gói) {lot.farmName ? `· ${lot.farmName}` : ""}
                                                </option>
                                            ))}
                                            {availableLots.length === 0 && (
                                                <option value="" disabled>Chưa có lô hàng nào ở trạng thái "Đã đóng gói"</option>
                                            )}
                                        </select>
                                        <p className="mt-1 text-[10px] text-slate-400 italic">
                                            * Quy định: Chỉ những lô hàng ở trạng thái "Đã đóng gói" mới có dữ liệu tại trang Xuất hàng.
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            {shipmentType === "EXPORT" ? "Tên sản phẩm xuất khẩu" : "Tên sản phẩm xuất bán"}
                                        </label>
                                        <input
                                            type="text"
                                            value={productName}
                                            onChange={(e) => setProductName(e.target.value)}
                                            placeholder={selectedLot ? selectedLot.productName : "Chọn lô thành phẩm để lấy tên sản phẩm..."}
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
                                                placeholder={selectedLot ? String(selectedLot.remainingWeight) : "0"}
                                                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Số thùng</label>
                                            <input
                                                type="number"
                                                value={boxCountInput}
                                                onChange={(e) => setBoxCountInput(e.target.value)}
                                                placeholder="0"
                                                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* PHẦN 2: THÔNG TIN VẬN CHUYỂN (TÙY THEO XUẤT KHẨU HAY NỘI ĐỊA) */}
                            {shipmentType === "EXPORT" ? (
                                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                                    <h3 className="text-xs font-black uppercase tracking-wider text-sky-800 flex items-center gap-1.5">
                                        <Truck className="h-4 w-4" />
                                        2. PHƯƠNG TIỆN VẬN CHUYỂN & CONTAINER (XUẤT KHẨU)
                                    </h3>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Biển số xe đầu kéo / xe tải</label>
                                            <input
                                                type="text"
                                                value={truckPlate}
                                                onChange={(e) => setTruckPlate(e.target.value)}
                                                placeholder="Ví dụ: 51D-999.88"
                                                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 font-mono text-xs font-semibold text-slate-900 focus:border-sky-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Số container</label>
                                            <input
                                                type="text"
                                                value={containerNumber}
                                                onChange={(e) => setContainerNumber(e.target.value)}
                                                placeholder="Ví dụ: TEMU-882910-2"
                                                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 font-mono text-xs font-bold text-slate-900 focus:border-sky-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Số chì / Seal niêm phong</label>
                                            <input
                                                type="text"
                                                value={sealNumber}
                                                onChange={(e) => setSealNumber(e.target.value)}
                                                placeholder="Ví dụ: SL-VN-88219"
                                                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 font-mono text-xs font-bold text-slate-900 focus:border-sky-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Đơn vị vận chuyển quốc tế</label>
                                            <input
                                                type="text"
                                                value={carrierName}
                                                onChange={(e) => setCarrierName(e.target.value)}
                                                placeholder="Ví dụ: Công ty Vận tải Á Châu"
                                                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 focus:border-sky-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                                    <h3 className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                                        <Building2 className="h-4 w-4" />
                                        2. THÔNG TIN KHÁCH HÀNG & ĐỐI TÁC (NỘI ĐỊA)
                                    </h3>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Kênh phân phối</label>
                                            <select
                                                value={distributionChannel}
                                                onChange={(e) => setDistributionChannel(e.target.value)}
                                                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 focus:border-emerald-500 focus:outline-none"
                                            >
                                                <option value="">-- Chọn kênh phân phối --</option>
                                                <option value="Hệ thống Siêu thị">Hệ thống Siêu thị (WinMart, Co.opmart...)</option>
                                                <option value="Chợ đầu mối">Chợ đầu mối (Thủ Đức, Hóc Môn...)</option>
                                                <option value="Cửa hàng trái cây sạch">Chuỗi cửa hàng trái cây / Bán lẻ</option>
                                                <option value="Đại lý sỉ">Đại lý cấp 1 / Phân phối sỉ</option>
                                                <option value="Khách hàng doanh nghiệp">Khách hàng Doanh nghiệp / Chế biến</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                Đơn vị / Người nhận hàng <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={customerName}
                                                onChange={(e) => setCustomerName(e.target.value)}
                                                placeholder="Ví dụ: Siêu thị WinMart Landmark 81"
                                                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Số điện thoại liên hệ</label>
                                            <input
                                                type="text"
                                                value={customerPhone}
                                                onChange={(e) => setCustomerPhone(e.target.value)}
                                                placeholder="Ví dụ: 0912 345 678"
                                                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 font-mono text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Địa chỉ giao hàng nội địa</label>
                                            <input
                                                type="text"
                                                value={deliveryAddress}
                                                onChange={(e) => setDeliveryAddress(e.target.value)}
                                                placeholder="Ví dụ: Kho trung chuyển Dĩ An, Bình Dương"
                                                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 focus:border-emerald-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* PHẦN 3: THÔNG TIN XUẤT HÀNG HOẶC VẬN CHUYỂN NỘI ĐỊA */}
                            {shipmentType === "EXPORT" ? (
                                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                                    <h3 className="text-xs font-black uppercase tracking-wider text-indigo-800 flex items-center gap-1.5">
                                        <Globe className="h-4 w-4" />
                                        3. THÔNG TIN XUẤT HÀNG & CỬA KHẨU (XUẤT KHẨU)
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
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Điểm đến / Cảng đến</label>
                                            <input
                                                type="text"
                                                value={portOfDestination}
                                                onChange={(e) => setPortOfDestination(e.target.value)}
                                                placeholder="Ví dụ: Côn Minh, Vân Nam"
                                                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Cửa khẩu / Cảng xuất</label>
                                            <input
                                                type="text"
                                                value={portOfLoading}
                                                onChange={(e) => setPortOfLoading(e.target.value)}
                                                placeholder="Ví dụ: Cửa khẩu Quốc tế Hữu Nghị"
                                                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Quốc gia nhập khẩu</label>
                                            <input
                                                type="text"
                                                value={destinationCountry}
                                                onChange={(e) => setDestinationCountry(e.target.value)}
                                                placeholder="Ví dụ: Trung Quốc"
                                                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú xuất khẩu</label>
                                        <input
                                            type="text"
                                            value={exportNote}
                                            onChange={(e) => setExportNote(e.target.value)}
                                            placeholder="Nhập ghi chú hoặc yêu cầu kiểm dịch đặc biệt..."
                                            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs focus:border-emerald-500 focus:outline-none"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                                    <h3 className="text-xs font-black uppercase tracking-wider text-sky-800 flex items-center gap-1.5">
                                        <Truck className="h-4 w-4" />
                                        3. PHƯƠNG THỨC VẬN CHUYỂN & GIAO HÀNG (NỘI ĐỊA)
                                    </h3>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Ngày giờ giao hàng</label>
                                            <input
                                                type="date"
                                                value={exportDate}
                                                onChange={(e) => setExportDate(e.target.value)}
                                                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 focus:border-sky-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Hình thức vận chuyển</label>
                                            <select
                                                value={transportMethod}
                                                onChange={(e) => setTransportMethod(e.target.value)}
                                                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 focus:border-sky-500 focus:outline-none"
                                            >
                                                <option value="">-- Chọn hình thức --</option>
                                                <option value="Xe tải lạnh nội địa">Xe tải lạnh nội địa</option>
                                                <option value="Xe giao hàng xưởng">Xe giao hàng của xưởng</option>
                                                <option value="Đơn vị chuyển phát">Đơn vị chuyển phát (Viettel Post, GHTK...)</option>
                                                <option value="Khách tự nhận tại kho">Khách hàng tự nhận tại kho</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Biển số xe vận chuyển</label>
                                            <input
                                                type="text"
                                                value={truckPlate}
                                                onChange={(e) => setTruckPlate(e.target.value)}
                                                placeholder="Ví dụ: 60C-882.19"
                                                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 font-mono text-xs font-semibold text-slate-900 focus:border-sky-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Tài xế / Người giao</label>
                                            <input
                                                type="text"
                                                value={driverName}
                                                onChange={(e) => setDriverName(e.target.value)}
                                                placeholder="Ví dụ: Nguyễn Văn Nam"
                                                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 focus:border-sky-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú giao hàng nội địa</label>
                                        <input
                                            type="text"
                                            value={exportNote}
                                            onChange={(e) => setExportNote(e.target.value)}
                                            placeholder="Thời gian giao hẹn trước, lưu ý kiểm đếm khi nhận..."
                                            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs focus:border-emerald-500 focus:outline-none"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* PHẦN 4: KHU VỰC QR TRUY XUẤT (LIVE PREVIEW & QUÉT TRỰC TIẾP NGAY TRÊN FORM) */}
                            <div className={`rounded-2xl border-2 p-4 space-y-3 transition ${selectedLot && isFormReadyForQr ? "border-emerald-400 bg-emerald-50/40" : "border-slate-300 bg-slate-50/60"}`}>
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                                        <QrCode className="h-4 w-4 text-emerald-600" />
                                        4. KHU VỰC QR TRUY XUẤT NGUỒN GỐC (QUÉT & XEM TRỰC TIẾP)
                                    </h3>
                                    {selectedLot && isFormReadyForQr ? (
                                        <span className="rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 flex items-center gap-1">
                                            <CheckCircle2 className="h-3 w-3" /> Đủ thông tin · Sẵn sàng quét & phát hành
                                        </span>
                                    ) : !selectedLot ? (
                                        <span className="rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                                            Chưa chọn lô thành phẩm
                                        </span>
                                    ) : (
                                        <span className="rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                                            {shipmentType === "EXPORT" ? "Chưa đủ thông tin điểm đến / xuất khẩu" : "Chưa đủ thông tin khách hàng / địa chỉ nhận"}
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-3 items-center">
                                    {/* Cột trái: QR Code Live Preview & Trực tiếp quét */}
                                    <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3 text-center min-h-[190px]">
                                        {selectedLot && isFormReadyForQr ? (
                                            <>
                                                <img
                                                    src={liveQrImage}
                                                    alt={`QR Preview ${shipmentCode}`}
                                                    className="h-36 w-36 rounded-lg object-contain shadow-sm border border-slate-100"
                                                />
                                                <span className="mt-2 font-mono text-[11px] font-black text-slate-900">{shipmentCode}</span>
                                                <span className="text-[10px] text-emerald-700 font-bold mt-0.5">
                                                    📱 Quét bằng camera điện thoại để xem trực tiếp!
                                                </span>
                                                <a
                                                    href={liveTraceUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="mt-2 inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 shadow-soft transition"
                                                >
                                                    <ExternalLink className="h-3 w-3" />
                                                    Xem trước trang truy xuất
                                                </a>
                                            </>
                                        ) : (
                                            <div className="py-4 space-y-2 text-slate-400">
                                                <QrCode className="h-16 w-16 mx-auto opacity-30" />
                                                <span className="block font-mono text-[11px] font-bold text-slate-400">
                                                    {shipmentCode || "EXP-..."}
                                                </span>
                                                <span className="block text-[10px] text-slate-400 max-w-[180px]">
                                                    Điền đầy đủ lô thành phẩm và thông tin vận chuyển để kích hoạt mã quét trực tiếp
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Cột phải: Chuỗi truy xuất liên kết */}
                                    <div className="md:col-span-2 space-y-2 text-xs">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="rounded-xl bg-white p-2.5 border border-slate-200">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                                    <Trees className="h-3 w-3 text-emerald-600" /> Farm / Vùng trồng
                                                </p>
                                                {selectedLot ? (
                                                    <>
                                                        <p className="font-bold text-slate-900 mt-0.5">{selectedLot.farmName || "Vườn liên kết"}</p>
                                                        <p className="text-[10px] text-emerald-700 font-semibold">{selectedLot.regionCode || "MSVT-VN-DL-0089"}</p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <p className="font-semibold text-slate-400 mt-0.5">— (Chưa chọn lô thành phẩm)</p>
                                                        <p className="text-[10px] text-slate-400">—</p>
                                                    </>
                                                )}
                                            </div>

                                            <div className="rounded-xl bg-white p-2.5 border border-slate-200">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                                    <Building2 className="h-3 w-3 text-emerald-600" /> Cơ sở chế biến & đóng gói
                                                </p>
                                                <p className="font-bold text-slate-900 mt-0.5">{facilityName}</p>
                                                <p className="text-[10px] text-slate-500">Mã CS: CS-TV-001</p>
                                            </div>
                                        </div>

                                        <div className="rounded-xl bg-white p-2.5 border border-slate-200 space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Tóm tắt chuỗi truy xuất nguồn gốc</p>
                                            {selectedLot ? (
                                                <>
                                                    <p className="font-medium text-slate-800">
                                                        Lô nguồn: <span className="font-mono font-bold text-slate-900">{selectedLot.lotCode}</span> ({selectedLot.productName}) · Hình thức: <span className="font-bold text-emerald-700">{shipmentType === "EXPORT" ? "Xuất khẩu nước ngoài" : "Xuất bán trong nước"}</span>
                                                    </p>
                                                    <p className="text-[11px] text-emerald-700 font-bold">
                                                        {isFormReadyForQr
                                                            ? `✅ Chuỗi truy xuất hợp lệ: ${selectedLot.farmName || "Farm"} ➔ Tiếp nhận & Phân loại ➔ Đóng gói ➔ ${shipmentType === "EXPORT" ? `Xuất khẩu (${destinationCountry || portOfDestination})` : `Xuất bán nội địa (${customerName || deliveryAddress})`}.`
                                                            : "⚠️ Vui lòng điền đủ khối lượng xuất và thông tin điểm đến/khách hàng."}
                                                    </p>
                                                </>
                                            ) : (
                                                <p className="text-[11px] text-amber-700 font-bold">
                                                    ⚠️ Chưa liên kết nguồn gốc. Vui lòng chọn lô thành phẩm từ kho ở Phần 1 để hệ thống kết nối chuỗi dữ liệu vườn / Farm.
                                                </p>
                                            )}
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
                                disabled={submitting || !selectedLot || !isFormReadyForQr}
                                className="flex-1 rounded-2xl h-11 bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700 shadow-soft disabled:opacity-50"
                            >
                                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tạo lô & Phát hành QR"}
                            </Button>
                        </div>
                    </div>
                </div>
            </ModalPortal>
        )}

            {/* MODAL 2: XEM MÃ QR & HỒ SƠ TRUY XUẤT NGUỒN GỐC (PORTAL TO BODY - FULL VIEWPORT OVERLAY) */}
            {viewQrShipment && (
                <ModalPortal>
                    <div className="fixed inset-0 z-[9999] w-screen h-screen flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
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
                                                    <span className="text-[10px] font-bold uppercase text-slate-400">
                                                        {viewQrShipment.shipmentType === "DOMESTIC" || viewQrShipment.shipmentCode.startsWith("DOM-") ? "Giao nhận nội địa" : "Vận chuyển & Cửa khẩu"}
                                                    </span>
                                                    {viewQrShipment.shipmentType === "DOMESTIC" || viewQrShipment.shipmentCode.startsWith("DOM-") ? (
                                                        <>
                                                            <p className="font-bold text-slate-900">{viewQrShipment.customerName || "Khách hàng nội địa"}</p>
                                                            <p className="text-slate-800">
                                                                Địa chỉ: <span className="font-semibold text-slate-900">{viewQrShipment.deliveryAddress || "Nội địa"}</span>
                                                            </p>
                                                            <p className="text-[11px] text-slate-500">
                                                                Xe: <span className="font-mono font-bold text-slate-900">{viewQrShipment.truckPlate || "—"}</span> {viewQrShipment.carrierName ? `· ${viewQrShipment.carrierName}` : ""}
                                                            </p>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <p className="text-slate-800">
                                                                Container: <span className="font-mono font-bold text-slate-900">{viewQrShipment.containerNumber || "—"}</span> · Seal: <span className="font-mono font-bold text-slate-900">{viewQrShipment.sealNumber || "—"}</span>
                                                            </p>
                                                            <p className="text-slate-800">
                                                                Xe: <span className="font-mono font-bold text-slate-900">{viewQrShipment.truckPlate || "—"}</span>
                                                            </p>
                                                            <p className="text-[11px] text-slate-500">
                                                                {viewQrShipment.portOfLoading || "Cửa khẩu Hữu Nghị"} ➔ {viewQrShipment.portOfDestination || viewQrShipment.destinationCountry || "Trung Quốc"}
                                                            </p>
                                                        </>
                                                    )}
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
            </ModalPortal>
        )}
        </div>
    );
}

