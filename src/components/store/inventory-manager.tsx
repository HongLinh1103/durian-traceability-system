"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
    ArrowDownToLine,
    ArrowUpFromLine,
    Download,
    FileText,
    History,
    Loader2,
    Plus,
    Search,
    Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VietnameseDatePicker } from "@/components/ui/vietnamese-date-picker";
import { useToast } from "@/components/ui/toast";
import { numberToVietnameseWords } from "@/lib/vietnamese-number-to-words";

type Product = {
    id: string;
    name: string;
    type: "FERTILIZER" | "PESTICIDE" | "EQUIPMENT";
    stock: number;
    unit: string;
    status: string;
    imageUrls: string[];
};

type Movement = {
    id: string;
    productId: string;
    quantity: number;
    stockBefore: number;
    stockAfter: number;
    unitCost?: number | null;
    totalCost?: number | null;
    product: { name: string; unit: string };
};

type Document = {
    id: string;
    code: string;
    type: "PN" | "PX" | "DC" | "HT";
    businessType: string;
    supplierName?: string | null;
    actorName?: string | null;
    createdAt: string;
    order?: { id: string; orderCode: string } | null;
    movements: Movement[];
};

type FormItem = { productId: string; quantity: string; unitCost?: string; note: string };

const businessLabels: Record<string, string> = {
    SUPPLIER_IMPORT: "Nhập từ nhà cung cấp",
    STOCK_REPLENISHMENT: "Nhập bổ sung tồn",
    RETURNED_GOODS_IMPORT: "Nhập hàng trả về",
    DISPOSAL_EXPORT: "Xuất hủy",
    TRANSFER_EXPORT: "Xuất điều chuyển",
    STOCKTAKE_INCREASE: "Kiểm kê tăng",
    STOCKTAKE_DECREASE: "Kiểm kê giảm",
    CUSTOMER_RETURN: "Khách trả hàng",
    SUPPLIER_RETURN: "Trả nhà cung cấp",
    SALE_EXPORT: "Xuất bán hàng",
    OPENING_BALANCE: "Số dư đầu kỳ",
};

function InventoryManagerContent() {
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const formRef = useRef<HTMLFormElement>(null);
    const lastScrolledKeyRef = useRef<string | null>(null);

    const [products, setProducts] = useState<Product[]>([]);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState("ALL");
    const [businessType, setBusinessType] = useState("SUPPLIER_IMPORT");
    const [createdDate, setCreatedDate] = useState(() => new Date().toLocaleDateString("en-CA"));
    const [items, setItems] = useState<FormItem[]>([{ productId: "", quantity: "", unitCost: "", note: "" }]);
    const [activeTab, setActiveTab] = useState<"stock" | "create" | "history">("stock");
    const [search, setSearch] = useState("");
    const [productType, setProductType] = useState("ALL");
    const [stockStatus, setStockStatus] = useState("ALL");
    const [historyFrom, setHistoryFrom] = useState("");
    const [historyTo, setHistoryTo] = useState("");
    const [historyBusiness, setHistoryBusiness] = useState("ALL");
    const [documentSearch, setDocumentSearch] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/store/inventory", { cache: "no-store" });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.message);
            setProducts(payload.products || []);
            setDocuments(payload.documents || []);
        } catch (error) {
            toast({
                title: "Không thể tải kho hàng",
                description: error instanceof Error ? error.message : "Vui lòng thử lại.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        void load();
    }, [load]);

    // Handle URL parameters (tab, action=restock, productId, businessType)
    useEffect(() => {
        const tab = searchParams.get("tab");
        const action = searchParams.get("action");
        const productId = searchParams.get("productId");
        const hash = typeof window !== "undefined" ? window.location.hash : "";
        const isRestockAction = action === "restock" || hash === "#warehouse-document-form";

        if (tab === "create" || isRestockAction) {
            setActiveTab("create");
        } else if (tab === "history") {
            setActiveTab("history");
        } else if (tab === "stock") {
            setActiveTab("stock");
        }

        if (isRestockAction) {
            setBusinessType("SUPPLIER_IMPORT");
            if (productId) {
                setItems([{ productId, quantity: "", unitCost: "", note: "" }]);
            }
        } else {
            if (productId) {
                setItems([{ productId, quantity: "", unitCost: "", note: "" }]);
            }
            const type = searchParams.get("type") || searchParams.get("businessType");
            if (type) setBusinessType(type);
        }
    }, [searchParams]);

    // Smooth scroll to the form when requested via restock action or target hash
    useEffect(() => {
        const action = searchParams.get("action");
        const productId = searchParams.get("productId") || "";
        const hash = typeof window !== "undefined" ? window.location.hash : "";
        const isRestock = action === "restock" || hash === "#warehouse-document-form";
        const scrollKey = `${action}-${productId}-${hash}`;

        if (isRestock && activeTab === "create" && formRef.current) {
            if (lastScrolledKeyRef.current !== scrollKey) {
                lastScrolledKeyRef.current = scrollKey;
                requestAnimationFrame(() => {
                    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                });
            }
        }
    }, [activeTab, searchParams]);

    const visibleProducts = useMemo(() => {
        return products.filter(
            (product) =>
                product.name.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi")) &&
                (productType === "ALL" || product.type === productType) &&
                (stockStatus === "ALL" ||
                    (stockStatus === "LOW" ? product.stock <= 5 : stockStatus === "OUT" ? product.stock === 0 : product.stock > 5)),
        );
    }, [products, search, productType, stockStatus]);

    const visibleDocuments = useMemo(() => {
        return documents.filter(
            (document) =>
                (selectedProduct === "ALL" || document.movements.some((movement) => movement.productId === selectedProduct)) &&
                (historyBusiness === "ALL" || document.businessType === historyBusiness) &&
                (!documentSearch.trim() || document.code.toLocaleLowerCase("vi").includes(documentSearch.trim().toLocaleLowerCase("vi"))) &&
                (!historyFrom || document.createdAt.slice(0, 10) >= historyFrom) &&
                (!historyTo || document.createdAt.slice(0, 10) <= historyTo),
        );
    }, [documents, selectedProduct, historyBusiness, documentSearch, historyFrom, historyTo]);

    const totalStock = products.reduce((sum, product) => sum + product.stock, 0);
    const lowStock = products.filter((product) => product.stock <= 5).length;
    const today = new Date().toLocaleDateString("en-CA");
    const todayDocuments = documents.filter((document) => new Date(document.createdAt).toLocaleDateString("en-CA") === today).length;

    const needsSupplier = ["SUPPLIER_IMPORT", "SUPPLIER_RETURN"].includes(businessType);
    const needsOrder = ["CUSTOMER_RETURN", "SALE_EXPORT"].includes(businessType);
    const needsReason = ["SUPPLIER_RETURN", "DISPOSAL_EXPORT"].includes(businessType);
    const showCostColumn = businessType === "SUPPLIER_IMPORT";

    const formTotalQuantity = items.reduce((sum, itm) => sum + (Number(itm.quantity) || 0), 0);
    const formTotalAmount = items.reduce((sum, itm) => {
        const q = Number(itm.quantity) || 0;
        const c = Number(itm.unitCost) || 0;
        return sum + q * c;
    }, 0);
    const formWordsAmount = formTotalAmount > 0 ? numberToVietnameseWords(formTotalAmount) : null;

    async function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSubmitting(true);
        const form = event.currentTarget;
        const data = new FormData(form);
        try {
            const response = await fetch("/api/store/inventory", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    createdDate,
                    businessType,
                    items: items.map((item) => ({
                        productId: item.productId,
                        quantity: Number(item.quantity),
                        unitCost: item.unitCost ? Number(item.unitCost) : null,
                        note: item.note,
                    })),
                    supplierName: data.get("supplierName"),
                    orderCode: data.get("orderCode"),
                    reason: data.get("reason"),
                    note: data.get("note"),
                }),
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.message);
            toast({
                title: `Đã tạo ${payload.document.code}`,
                description: "Tồn kho và chứng từ truy vết đã được cập nhật.",
                variant: "success",
            });
            form.reset();
            setBusinessType("SUPPLIER_IMPORT");
            setCreatedDate(new Date().toLocaleDateString("en-CA"));
            setItems([{ productId: "", quantity: "", unitCost: "", note: "" }]);
            await load();
        } catch (error) {
            toast({
                title: "Không thể tạo chứng từ",
                description: error instanceof Error ? error.message : "Vui lòng thử lại.",
                variant: "destructive",
            });
        } finally {
            setSubmitting(false);
        }
    }

    function exportInventory() {
        const rows = [
            ["STT", "Sản phẩm", "Loại", "Đơn vị", "Tồn hiện tại"],
            ...visibleProducts.map((product, index) => [
                String(index + 1),
                product.name,
                product.type === "FERTILIZER" ? "Phân bón" : product.type === "PESTICIDE" ? "Thuốc BVTV" : "Dụng cụ / Khác",
                product.unit,
                String(product.stock),
            ]),
        ];
        const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\r\n");
        const url = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `ton-kho-${today}.csv`;
        anchor.click();
        URL.revokeObjectURL(url);
    }

    return (
        <div className="space-y-6">
            {/* Stat Cards */}
            <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <Stat label="Sản phẩm" value={products.length} />
                <Stat label="Tổng đơn vị" value={totalStock} />
                <Stat label="Sắp hết" value={lowStock} warning={lowStock > 0} />
                <Stat label="Chứng từ hôm nay" value={todayDocuments} />
            </section>

            {/* Standalone Full-Width Search Input (No outer container card, no border/shadow wrapper) */}
            <div className="relative w-full">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <Input
                    value={activeTab === "history" ? documentSearch : search}
                    onChange={(event) =>
                        activeTab === "history" ? setDocumentSearch(event.target.value) : setSearch(event.target.value)
                    }
                    className="h-11 sm:h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm sm:text-base placeholder:text-slate-400 shadow-xs focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20"
                    placeholder={activeTab === "history" ? "Tìm mã chứng từ..." : "Tìm sản phẩm..."}
                />
            </div>

            {/* Navigation Tabs */}
            <nav className="flex overflow-x-auto border-b border-slate-200" aria-label="Quản lý kho">
                {(
                    [
                        ["stock", "Tồn kho hiện tại"],
                        ["create", "Tạo chứng từ"],
                        ["history", "Lịch sử kho"],
                    ] as const
                ).map(([value, label]) => (
                    <button
                        key={value}
                        type="button"
                        onClick={() => setActiveTab(value)}
                        className={`whitespace-nowrap border-b-2 px-5 py-3 text-sm font-bold transition-colors ${activeTab === value
                            ? "border-emerald-600 text-emerald-700"
                            : "border-transparent text-slate-500 hover:text-slate-900"
                            }`}
                    >
                        {label}
                    </button>
                ))}
            </nav>

            {/* Tab 1: Current Stock */}
            {activeTab === "stock" && (
                <section className="overflow-hidden rounded-3xl border bg-white shadow-sm">
                    <header className="space-y-4 border-b p-5">
                        <h2 className="text-xl font-bold">Tồn kho hiện tại</h2>
                        <div className="flex flex-col gap-3 lg:flex-row">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                <Input
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    className="h-10 pl-10"
                                    placeholder="Tìm theo tên sản phẩm..."
                                />
                            </div>
                            <select
                                value={productType}
                                onChange={(event) => setProductType(event.target.value)}
                                className="h-10 rounded-xl border bg-white px-3 text-sm"
                            >
                                <option value="ALL">Tất cả loại vật tư</option>
                                <option value="FERTILIZER">Phân bón</option>
                                <option value="PESTICIDE">Thuốc BVTV</option>
                                <option value="EQUIPMENT">Dụng cụ / Vật tư khác</option>
                            </select>
                            <select
                                value={stockStatus}
                                onChange={(event) => setStockStatus(event.target.value)}
                                className="h-10 rounded-xl border bg-white px-3 text-sm"
                            >
                                <option value="ALL">Tất cả trạng thái tồn</option>
                                <option value="AVAILABLE">Còn hàng</option>
                                <option value="LOW">Sắp hết (≤ 5)</option>
                                <option value="OUT">Hết hàng</option>
                            </select>
                            <Button size="sm" variant="outline" onClick={exportInventory}>
                                <Download className="mr-2 h-4 w-4" />
                                Xuất Excel
                            </Button>
                        </div>
                    </header>
                    {loading ? (
                        <div className="flex justify-center py-16">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : (<>
                        <div className="grid gap-3 p-4 sm:hidden">
                            {visibleProducts.map((product) => (
                                <article key={product.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <h3 className="font-bold leading-snug text-slate-900">{product.name}</h3>
                                            <p className="mt-1 text-xs text-slate-500">{product.type === "FERTILIZER" ? "Phân bón" : product.type === "PESTICIDE" ? "Thuốc BVTV" : "Dụng cụ / Khác"}</p>
                                        </div>
                                        <span className={`shrink-0 rounded-xl px-3 py-2 text-lg font-black tabular-nums ${product.stock === 0 ? "bg-red-50 text-red-700" : product.stock <= 5 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{product.stock}</span>
                                    </div>
                                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm"><span className="text-slate-500">Đơn vị tính</span><b>{product.unit}</b></div>
                                </article>
                            ))}
                            {!visibleProducts.length && <p className="py-10 text-center text-sm text-slate-500">Không tìm thấy sản phẩm phù hợp.</p>}
                        </div>
                        <div className="hidden overflow-x-auto sm:block">
                            <table className="w-full min-w-[700px] text-left text-sm">
                                <thead className="bg-slate-50 text-slate-500">
                                    <tr>
                                        <th className="w-20 p-4 text-center">STT</th>
                                        <th className="p-4">Sản phẩm</th>
                                        <th className="p-4">Loại</th>
                                        <th className="p-4">Đơn vị</th>
                                        <th className="p-4 text-right">Tồn hiện tại</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {visibleProducts.map((product, index) => (
                                        <tr key={product.id} className="hover:bg-slate-50">
                                            <td className="p-4 text-center">{index + 1}</td>
                                            <td className="p-4 font-bold">{product.name}</td>
                                            <td className="p-4">
                                                {product.type === "FERTILIZER"
                                                    ? "Phân bón"
                                                    : product.type === "PESTICIDE"
                                                        ? "Thuốc BVTV"
                                                        : "Dụng cụ / Khác"}
                                            </td>
                                            <td className="p-4">{product.unit}</td>
                                            <td
                                                className={`p-4 text-right text-lg font-black ${product.stock === 0
                                                    ? "text-red-600"
                                                    : product.stock <= 5
                                                        ? "text-amber-600"
                                                        : "text-emerald-700"
                                                    }`}
                                            >
                                                {product.stock}
                                            </td>
                                        </tr>
                                    ))}
                                    {!visibleProducts.length && (
                                        <tr>
                                            <td colSpan={5} className="p-12 text-center text-slate-500">
                                                Không tìm thấy sản phẩm phù hợp.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>)}
                </section>
            )}

            {/* Tab 2: Create Warehouse Document */}
            {activeTab === "create" && (
                <form
                    ref={formRef}
                    id="warehouse-document-form"
                    onSubmit={submit}
                    className="scroll-mt-20 sm:scroll-mt-24 space-y-5 rounded-3xl border bg-white p-5 shadow-sm sm:p-6 mb-8"
                >
                    <div>
                        <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
                            <FileText className="h-5 w-5 text-emerald-600" />
                            Tạo chứng từ kho
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">Mã PN/PX được hệ thống tự sinh và lưu vào sổ theo dõi.</p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="block text-sm font-semibold">
                            Ngày tạo
                            <VietnameseDatePicker required value={createdDate} onChange={setCreatedDate} className="mt-1" />
                        </label>
                        <label className="block text-sm font-semibold">
                            Loại nghiệp vụ
                            <select
                                name="businessType"
                                value={businessType}
                                onChange={(event) => setBusinessType(event.target.value)}
                                className="mt-1 h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 font-semibold text-slate-900"
                            >
                                <optgroup label="Phiếu nhập kho (PN)">
                                    <option value="SUPPLIER_IMPORT">Nhập từ nhà cung cấp</option>
                                    <option value="CUSTOMER_RETURN">Khách trả hàng</option>
                                </optgroup>
                                <optgroup label="Phiếu xuất kho (PX)">
                                    <option value="SALE_EXPORT">Xuất bán hàng</option>
                                    <option value="SUPPLIER_RETURN">Trả nhà cung cấp</option>
                                    <option value="DISPOSAL_EXPORT">Xuất hủy</option>
                                </optgroup>
                                <optgroup label="Phiếu điều chỉnh (DC)">
                                    <option value="STOCKTAKE_INCREASE">Kiểm kê tăng (+)</option>
                                    <option value="STOCKTAKE_DECREASE">Kiểm kê giảm (−)</option>
                                </optgroup>
                            </select>
                        </label>
                    </div>

                    {needsSupplier && (
                        <label className="block text-sm font-semibold">
                            Tên nhà cung cấp <span className="text-red-600">*</span>
                            <Input
                                name="supplierName"
                                required
                                className="mt-1"
                                placeholder="Ví dụ: Công ty Phân bón Bình Điền, Đại lý BVTV Miền Nam..."
                            />
                        </label>
                    )}

                    {needsOrder && (
                        <label className="block text-sm font-semibold">
                            Đơn hàng liên quan <span className="text-red-600">*</span>
                            <Input name="orderCode" required className="mt-1" placeholder="Ví dụ: DH-20260810-015" />
                        </label>
                    )}

                    {needsReason && (
                        <label className="block text-sm font-semibold">
                            {businessType === "DISPOSAL_EXPORT" ? "Lý do hủy" : "Lý do trả hàng"}{" "}
                            <span className="text-red-600">*</span>
                            <Input
                                name="reason"
                                required
                                className="mt-1"
                                placeholder={
                                    businessType === "DISPOSAL_EXPORT"
                                        ? "Ví dụ: Hết hạn sử dụng, bao bì hư hỏng"
                                        : "Ví dụ: Hàng lỗi, cận date, sai quy cách"
                                }
                            />
                        </label>
                    )}

                    <label className="block text-sm font-semibold">
                        Ghi chú chung
                        <Input name="note" maxLength={1000} className="mt-1" placeholder="Ghi chú chung cho chứng từ (nếu có)" />
                    </label>

                    {/* Danh sách hàng hóa: Desktop Table & Mobile Card List */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                                Danh sách sản phẩm trong chứng từ ({items.length})
                            </h3>
                            <span className="text-xs text-slate-500">
                                Tối đa 50 mặt hàng / chứng từ
                            </span>
                        </div>

                        {/* MOBILE VIEW (Dưới màn hình MD): Dạng thẻ Cards từng dòng, 100% full width, không cuộn ngang */}
                        <div className="space-y-3.5 block md:hidden">
                            {items.map((item, index) => {
                                const product = products.find((candidate) => candidate.id === item.productId);
                                const quantityNum = Number(item.quantity) || 0;
                                const unitCostNum = Number(item.unitCost) || 0;
                                const lineTotal = quantityNum * unitCostNum;

                                return (
                                    <div
                                        key={index}
                                        className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-3.5 shadow-xs space-y-3"
                                    >
                                        {/* Card Header: STT, Stock Badge, Delete Button */}
                                        <div className="flex items-center justify-between border-b border-slate-200/70 pb-2.5">
                                            <div className="flex items-center gap-2">
                                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs font-black text-white">
                                                    {index + 1}
                                                </span>
                                                <span className="text-xs font-bold text-slate-800">Sản phẩm {index + 1}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {product && (
                                                    <span className="rounded-lg bg-white px-2 py-0.5 text-xs font-medium text-slate-600 border border-slate-200">
                                                        Tồn: <b>{product.stock}</b> {product.unit}
                                                    </span>
                                                )}
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={items.length === 1}
                                                    onClick={() => setItems((current) => current.filter((_, rowIndex) => rowIndex !== index))}
                                                    className="h-7 w-7 p-0 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg"
                                                    aria-label="Xóa dòng"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Product Select */}
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                Sản phẩm <span className="text-red-600">*</span>
                                            </label>
                                            <select
                                                required
                                                value={item.productId}
                                                onChange={(event) =>
                                                    setItems((current) =>
                                                        current.map((row, rowIndex) =>
                                                            rowIndex === index ? { ...row, productId: event.target.value } : row,
                                                        ),
                                                    )
                                                }
                                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 focus:border-emerald-500 focus:outline-hidden"
                                            >
                                                <option value="">-- Chọn sản phẩm --</option>
                                                {products.map((option) => (
                                                    <option
                                                        key={option.id}
                                                        value={option.id}
                                                        disabled={items.some(
                                                            (row, rowIndex) => rowIndex !== index && row.productId === option.id,
                                                        )}
                                                    >
                                                        {option.name} (Tồn: {option.stock} {option.unit})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Quantity and Unit Price in Grid */}
                                        <div className={`grid gap-2.5 ${showCostColumn ? "grid-cols-2" : "grid-cols-1"}`}>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                                    Số lượng {product ? `(${product.unit})` : ""} <span className="text-red-600">*</span>
                                                </label>
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    required
                                                    value={item.quantity}
                                                    onChange={(event) =>
                                                        setItems((current) =>
                                                            current.map((row, rowIndex) =>
                                                                rowIndex === index ? { ...row, quantity: event.target.value } : row,
                                                            ),
                                                        )
                                                    }
                                                    className="h-10 rounded-xl bg-white"
                                                    placeholder="Nhập số lượng"
                                                />
                                            </div>

                                            {showCostColumn && (
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                                        Đơn giá nhập (đ)
                                                    </label>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        value={item.unitCost || ""}
                                                        onChange={(event) =>
                                                            setItems((current) =>
                                                                current.map((row, rowIndex) =>
                                                                    rowIndex === index ? { ...row, unitCost: event.target.value } : row,
                                                                ),
                                                            )
                                                        }
                                                        className="h-10 rounded-xl bg-white"
                                                        placeholder="Giá nhập"
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {/* Line Total preview on mobile */}
                                        {showCostColumn && lineTotal > 0 && (
                                            <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-1.5 text-xs border border-emerald-100">
                                                <span className="font-semibold text-emerald-800">Thành tiền:</span>
                                                <span className="font-bold text-emerald-900 tabular-nums">
                                                    {lineTotal.toLocaleString("vi-VN")} đ
                                                </span>
                                            </div>
                                        )}

                                        {/* Line Note */}
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                Ghi chú dòng
                                            </label>
                                            <Input
                                                maxLength={500}
                                                value={item.note}
                                                onChange={(event) =>
                                                    setItems((current) =>
                                                        current.map((row, rowIndex) =>
                                                            rowIndex === index ? { ...row, note: event.target.value } : row,
                                                        ),
                                                    )
                                                }
                                                className="h-10 rounded-xl bg-white"
                                                placeholder="Ghi chú nếu có..."
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* DESKTOP VIEW (Từ màn hình MD trở lên): Bảng chuyên nghiệp, nhanh gọn */}
                        <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                                    <tr>
                                        <th className="w-14 p-3 text-center">STT</th>
                                        <th className="p-3">Sản phẩm</th>
                                        <th className="w-24 p-3 text-center">ĐVT</th>
                                        <th className="w-24 p-3 text-right">Tồn hiện tại</th>
                                        <th className="w-32 p-3">Số lượng</th>
                                        {showCostColumn && <th className="w-36 p-3">Đơn giá nhập (đ)</th>}
                                        {showCostColumn && <th className="w-36 p-3 text-right">Thành tiền (đ)</th>}
                                        <th className="p-3">Ghi chú</th>
                                        <th className="w-12 p-3 text-center" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {items.map((item, index) => {
                                        const product = products.find((candidate) => candidate.id === item.productId);
                                        const quantityNum = Number(item.quantity) || 0;
                                        const unitCostNum = Number(item.unitCost) || 0;
                                        const lineTotal = quantityNum * unitCostNum;

                                        return (
                                            <tr key={index} className="hover:bg-slate-50/50">
                                                <td className="p-3 text-center font-semibold text-slate-500">{index + 1}</td>
                                                <td className="p-3">
                                                    <select
                                                        required
                                                        value={item.productId}
                                                        onChange={(event) =>
                                                            setItems((current) =>
                                                                current.map((row, rowIndex) =>
                                                                    rowIndex === index ? { ...row, productId: event.target.value } : row,
                                                                ),
                                                            )
                                                        }
                                                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 font-medium text-slate-900 text-sm focus:border-emerald-500 focus:outline-hidden"
                                                    >
                                                        <option value="">-- Chọn sản phẩm --</option>
                                                        {products.map((option) => (
                                                            <option
                                                                key={option.id}
                                                                value={option.id}
                                                                disabled={items.some(
                                                                    (row, rowIndex) => rowIndex !== index && row.productId === option.id,
                                                                )}
                                                            >
                                                                {option.name} (Tồn: {option.stock} {option.unit})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="p-3 text-center font-semibold text-slate-600">
                                                    {product?.unit || "—"}
                                                </td>
                                                <td className="p-3 text-right font-medium text-slate-600 tabular-nums">
                                                    {product ? product.stock : "—"}
                                                </td>
                                                <td className="p-3">
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        required
                                                        value={item.quantity}
                                                        onChange={(event) =>
                                                            setItems((current) =>
                                                                current.map((row, rowIndex) =>
                                                                    rowIndex === index ? { ...row, quantity: event.target.value } : row,
                                                                ),
                                                            )
                                                        }
                                                        className="h-10 rounded-xl bg-white"
                                                        placeholder="SL"
                                                    />
                                                </td>
                                                {showCostColumn && (
                                                    <td className="p-3">
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            value={item.unitCost || ""}
                                                            onChange={(event) =>
                                                                setItems((current) =>
                                                                    current.map((row, rowIndex) =>
                                                                        rowIndex === index ? { ...row, unitCost: event.target.value } : row,
                                                                    ),
                                                                )
                                                            }
                                                            className="h-10 rounded-xl bg-white"
                                                            placeholder="Giá nhập"
                                                        />
                                                    </td>
                                                )}
                                                {showCostColumn && (
                                                    <td className="p-3 text-right font-bold tabular-nums text-slate-900">
                                                        {lineTotal > 0 ? `${lineTotal.toLocaleString("vi-VN")} đ` : "—"}
                                                    </td>
                                                )}
                                                <td className="p-3">
                                                    <Input
                                                        maxLength={500}
                                                        value={item.note}
                                                        onChange={(event) =>
                                                            setItems((current) =>
                                                                current.map((row, rowIndex) =>
                                                                    rowIndex === index ? { ...row, note: event.target.value } : row,
                                                                ),
                                                            )
                                                        }
                                                        className="h-10 rounded-xl bg-white"
                                                        placeholder="Ghi chú"
                                                    />
                                                </td>
                                                <td className="p-3 text-center">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        disabled={items.length === 1}
                                                        onClick={() => setItems((current) => current.filter((_, rowIndex) => rowIndex !== index))}
                                                        className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg"
                                                        aria-label="Xóa dòng"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Summary row inside form */}
                    <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 flex flex-wrap items-center justify-between gap-3 text-sm">
                        <div className="flex items-center gap-4">
                            <span>Tổng mặt hàng: <b className="text-slate-900">{items.filter((i) => i.productId).length}</b></span>
                            <span>Tổng số lượng: <b className="text-emerald-700">{formTotalQuantity}</b></span>
                        </div>
                        {showCostColumn && formTotalAmount > 0 && (
                            <div className="text-right">
                                <span>Tổng giá trị nhập: <b className="text-emerald-800 text-base">{formTotalAmount.toLocaleString("vi-VN")} đ</b></span>
                                {formWordsAmount && <div className="text-xs text-slate-500 italic mt-0.5">{formWordsAmount}</div>}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                        <Button
                            type="button"
                            variant="outline"
                            disabled={items.length >= 50}
                            onClick={() => setItems((current) => [...current, { productId: "", quantity: "", unitCost: "", note: "" }])}
                            className="rounded-xl font-bold"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Thêm dòng sản phẩm
                        </Button>
                        <Button type="submit" className="sm:min-w-48 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl" disabled={submitting || !products.length}>
                            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Lưu chứng từ
                        </Button>
                    </div>
                </form>
            )}

            {/* Tab 3: Warehouse History */}
            {activeTab === "history" && (
                <section className="rounded-3xl border bg-white shadow-sm">
                    <header className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="flex items-center gap-2 text-xl font-bold">
                                <History className="h-5 w-5" />
                                Lịch sử xuất nhập kho
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Theo dõi toàn bộ biến động và bấm mã chứng từ để xem chi tiết & in phiếu A4.
                            </p>
                        </div>
                    </header>
                    <div className="grid min-w-0 gap-3 border-b p-4 sm:grid-cols-2 xl:grid-cols-5">
                        <div className="min-w-0"><VietnameseDatePicker value={historyFrom} onChange={setHistoryFrom} aria-label="Từ ngày" className="w-full min-w-0" /></div>
                        <div className="min-w-0"><VietnameseDatePicker value={historyTo} onChange={setHistoryTo} aria-label="Đến ngày" className="w-full min-w-0" /></div>
                        <select
                            value={historyBusiness}
                            onChange={(event) => setHistoryBusiness(event.target.value)}
                            className="h-12 min-w-0 w-full rounded-2xl border bg-white px-3 text-sm"
                        >
                            <option value="ALL">Tất cả nghiệp vụ</option>
                            {Object.entries(businessLabels).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                        <select
                            value={selectedProduct}
                            onChange={(event) => setSelectedProduct(event.target.value)}
                            className="h-12 min-w-0 w-full rounded-2xl border bg-white px-3 text-sm"
                        >
                            <option value="ALL">Tất cả sản phẩm</option>
                            {products.map((product) => (
                                <option key={product.id} value={product.id}>
                                    {product.name}
                                </option>
                            ))}
                        </select>
                        <Input
                            value={documentSearch}
                            onChange={(event) => setDocumentSearch(event.target.value)}
                            placeholder="Tìm chứng từ..."
                            className="min-w-0 w-full"
                        />
                    </div>
                    <div className="grid gap-3 p-4 sm:hidden">
                        {visibleDocuments.flatMap((document) => document.movements.map((movement) => {
                            const incoming = movement.stockAfter - movement.stockBefore >= 0;
                            return (
                                <article key={movement.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <h3 className="font-bold leading-snug text-slate-900">{movement.product.name}</h3>
                                            <p className="mt-1 text-xs text-slate-500">{new Date(document.createdAt).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                                        </div>
                                        <span className={`shrink-0 text-lg font-black tabular-nums ${incoming ? "text-emerald-700" : "text-amber-700"}`}>{incoming ? "+" : "−"}{movement.quantity}</span>
                                    </div>
                                    <div className={`mt-3 inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-xs font-bold ${incoming ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
                                        {incoming ? <ArrowDownToLine className="mr-1 h-3.5 w-3.5 shrink-0" /> : <ArrowUpFromLine className="mr-1 h-3.5 w-3.5 shrink-0" />}
                                        <span className="truncate">{businessLabels[document.businessType] || document.businessType}</span>
                                    </div>
                                    <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-sm">
                                        <div><dt className="text-xs text-slate-500">Tồn kho</dt><dd className="mt-0.5 font-semibold tabular-nums">{movement.stockBefore} → {movement.stockAfter} {movement.product.unit}</dd></div>
                                        <div className="text-right"><dt className="text-xs text-slate-500">Chứng từ</dt><dd className="mt-0.5"><Link href={`/dashboard/store/inventory/${encodeURIComponent(document.id)}`} className="font-bold text-emerald-700">{document.code}</Link></dd></div>
                                    </dl>
                                </article>
                            );
                        }))}
                        {!visibleDocuments.length && <p className="py-10 text-center text-sm text-slate-500">Chưa có giao dịch kho nào phù hợp với bộ lọc.</p>}
                    </div>
                    <div className="hidden overflow-x-auto sm:block">
                        <table className="w-full min-w-[760px] text-left text-xs sm:text-[13px]">
                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                                <tr>
                                    <th className="px-3.5 py-3">Thời gian</th>
                                    <th className="px-3.5 py-3">Sản phẩm</th>
                                    <th className="px-3.5 py-3">Nghiệp vụ</th>
                                    <th className="px-3.5 py-3 text-right">Số lượng</th>
                                    <th className="px-3.5 py-3 text-right">Tồn trước → sau</th>
                                    <th className="px-3.5 py-3">Chứng từ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {visibleDocuments.flatMap((document) =>
                                    document.movements.map((movement) => {
                                        const delta = movement.stockAfter - movement.stockBefore;
                                        const incoming = delta >= 0;
                                        return (
                                            <tr key={movement.id} className="hover:bg-slate-50/70 transition">
                                                <td className="whitespace-nowrap px-3.5 py-2.5 text-slate-600">
                                                    {new Date(document.createdAt).toLocaleString("vi-VN", {
                                                        day: "2-digit",
                                                        month: "2-digit",
                                                        year: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </td>
                                                <td className="px-3.5 py-2.5">
                                                    <div className="font-semibold text-slate-900">{movement.product.name}</div>
                                                    <div className="text-[11px] text-slate-400">ĐVT: {movement.product.unit}</div>
                                                </td>
                                                <td className="whitespace-nowrap px-3.5 py-2.5">
                                                    <span
                                                        className={`inline-flex whitespace-nowrap items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${incoming
                                                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200/80"
                                                            : "bg-amber-50 text-amber-800 border border-amber-200/80"
                                                            }`}
                                                    >
                                                        {incoming ? (
                                                            <ArrowDownToLine className="mr-1 h-3 w-3 shrink-0" />
                                                        ) : (
                                                            <ArrowUpFromLine className="mr-1 h-3 w-3 shrink-0" />
                                                        )}
                                                        {businessLabels[document.businessType] || document.businessType}
                                                    </span>
                                                </td>
                                                <td className="whitespace-nowrap px-3.5 py-2.5 text-right font-bold tabular-nums">
                                                    <span className={incoming ? "text-emerald-700" : "text-amber-700"}>
                                                        {incoming ? "+" : "−"}{movement.quantity}
                                                    </span>
                                                </td>
                                                <td className="whitespace-nowrap px-3.5 py-2.5 text-right text-slate-600 tabular-nums">
                                                    {movement.stockBefore} → <b className="text-slate-900">{movement.stockAfter}</b>
                                                </td>
                                                <td className="whitespace-nowrap px-3.5 py-2.5 font-medium">
                                                    <Link
                                                        href={`/dashboard/store/inventory/${encodeURIComponent(document.id)}`}
                                                        className="font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
                                                    >
                                                        {document.code}
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    }),
                                )}
                                {!visibleDocuments.length && (
                                    <tr>
                                        <td colSpan={6} className="p-10 text-center text-slate-500 text-sm">
                                            Chưa có giao dịch kho nào phù hợp với bộ lọc.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}
        </div>
    );
}

function Stat({ label, value, warning }: { label: string; value: number; warning?: boolean }) {
    return (
        <div className={`rounded-2xl border p-4 ${warning ? "border-red-200 bg-red-50" : "bg-white"}`}>
            <p className="text-sm text-slate-500">{label}</p>
            <p className={`mt-1 text-3xl font-black ${warning ? "text-red-700" : "text-slate-900"}`}>{value}</p>
        </div>
    );
}

export function InventoryManager() {
    return (
        <Suspense
            fallback={
                <div className="flex justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                </div>
            }
        >
            <InventoryManagerContent />
        </Suspense>
    );
}
