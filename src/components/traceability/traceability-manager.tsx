"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { 
    CheckCircle2, 
    ExternalLink, 
    QrCode, 
    ShieldAlert, 
    Printer, 
    Download, 
    FileText, 
    Calculator,
    ArrowRight,
    Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SalesDispatchSlip, SalesDispatchData } from "@/components/partner/sales-dispatch-slip";

type Lot = {
    id: string;
    lotCode: string;
    ownerType?: string;
    productName: string;
    quantity: number;
    remainingQuantity?: number;
    unit: string;
    stockBeforeDispatch?: number | null;
    buyerName?: string | null;
    buyerPhone?: string | null;
    buyerAddress?: string | null;
    unitPrice?: number | null;
    subtotal?: number | null;
    discount?: number | null;
    totalAmount?: number | null;
    paidAmount?: number | null;
    debtAmount?: number | null;
    paymentStatus?: string | null;
    paymentMethod?: string | null;
    dispatchedAt?: string | Date | null;
    owner: { name: string };
    destination: { name: string; type?: string; address?: string } | null;
    traceabilityCode: { id: string; publicToken: string; code?: string; status: string } | null;
    validation: { traceCompleteness: number; canIssueQr: boolean; missingRequirements: string[] };
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
    qcStatus?: "PASSED" | "PENDING" | "FAILED";
};

type DestinationOption = {
    id: string;
    name: string;
    address?: string;
    type?: string;
    contactName?: string | null;
    contactPhone?: string | null;
};

type IssuerRole = "FARMER" | "COLLECTOR" | "PROCESSING_FACILITY";

function QrPreview({ token }: { token: string }) {
    const [src, setSrc] = useState("");
    useEffect(() => {
        void QRCode.toDataURL(`${window.location.origin}/trace/${token}`, {
            width: 180,
            margin: 1,
            errorCorrectionLevel: "M",
        }).then(setSrc);
    }, [token]);

    function printQr() {
        const popup = window.open("", "_blank", "width=520,height=620");
        if (popup) {
            popup.document.write(`
                <title>${token}</title>
                <main style="font-family:sans-serif;text-align:center;padding:40px">
                    <h2 style="color:#1b5e20;">TriViet Traceability</h2>
                    <img width="260" src="${src}"/>
                    <p style="font-size:18px;font-weight:bold;margin:12px 0 4px;">${token}</p>
                    <p style="color:#555;font-size:12px;">${window.location.origin}/trace/${token}</p>
                </main>
            `);
            popup.document.close();
            popup.onload = () => popup.print();
        }
    }

    return src ? (
        <div className="flex items-center gap-2">
            <Image
                unoptimized
                src={src}
                width={80}
                height={80}
                alt={`QR truy xuất ${token}`}
                className="h-20 w-20 rounded-xl border bg-white p-1 shadow-sm shrink-0"
            />
            <div className="flex flex-col gap-1">
                <a
                    download={`${token}.png`}
                    href={src}
                    className="inline-flex items-center gap-1 rounded-lg border bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                    <Download className="h-3 w-3" /> Tải QR
                </a>
                <button
                    type="button"
                    onClick={printQr}
                    className="inline-flex items-center gap-1 rounded-lg border bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                    <Printer className="h-3 w-3" /> In QR
                </button>
            </div>
        </div>
    ) : null;
}

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
    const [busy, setBusy] = useState<string | null>(null);
    const [message, setMessage] = useState("");
    const [issuerFilter, setIssuerFilter] = useState("ALL");
    const [saleMode, setSaleMode] = useState(
        role === "PROCESSING_FACILITY" ? "DOMESTIC" : role === "COLLECTOR" ? "MARKET" : "DIRECT"
    );
    const [selectedSourceId, setSelectedSourceId] = useState(initialSourceId || "");
    const [destinationName, setDestinationName] = useState("");
    const [destinationAddress, setDestinationAddress] = useState("");
    const [destinationType, setDestinationType] = useState(
        role === "PROCESSING_FACILITY" ? "DOMESTIC" : role === "COLLECTOR" ? "MARKET" : "RETAIL"
    );
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Form inputs for sales dispatch & finance
    const [quantityInput, setQuantityInput] = useState<string>("");
    const [unitPriceInput, setUnitPriceInput] = useState<string>("");
    const [discountInput, setDiscountInput] = useState<string>("");
    const [paidAmountInput, setPaidAmountInput] = useState<string>("");
    const [paymentMethod, setPaymentMethod] = useState<string>("Chuyển khoản");
    const [buyerPhone, setBuyerPhone] = useState<string>("");

    // Modal state for viewing the sales dispatch slip
    const [selectedSlipData, setSelectedSlipData] = useState<SalesDispatchData | null>(null);
    const [issuingQr, setIssuingQr] = useState(false);

    useEffect(() => {
        if (saleMode === "EXPORT") setDestinationType("EXPORT");
        else if (saleMode === "DISTRIBUTOR") setDestinationType("DISTRIBUTOR");
        else if (saleMode === "MARKET" || saleMode === "WHOLESALE_MARKET") setDestinationType("MARKET");
        else setDestinationType("RETAIL");
    }, [saleMode]);

    const defaultSuggestions = useMemo(() => {
        if (saleMode === "EXPORT") {
            return [
                "Thị trường Trung Quốc",
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
    }, [saleMode]);

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
                type: saleMode === "EXPORT" ? "EXPORT" : "RETAIL",
                contactName: "",
                contactPhone: "",
                isSaved: false,
            }));
        return [...dbList, ...defaults];
    }, [destinations, defaultSuggestions, saleMode]);

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

    const selectedSource = sources.find((source) => source.id === selectedSourceId);
    const dateCode = new Date().toISOString().slice(0, 10).replaceAll("-", "");
    const prefix = role === "COLLECTOR" ? "CM-COL" : role === "PROCESSING_FACILITY" ? "TP" : "CM-FAR";
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
        const selected = sources.find((source) => source.id === formData.get("sourceId"));
        const destName = destinationName.trim();
        if (!destName) {
            setMessage("Vui lòng nhập bên mua / điểm đến");
            setBusy(null);
            return;
        }

        const destAddress = destinationAddress.trim();
        const destType = destinationType;
        const contactName = String(formData.get("contactName") || "").trim();
        const contactPhone = buyerPhone.trim();

        const matched = destinations.find((d) => d.name.trim().toLowerCase() === destName.toLowerCase());
        const destinationId = matched && (!destAddress || destAddress === matched.address) ? matched.id : undefined;

        const note = [
            formData.get("plannedDate") && `Ngày dự kiến: ${formData.get("plannedDate")}`,
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
        setLots((prev) => [createdLot, ...prev]);

        // Open the official Sales Dispatch Slip Modal immediately
        setSelectedSlipData({
            id: createdLot.id,
            lotCode: createdLot.lotCode,
            productName: createdLot.productName,
            quantity: Number(createdLot.quantity),
            unit: createdLot.unit,
            stockBeforeDispatch: createdLot.stockBeforeDispatch,
            buyerName: createdLot.buyerName,
            buyerPhone: createdLot.buyerPhone,
            buyerAddress: createdLot.buyerAddress,
            unitPrice: createdLot.unitPrice,
            subtotal: createdLot.subtotal,
            discount: createdLot.discount,
            totalAmount: createdLot.totalAmount,
            paidAmount: createdLot.paidAmount,
            debtAmount: createdLot.debtAmount,
            paymentStatus: createdLot.paymentStatus,
            paymentMethod: createdLot.paymentMethod,
            dispatchedAt: createdLot.dispatchedAt,
            note: createdLot.note,
            ownerName: createdLot.owner?.name,
            ownerType: role,
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
        setBusy(null);
    }

    return (
        <div className="space-y-6">
            {/* Sales Dispatch & QR Creation Form */}
            {!admin && !readOnly && (
                <form onSubmit={createLot} className="space-y-6 rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 font-black text-xs">
                                    1
                                </span>
                                <h2 className="text-xl font-black text-slate-900">
                                    {role === "PROCESSING_FACILITY"
                                        ? "Xuất Bán Lô Thành Phẩm & Tạo QR"
                                        : "Xuất Bán Lô Sầu Riêng & Tạo QR"}
                                </h2>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-500 mt-1">
                                Lập phiếu xuất bán hàng, ghi nhận giá xuất & tài chính, trừ tồn kho và chuyển sang phát hành mã QR truy xuất.
                            </p>
                        </div>
                        <div className="text-xs bg-emerald-50 text-emerald-800 font-bold px-3 py-1.5 rounded-xl border border-emerald-200 self-start sm:self-auto flex items-center gap-1.5">
                            <Sparkles className="h-4 w-4 text-emerald-600" />
                            Quy trình: Xuất lô bán ➔ Ghi nhận tài chính ➔ Tạo QR
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {/* 1. Chọn Lô Nguồn */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                                1. {role === "FARMER" ? "Lô thu hoạch" : role === "COLLECTOR" ? "Lô thu mua tươi" : "Lô thành phẩm"} <span className="text-rose-500">*</span>
                            </label>
                            <select
                                required
                                name="sourceId"
                                value={selectedSourceId}
                                onChange={(event) => setSelectedSourceId(event.target.value)}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white font-medium focus:border-emerald-500 focus:outline-none"
                            >
                                <option value="">-- Chọn lô nguồn hàng --</option>
                                {sources.map((source) => (
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
                                Mã lô xuất bán <span className="text-rose-500">*</span>
                            </label>
                            <input
                                required
                                name="lotCode"
                                defaultValue={generatedLotCode}
                                placeholder="Ví dụ: TP-20260827-001"
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
                                    role === "COLLECTOR" || role === "PROCESSING_FACILITY"
                                        ? selectedSource?.productName ?? ""
                                        : ""
                                }
                                placeholder="Sầu riêng Ri6 tách múi cấp đông..."
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800"
                            />
                        </div>
                    </div>

                    {/* Customer & Destination */}
                    <div className="border-t border-slate-100 pt-4 space-y-3">
                        <p className="text-xs font-black uppercase text-slate-500">2. Thông tin bên mua & Điểm đến giao nhận</p>
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
                                    onBlur={() => {
                                        setTimeout(() => setShowSuggestions(false), 250);
                                    }}
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

                            {/* Số điện thoại bên mua */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Số điện thoại bên mua
                                </label>
                                <input
                                    name="contactPhone"
                                    value={buyerPhone}
                                    onChange={(e) => setBuyerPhone(e.target.value)}
                                    placeholder="0912 345 678"
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                />
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
                                    placeholder="Địa chỉ chi tiết (Tỉnh/Thành, Cảng...)"
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 3. Khối lượng xuất & Thông tin Tài chính (Mẫu phiếu xuất bán) */}
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 space-y-4">
                        <div className="flex items-center justify-between border-b border-emerald-200/70 pb-3">
                            <div className="flex items-center gap-2">
                                <Calculator className="h-5 w-5 text-emerald-700" />
                                <h3 className="text-sm font-black uppercase tracking-wider text-emerald-900">
                                    3. Khối Lượng Xuất & Hạch Toán Tài Chính
                                </h3>
                            </div>
                            <span className="text-xs text-emerald-800 font-bold">
                                Tự động tính toán & ghi nhận tài chính
                            </span>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {/* Khối lượng xuất */}
                            <div>
                                <label className="block text-xs font-bold text-slate-800 mb-1">
                                    Khối lượng xuất (kg) <span className="text-rose-500">*</span>
                                </label>
                                <Input
                                    required
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    max={selectedSource?.remainingQuantity}
                                    value={quantityInput}
                                    onChange={(e) => setQuantityInput(e.target.value)}
                                    placeholder="VD: 1000"
                                    className="rounded-xl font-bold text-slate-900 bg-white"
                                />
                                <span className="mt-1 block text-[11px] text-slate-500 font-medium">
                                    {selectedSource?.remainingQuantity != null
                                        ? `Tồn kho: ${selectedSource.remainingQuantity.toLocaleString("vi-VN")} kg`
                                        : "Vui lòng chọn lô nguồn"}
                                </span>
                            </div>

                            {/* Đơn giá */}
                            <div>
                                <label className="block text-xs font-bold text-slate-800 mb-1">
                                    Đơn giá xuất bán (đ/kg) <span className="text-rose-500">*</span>
                                </label>
                                <Input
                                    type="text"
                                    value={unitPriceInput}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, "");
                                        setUnitPriceInput(val ? Number(val).toLocaleString("vi-VN") : "");
                                    }}
                                    placeholder="VD: 145.000"
                                    className="rounded-xl font-bold text-slate-900 bg-white"
                                />
                                <span className="mt-1 block text-[11px] text-slate-500 font-medium">
                                    Thành tiền: <b>{calcSubtotal.toLocaleString("vi-VN")} đ</b>
                                </span>
                            </div>

                            {/* Chiết khấu */}
                            <div>
                                <label className="block text-xs font-bold text-slate-800 mb-1">
                                    Chiết khấu / Giảm giá (đ)
                                </label>
                                <Input
                                    type="text"
                                    value={discountInput}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, "");
                                        setDiscountInput(val ? Number(val).toLocaleString("vi-VN") : "");
                                    }}
                                    placeholder="VD: 5.000.000"
                                    className="rounded-xl font-medium text-slate-900 bg-white"
                                />
                                <span className="mt-1 block text-[11px] text-emerald-800 font-bold">
                                    TỔNG PHẢI THU: <b>{calcTotalAmount.toLocaleString("vi-VN")} đ</b>
                                </span>
                            </div>

                            {/* Đã nhận / Thanh toán */}
                            <div>
                                <label className="block text-xs font-bold text-slate-800 mb-1">
                                    Số tiền đã nhận (đ)
                                </label>
                                <Input
                                    type="text"
                                    value={paidAmountInput}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, "");
                                        setPaidAmountInput(val ? Number(val).toLocaleString("vi-VN") : "");
                                    }}
                                    placeholder="VD: 80.000.000"
                                    className="rounded-xl font-bold text-emerald-700 bg-white"
                                />
                                <span className="mt-1 block text-[11px] text-rose-600 font-bold">
                                    Còn nợ: <b>{calcDebtAmount.toLocaleString("vi-VN")} đ</b>
                                </span>
                            </div>
                        </div>

                        {/* Phương thức & Ghi chú */}
                        <div className="grid gap-3 sm:grid-cols-3 border-t border-emerald-200/50 pt-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Phương thức thanh toán
                                </label>
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white font-medium"
                                >
                                    <option value="Chuyển khoản">Chuyển khoản ngân hàng</option>
                                    <option value="Tiền mặt">Tiền mặt</option>
                                    <option value="Công nợ">Ghi nhận công nợ (Chưa thu)</option>
                                    <option value="Ví điện tử">Ví điện tử / QR Pay</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Ngày xuất bán
                                </label>
                                <input
                                    name="plannedDate"
                                    type="date"
                                    defaultValue={new Date().toISOString().split("T")[0]}
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white font-medium"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Ghi chú đơn hàng
                                </label>
                                <input
                                    name="note"
                                    placeholder="Ghi chú thêm về lô hàng, số hóa đơn..."
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Action button */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t pt-4">
                        <div className="text-xs text-slate-500">
                            Sau khi bấm xuất bán, hệ thống tự động lưu phiếu và chuyển sang bước <b>Tạo mã QR</b> truy xuất nguồn gốc.
                        </div>
                        <Button
                            type="submit"
                            disabled={busy === "create"}
                            className="w-full sm:w-auto bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-2xl px-6 py-2.5 shadow-md flex items-center justify-center gap-2"
                        >
                            <FileText className="h-4 w-4" />
                            {busy === "create" ? "Đang xử lý xuất bán..." : "Xác nhận Xuất Bán & Chuyển Sang Tạo QR"}
                            <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                </form>
            )}

            {message && <p className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{message}</p>}

            {/* List of Dispatched Lots & QR Issuance */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-black text-slate-900">
                            Danh Sách Lô Đã Xuất Bán & Mã QR Truy Xuất
                        </h3>
                        <p className="text-xs text-slate-500">
                            Mỗi lô xuất bán được quản lý đầy đủ giá bán, tài chính và mã QR truy xuất cho khách hàng
                        </p>
                    </div>
                    {admin && (
                        <select
                            value={issuerFilter}
                            onChange={(event) => setIssuerFilter(event.target.value)}
                            className="rounded-xl border bg-white px-3 py-1.5 text-xs font-bold"
                        >
                            <option value="ALL">Tất cả đơn vị</option>
                            <option value="FARMER">Nông dân</option>
                            <option value="COLLECTOR">Vựa thu mua</option>
                            <option value="PROCESSING_FACILITY">Cơ sở chế biến</option>
                        </select>
                    )}
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                    {visibleLots.map((lot) => {
                        const total = Number(lot.totalAmount || (lot.unitPrice ? Number(lot.unitPrice) * Number(lot.quantity) - Number(lot.discount || 0) : 0));
                        const paid = Number(lot.paidAmount || 0);
                        const debt = Number(lot.debtAmount || Math.max(0, total - paid));

                        return (
                            <article key={lot.id} className="rounded-3xl border bg-white p-5 shadow-sm space-y-4 hover:shadow-md transition">
                                <div className="flex items-start justify-between gap-3 border-b pb-3">
                                    <div>
                                        <span className="text-xs font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                            {lot.lotCode}
                                        </span>
                                        <h2 className="mt-2 text-base font-black text-slate-900">{lot.productName}</h2>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {lot.owner.name} · Xuất: <b className="text-slate-800">{lot.quantity.toLocaleString("vi-VN")} {lot.unit}</b>
                                        </p>
                                    </div>
                                    <span
                                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                                            lot.validation.canIssueQr ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"
                                        }`}
                                    >
                                        Đầy đủ {lot.validation.traceCompleteness}%
                                    </span>
                                </div>

                                {/* Financial & Buyer Info */}
                                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                    <div>
                                        <span className="text-slate-400 block">Bên mua:</span>
                                        <span className="font-bold text-slate-800 truncate block">
                                            {lot.buyerName || lot.destination?.name || "Chưa xác định"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block">Tổng tiền:</span>
                                        <span className="font-black text-slate-900">
                                            {total > 0 ? `${total.toLocaleString("vi-VN")} đ` : "—"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block">Đã thanh toán:</span>
                                        <span className="font-semibold text-emerald-700">
                                            {paid > 0 ? `${paid.toLocaleString("vi-VN")} đ` : "0 đ"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block">Còn nợ:</span>
                                        <span className={`font-bold ${debt > 0 ? "text-rose-600" : "text-emerald-700"}`}>
                                            {debt > 0 ? `${debt.toLocaleString("vi-VN")} đ` : "0 đ (Đã tất toán)"}
                                        </span>
                                    </div>
                                </div>

                                {!lot.validation.canIssueQr && (
                                    <div className="flex gap-2 rounded-2xl bg-amber-50 p-3 text-xs text-amber-900">
                                        <ShieldAlert className="h-4 w-4 shrink-0" />
                                        <span>{lot.validation.missingRequirements.join("; ")}</span>
                                    </div>
                                )}

                                {/* Bottom Actions & QR */}
                                <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                                    <div className="flex items-center gap-1.5">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setSelectedSlipData({
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
                                                ownerName: lot.owner.name,
                                                ownerType: role,
                                                traceabilityCode: lot.traceabilityCode ? {
                                                    id: lot.traceabilityCode.id,
                                                    code: lot.traceabilityCode.code || lot.traceabilityCode.publicToken,
                                                    publicToken: lot.traceabilityCode.publicToken,
                                                    status: lot.traceabilityCode.status,
                                                } : null,
                                            })}
                                            className="rounded-xl text-xs h-8 px-2.5 font-bold flex items-center gap-1 bg-slate-50 hover:bg-slate-100"
                                        >
                                            <FileText className="h-3.5 w-3.5" />
                                            Xem phiếu xuất
                                        </Button>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {lot.traceabilityCode ? (
                                            <>
                                                <QrPreview token={lot.traceabilityCode.publicToken} />
                                                <Button asChild variant="outline" size="sm" className="rounded-xl text-xs h-8">
                                                    <Link target="_blank" href={`/trace/${lot.traceabilityCode.publicToken}`}>
                                                        Trang QR <ExternalLink className="ml-1 h-3 w-3" />
                                                    </Link>
                                                </Button>
                                            </>
                                        ) : (
                                            !admin && (
                                                <Button
                                                    disabled={!lot.validation.canIssueQr || busy === lot.id}
                                                    onClick={() => issue(lot.id)}
                                                    size="sm"
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs h-8 flex items-center gap-1 shadow-sm"
                                                >
                                                    <QrCode className="h-3.5 w-3.5" />
                                                    {busy === lot.id ? "Đang tạo QR..." : "Tạo mã QR"}
                                                </Button>
                                            )
                                        )}
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                    {!lots.length && (
                        <p className="rounded-3xl border border-dashed bg-white p-10 text-center text-slate-500 lg:col-span-2">
                            Chưa có lô bán hoặc lô xuất hàng nào. Hãy lập phiếu xuất bán ở trên để bắt đầu.
                        </p>
                    )}
                </div>
            </div>

            {/* Modal: Sales Dispatch Slip */}
            {selectedSlipData && (
                <SalesDispatchSlip
                    data={selectedSlipData}
                    onClose={() => setSelectedSlipData(null)}
                    onIssueQr={issue}
                    issuingQr={issuingQr}
                />
            )}
        </div>
    );
}
