'use client';

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import {
    Truck,
    Package,
    Plus,
    FileText,
    QrCode,
    CheckCircle2,
    AlertCircle,
    X,
    Calendar,
    Building2,
    MapPin,
    ShieldCheck,
    Download,
    Printer,
    Copy,
    ExternalLink,
    Search,
    Eye,
    Globe,
} from "lucide-react";
import { useProcessingWorkflow } from "@/hooks/use-processing-workflow";
import { ShipmentRecord, generateShipmentCode, DEFAULT_FACILITY_INFO } from "@/lib/processing-workflow";
import { useToast } from "@/components/ui/toast";
import { ModalPortal } from "@/components/ui/modal-portal";

export function ProcessingShipmentsDocumentView() {
    const { state, isLoaded, createShipment, issueShipmentQr } = useProcessingWorkflow();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const lotIdFromQuery = searchParams.get("lotId");

    const [searchTerm, setSearchTerm] = useState("");
    const [marketFilter, setMarketFilter] = useState("ALL");

    // Modal state for creating shipment
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [formError, setFormError] = useState("");

    // Form fields
    const nextAutoCode = useMemo(() => generateShipmentCode(state.shipments), [state.shipments]);
    const [shipmentDate, setShipmentDate] = useState(() => new Intl.DateTimeFormat("en-CA").format(new Date()));
    const [contractType, setContractType] = useState<"EXPORT" | "DOMESTIC">("EXPORT");
    const [departurePort, setDeparturePort] = useState("Cảng Cát Lái, TP. Hồ Chí Minh");
    const [buyerName, setBuyerName] = useState("");
    const [destinationMarket, setDestinationMarket] = useState("Trung Quốc");
    const [destinationPort, setDestinationPort] = useState("Cảng Khâm Châu (Qinzhou Port, China)");
    const [selectedLotId, setSelectedLotId] = useState("");
    const [unitPrice, setUnitPrice] = useState<number | "">("");
    const [currency, setCurrency] = useState<"VND" | "USD">("VND");
    const [truckPlate, setTruckPlate] = useState("");
    const [containerNumber, setContainerNumber] = useState("");
    const [sealNumber, setSealNumber] = useState("");
    const [carrierName, setCarrierName] = useState("");
    const [containerTemp, setContainerTemp] = useState("+13°C");

    // Available finished lots with status "READY"
    const readyFinishedLots = useMemo(() => {
        return state.finishedLots.filter((l) => l.status === "READY");
    }, [state.finishedLots]);

    const currentSelectedLot = useMemo(() => {
        return state.finishedLots.find((l) => l.id === selectedLotId);
    }, [state.finishedLots, selectedLotId]);

    // Total amount
    const totalAmount = useMemo(() => {
        if (!currentSelectedLot || typeof unitPrice !== "number") return 0;
        return currentSelectedLot.netWeightKg * unitPrice;
    }, [currentSelectedLot, unitPrice]);

    // Modal state for viewing QR & Traceability chain
    const [viewingQrShipment, setViewingQrShipment] = useState<ShipmentRecord | null>(null);
    const [qrDataUrl, setQrDataUrl] = useState<string>("");
    const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

    // Auto open modal if lotId is in query
    useEffect(() => {
        if (lotIdFromQuery && readyFinishedLots.some((l) => l.id === lotIdFromQuery)) {
            setSelectedLotId(lotIdFromQuery);
            const lot = readyFinishedLots.find((l) => l.id === lotIdFromQuery);
            if (lot) {
                setUnitPrice(lot.type === "FRESH" ? 160000 : 350000);
            }
            setIsCreateOpen(true);
        }
    }, [lotIdFromQuery, readyFinishedLots]);

    // Generate QR Image when viewing QR modal opens
    useEffect(() => {
        if (viewingQrShipment) {
            const origin = typeof window !== "undefined" ? window.location.origin : "https://triviet-trace.vn";
            const traceUrl = `${origin}/trace?code=${viewingQrShipment.shipmentCode}`;
            QRCode.toDataURL(traceUrl, { width: 280, margin: 2 })
                .then((url) => setQrDataUrl(url))
                .catch((e) => console.error("QR gen error:", e));
        } else {
            setQrDataUrl("");
        }
    }, [viewingQrShipment]);

    const handleOpenCreate = () => {
        setShipmentDate(new Intl.DateTimeFormat("en-CA").format(new Date()));
        setContractType("EXPORT");
        setDeparturePort("Cảng Cát Lái, TP. Hồ Chí Minh");
        setBuyerName("");
        setDestinationMarket("Trung Quốc");
        setDestinationPort("Cảng Khâm Châu (Qinzhou Port, China)");
        if (readyFinishedLots.length > 0) {
            setSelectedLotId(readyFinishedLots[0].id);
            setUnitPrice(readyFinishedLots[0].type === "FRESH" ? 160000 : 350000);
        } else {
            setSelectedLotId("");
            setUnitPrice("");
        }
        setCurrency("VND");
        setTruckPlate("51D-");
        setContainerNumber("TGHU-");
        setSealNumber("VN-GACC-");
        setCarrierName("Công ty TNHH Vận tải & Tiếp vận Biển Đông");
        setContainerTemp("+13°C");
        setFormError("");
        setIsCreateOpen(true);
    };

    const handleSelectLot = (id: string) => {
        setSelectedLotId(id);
        const lot = state.finishedLots.find((l) => l.id === id);
        if (lot && typeof unitPrice !== "number") {
            setUnitPrice(lot.type === "FRESH" ? 160000 : 350000);
        }
    };

    const handleSaveShipment = (e: React.FormEvent) => {
        e.preventDefault();
        setFormError("");

        if (!selectedLotId) {
            setFormError("Vui lòng chọn một Lô thành phẩm sẵn sàng xuất");
            return;
        }
        if (!buyerName.trim()) {
            setFormError("Vui lòng nhập tên khách hàng / đối tác mua hàng");
            return;
        }
        if (typeof unitPrice !== "number" || unitPrice <= 0) {
            setFormError("Đơn giá xuất phải lớn hơn 0");
            return;
        }
        if (!truckPlate.trim()) {
            setFormError("Vui lòng nhập biển số xe vận chuyển");
            return;
        }
        if (!containerNumber.trim()) {
            setFormError("Vui lòng nhập số container");
            return;
        }
        if (!sealNumber.trim()) {
            setFormError("Vui lòng nhập số seal niêm phong");
            return;
        }

        try {
            const shipment = createShipment({
                shipmentDate,
                contractType,
                departurePort: departurePort.trim(),
                buyerName: buyerName.trim(),
                destinationMarket: destinationMarket.trim(),
                destinationPort: destinationPort.trim(),
                finishedProductLotId: selectedLotId,
                unitPrice,
                currency,
                truckPlate: truckPlate.trim(),
                containerNumber: containerNumber.trim(),
                sealNumber: sealNumber.trim(),
                carrierName: carrierName.trim(),
                containerTemp: containerTemp.trim() || undefined,
            });

            toast({
                title: "Lập hồ sơ xuất hàng thành công!",
                description: `Mã hợp đồng ${shipment.shipmentCode} đã được lưu, tự động sinh Khoản phải thu (${shipment.totalAmount.toLocaleString("vi-VN")} đ) trong Tài chính!`,
                variant: "success",
            });

            setIsCreateOpen(false);
        } catch (err: unknown) {
            setFormError(err instanceof Error ? err.message : "Đã có lỗi xảy ra khi lưu");
        }
    };

    const handleIssueQr = (shipment: ShipmentRecord) => {
        // Validation check for PUC and PHC
        if (!shipment.pucCode || !shipment.phcCode) {
            toast({
                title: "Không thể phát hành QR!",
                description: "Hồ sơ bắt buộc phải có tối thiểu Mã vùng trồng (PUC) và Mã cơ sở đóng gói (PHC) theo quy chuẩn GACC!",
                variant: "destructive",
            });
            return;
        }

        try {
            const updated = issueShipmentQr(shipment.id);
            if (updated) {
                toast({
                    title: "Phát hành QR thành công!",
                    description: `Đã cấp mã QR truy xuất cho hồ sơ xuất hàng ${shipment.shipmentCode}`,
                    variant: "success",
                });
                setViewingQrShipment(updated);
            }
        } catch (err: unknown) {
            toast({
                title: "Lỗi",
                description: err instanceof Error ? err.message : "Không thể phát hành QR",
                variant: "destructive",
            });
        }
    };

    const handleCopyTraceLink = (code: string) => {
        const origin = typeof window !== "undefined" ? window.location.origin : "https://triviet-trace.vn";
        const traceUrl = `${origin}/trace?code=${code}`;
        navigator.clipboard.writeText(traceUrl);
        toast({
            title: "Đã sao chép liên kết!",
            description: `Link tra cứu: ${traceUrl}`,
            variant: "default",
        });
    };

    // Filter shipments
    const filteredShipments = useMemo(() => {
        return state.shipments.filter((s) => {
            const matchesSearch =
                s.shipmentCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.buyerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.containerNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.pucCode.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesMarket = marketFilter === "ALL" || s.destinationMarket === marketFilter;

            return matchesSearch && matchesMarket;
        });
    }, [state.shipments, searchTerm, marketFilter]);

    if (!isLoaded) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="flex items-center gap-2 text-slate-500">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                    <span>Đang tải hồ sơ xuất hàng...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Xuất hàng & Hồ sơ xuất khẩu</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Hình thức Hồ sơ xuất hàng (Shipping Contract chứng từ). Tự động kế thừa chuỗi nguồn gốc từ Lô thành phẩm và phát hành mã QR truy xuất chuẩn PUC + PHC.
                    </p>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-teal-600/20 transition hover:bg-teal-700"
                >
                    <Plus className="h-4 w-4" />
                    <span>+ Lập hồ sơ xuất hàng mới</span>
                </button>
            </div>

            {/* Quick overview banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <span className="text-xs font-semibold text-slate-500">Số hồ sơ xuất hàng</span>
                    <p className="mt-1 text-2xl font-black text-slate-900">{state.shipments.length} hồ sơ</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <span className="text-xs font-semibold text-slate-500">Tổng sản lượng xuất khẩu</span>
                    <p className="mt-1 text-2xl font-black text-teal-700">
                        {state.shipments.reduce((sum, s) => sum + s.netWeightKg, 0).toLocaleString("vi-VN")} kg
                    </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <span className="text-xs font-semibold text-slate-500">Lô thành phẩm sẵn sàng xuất</span>
                    <p className="mt-1 text-2xl font-black text-emerald-600">
                        {readyFinishedLots.length} lô trong kho
                    </p>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Tìm theo mã hồ sơ XH, khách hàng, container, PUC..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-sm focus:border-teal-500 focus:bg-white focus:outline-none"
                    />
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <span>Thị trường:</span>
                        <select
                            value={marketFilter}
                            onChange={(e) => setMarketFilter(e.target.value)}
                            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:border-teal-500 focus:outline-none"
                        >
                            <option value="ALL">Tất cả thị trường</option>
                            <option value="Trung Quốc">Trung Quốc</option>
                            <option value="Nội địa">Nội địa</option>
                            <option value="Khác">Khác</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Table: Danh sách hồ sơ xuất hàng */}
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                            <tr>
                                <th className="px-5 py-4">Mã hồ sơ XH</th>
                                <th className="px-5 py-4">Ngày xuất</th>
                                <th className="px-5 py-4">Bên mua & Cảng đến</th>
                                <th className="px-5 py-4">Sản phẩm & Khối lượng</th>
                                <th className="px-5 py-4">Thành tiền</th>
                                <th className="px-5 py-4">Phương tiện / Container</th>
                                <th className="px-5 py-4">QR truy xuất</th>
                                <th className="px-5 py-4 text-center">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredShipments.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                                        Chưa có hồ sơ xuất hàng nào được lập
                                    </td>
                                </tr>
                            ) : (
                                filteredShipments.map((s) => (
                                    <tr key={s.id} className="hover:bg-slate-50/60 transition">
                                        <td className="px-5 py-4">
                                            <span className="font-mono font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-100">
                                                {s.shipmentCode}
                                            </span>
                                            <span className="block text-[11px] text-slate-400 mt-1">
                                                HĐ: {s.contractType === "EXPORT" ? "Xuất khẩu" : "Nội địa"}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-slate-700 font-medium">{s.shipmentDate}</td>
                                        <td className="px-5 py-4">
                                            <span className="font-bold text-slate-900">{s.buyerName}</span>
                                            <span className="block text-xs text-teal-700 font-medium">
                                                {s.destinationMarket} • {s.destinationPort}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="font-medium text-slate-900">{s.productName}</span>
                                            <span className="block font-mono font-bold text-slate-800 text-xs mt-0.5">
                                                {s.netWeightKg.toLocaleString("vi-VN")} kg ({s.packageCount} {s.packagingSpec})
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 font-mono font-black text-emerald-800">
                                            {s.totalAmount.toLocaleString("vi-VN")} {s.currency}
                                        </td>
                                        <td className="px-5 py-4 text-xs font-mono">
                                            <div className="text-slate-900 font-bold">Xe: {s.truckPlate}</div>
                                            <div className="text-slate-500">Cont: {s.containerNumber}</div>
                                            <div className="text-slate-500">Seal: {s.sealNumber}</div>
                                        </td>
                                        <td className="px-5 py-4">
                                            {s.qrIssued ? (
                                                <button
                                                    onClick={() => setViewingQrShipment(s)}
                                                    className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-200 transition"
                                                >
                                                    <QrCode className="h-3.5 w-3.5 text-emerald-700" />
                                                    <span>Đã phát hành QR</span>
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleIssueQr(s)}
                                                    className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2.5 py-1 text-xs font-bold text-amber-900 hover:bg-amber-200 transition"
                                                >
                                                    <QrCode className="h-3.5 w-3.5 text-amber-700" />
                                                    <span>Phát hành QR</span>
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <button
                                                    onClick={() => setViewingQrShipment(s)}
                                                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 shadow-sm"
                                                    title="Xem chi tiết hồ sơ & chuỗi truy xuất"
                                                >
                                                    <Eye className="h-3.5 w-3.5 text-teal-600" />
                                                    <span>Xem hồ sơ</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL: LẬP HỒ SƠ XUẤT HÀNG (SHIPPING CONTRACT) */}
            {isCreateOpen && (
                <ModalPortal>
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
                        <div className="w-full max-w-3xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto space-y-6">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                                        <FileText className="h-5 w-5 text-teal-600" />
                                        Hồ sơ xuất hàng (Shipping Contract)
                                    </h2>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Mã hồ sơ tự sinh: <strong className="font-mono text-teal-800">{nextAutoCode}</strong>. Tự động liên kết chuỗi nguồn gốc và sinh khoản phải thu trong Tài chính.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsCreateOpen(false)}
                                    className="rounded-full p-2 text-slate-400 hover:bg-slate-100"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {formError && (
                                <div className="flex items-center gap-2 rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800">
                                    <AlertCircle className="h-4 w-4 shrink-0" />
                                    <span>{formError}</span>
                                </div>
                            )}

                            <form onSubmit={handleSaveShipment} className="space-y-6">
                                {/* BLOCK 1: THÔNG TIN XUẤT HÀNG */}
                                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                                    <span className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                                        1. Thông tin xuất hàng
                                    </span>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-600">Mã hồ sơ (Tự sinh)</label>
                                            <input
                                                type="text"
                                                value={nextAutoCode}
                                                readOnly
                                                className="mt-1 w-full rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-mono font-bold text-teal-900 cursor-not-allowed"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-600">Ngày xuất hàng *</label>
                                            <input
                                                type="date"
                                                value={shipmentDate}
                                                onChange={(e) => setShipmentDate(e.target.value)}
                                                required
                                                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-teal-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-600">Loại hợp đồng</label>
                                            <select
                                                value={contractType}
                                                onChange={(e) => setContractType(e.target.value as "EXPORT" | "DOMESTIC")}
                                                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800"
                                            >
                                                <option value="EXPORT">Xuất khẩu quốc tế</option>
                                                <option value="DOMESTIC">Tiêu thụ nội địa</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* BLOCK 2: BÊN BÁN / CẢNG ĐI */}
                                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                                    <span className="text-xs font-black uppercase text-slate-700 tracking-wider">
                                        2. Bên bán / Cảng đi
                                    </span>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div className="sm:col-span-1">
                                            <label className="block text-[11px] font-bold text-slate-600">Tên cơ sở chế biến & đóng gói</label>
                                            <input
                                                type="text"
                                                value={DEFAULT_FACILITY_INFO.name}
                                                readOnly
                                                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-800 cursor-not-allowed"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-600">Mã CSĐG (Cố định)</label>
                                            <input
                                                type="text"
                                                value={DEFAULT_FACILITY_INFO.phcCode}
                                                readOnly
                                                className="mt-1 w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-mono font-bold text-emerald-900 cursor-not-allowed"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-600">Cảng xuất / Địa chỉ đi *</label>
                                            <input
                                                type="text"
                                                value={departurePort}
                                                onChange={(e) => setDeparturePort(e.target.value)}
                                                required
                                                placeholder="VD: Cảng Cát Lái, TP.HCM"
                                                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-teal-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* BLOCK 3: BÊN MUA / CẢNG ĐẾN */}
                                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                                    <span className="text-xs font-black uppercase text-slate-700 tracking-wider">
                                        3. Bên mua / Cảng đến
                                    </span>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-600">Khách hàng / Đối tác *</label>
                                            <input
                                                type="text"
                                                value={buyerName}
                                                onChange={(e) => setBuyerName(e.target.value)}
                                                required
                                                placeholder="VD: Guangxi Agri-Trade Group"
                                                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-teal-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-600">Thị trường đích *</label>
                                            <select
                                                value={destinationMarket}
                                                onChange={(e) => setDestinationMarket(e.target.value)}
                                                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800"
                                            >
                                                <option value="Trung Quốc">Trung Quốc (GACC)</option>
                                                <option value="Nội địa">Nội địa Việt Nam</option>
                                                <option value="Nhật Bản">Nhật Bản</option>
                                                <option value="Hàn Quốc">Hàn Quốc</option>
                                                <option value="Khác">Thị trường khác</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-600">Cảng đến / Cửa khẩu *</label>
                                            <input
                                                type="text"
                                                value={destinationPort}
                                                onChange={(e) => setDestinationPort(e.target.value)}
                                                required
                                                placeholder="VD: Cảng Khâm Châu, Trung Quốc"
                                                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-teal-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* BLOCK 4: THÔNG TIN HÀNG HÓA */}
                                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                                    <span className="text-xs font-black uppercase text-slate-700 tracking-wider">
                                        4. Thông tin hàng hóa (Chọn từ Lô thành phẩm)
                                    </span>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600">
                                            Chọn Lô thành phẩm (Chỉ hiện các lô Sẵn sàng xuất) *
                                        </label>
                                        <select
                                            value={selectedLotId}
                                            onChange={(e) => handleSelectLot(e.target.value)}
                                            required
                                            className="mt-1 w-full rounded-xl border border-teal-300 bg-white px-3 py-2 text-xs font-mono font-bold text-teal-950 focus:border-teal-600 focus:outline-none"
                                        >
                                            <option value="">-- Chọn lô thành phẩm --</option>
                                            {readyFinishedLots.map((l) => (
                                                <option key={l.id} value={l.id}>
                                                    {l.productCode} - {l.productName} ({l.netWeightKg.toLocaleString("vi-VN")} kg, {l.packageCount} {l.packagingSpec})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Auto-populated goods detail */}
                                    {currentSelectedLot && (
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl border border-teal-200 bg-white p-3 text-xs">
                                            <div>
                                                <span className="text-slate-400">Loại sản phẩm:</span>
                                                <p className="font-bold text-slate-900">{currentSelectedLot.type === "FRESH" ? "Trái tươi" : "Chế biến"}</p>
                                            </div>
                                            <div>
                                                <span className="text-slate-400">Quy cách:</span>
                                                <p className="font-bold text-slate-900">{currentSelectedLot.packagingSpec}</p>
                                            </div>
                                            <div>
                                                <span className="text-slate-400">Khối lượng tịnh:</span>
                                                <p className="font-mono font-black text-slate-900">
                                                    {currentSelectedLot.netWeightKg.toLocaleString("vi-VN")} kg
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-slate-400">Số lượng:</span>
                                                <p className="font-bold text-slate-900">{currentSelectedLot.packageCount} thùng/khay</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-600">Đơn giá xuất *</label>
                                            <input
                                                type="number"
                                                value={unitPrice}
                                                onChange={(e) => setUnitPrice(e.target.value === "" ? "" : Number(e.target.value))}
                                                required
                                                placeholder="VD: 160000"
                                                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-teal-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-600">Loại tiền tệ</label>
                                            <select
                                                value={currency}
                                                onChange={(e) => setCurrency(e.target.value as "VND" | "USD")}
                                                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800"
                                            >
                                                <option value="VND">VNĐ (Việt Nam Đồng)</option>
                                                <option value="USD">USD (Đô la Mỹ)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-600">Thành tiền tự tính</label>
                                            <input
                                                type="text"
                                                value={`${totalAmount.toLocaleString("vi-VN")} ${currency}`}
                                                readOnly
                                                className="mt-1 w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-mono font-black text-emerald-900 cursor-not-allowed"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* BLOCK 5: VẬN CHUYỂN */}
                                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                                    <span className="text-xs font-black uppercase text-slate-700 tracking-wider">
                                        5. Vận chuyển & Container
                                    </span>
                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-600">Biển số xe *</label>
                                            <input
                                                type="text"
                                                value={truckPlate}
                                                onChange={(e) => setTruckPlate(e.target.value)}
                                                required
                                                placeholder="VD: 51D-892.45"
                                                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono text-slate-800"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-600">Số container *</label>
                                            <input
                                                type="text"
                                                value={containerNumber}
                                                onChange={(e) => setContainerNumber(e.target.value)}
                                                required
                                                placeholder="VD: TGHU-782910-4"
                                                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono text-slate-800"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-600">Số seal *</label>
                                            <input
                                                type="text"
                                                value={sealNumber}
                                                onChange={(e) => setSealNumber(e.target.value)}
                                                required
                                                placeholder="VD: VN-GACC-992104"
                                                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono text-slate-800"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-600">Đơn vị vận chuyển</label>
                                            <input
                                                type="text"
                                                value={carrierName}
                                                onChange={(e) => setCarrierName(e.target.value)}
                                                placeholder="VD: Vận tải Biển Đông"
                                                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-600">Nhiệt độ cont</label>
                                            <input
                                                type="text"
                                                value={containerTemp}
                                                onChange={(e) => setContainerTemp(e.target.value)}
                                                placeholder="VD: +13°C"
                                                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* BLOCK 6: NGUỒN GỐC & TRUY XUẤT (LOCKED - READ ONLY) */}
                                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-black uppercase text-emerald-950 tracking-wider flex items-center gap-1.5">
                                            <ShieldCheck className="h-4 w-4 text-emerald-600" />
                                            6. Nguồn gốc & Truy xuất (Tự nạp từ liên kết ngược - Khóa sửa)
                                        </span>
                                        <span className="text-[10px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                                            Bảo chứng hệ thống
                                        </span>
                                    </div>

                                    {currentSelectedLot ? (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                                            <div className="rounded-xl bg-white p-2.5 border border-emerald-100">
                                                <span className="text-[10px] font-bold text-slate-400">Vườn trồng / Hộ dân</span>
                                                <p className="font-bold text-slate-900 mt-0.5">{currentSelectedLot.farmName}</p>
                                                <span className="text-[10px] text-slate-500">Chủ vườn: {currentSelectedLot.sellerName}</span>
                                            </div>

                                            <div className="rounded-xl bg-white p-2.5 border border-emerald-100">
                                                <span className="text-[10px] font-bold text-slate-400">Mã vùng trồng (PUC)</span>
                                                <p className="font-mono font-bold text-brand-800 mt-0.5">{currentSelectedLot.pucCode}</p>
                                                <span className="text-[10px] text-emerald-600 font-semibold">Đạt chuẩn GACC</span>
                                            </div>

                                            <div className="rounded-xl bg-white p-2.5 border border-emerald-100">
                                                <span className="text-[10px] font-bold text-slate-400">Mã cơ sở đóng gói (PHC)</span>
                                                <p className="font-mono font-bold text-emerald-800 mt-0.5">{currentSelectedLot.phcCode}</p>
                                                <span className="text-[10px] text-slate-500">{currentSelectedLot.facilityName}</span>
                                            </div>

                                            <div className="rounded-xl bg-white p-2.5 border border-emerald-100">
                                                <span className="text-[10px] font-bold text-slate-400">Mã lô thu mua gốc</span>
                                                <p className="font-mono font-bold text-slate-900 mt-0.5">{currentSelectedLot.purchaseCode}</p>
                                            </div>

                                            <div className="rounded-xl bg-white p-2.5 border border-emerald-100">
                                                <span className="text-[10px] font-bold text-slate-400">Giống sầu riêng</span>
                                                <p className="font-bold text-slate-900 mt-0.5">{currentSelectedLot.durianVariety}</p>
                                            </div>

                                            <div className="rounded-xl bg-white p-2.5 border border-emerald-100">
                                                <span className="text-[10px] font-bold text-slate-400">Mã lô phân loại</span>
                                                <p className="font-mono font-bold text-slate-900 mt-0.5">{currentSelectedLot.gradingCode}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-400 italic">Vui lòng chọn Lô thành phẩm để tự động hiển thị chuỗi nguồn gốc</p>
                                    )}
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreateOpen(false)}
                                        className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                                    >
                                        Hủy bỏ
                                    </button>
                                    <button
                                        type="submit"
                                        className="rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-teal-700 transition"
                                    >
                                        Lưu hợp đồng xuất hàng
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {/* MODAL: XEM MÃ QR VÀ CHUỖI TRUY XUẤT 7 BƯỚC */}
            {viewingQrShipment && (
                <ModalPortal>
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
                        <div className="w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto space-y-6">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                                        <QrCode className="h-5 w-5 text-emerald-600" />
                                        Mã QR Truy Xuất Nguồn Gốc Xuất Khẩu
                                    </h2>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Hồ sơ: <strong className="font-mono text-teal-800">{viewingQrShipment.shipmentCode}</strong> • Đối tác: {viewingQrShipment.buyerName}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setViewingQrShipment(null)}
                                    className="rounded-full p-2 text-slate-400 hover:bg-slate-100"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* QR Code and Actions */}
                            <div className="flex flex-col sm:flex-row items-center gap-6 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6">
                                {qrDataUrl ? (
                                    <img
                                        src={qrDataUrl}
                                        alt="QR Truy xuất nguồn gốc"
                                        className="h-48 w-48 rounded-2xl border border-emerald-300 bg-white p-2 shadow-md"
                                    />
                                ) : (
                                    <div className="flex h-48 w-48 items-center justify-center rounded-2xl bg-white border border-slate-200 text-xs text-slate-400">
                                        Đang tạo mã QR...
                                    </div>
                                )}

                                <div className="flex-1 space-y-3">
                                    <div>
                                        <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">
                                            Mã truy xuất quốc tế
                                        </span>
                                        <h3 className="text-lg font-mono font-black text-emerald-950 mt-0.5">
                                            {viewingQrShipment.shipmentCode}
                                        </h3>
                                        <p className="text-xs text-slate-600 mt-1">
                                            Mã QR mang mã hồ sơ xuất hàng, tích hợp đầy đủ chuỗi 7 bước từ vùng trồng, thu mua đến xuất cảng.
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap gap-2 pt-2">
                                        <button
                                            onClick={() => handleCopyTraceLink(viewingQrShipment.shipmentCode)}
                                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
                                        >
                                            <Copy className="h-3.5 w-3.5 text-slate-500" />
                                            <span>Sao chép link</span>
                                        </button>

                                        {qrDataUrl && (
                                            <a
                                                href={qrDataUrl}
                                                download={`QR_${viewingQrShipment.shipmentCode}.png`}
                                                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm"
                                            >
                                                <Download className="h-3.5 w-3.5" />
                                                <span>Tải ảnh QR</span>
                                            </a>
                                        )}

                                        <Link
                                            href={`/trace?code=${viewingQrShipment.shipmentCode}`}
                                            target="_blank"
                                            className="inline-flex items-center gap-1.5 rounded-xl border border-teal-300 bg-teal-50 px-3 py-2 text-xs font-bold text-teal-800 hover:bg-teal-100 shadow-sm"
                                        >
                                            <ExternalLink className="h-3.5 w-3.5" />
                                            <span>Xem trang công khai</span>
                                        </Link>
                                    </div>
                                </div>
                            </div>

                            {/* Full 7-Step Traceability Journey */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                                    Chuỗi truy xuất toàn vẹn khép kín (Hiển thị khi quét QR)
                                </h4>

                                <div className="space-y-2.5 text-xs">
                                    {/* 1. Xuất hàng */}
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-start gap-3">
                                        <div className="rounded-lg bg-teal-600 p-1.5 text-white font-bold text-[10px]">01</div>
                                        <div className="flex-1">
                                            <span className="font-bold text-slate-900">Hồ sơ xuất hàng & Vận chuyển:</span>
                                            <p className="text-slate-600 mt-0.5 font-mono">
                                                Mã: {viewingQrShipment.shipmentCode} | Cảng xuất: {viewingQrShipment.departurePort} ➔ Cảng đến: {viewingQrShipment.destinationPort}
                                            </p>
                                            <p className="text-slate-500 font-mono text-[11px] mt-0.5">
                                                Biển số xe: {viewingQrShipment.truckPlate} | Cont: {viewingQrShipment.containerNumber} | Seal: {viewingQrShipment.sealNumber}
                                            </p>
                                        </div>
                                    </div>

                                    {/* 2. Thành phẩm */}
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-start gap-3">
                                        <div className="rounded-lg bg-teal-600 p-1.5 text-white font-bold text-[10px]">02</div>
                                        <div className="flex-1">
                                            <span className="font-bold text-slate-900">Lô thành phẩm:</span>
                                            <p className="text-slate-600 mt-0.5">
                                                Mã TP: <strong className="font-mono text-teal-800">{viewingQrShipment.productCode}</strong> ({viewingQrShipment.productName})
                                            </p>
                                            <p className="text-slate-500 font-mono text-[11px] mt-0.5">
                                                Khối lượng: {viewingQrShipment.netWeightKg.toLocaleString("vi-VN")} kg | Quy cách: {viewingQrShipment.packageCount} {viewingQrShipment.packagingSpec}
                                            </p>
                                        </div>
                                    </div>

                                    {/* 3. Chế biến & Đóng gói */}
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-start gap-3">
                                        <div className="rounded-lg bg-teal-600 p-1.5 text-white font-bold text-[10px]">03</div>
                                        <div className="flex-1">
                                            <span className="font-bold text-slate-900">Chế biến & Đóng gói:</span>
                                            <p className="text-slate-600 mt-0.5">
                                                Thực hiện tại: {viewingQrShipment.facilityName}
                                            </p>
                                            <p className="text-slate-500 text-[11px] mt-0.5">
                                                Quy chuẩn kiểm định vi sinh, dán tem mã QR từng kiện
                                            </p>
                                        </div>
                                    </div>

                                    {/* 4. Phân loại */}
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-start gap-3">
                                        <div className="rounded-lg bg-teal-600 p-1.5 text-white font-bold text-[10px]">04</div>
                                        <div className="flex-1">
                                            <span className="font-bold text-slate-900">Phân loại nguyên liệu:</span>
                                            <p className="text-slate-600 mt-0.5">
                                                Phân luồng kiểm soát chất lượng từ lô thu mua gốc
                                            </p>
                                        </div>
                                    </div>

                                    {/* 5. Thu mua */}
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-start gap-3">
                                        <div className="rounded-lg bg-teal-600 p-1.5 text-white font-bold text-[10px]">05</div>
                                        <div className="flex-1">
                                            <span className="font-bold text-slate-900">Hồ sơ thu mua gốc:</span>
                                            <p className="text-slate-600 mt-0.5 font-mono">
                                                Mã lô TM: <strong className="text-emerald-800">{viewingQrShipment.purchaseCode}</strong> | Giống: {viewingQrShipment.durianVariety}
                                            </p>
                                        </div>
                                    </div>

                                    {/* 6. Vườn trồng */}
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-start gap-3">
                                        <div className="rounded-lg bg-teal-600 p-1.5 text-white font-bold text-[10px]">06</div>
                                        <div className="flex-1">
                                            <span className="font-bold text-slate-900">Vườn trồng & Hộ sản xuất:</span>
                                            <p className="text-slate-600 mt-0.5">
                                                Tên vườn: <strong>{viewingQrShipment.farmName}</strong>
                                            </p>
                                        </div>
                                    </div>

                                    {/* 7. Định danh quốc tế (PUC + PHC) */}
                                    <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-3 flex items-start gap-3">
                                        <div className="rounded-lg bg-emerald-700 p-1.5 text-white font-bold text-[10px]">07</div>
                                        <div className="flex-1">
                                            <span className="font-bold text-emerald-950">Định danh quốc tế (GACC / ISO):</span>
                                            <div className="mt-1 flex flex-wrap gap-4 font-mono text-xs">
                                                <div>
                                                    Mã vùng trồng (PUC): <strong className="text-brand-800">{viewingQrShipment.pucCode}</strong>
                                                </div>
                                                <div>
                                                    Mã cơ sở đóng gói (PHC): <strong className="text-emerald-800">{viewingQrShipment.phcCode}</strong>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
                                <button
                                    onClick={() => setViewingQrShipment(null)}
                                    className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800"
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}
        </div>
    );
}
