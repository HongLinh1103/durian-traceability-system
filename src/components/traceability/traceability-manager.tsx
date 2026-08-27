"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import {
    CheckCircle2,
    Clock,
    QrCode,
    Sparkles,
    Building2,
    Store,
    ShoppingBag,
    HelpCircle,
    Printer,
    FileText,
    ArrowRight,
    Search,
    DollarSign,
    Scale,
    Layers,
    ShieldAlert,
    AlertCircle,
    X,
    ExternalLink,
    Ship,
    Truck,
    Globe,
    CheckCircle,
    Flag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TraceValidation } from "@/lib/traceability";
import { SalesDispatchSlip, SalesDispatchData } from "@/components/partner/sales-dispatch-slip";

type IssuerRole = "FARMER" | "COLLECTOR" | "PROCESSING_FACILITY";

type Lot = {
    id: string;
    lotCode: string;
    ownerType: string;
    productName: string;
    quantity: number;
    remainingQuantity: number;
    stockBeforeDispatch?: number | null;
    unit: string;
    status: string;
    buyerName?: string | null;
    buyerPhone?: string | null;
    buyerAddress?: string | null;
    unitPrice?: number | null;
    subtotal?: number | null;
    discount?: number | null;
    totalAmount?: number | null;
    paidAmount?: number | null;
    debtAmount?: number | null;
    paymentStatus?: "PAID" | "PARTIAL" | "UNPAID" | string | null;
    paymentMethod?: string | null;
    dispatchedAt?: string | Date | null;
    note?: string | null;
    destination?: {
        name: string;
        type: string;
        address?: string | null;
        country?: string | null;
    } | null;
    traceabilityCode?: {
        id: string;
        code: string;
        publicToken: string;
        status: string;
    } | null;
    owner?: {
        name: string;
    } | null;
    validation?: TraceValidation;
};

type SourceOption = {
    id: string;
    code: string;
    type: "HARVEST_LOT" | "COLLECTION_LOT" | "FINISHED_PRODUCT_LOT";
    label: string;
    productName?: string;
    totalQuantity?: number;
    remainingQuantity?: number;
    farmCount?: number;
    qcStatus?: "PASSED" | "PENDING" | "REJECTED";
};

type DestinationOption = {
    id: string;
    name: string;
    address?: string | null;
    type: string;
    contactName?: string | null;
    contactPhone?: string | null;
};

export function TraceabilityManager({
    initialLots,
    admin = false,
    readOnly = false,
    role = "FARMER",
    sources = [],
    destinations = [],
    initialSourceId = "",
}: {
    initialLots: Lot[];
    admin?: boolean;
    readOnly?: boolean;
    role?: IssuerRole;
    sources?: SourceOption[];
    destinations?: DestinationOption[];
    initialSourceId?: string;
}) {
    const [lots, setLots] = useState(initialLots);
    const [sourceList, setSourceList] = useState<SourceOption[]>(sources);
    const [busy, setBusy] = useState<string | null>(null);
    const [message, setMessage] = useState("");
    const [issuerFilter, setIssuerFilter] = useState("ALL");
    
    // Mode of Dispatch: DOMESTIC vs EXPORT
    const [dispatchMode, setDispatchMode] = useState<"DOMESTIC" | "EXPORT">(
        role === "PROCESSING_FACILITY" ? "EXPORT" : "DOMESTIC"
    );

    const [selectedSourceId, setSelectedSourceId] = useState(initialSourceId || "");
    const [destinationName, setDestinationName] = useState("");
    const [destinationAddress, setDestinationAddress] = useState("");
    const [destinationCountry, setDestinationCountry] = useState("Trung Quốc");
    const [portOfLoading, setPortOfLoading] = useState("Cửa khẩu Quốc tế Hữu Nghị (Lạng Sơn) - Đường bộ");
    const [transportMethod, setTransportMethod] = useState("Đường bộ (Xe container lạnh)");
    const [containerNumber, setContainerNumber] = useState("");
    const [sealNumber, setSealNumber] = useState("");
    const [vehicleReference, setVehicleReference] = useState("");
    const [exportStageStatus, setExportStageStatus] = useState("DISPATCHED");

    const [destinationType, setDestinationType] = useState(
        dispatchMode === "EXPORT" ? "EXPORT" : role === "COLLECTOR" ? "MARKET" : "RETAIL"
    );
    const [showSuggestions, setShowSuggestions] = useState(false);

    useEffect(() => {
        setSourceList(sources);
    }, [sources]);

    // Form inputs for sales dispatch & finance
    const [quantityInput, setQuantityInput] = useState<string>("");
    const [unitPriceInput, setUnitPriceInput] = useState<string>("");
    const [discountInput, setDiscountInput] = useState<string>("");
    const [paidAmountInput, setPaidAmountInput] = useState<string>("");
    const [paymentMethod, setPaymentMethod] = useState<string>("Chuyển khoản");
    const [buyerPhone, setBuyerPhone] = useState<string>("");

    // Modal state for viewing the sales dispatch slip
    const [selectedSlipData, setSelectedSlipData] = useState<SalesDispatchData | null>(null);
    const [exportProgressLot, setExportProgressLot] = useState<Lot | null>(null);
    const [issuingQr, setIssuingQr] = useState(false);

    useEffect(() => {
        if (dispatchMode === "EXPORT") {
            setDestinationType("EXPORT");
            if (!destinationName || destinationName === "Công ty ABC" || destinationName === "Chợ đầu mối Nông sản Thủ Đức") {
                setDestinationName("Thị trường Trung Quốc");
            }
        } else {
            setDestinationType(role === "COLLECTOR" ? "MARKET" : "RETAIL");
            if (destinationName === "Thị trường Trung Quốc") {
                setDestinationName("");
            }
        }
    }, [dispatchMode, role]);

    const defaultSuggestions = useMemo(() => {
        if (dispatchMode === "EXPORT") {
            return [
                "Thị trường Trung Quốc (GACC)",
                "Thị trường Hoa Kỳ (Mỹ)",
                "Thị trường Nhật Bản",
                "Thị trường Hàn Quốc",
                "Thị trường EU (Châu Âu)",
                "Thị trường Úc",
                "Thị trường Đài Loan",
                "Thị trường Singapore",
            ];
        }
        return [
            "Công ty ABC",
            "Chợ đầu mối Nông sản Thủ Đức",
            "Chợ đầu mối Hóc Môn",
            "Chợ đầu mối Bình Điền",
            "Hệ thống Siêu thị Co.opmart",
            "Hệ thống Siêu thị WinMart",
            "Chuỗi Cửa hàng Bách Hóa Xanh",
            "Hệ thống Siêu thị GO! / Big C",
            "Siêu thị MM Mega Market",
            "Đại lý phân phối nông sản",
        ];
    }, [dispatchMode]);

    const allSuggestions = useMemo(() => {
        const dbList = destinations.map((d) => ({
            id: d.id,
            name: d.name,
            address: d.address || "",
            type: d.type,
            contactName: d.contactName || "",
            contactPhone: d.contactPhone || "",
            isSaved: true,
        }));
        const dbNames = new Set(destinations.map((d) => d.name.trim().toLowerCase()));
        const defaults = defaultSuggestions
            .filter((name) => !dbNames.has(name.trim().toLowerCase()))
            .map((name) => ({
                id: "",
                name,
                address: "",
                type: dispatchMode === "EXPORT" ? "EXPORT" : "RETAIL",
                contactName: "",
                contactPhone: "",
                isSaved: false,
            }));
        return [...dbList, ...defaults];
    }, [destinations, defaultSuggestions, dispatchMode]);

    const filteredSuggestions = useMemo(() => {
        if (!destinationName.trim()) return allSuggestions.slice(0, 8);
        const query = destinationName.trim().toLowerCase();
        return allSuggestions.filter((s) => s.name.toLowerCase().includes(query)).slice(0, 8);
    }, [allSuggestions, destinationName]);

    function selectSuggestion(item: {
        name: string;
        address?: string;
        type?: string;
        contactName?: string;
        contactPhone?: string;
    }) {
        setDestinationName(item.name);
        if (item.address) setDestinationAddress(item.address);
        if (item.type) setDestinationType(item.type);
        if (item.contactPhone) setBuyerPhone(item.contactPhone);
        setShowSuggestions(false);
    }

    const selectedSource = sourceList.find((source) => source.id === selectedSourceId);
    const dateCode = new Date().toISOString().slice(0, 10).replaceAll("-", "");
    const prefix = dispatchMode === "EXPORT" 
        ? "EXP" 
        : role === "COLLECTOR" 
        ? "CM-COL" 
        : role === "PROCESSING_FACILITY" 
        ? "TP" 
        : "CM-FAR";
    const nextSequence =
        Math.max(
            0,
            ...lots
                .map((lot) => lot.lotCode.match(new RegExp(`^${prefix}-${dateCode}-(\\d+)$`)))
                .map((match) => Number(match?.[1] ?? 0))
        ) + 1;
    const generatedLotCode = `${prefix}-${dateCode}-${String(nextSequence).padStart(3, "0")}`;
    const visibleLots = issuerFilter === "ALL" ? lots : lots.filter((lot) => lot.ownerType === issuerFilter);

    // Real-time financial calculations
    const numQuantity = Number(quantityInput) || 0;
    const numUnitPrice = Number(unitPriceInput.replace(/\D/g, "")) || 0;
    const numDiscount = Number(discountInput.replace(/\D/g, "")) || 0;
    const calcSubtotal = numQuantity * numUnitPrice;
    const calcTotalAmount = Math.max(0, calcSubtotal - numDiscount);
    const numPaidAmount = Number(paidAmountInput.replace(/\D/g, "")) || 0;
    const calcDebtAmount = Math.max(0, calcTotalAmount - numPaidAmount);

    let calcPaymentStatus = "UNPAID";
    if (calcTotalAmount > 0) {
        if (numPaidAmount >= calcTotalAmount) calcPaymentStatus = "PAID";
        else if (numPaidAmount > 0) calcPaymentStatus = "PARTIAL";
        else calcPaymentStatus = "UNPAID";
    }

    async function issue(id: string) {
        setBusy(id);
        setIssuingQr(true);
        setMessage("");
        const response = await fetch("/api/traceability/codes", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ commercialLotId: id }),
        });
        const payload = await response.json();
        if (payload.success) {
            setLots((current) =>
                current.map((lot) => (lot.id === id ? { ...lot, traceabilityCode: payload.data } : lot))
            );
            if (selectedSlipData && selectedSlipData.id === id) {
                setSelectedSlipData((prev) =>
                    prev
                        ? {
                              ...prev,
                              traceabilityCode: {
                                  id: payload.data.id,
                                  code: payload.data.code,
                                  publicToken: payload.data.publicToken,
                                  status: payload.data.status,
                              },
                          }
                        : null
                );
            }
        } else {
            setMessage(payload.error || "Không thể phát hành mã QR");
        }
        setBusy(null);
        setIssuingQr(false);
    }

    async function createLot(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setBusy("create");
        setMessage("");

        const formData = new FormData(e.currentTarget);
        const selected = sourceList.find((source) => source.id === formData.get("sourceId"));
        const destName = destinationName.trim();
        if (!destName) {
            setMessage("Vui lòng nhập bên mua / thị trường đến");
            setBusy(null);
            return;
        }

        const isExport = dispatchMode === "EXPORT";
        const destAddress = destinationAddress.trim() || (isExport ? destinationCountry : "");
        const destType = isExport ? "EXPORT" : destinationType;
        const contactName = String(formData.get("contactName") || "").trim();
        const contactPhone = buyerPhone.trim();

        const matched = destinations.find((d) => d.name.trim().toLowerCase() === destName.toLowerCase());
        const destinationId = matched && (!destAddress || destAddress === matched.address) ? matched.id : undefined;

        const note = [
            formData.get("plannedDate") && `Ngày xuất: ${formData.get("plannedDate")}`,
            isExport && `Thị trường: ${destinationCountry}`,
            isExport && portOfLoading && `Cửa khẩu/Cảng: ${portOfLoading}`,
            isExport && containerNumber && `Container: ${containerNumber}`,
            isExport && sealNumber && `Seal: ${sealNumber}`,
            isExport && vehicleReference && `Biển số xe: ${vehicleReference}`,
            formData.get("note"),
        ]
            .filter(Boolean)
            .join("\n");

        const payloadBody = {
            lotCode: formData.get("lotCode"),
            sourceId: selected?.id,
            sourceType: selected?.type,
            destinationId: destinationId || undefined,
            destination: destinationId
                ? undefined
                : {
                      type: destType,
                      name: destName,
                      address: destAddress || destName,
                      country: isExport ? destinationCountry : undefined,
                      contactName: contactName || undefined,
                      contactPhone: contactPhone || undefined,
                  },
            productName: formData.get("productName"),
            quantity: numQuantity,
            unit: "kg",
            stockBeforeDispatch: selected?.remainingQuantity ?? numQuantity,
            buyerName: destName,
            buyerPhone: contactPhone || undefined,
            buyerAddress: destAddress || undefined,
            unitPrice: numUnitPrice,
            subtotal: calcSubtotal,
            discount: numDiscount,
            totalAmount: calcTotalAmount,
            paidAmount: numPaidAmount,
            debtAmount: calcDebtAmount,
            paymentStatus: calcPaymentStatus,
            paymentMethod,
            dispatchedAt: formData.get("plannedDate")
                ? new Date(String(formData.get("plannedDate")))
                : new Date(),
            note,
            // Export fields
            isExport,
            destinationCountry: isExport ? destinationCountry : undefined,
            portOfLoading: isExport ? portOfLoading : undefined,
            transportMethod: isExport ? transportMethod : undefined,
            containerNumber: isExport ? containerNumber || undefined : undefined,
            sealNumber: isExport ? sealNumber || undefined : undefined,
            vehicleReference: isExport ? vehicleReference || undefined : undefined,
            exportStageStatus: isExport ? exportStageStatus : undefined,
        };

        const response = await fetch("/api/traceability/commercial-lots", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payloadBody),
        });
        const payload = await response.json();
        if (!payload.success) {
            setMessage(payload.error || "Không thể tạo phiếu xuất lô bán hàng");
            setBusy(null);
            return;
        }

        const createdLot = payload.data;
        const normalizedLot = {
            ...createdLot,
            quantity: Number(createdLot.quantity),
            remainingQuantity: Number(createdLot.remainingQuantity),
            stockBeforeDispatch: createdLot.stockBeforeDispatch ? Number(createdLot.stockBeforeDispatch) : null,
            unitPrice: createdLot.unitPrice ? Number(createdLot.unitPrice) : null,
            subtotal: createdLot.subtotal ? Number(createdLot.subtotal) : null,
            discount: createdLot.discount ? Number(createdLot.discount) : 0,
            totalAmount: createdLot.totalAmount ? Number(createdLot.totalAmount) : null,
            paidAmount: createdLot.paidAmount ? Number(createdLot.paidAmount) : 0,
            debtAmount: createdLot.debtAmount ? Number(createdLot.debtAmount) : 0,
            owner: createdLot.owner || { name: role === "PROCESSING_FACILITY" ? "Cơ sở chế biến" : role === "COLLECTOR" ? "Vựa thu mua" : "Nông dân" },
            validation: createdLot.validation || { traceCompleteness: 100, canIssueQr: true, missingRequirements: [] },
        };
        setLots((prev) => [normalizedLot, ...prev]);

        // Deduct source lot quantity in UI sources list
        setSourceList((prev) =>
            prev
                .map((s) => {
                    if (s.id === selectedSource?.id) {
                        const currentRem = s.remainingQuantity ?? 0;
                        const newRemaining = Math.max(0, currentRem - numQuantity);
                        return {
                            ...s,
                            remainingQuantity: newRemaining,
                        };
                    }
                    return s;
                })
                .filter((s) => (s.remainingQuantity ?? 0) > 0)
        );

        // Open the official Sales Dispatch Slip Modal immediately
        setSelectedSlipData({
            id: normalizedLot.id,
            lotCode: normalizedLot.lotCode,
            productName: normalizedLot.productName,
            quantity: Number(normalizedLot.quantity),
            unit: normalizedLot.unit || "kg",
            stockBeforeDispatch: normalizedLot.stockBeforeDispatch,
            buyerName: normalizedLot.buyerName || normalizedLot.destination?.name || destName,
            buyerPhone: normalizedLot.buyerPhone || contactPhone,
            buyerAddress: normalizedLot.buyerAddress || destAddress,
            unitPrice: normalizedLot.unitPrice,
            subtotal: normalizedLot.subtotal,
            discount: normalizedLot.discount,
            totalAmount: normalizedLot.totalAmount,
            paidAmount: normalizedLot.paidAmount,
            debtAmount: normalizedLot.debtAmount,
            paymentStatus: normalizedLot.paymentStatus,
            paymentMethod: normalizedLot.paymentMethod,
            dispatchedAt: normalizedLot.dispatchedAt,
            note: normalizedLot.note,
            ownerName: normalizedLot.owner?.name,
            ownerType: role,
            isExport,
            destinationCountry: isExport ? destinationCountry : undefined,
            portOfLoading: isExport ? portOfLoading : undefined,
            transportMethod: isExport ? transportMethod : undefined,
            containerNumber: isExport ? containerNumber : undefined,
            sealNumber: isExport ? sealNumber : undefined,
            vehicleReference: isExport ? vehicleReference : undefined,
            traceabilityCode: null,
        });

        // Reset form
        setQuantityInput("");
        setUnitPriceInput("");
        setDiscountInput("");
        setPaidAmountInput("");
        setDestinationName("");
        setDestinationAddress("");
        setBuyerPhone("");
        setContainerNumber("");
        setSealNumber("");
        setVehicleReference("");
        setBusy(null);
    }

    return (
        <div className="space-y-6">
            {/* Sales Dispatch & QR Creation Form */}
            {!admin && !readOnly && (
                <form onSubmit={createLot} className="space-y-6 rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
                    {/* Header & Mode Switcher */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-5">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-700 text-white font-black text-sm shadow-xs">
                                    {dispatchMode === "EXPORT" ? <Ship className="h-4 w-4" /> : <Truck className="h-4 w-4" />}
                                </span>
                                <h2 className="text-xl font-black text-slate-900">
                                    {dispatchMode === "EXPORT"
                                        ? "Tạo Lô Hàng Xuất Khẩu & Phát Hành QR (GACC)"
                                        : "Xuất Bán Lô Hàng Trong Nước & Phát Hành QR"}
                                </h2>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-500 mt-1">
                                {dispatchMode === "EXPORT"
                                    ? "Lập hồ sơ lô sầu riêng xuất khẩu chính ngạch sang Trung Quốc / Quốc tế, đối soát mã số vùng trồng (MSVT) & mã cơ sở đóng gói (MSCSĐG)."
                                    : "Lập phiếu xuất bán sầu riêng cho siêu thị, chợ đầu mối, đại lý nội địa, ghi nhận giá xuất và tạo mã QR truy xuất."}
                            </p>
                        </div>

                        {/* Mode Selector Radio Group */}
                        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200 self-start sm:self-auto">
                            <button
                                type="button"
                                onClick={() => setDispatchMode("DOMESTIC")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                                    dispatchMode === "DOMESTIC"
                                        ? "bg-white text-emerald-800 shadow-xs border border-slate-200"
                                        : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                                <Store className="h-3.5 w-3.5 text-emerald-600" />
                                🇻🇳 Bán trong nước
                            </button>
                            <button
                                type="button"
                                onClick={() => setDispatchMode("EXPORT")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                                    dispatchMode === "EXPORT"
                                        ? "bg-indigo-700 text-white shadow-xs"
                                        : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                                <Globe className="h-3.5 w-3.5" />
                                🌏 Xuất khẩu chính ngạch
                            </button>
                        </div>
                    </div>

                    {/* Section 1: Chọn Nguồn Hàng */}
                    <div className="space-y-3">
                        <p className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                            <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-slate-200 text-slate-700 text-[11px] font-black">1</span>
                            Nguồn hàng & Định danh lô
                        </p>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {/* 1. Chọn Lô Nguồn */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                                    Lô nguồn gốc <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    required
                                    name="sourceId"
                                    value={selectedSourceId}
                                    onChange={(event) => setSelectedSourceId(event.target.value)}
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white font-medium focus:border-emerald-500 focus:outline-none"
                                >
                                    <option value="">-- Chọn lô nguồn hàng --</option>
                                    {sourceList.map((source) => (
                                        <option key={source.id} value={source.id}>
                                            {source.code} · {source.label} (Còn {source.remainingQuantity?.toLocaleString("vi-VN")} kg)
                                        </option>
                                    ))}
                                </select>
                                {selectedSource && (
                                    <p className="text-xs text-emerald-700 font-medium">
                                        Tồn kho khả dụng: <b>{selectedSource.remainingQuantity?.toLocaleString("vi-VN")} kg</b>
                                    </p>
                                )}
                            </div>

                            {/* Mã phiếu / Mã lô xuất */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                                    {dispatchMode === "EXPORT" ? "Mã lô xuất khẩu" : "Mã lô xuất bán"} <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    required
                                    name="lotCode"
                                    defaultValue={generatedLotCode}
                                    placeholder={dispatchMode === "EXPORT" ? "EXP-20260828-001" : "TP-20260828-001"}
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono font-bold text-slate-800 text-sm"
                                />
                            </div>

                            {/* Tên sản phẩm */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                                    Tên sản phẩm <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    required
                                    name="productName"
                                    defaultValue={
                                        selectedSource?.productName ||
                                        (dispatchMode === "EXPORT"
                                            ? role === "PROCESSING_FACILITY"
                                                ? "Sầu riêng Ri6 tách múi cấp đông IQF"
                                                : "Sầu riêng tươi Ri6 (Nguyên quả xuất khẩu)"
                                            : "Sầu riêng tươi")
                                    }
                                    placeholder="Sầu riêng Ri6 tươi / Cấp đông..."
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Thông Tin Điểm Đến Hoặc Thị Trường Xuất Khẩu */}
                    <div className="border-t border-slate-100 pt-4 space-y-3">
                        <p className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                            <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-slate-200 text-slate-700 text-[11px] font-black">2</span>
                            {dispatchMode === "EXPORT" ? "Hồ sơ xuất khẩu & Logistics quốc tế" : "Bên mua & Điểm đến giao nhận nội địa"}
                        </p>

                        {dispatchMode === "EXPORT" ? (
                            /* EXPORT SPECIFIC FIELDS */
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 bg-indigo-50/40 p-4 rounded-2xl border border-indigo-100">
                                {/* Thị trường xuất khẩu */}
                                <div>
                                    <label className="block text-xs font-bold text-indigo-950 mb-1">
                                        Thị trường nhập khẩu <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={destinationCountry}
                                        onChange={(e) => {
                                            setDestinationCountry(e.target.value);
                                            setDestinationName(`Thị trường ${e.target.value}`);
                                        }}
                                        className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm font-bold text-indigo-950 focus:outline-none"
                                    >
                                        <option value="Trung Quốc">Trung Quốc (GACC Nghị định thư)</option>
                                        <option value="Hoa Kỳ (Mỹ)">Hoa Kỳ (Mỹ - USDA)</option>
                                        <option value="Nhật Bản">Nhật Bản (MAFF)</option>
                                        <option value="Hàn Quốc">Hàn Quốc</option>
                                        <option value="Châu Âu (EU)">Châu Âu (EU)</option>
                                        <option value="Úc (Australia)">Úc (Australia)</option>
                                        <option value="Đài Loan">Đài Loan</option>
                                        <option value="Singapore">Singapore</option>
                                    </select>
                                </div>

                                {/* Cửa khẩu / Cảng xuất */}
                                <div>
                                    <label className="block text-xs font-bold text-indigo-950 mb-1">
                                        Cửa khẩu / Cảng xuất hàng <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={portOfLoading}
                                        onChange={(e) => setPortOfLoading(e.target.value)}
                                        className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none"
                                    >
                                        <option value="Cửa khẩu Quốc tế Hữu Nghị (Lạng Sơn) - Đường bộ">Cửa khẩu QT Hữu Nghị (Lạng Sơn) - Đường bộ</option>
                                        <option value="Cửa khẩu Tân Thanh (Lạng Sơn) - Đường bộ">Cửa khẩu Tân Thanh (Lạng Sơn) - Đường bộ</option>
                                        <option value="Cửa khẩu Quốc tế Móng Cái (Quảng Ninh) - Đường bộ">Cửa khẩu QT Móng Cái (Quảng Ninh) - Đường bộ</option>
                                        <option value="Cửa khẩu Quốc tế Kim Thành (Lào Cai) - Đường bộ">Cửa khẩu QT Kim Thành (Lào Cai) - Đường bộ</option>
                                        <option value="Cảng Cát Lái (TP. Hồ Chí Minh) - Đường biển">Cảng Cát Lái (TP. Hồ Chí Minh) - Đường biển</option>
                                        <option value="Cảng Hải Phòng - Đường biển">Cảng Hải Phòng - Đường biển</option>
                                        <option value="Cảng Đà Nẵng - Đường biển">Cảng Đà Nẵng - Đường biển</option>
                                        <option value="Sân bay Quốc tế Tân Sơn Nhất - Hàng không">Sân bay QT Tân Sơn Nhất - Hàng không</option>
                                    </select>
                                </div>

                                {/* Phương thức vận chuyển */}
                                <div>
                                    <label className="block text-xs font-bold text-indigo-950 mb-1">
                                        Phương thức vận chuyển
                                    </label>
                                    <select
                                        value={transportMethod}
                                        onChange={(e) => setTransportMethod(e.target.value)}
                                        className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none"
                                    >
                                        <option value="Đường bộ (Xe container lạnh)">Đường bộ (Xe container lạnh)</option>
                                        <option value="Đường biển (Container lạnh)">Đường biển (Container lạnh)</option>
                                        <option value="Đường hàng không">Đường hàng không</option>
                                    </select>
                                </div>

                                {/* Số Container */}
                                <div>
                                    <label className="block text-xs font-bold text-indigo-950 mb-1">
                                        Số Container (nếu có)
                                    </label>
                                    <input
                                        value={containerNumber}
                                        onChange={(e) => setContainerNumber(e.target.value)}
                                        placeholder="VD: CONT-TEST-001"
                                        className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-mono font-bold"
                                    />
                                </div>

                                {/* Số Seal */}
                                <div>
                                    <label className="block text-xs font-bold text-indigo-950 mb-1">
                                        Số Niêm phong Seal (nếu có)
                                    </label>
                                    <input
                                        value={sealNumber}
                                        onChange={(e) => setSealNumber(e.target.value)}
                                        placeholder="VD: SEAL-TEST-001"
                                        className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-mono font-bold"
                                    />
                                </div>

                                {/* Biển số xe */}
                                <div>
                                    <label className="block text-xs font-bold text-indigo-950 mb-1">
                                        Biển số phương tiện (xe lạnh)
                                    </label>
                                    <input
                                        value={vehicleReference}
                                        onChange={(e) => setVehicleReference(e.target.value)}
                                        placeholder="VD: 51H-123.45"
                                        className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-mono font-bold"
                                    />
                                </div>

                                {/* Tiến độ hồ sơ xuất khẩu (Giai đoạn 6) */}
                                <div className="sm:col-span-2 lg:col-span-3 pt-2 border-t border-indigo-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                    <label className="text-xs font-bold text-indigo-950">
                                        Giai đoạn kiểm dịch & thông quan (Nghị quyết 36/2026/NQ-CP):
                                    </label>
                                    <select
                                        value={exportStageStatus}
                                        onChange={(e) => setExportStageStatus(e.target.value)}
                                        className="rounded-xl border border-indigo-300 bg-white px-3 py-1.5 text-xs font-bold text-indigo-900 focus:outline-none"
                                    >
                                        <option value="DISPATCHED">1. Đã xuất hàng qua cửa khẩu/cảng (Hoàn tất)</option>
                                        <option value="CUSTOMS_CLEARED">2. Đã thông quan hải quan</option>
                                        <option value="CUSTOMS_DECLARING">3. Chờ thông quan hải quan</option>
                                        <option value="PHYTOSANITARY_PASSED">4. Kiểm dịch thực vật đạt</option>
                                        <option value="PENDING_PHYTOSANITARY">5. Chờ kiểm dịch thực vật</option>
                                        <option value="DRAFT">6. Chuẩn bị lô xuất khẩu (Nháp)</option>
                                    </select>
                                </div>
                            </div>
                        ) : (
                            /* DOMESTIC SPECIFIC FIELDS */
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {/* Bên mua */}
                                <div className="relative">
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Bên mua (Tên công ty / Khách hàng) <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        required
                                        name="destinationName"
                                        value={destinationName}
                                        onChange={(event) => {
                                            setDestinationName(event.target.value);
                                            setShowSuggestions(true);
                                        }}
                                        onFocus={() => setShowSuggestions(true)}
                                        onBlur={() => setTimeout(() => setShowSuggestions(false), 250)}
                                        placeholder="VD: Công ty ABC, Siêu thị Co.opmart..."
                                        autoComplete="off"
                                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold focus:border-emerald-500 focus:outline-none"
                                    />
                                    {showSuggestions && filteredSuggestions.length > 0 && (
                                        <div className="absolute left-0 right-0 z-30 mt-1 max-h-56 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
                                            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                Gợi ý khách hàng / điểm đến
                                            </div>
                                            {filteredSuggestions.map((item, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        selectSuggestion(item);
                                                    }}
                                                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition hover:bg-emerald-50 hover:text-emerald-900"
                                                >
                                                    <span className="font-semibold text-slate-800">{item.name}</span>
                                                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                                                        {item.address || "Điểm đến"}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Địa chỉ giao nhận */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Địa chỉ giao nhận
                                    </label>
                                    <input
                                        name="destinationAddress"
                                        value={destinationAddress}
                                        onChange={(event) => setDestinationAddress(event.target.value)}
                                        placeholder="Số nhà, đường, quận/huyện, tỉnh thành..."
                                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium focus:border-emerald-500 focus:outline-none"
                                    />
                                </div>

                                {/* Số điện thoại */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Số điện thoại người nhận
                                    </label>
                                    <input
                                        type="tel"
                                        value={buyerPhone}
                                        onChange={(event) => setBuyerPhone(event.target.value)}
                                        placeholder="VD: 0987654321"
                                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium focus:border-emerald-500 focus:outline-none"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Section 3: Khối Lượng & Doanh Thu / Công Nợ Tài Chính */}
                    <div className="border-t border-slate-100 pt-4 space-y-3">
                        <p className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                            <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-slate-200 text-slate-700 text-[11px] font-black">3</span>
                            Khối lượng xuất & Tài chính công nợ
                        </p>

                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {/* Khối lượng xuất */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Khối lượng xuất (kg) <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    required
                                    type="number"
                                    step="0.01"
                                    min="0.1"
                                    max={selectedSource?.remainingQuantity ?? undefined}
                                    value={quantityInput}
                                    onChange={(e) => setQuantityInput(e.target.value)}
                                    placeholder="VD: 1000"
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-black text-emerald-800 focus:border-emerald-500 focus:outline-none"
                                />
                            </div>

                            {/* Đơn giá */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Đơn giá xuất (đ/kg)
                                </label>
                                <input
                                    type="text"
                                    value={unitPriceInput ? Number(unitPriceInput.replace(/\D/g, "")).toLocaleString("vi-VN") : ""}
                                    onChange={(e) => setUnitPriceInput(e.target.value.replace(/\D/g, ""))}
                                    placeholder="VD: 145.000"
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold focus:border-emerald-500 focus:outline-none"
                                />
                            </div>

                            {/* Chiết khấu */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Chiết khấu / Giảm giá (đ)
                                </label>
                                <input
                                    type="text"
                                    value={discountInput ? Number(discountInput.replace(/\D/g, "")).toLocaleString("vi-VN") : ""}
                                    onChange={(e) => setDiscountInput(e.target.value.replace(/\D/g, ""))}
                                    placeholder="VD: 5.000.000"
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold focus:border-emerald-500 focus:outline-none"
                                />
                            </div>

                            {/* Tổng tiền */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Tổng giá trị hợp đồng
                                </label>
                                <div className="w-full rounded-xl border border-slate-200 bg-emerald-50/70 px-3 py-2 text-sm font-black text-emerald-900">
                                    {calcTotalAmount > 0 ? `${calcTotalAmount.toLocaleString("vi-VN")} đ` : "0 đ"}
                                </div>
                            </div>
                        </div>

                        {/* Thanh toán & Công nợ */}
                        <div className="grid gap-3 sm:grid-cols-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Số tiền đã nhận thanh toán (đ)
                                </label>
                                <input
                                    type="text"
                                    value={paidAmountInput ? Number(paidAmountInput.replace(/\D/g, "")).toLocaleString("vi-VN") : ""}
                                    onChange={(e) => setPaidAmountInput(e.target.value.replace(/\D/g, ""))}
                                    placeholder="VD: 80.000.000"
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-emerald-700 focus:border-emerald-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Còn phải thu (Công nợ)
                                </label>
                                <div className={`w-full rounded-xl border bg-white px-3 py-2 text-sm font-black ${
                                    calcDebtAmount > 0 ? "border-rose-200 text-rose-600" : "border-emerald-200 text-emerald-700"
                                }`}>
                                    {calcDebtAmount > 0 ? `${calcDebtAmount.toLocaleString("vi-VN")} đ` : "0 đ (Đã trả đủ)"}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Phương thức thanh toán
                                </label>
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium focus:outline-none"
                                >
                                    <option value="Chuyển khoản">Chuyển khoản ngân hàng (T/T)</option>
                                    <option value="Tín dụng thư (L/C)">Tín dụng thư chứng từ (L/C)</option>
                                    <option value="Tiền mặt">Tiền mặt</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {message && (
                        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            {message}
                        </div>
                    )}

                    {/* Submit Button */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <Button
                            type="submit"
                            disabled={busy === "create"}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-2xl px-6 py-2.5 shadow-sm text-sm gap-2"
                        >
                            <FileText className="h-4 w-4" />
                            {busy === "create" ? "Đang xử lý..." : "Xác nhận xuất lô & Chuyển sang Tạo QR"}
                        </Button>
                    </div>
                </form>
            )}

            {/* List of Dispatched Lots */}
            <section className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-wide">
                            Danh Sách Lô Hàng Đã Xuất Bán / Xuất Khẩu
                        </h3>
                        <p className="text-xs text-slate-500">
                            Theo dõi mã lô, doanh thu, công nợ và trạng thái mã QR truy xuất
                        </p>
                    </div>
                    <div className="text-xs text-slate-500 font-semibold">
                        Tổng cộng: <b>{lots.length}</b> lô hàng
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {visibleLots.map((lot) => {
                        const isExp = lot.lotCode.startsWith("EXP-") || lot.lotCode.startsWith("CM-EXP-") || lot.destination?.type === "EXPORT";
                        const qr = lot.traceabilityCode;

                        return (
                            <article
                                key={lot.id}
                                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md space-y-4"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2.5">
                                        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                                            isExp ? "bg-indigo-50 text-indigo-700" : "bg-emerald-50 text-emerald-700"
                                        }`}>
                                            {isExp ? <Ship className="h-5 w-5" /> : <Truck className="h-5 w-5" />}
                                        </div>
                                        <div>
                                            <span className="font-mono text-xs font-black uppercase text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                                                {lot.lotCode}
                                            </span>
                                            <p className="text-[11px] text-slate-400 mt-0.5">
                                                {lot.dispatchedAt ? new Date(lot.dispatchedAt).toLocaleDateString("vi-VN") : "—"}
                                            </p>
                                        </div>
                                    </div>

                                    {/* QR Status badge */}
                                    {qr ? (
                                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-800 flex items-center gap-1 border border-emerald-200">
                                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                            Đã có QR
                                        </span>
                                    ) : (
                                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 flex items-center gap-1 border border-amber-200">
                                            <Clock className="h-3.5 w-3.5 text-amber-600" />
                                            Chờ tạo QR
                                        </span>
                                    )}
                                </div>

                                <div>
                                    <h4 className="text-sm font-black text-slate-900 line-clamp-1">{lot.productName}</h4>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Điểm đến: <b>{lot.buyerName || lot.destination?.name || "Chưa xác định"}</b>
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-3 text-xs border border-slate-100">
                                    <div>
                                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Khối lượng:</span>
                                        <span className="font-black text-slate-900">{lot.quantity.toLocaleString("vi-VN")} {lot.unit}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Tổng tiền:</span>
                                        <span className="font-bold text-emerald-700">
                                            {lot.totalAmount ? `${lot.totalAmount.toLocaleString("vi-VN")} đ` : "Thỏa thuận"}
                                        </span>
                                    </div>
                                </div>

                                {/* Card Actions */}
                                <div className="border-t pt-3 flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setSelectedSlipData({
                                                    id: lot.id,
                                                    lotCode: lot.lotCode,
                                                    productName: lot.productName,
                                                    quantity: lot.quantity,
                                                    unit: lot.unit,
                                                    stockBeforeDispatch: lot.stockBeforeDispatch,
                                                    buyerName: lot.buyerName || lot.destination?.name,
                                                    buyerPhone: lot.buyerPhone,
                                                    buyerAddress: lot.buyerAddress,
                                                    unitPrice: lot.unitPrice,
                                                    subtotal: lot.subtotal,
                                                    discount: lot.discount,
                                                    totalAmount: lot.totalAmount,
                                                    paidAmount: lot.paidAmount,
                                                    debtAmount: lot.debtAmount,
                                                    paymentStatus: lot.paymentStatus,
                                                    paymentMethod: lot.paymentMethod,
                                                    dispatchedAt: lot.dispatchedAt,
                                                    note: lot.note,
                                                    ownerName: lot.owner?.name,
                                                    ownerType: lot.ownerType,
                                                    isExport: isExp,
                                                    destinationCountry: lot.destination?.country || (isExp ? "Trung Quốc" : undefined),
                                                    traceabilityCode: lot.traceabilityCode,
                                                })
                                            }
                                            className="text-xs font-bold text-slate-700 hover:text-emerald-700 flex items-center gap-1"
                                        >
                                            <FileText className="h-3.5 w-3.5" />
                                            Phiếu xuất
                                        </button>

                                        {isExp && (
                                            <button
                                                type="button"
                                                onClick={() => setExportProgressLot(lot)}
                                                className="text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200 flex items-center gap-1"
                                            >
                                                <Flag className="h-3 w-3" />
                                                Tiến độ xuất
                                            </button>
                                        )}
                                    </div>

                                    {qr ? (
                                        <Link
                                            href={`/trace/${qr.publicToken || qr.code}`}
                                            target="_blank"
                                            className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                                        >
                                            <QrCode className="h-3.5 w-3.5" />
                                            Xem mã QR
                                        </Link>
                                    ) : (
                                        <Button
                                            type="button"
                                            size="sm"
                                            disabled={busy === lot.id}
                                            onClick={() => issue(lot.id)}
                                            className="rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs h-7 gap-1"
                                        >
                                            <QrCode className="h-3 w-3" />
                                            {busy === lot.id ? "Đang tạo..." : "Tạo QR"}
                                        </Button>
                                    )}
                                </div>
                            </article>
                        );
                    })}

                    {!visibleLots.length && (
                        <div className="col-span-full rounded-3xl border border-dashed bg-white p-12 text-center text-slate-400">
                            Chưa có lô hàng xuất bán / xuất khẩu nào được ghi nhận.
                        </div>
                    )}
                </div>
            </section>

            {/* Sales Dispatch Slip Modal */}
            {selectedSlipData && (
                <SalesDispatchSlip
                    data={selectedSlipData}
                    onClose={() => setSelectedSlipData(null)}
                    onIssueQr={issue}
                    issuingQr={issuingQr}
                />
            )}

            {/* Export Progress Modal (Giai đoạn 6 - Kiểm dịch, Hải quan & Xuất hàng) */}
            {exportProgressLot && (
                <ExportProgressModal
                    lot={exportProgressLot}
                    onClose={() => setExportProgressLot(null)}
                    onSaved={(updated) => {
                        setLots((prev) =>
                            prev.map((l) => (l.id === exportProgressLot.id ? { ...l, ...updated } : l))
                        );
                        setExportProgressLot(null);
                    }}
                />
            )}
        </div>
    );
}

function ExportProgressModal({
    lot,
    onClose,
    onSaved,
}: {
    lot: Lot;
    onClose: () => void;
    onSaved: (updated: Partial<Lot>) => void;
}) {
    const [stage, setStage] = useState<string>("PHYTOSANITARY_PASSED");
    const [kdtvNumber, setKdtvNumber] = useState<string>("");
    const [customsNumber, setCustomsNumber] = useState<string>("");
    const [containerNum, setContainerNum] = useState<string>("");
    const [sealNum, setSealNum] = useState<string>("");
    const [vehicleRef, setVehicleRef] = useState<string>("");
    const [port, setPort] = useState<string>("Cửa khẩu Quốc tế Hữu Nghị (Lạng Sơn)");
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState("");

    const STAGES = [
        { key: "DRAFT", label: "1. Chuẩn bị lô xuất", desc: "Đóng gói hoàn tất, chờ kiểm tra" },
        { key: "PENDING_PHYTOSANITARY", label: "2. Chờ kiểm dịch", desc: "Gửi mẫu kiểm tra KDTV" },
        { key: "PHYTOSANITARY_PASSED", label: "3. Kiểm dịch ĐẠT", desc: "Đã cấp GCN Kiểm dịch thực vật" },
        { key: "CUSTOMS_DECLARING", label: "4. Chờ thông quan", desc: "Nộp hồ sơ tờ khai hải quan" },
        { key: "CUSTOMS_CLEARED", label: "5. Đã thông quan", desc: "Hải quan đã phê duyệt xuất" },
        { key: "DISPATCHED", label: "6. Đã xuất hàng", desc: "Đã qua cửa khẩu/cảng sang Trung Quốc" },
    ];

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setMsg("");

        try {
            const res = await fetch("/api/traceability/commercial-lots", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    commercialLotId: lot.id,
                    exportStageStatus: stage,
                    phytosanitaryCertificateNumber: kdtvNumber || undefined,
                    customsDeclarationNumber: customsNumber || undefined,
                    containerNumber: containerNum || undefined,
                    sealNumber: sealNum || undefined,
                    vehicleReference: vehicleRef || undefined,
                    portOfLoading: port || undefined,
                }),
            });

            const json = await res.json();
            if (json.success) {
                onSaved({ status: stage === "DISPATCHED" ? "DISPATCHED" : "DRAFT" });
            } else {
                setMsg(json.error || "Không thể cập nhật tiến độ");
            }
        } catch {
            setMsg("Lỗi kết nối máy chủ");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
            <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl overflow-hidden my-8 border border-slate-200">
                <div className="bg-gradient-to-r from-indigo-950 via-indigo-900 to-slate-900 p-6 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md">
                            <Ship className="h-6 w-6 text-indigo-300" />
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-500/30 px-2 py-0.5 rounded text-indigo-200">
                                GIAI ĐOẠN 6 · TIẾN ĐỘ XUẤT KHẨU & CHỨNG TỪ
                            </span>
                            <h3 className="text-lg font-black mt-0.5 tracking-tight text-white line-clamp-1">
                                {lot.lotCode} · {lot.productName}
                            </h3>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl p-2 text-white/80 hover:bg-white/10 hover:text-white transition"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSave} className="p-6 space-y-5 text-xs">
                    {/* Stages Stepper */}
                    <div>
                        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-2">
                            Tiến độ chu trình xuất khẩu (6 Giai đoạn):
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {STAGES.map((s) => (
                                <button
                                    key={s.key}
                                    type="button"
                                    onClick={() => setStage(s.key)}
                                    className={`p-3 rounded-2xl border text-left transition ${
                                        stage === s.key
                                            ? "border-indigo-600 bg-indigo-50/80 font-bold text-indigo-950 shadow-xs ring-2 ring-indigo-500/20"
                                            : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                                    }`}
                                >
                                    <div className="font-black text-xs">{s.label}</div>
                                    <div className="text-[10px] text-slate-500 mt-0.5">{s.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Documents & Transport details */}
                    <div className="grid gap-3 sm:grid-cols-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Số GCN Kiểm dịch thực vật (KDTV)
                            </label>
                            <input
                                value={kdtvNumber}
                                onChange={(e) => setKdtvNumber(e.target.value)}
                                placeholder="VD: KDTV-2026-0828-01"
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:border-indigo-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Số Tờ khai Hải quan xuất khẩu
                            </label>
                            <input
                                value={customsNumber}
                                onChange={(e) => setCustomsNumber(e.target.value)}
                                placeholder="VD: TKHQ-105829103940"
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:border-indigo-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Số Container
                            </label>
                            <input
                                value={containerNum}
                                onChange={(e) => setContainerNum(e.target.value)}
                                placeholder="VD: TEMU-782910-4"
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:border-indigo-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Số Seal niêm phong
                            </label>
                            <input
                                value={sealNum}
                                onChange={(e) => setSealNum(e.target.value)}
                                placeholder="VD: VN-SEAL-89201"
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:border-indigo-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Biển số xe vận chuyển
                            </label>
                            <input
                                value={vehicleRef}
                                onChange={(e) => setVehicleRef(e.target.value)}
                                placeholder="VD: 51D-892.45 / 51R-123.45"
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:border-indigo-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Cửa khẩu / Cảng xuất hàng
                            </label>
                            <input
                                value={port}
                                onChange={(e) => setPort(e.target.value)}
                                placeholder="VD: Cửa khẩu Quốc tế Hữu Nghị (Lạng Sơn)"
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    {msg && (
                        <div className="rounded-xl bg-rose-50 p-2.5 text-xs font-bold text-rose-700 border border-rose-200">
                            {msg}
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            className="rounded-xl text-xs font-bold"
                        >
                            Hủy bỏ
                        </Button>
                        <Button
                            type="submit"
                            disabled={saving}
                            className="bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold px-6 h-9"
                        >
                            {saving ? "Đang lưu..." : "Lưu tiến độ & Chứng từ"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
