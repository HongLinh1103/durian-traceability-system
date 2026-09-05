"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, FileText, Package, Printer, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { numberToVietnameseWords } from "@/lib/vietnamese-number-to-words";
import { formatVietnameseDate, formatVietnameseDateTime } from "@/lib/date-format";

type DocumentData = {
    id: string;
    code: string;
    type: "PN" | "PX" | "DC" | "HT";
    businessType: string;
    supplierName?: string | null;
    actorName?: string | null;
    reason?: string | null;
    note?: string | null;
    createdAt: string;
    store: {
        name: string;
        address?: string | null;
        phone?: string | null;
        representativeName?: string | null;
        taxOrBusinessCode?: string | null;
    };
    order?: {
        orderCode: string;
        status: string;
        recipientName?: string | null;
        phone?: string | null;
    } | null;
    movements: Array<{
        id: string;
        quantity: number;
        stockBefore: number;
        stockAfter: number;
        unitCost?: number | null;
        totalCost?: number | null;
        note?: string | null;
        product: {
            name: string;
            unit: string;
            type?: string;
            brand?: string | null;
        };
    }>;
};

const documentTypeTitles: Record<string, string> = {
    PN: "PHIẾU NHẬP KHO",
    PX: "PHIẾU XUẤT KHO",
    DC: "PHIẾU ĐIỀU CHỈNH KHO",
    HT: "PHIẾU HOÀN HÀNG",
};

const businessLabels: Record<string, string> = {
    SUPPLIER_IMPORT: "Nhập từ nhà cung cấp",
    STOCK_REPLENISHMENT: "Nhập bổ sung tồn",
    RETURNED_GOODS_IMPORT: "Nhập hàng trả về",
    SALE_EXPORT: "Xuất bán cho nông dân",
    DISPOSAL_EXPORT: "Xuất hủy",
    TRANSFER_EXPORT: "Xuất điều chuyển",
    STOCKTAKE_INCREASE: "Điều chỉnh tăng do kiểm kê",
    STOCKTAKE_DECREASE: "Điều chỉnh giảm do kiểm kê",
    CUSTOMER_RETURN: "Khách trả hàng",
    SUPPLIER_RETURN: "Trả hàng nhà cung cấp",
    OPENING_BALANCE: "Số dư đầu kỳ",
};

export function InventoryDocumentView({ document }: { document: DocumentData }) {
    const handlePrint = () => {
        if (typeof window !== "undefined") {
            window.print();
        }
    };

    const totalItemsCount = document.movements.length;
    const totalQuantity = document.movements.reduce((sum, m) => sum + m.quantity, 0);

    const hasAnyCost = document.movements.some((m) => m.unitCost !== null && m.unitCost !== undefined && m.unitCost > 0);
    const showPrintCost = document.type === "PN" && hasAnyCost;
    const totalValue = document.movements.reduce((sum, m) => {
        const itemTotal = m.totalCost ? Number(m.totalCost) : m.unitCost ? Number(m.unitCost) * m.quantity : 0;
        return sum + itemTotal;
    }, 0);

    const createdDateObj = new Date(document.createdAt);
    const formattedCreatedDate = formatVietnameseDate(createdDateObj);
    const formattedCreatedTime = createdDateObj.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
    });
    const nowFormatted = formatVietnameseDateTime(new Date());

    const wordsAmount = totalValue > 0 ? numberToVietnameseWords(totalValue) : null;

    return (
        <div className="space-y-6">
            {/* Top Navigation & Actions Bar (Hidden on Print) */}
            <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Link
                    href="/dashboard/store/inventory?tab=history"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800 transition"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Quay lại lịch sử kho
                </Link>

                <div className="flex items-center gap-2.5">
                    <Button
                        onClick={handlePrint}
                        className="bg-emerald-700 hover:bg-emerald-800 font-bold text-white shadow-soft"
                    >
                        <Printer className="mr-2 h-4 w-4" />
                        In phiếu / Xuất PDF
                    </Button>
                </div>
            </div>

            {/* WEB VIEW: 4 Main Structured Sections (Hidden on Print) */}
            <div className="no-print space-y-6">
                {/* Header Banner */}
                <div className="rounded-3xl bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-700 p-6 text-white shadow-md">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-100 backdrop-blur-xs">
                            <FileText className="h-3.5 w-3.5" />
                            {documentTypeTitles[document.type] || "CHỨNG TỪ KHO"}
                        </span>
                        <Badge className="bg-emerald-500/30 text-white border-emerald-400/40 font-bold">
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-emerald-200" />
                            Đã ghi nhận vào hệ thống
                        </Badge>
                    </div>
                    <h1 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight">{document.code}</h1>
                    <p className="mt-1 text-sm text-emerald-100">
                        {businessLabels[document.businessType] || document.businessType}
                    </p>
                </div>

                {/* 1. THÔNG TIN CHỨNG TỪ & 2. THÔNG TIN ĐỐI TÁC / LIÊN QUAN */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    {/* Phần 1: Thông tin chứng từ */}
                    <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                            <FileText className="h-5 w-5 text-emerald-600" />
                            <h2 className="text-base sm:text-lg font-bold text-slate-900">1. Thông tin chứng từ</h2>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Mã chứng từ</span>
                                <p className="mt-0.5 font-bold text-slate-900">{document.code}</p>
                            </div>
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Ngày tạo</span>
                                <p className="mt-0.5 font-semibold text-slate-800">
                                    {formattedCreatedDate} <span className="text-xs text-slate-500 font-normal">({formattedCreatedTime})</span>
                                </p>
                            </div>
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Loại nghiệp vụ</span>
                                <p className="mt-0.5 font-semibold text-emerald-700">
                                    {businessLabels[document.businessType] || document.businessType}
                                </p>
                            </div>
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Người tạo</span>
                                <p className="mt-0.5 font-semibold text-slate-800">{document.actorName || "Chủ cửa hàng"}</p>
                            </div>
                            <div className="col-span-2">
                                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Trạng thái</span>
                                <div className="mt-1">
                                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                                        <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-emerald-600" />
                                        Đã ghi nhận
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Phần 2: Thông tin đối tác / liên quan */}
                    <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                            <Store className="h-5 w-5 text-emerald-600" />
                            <h2 className="text-base sm:text-lg font-bold text-slate-900">2. Thông tin liên quan</h2>
                        </div>
                        <div className="space-y-3 text-sm">
                            {document.supplierName && (
                                <div>
                                    <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Nhà cung cấp</span>
                                    <p className="mt-0.5 font-bold text-slate-900">{document.supplierName}</p>
                                </div>
                            )}

                            {document.order && (
                                <div>
                                    <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Đơn hàng liên quan</span>
                                    <p className="mt-0.5 font-bold text-emerald-700">{document.order.orderCode}</p>
                                    {document.order.recipientName && (
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Khách nhận: <b>{document.order.recipientName}</b> ({document.order.status})
                                        </p>
                                    )}
                                </div>
                            )}

                            {document.reason && (
                                <div>
                                    <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                        {document.businessType === "DISPOSAL_EXPORT" ? "Lý do hủy" : "Lý do trả hàng"}
                                    </span>
                                    <p className="mt-0.5 font-semibold text-slate-800">{document.reason}</p>
                                </div>
                            )}

                            <div>
                                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Ghi chú chung</span>
                                <p className="mt-0.5 text-slate-700 italic">{document.note || "Không có ghi chú"}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Phần 3: Danh sách sản phẩm */}
                <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 p-5">
                        <div className="flex items-center gap-2">
                            <Package className="h-5 w-5 text-emerald-600" />
                            <h2 className="text-lg font-bold text-slate-900">3. Danh sách hàng hóa trong phiếu</h2>
                        </div>
                        <span className="text-xs font-semibold text-slate-500">
                            {totalItemsCount} mặt hàng · Tổng số lượng: <b>{totalQuantity}</b>
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-left text-sm">
                            <thead className="bg-slate-50 text-slate-600 font-bold">
                                <tr>
                                    <th className="w-14 p-4 text-center">STT</th>
                                    <th className="p-4">Sản phẩm</th>
                                    <th className="w-24 p-4 text-center">ĐVT</th>
                                    <th className="w-28 p-4 text-right">Tồn trước</th>
                                    <th className="w-32 p-4 text-right">Số lượng</th>
                                    <th className="w-28 p-4 text-right">Tồn sau</th>
                                    {hasAnyCost && <th className="w-36 p-4 text-right">Đơn giá (đ)</th>}
                                    {hasAnyCost && <th className="w-40 p-4 text-right">Thành tiền (đ)</th>}
                                    <th className="p-4">Ghi chú</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {document.movements.map((movement, index) => {
                                    const delta = movement.stockAfter - movement.stockBefore;
                                    const isPositive = delta >= 0;
                                    const itemCost = movement.totalCost
                                        ? Number(movement.totalCost)
                                        : movement.unitCost
                                          ? Number(movement.unitCost) * movement.quantity
                                          : null;

                                    return (
                                        <tr key={movement.id} className="hover:bg-slate-50/70 transition">
                                            <td className="p-4 text-center font-semibold text-slate-500">{index + 1}</td>
                                            <td className="p-4">
                                                <div className="font-bold text-slate-900">{movement.product.name}</div>
                                                {movement.product.brand && (
                                                    <div className="text-xs text-slate-400">{movement.product.brand}</div>
                                                )}
                                            </td>
                                            <td className="p-4 text-center font-medium text-slate-600">{movement.product.unit}</td>
                                            <td className="p-4 text-right tabular-nums text-slate-600">{movement.stockBefore}</td>
                                            <td className="p-4 text-right">
                                                <span
                                                    className={`inline-flex items-center font-bold tabular-nums ${
                                                        isPositive ? "text-emerald-700" : "text-amber-700"
                                                    }`}
                                                >
                                                    {isPositive ? "+" : "−"}
                                                    {movement.quantity}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right font-black tabular-nums text-slate-900">
                                                {movement.stockAfter}
                                            </td>
                                            {hasAnyCost && (
                                                <td className="p-4 text-right tabular-nums font-semibold text-slate-700">
                                                    {movement.unitCost ? Number(movement.unitCost).toLocaleString("vi-VN") : "—"}
                                                </td>
                                            )}
                                            {hasAnyCost && (
                                                <td className="p-4 text-right tabular-nums font-bold text-slate-900">
                                                    {itemCost !== null ? `${itemCost.toLocaleString("vi-VN")} đ` : "—"}
                                                </td>
                                            )}
                                            <td className="p-4 text-slate-600">{movement.note || "—"}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Phần 4: Tổng kết & Trạng thái */}
                <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
                        4. Tổng kết phiếu & Xác nhận
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                            <span className="text-xs font-semibold text-slate-500">Tổng số mặt hàng</span>
                            <div className="mt-1 text-2xl font-black text-slate-900">{totalItemsCount}</div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                            <span className="text-xs font-semibold text-slate-500">Tổng số lượng luân chuyển</span>
                            <div className="mt-1 text-2xl font-black text-emerald-800">{totalQuantity}</div>
                        </div>
                        {totalValue > 0 && (
                            <div className="rounded-2xl bg-emerald-50/70 p-4 border border-emerald-100">
                                <span className="text-xs font-semibold text-emerald-800">Tổng giá trị phiếu</span>
                                <div className="mt-1 text-2xl font-black text-emerald-900">
                                    {totalValue.toLocaleString("vi-VN")} đ
                                </div>
                            </div>
                        )}
                    </div>

                    {wordsAmount && (
                        <div className="rounded-2xl bg-slate-50/80 p-3.5 border border-slate-100 text-sm">
                            <span className="font-semibold text-slate-600">Số tiền bằng chữ: </span>
                            <span className="font-bold text-slate-900 italic">{wordsAmount}</span>
                        </div>
                    )}

                    <div className="pt-2 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
                        <span>Mã tra cứu: <b className="text-slate-700">{document.code}</b></span>
                        <span>Thời gian xuất: {nowFormatted}</span>
                    </div>
                </div>
            </div>

            {/* PRINT / PDF OFFICIAL DOCUMENT TEMPLATE (A4 Clean Minimalist Accounting Format) */}
            <div className="printable-a4 hidden print:block bg-white text-black font-serif">
                {/* Header: Store details */}
                <div className="grid grid-cols-[minmax(0,1.65fr)_minmax(190px,1fr)] gap-10 border-b border-black pb-4">
                    <div className="min-w-0">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.08em]">HỆ THỐNG TRUY XUẤT NÔNG NGHIỆP TRI VIỆT</div>
                        <h2 className="mt-1 text-[15px] font-bold uppercase leading-snug">{document.store.name || "CỬA HÀNG VẬT TƯ NÔNG NGHIỆP"}</h2>
                        <p className="mt-1.5 text-[11px] leading-4 text-slate-700"><b>Địa chỉ:</b> {document.store.address || "Xã Trị An, Huyện Vĩnh Cửu, Tỉnh Đồng Nai"}</p>
                        <p className="text-[11px] leading-4 text-slate-700"><b>SĐT:</b> {document.store.phone || "0909000001"}</p>
                    </div>
                    <div className="border-l border-slate-300 pl-6 text-right text-[11px] leading-5">
                        <p><span className="text-slate-600">Mẫu số</span><br/><b className="text-[12px]">01-VT/TV</b></p>
                        <p className="mt-2"><span className="text-slate-600">Mã phiếu / Mã tra cứu</span><br/><b className="font-mono text-[13px]">{document.code}</b></p>
                    </div>
                </div>

                {/* Title */}
                <div className="mb-5 mt-7 text-center">
                    <h1 className="text-xl font-black tracking-wide uppercase">
                        {documentTypeTitles[document.type] || "PHIẾU CHỨNG TỪ KHO"}
                    </h1>
                    <p className="mt-1 text-[10px] italic text-slate-600">
                        Ngày lập: {formattedCreatedDate} ({formattedCreatedTime})
                    </p>
                </div>

                {/* Info Block (2 Columns) */}
                <div className="mb-5 grid grid-cols-2 gap-x-12 border-y border-slate-300 py-3 text-[11px] leading-5">
                    <div className="space-y-1">
                        <p><b>Mã chứng từ:</b> <span className="font-mono">{document.code}</span></p>
                        {document.order && <p><b>Đơn hàng liên quan:</b> <span>{document.order.orderCode}</span></p>}
                        {document.supplierName && <p><b>Nhà cung cấp:</b> <span>{document.supplierName}</span></p>}
                        <p><b>Trạng thái:</b> <span>Đã ghi nhận</span></p>
                    </div>
                    <div className="space-y-1">
                        <p><b>Loại nghiệp vụ:</b> <span>{businessLabels[document.businessType] || document.businessType}</span></p>
                        <p><b>Người lập phiếu:</b> <span>{document.actorName || document.store.representativeName || "Nguyễn Văn Minh"}</span></p>
                        {document.reason && <p><b>Lý do:</b> <span>{document.reason}</span></p>}
                        {document.note && <p><b>Ghi chú:</b> <span className="italic">{document.note}</span></p>}
                    </div>
                </div>

                {/* Products Table */}
                <table className="my-4 w-full table-fixed border-collapse border border-black text-[11px] leading-4">
                    <thead>
                        <tr className="bg-slate-100 text-center font-bold border-b border-black">
                            <th className="w-[7%] border border-black px-2 py-2.5">STT</th>
                            <th className={`${showPrintCost ? "w-[27%]" : "w-[45%]"} border border-black px-2 py-2.5 text-left`}>Tên sản phẩm</th>
                            <th className={`${showPrintCost ? "w-[8%]" : "w-[10%]"} border border-black px-2 py-2.5`}>ĐVT</th>
                            <th className={`${showPrintCost ? "w-[10%]" : "w-[13%]"} border border-black px-2 py-2.5`}>Tồn trước</th>
                            <th className={`${showPrintCost ? "w-[8%]" : "w-[10%]"} border border-black px-2 py-2.5`}>SL</th>
                            <th className={`${showPrintCost ? "w-[10%]" : "w-[15%]"} border border-black px-2 py-2.5`}>Tồn sau</th>
                            {showPrintCost && <th className="w-[14%] border border-black px-2 py-2.5 text-right">Đơn giá (đ)</th>}
                            {showPrintCost && <th className="w-[16%] border border-black px-2 py-2.5 text-right">Thành tiền (đ)</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {document.movements.map((movement, idx) => {
                            const itemCost = movement.totalCost
                                ? Number(movement.totalCost)
                                : movement.unitCost
                                  ? Number(movement.unitCost) * movement.quantity
                                  : null;

                            return (
                                <tr key={movement.id} className="border-b border-black">
                                    <td className="border border-black px-2 py-2.5 text-center">{idx + 1}</td>
                                    <td className="border border-black px-2 py-2.5 font-medium">{movement.product.name}</td>
                                    <td className="border border-black px-2 py-2.5 text-center">{movement.product.unit}</td>
                                    <td className="border border-black px-2 py-2.5 text-right font-mono">{movement.stockBefore}</td>
                                    <td className="border border-black px-2 py-2.5 text-right font-mono font-bold">{movement.quantity}</td>
                                    <td className="border border-black px-2 py-2.5 text-right font-mono">{movement.stockAfter}</td>
                                    {showPrintCost && (
                                        <td className="border border-black px-2 py-2.5 text-right font-mono">
                                            {movement.unitCost ? Number(movement.unitCost).toLocaleString("vi-VN") : "—"}
                                        </td>
                                    )}
                                    {showPrintCost && (
                                        <td className="border border-black px-2 py-2.5 text-right font-mono font-bold">
                                            {itemCost !== null ? itemCost.toLocaleString("vi-VN") : "—"}
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {/* Summary */}
                <div className="space-y-1 text-xs my-3 border-b border-black pb-2">
                    <div className="flex justify-between">
                        <span>Tổng số mặt hàng: <b>{totalItemsCount}</b></span>
                        <span>Tổng số lượng: <b>{totalQuantity}</b></span>
                        {showPrintCost && totalValue > 0 && <span>Tổng giá trị: <b>{totalValue.toLocaleString("vi-VN")} VNĐ</b></span>}
                    </div>
                    {showPrintCost && wordsAmount && (
                        <p className="mt-1">
                            Bằng chữ: <span className="font-semibold italic">{wordsAmount}</span>
                        </p>
                    )}
                </div>

                {/* Signatures (3 Columns) */}
                <div className="mb-12 mt-10 grid grid-cols-3 gap-8 text-center text-xs">
                    <div>
                        <p className="font-bold uppercase">NGƯỜI LẬP PHIẾU</p>
                        <p className="text-[11px] italic text-slate-600">(Ký, ghi rõ họ tên)</p>
                        <div className="h-24" />
                        <p className="font-semibold">{document.actorName || "Nguyễn Văn Minh"}</p>
                    </div>
                    <div>
                        <p className="font-bold uppercase">NGƯỜI GIAO HÀNG</p>
                        <p className="text-[11px] italic text-slate-600">(Ký, ghi rõ họ tên)</p>
                        <div className="h-24" />
                        <p className="font-semibold">{document.supplierName || "—"}</p>
                    </div>
                    <div>
                        <p className="font-bold uppercase">NGƯỜI NHẬN HÀNG</p>
                        <p className="text-[11px] italic text-slate-600">(Ký, ghi rõ họ tên)</p>
                        <div className="h-24" />
                        <p className="font-semibold">{document.store.representativeName || "Chủ cửa hàng"}</p>
                    </div>
                </div>

                {/* Print Footer */}
                <div className="mt-6 grid grid-cols-3 items-center border-t border-slate-300 pt-2 text-[9px] text-slate-600">
                    <span>Mã tra cứu chứng từ: {document.code}</span>
                    <span className="text-center">Ngày xuất: {nowFormatted}</span>
                    <span className="text-right">Trang 1/1</span>
                </div>
            </div>
        </div>
    );
}
