"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { 
    Printer, 
    Download, 
    QrCode, 
    Building2, 
    Calendar, 
    CreditCard, 
    CheckCircle2, 
    Clock, 
    AlertCircle,
    X,
    FileText,
    ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";

export type SalesDispatchData = {
    id: string;
    lotCode: string;
    productName: string;
    quantity: number;
    unit?: string;
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
    paymentStatus?: "PAID" | "PARTIAL" | "UNPAID" | string | null;
    paymentMethod?: string | null;
    dispatchedAt?: string | Date | null;
    note?: string | null;
    ownerName?: string | null;
    ownerType?: string | null;
    traceabilityCode?: {
        id: string;
        code: string;
        publicToken: string;
        status: string;
    } | null;
};

export function SalesDispatchSlip({
    data,
    onClose,
    onIssueQr,
    issuingQr = false,
}: {
    data: SalesDispatchData;
    onClose?: () => void;
    onIssueQr?: (id: string) => Promise<void> | void;
    issuingQr?: boolean;
}) {
    const [qrSrc, setQrSrc] = useState<string>("");

    const token = data.traceabilityCode?.publicToken || data.traceabilityCode?.code;

    useEffect(() => {
        if (token && typeof window !== "undefined") {
            try {
                void QRCode.toDataURL(`${window.location.origin}/trace/${token}`, {
                    width: 240,
                    margin: 1,
                    errorCorrectionLevel: "M",
                })
                    .then(setQrSrc)
                    .catch((err) => {
                        console.error("QR Code generation error:", err);
                        setQrSrc("");
                    });
            } catch (err) {
                console.error("QR Code error:", err);
                setQrSrc("");
            }
        } else {
            setQrSrc("");
        }
    }, [token]);

    const isProcessingFacility = data.ownerType === "PROCESSING_FACILITY" || data.lotCode?.startsWith("TP-") || data.lotCode?.startsWith("CM-FAC");
    const slipTitle = isProcessingFacility ? "XUẤT BÁN LÔ THÀNH PHẨM" : "XUẤT BÁN LÔ SẦU RIÊNG";

    const unit = data.unit || "kg";
    const quantity = Number(data.quantity || 0);
    const stockBefore = data.stockBeforeDispatch !== null && data.stockBeforeDispatch !== undefined
        ? Number(data.stockBeforeDispatch)
        : quantity;
    const unitPrice = Number(data.unitPrice || 0);
    const subtotal = Number(data.subtotal || (unitPrice > 0 ? quantity * unitPrice : 0));
    const discount = Number(data.discount || 0);
    const totalAmount = Number(data.totalAmount || Math.max(0, subtotal - discount));
    const paidAmount = Number(data.paidAmount || 0);
    const debtAmount = Number(data.debtAmount || Math.max(0, totalAmount - paidAmount));

    const paymentStatusText = 
        data.paymentStatus === "PAID" ? "Đã thanh toán đủ" :
        data.paymentStatus === "PARTIAL" ? "Thanh toán một phần" : "Chưa thanh toán";

    const paymentMethodText = data.paymentMethod || "Chuyển khoản";

    const dispatchDate = data.dispatchedAt ? new Date(data.dispatchedAt) : new Date();
    const formattedDate = !isNaN(dispatchDate.getTime())
        ? dispatchDate.toLocaleDateString("vi-VN", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
          })
        : new Date().toLocaleDateString("vi-VN");

    function handlePrint() {
        const printWindow = window.open("", "_blank", "width=800,height=900");
        if (!printWindow) return;

        const qrHtml = qrSrc
            ? `<div style="text-align: center; margin: 15px 0;">
                <img src="${qrSrc}" width="140" height="140" style="border: 1px solid #ccc; padding: 4px; border-radius: 8px;" />
                <p style="margin: 4px 0 0; font-size: 11px; font-weight: bold;">Mã QR: ${token}</p>
                <p style="margin: 2px 0 0; font-size: 10px; color: #666;">Quét để truy xuất nguồn gốc lô hàng</p>
               </div>`
            : `<div style="text-align: center; padding: 12px; border: 1px dashed #bbb; border-radius: 8px; margin: 15px 0; font-size: 12px; color: #777;">
                (Lô hàng chưa phát hành mã QR truy xuất)
               </div>`;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>${slipTitle} - ${data.lotCode}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #111; font-size: 13px; line-height: 1.5; }
                    .header { text-align: center; border-bottom: 2px solid #2e7d32; padding-bottom: 12px; margin-bottom: 20px; }
                    .company { font-size: 14px; font-weight: bold; color: #2e7d32; text-transform: uppercase; }
                    .title { font-size: 20px; font-weight: 900; margin: 6px 0; letter-spacing: 0.5px; }
                    .meta { font-size: 12px; color: #555; }
                    .table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                    .table td, .table th { padding: 8px 10px; border-bottom: 1px solid #e0e0e0; }
                    .table th { background: #f4f6f8; text-align: left; font-size: 12px; color: #444; }
                    .label { color: #555; width: 40%; }
                    .val { font-weight: 600; text-align: right; }
                    .highlight-row { background-color: #f1f8e9; font-weight: bold; font-size: 14px; }
                    .highlight-row td { color: #1b5e20; border-top: 2px solid #a5d6a7; border-bottom: 2px solid #a5d6a7; }
                    .signatures { margin-top: 40px; display: flex; justify-content: space-between; text-align: center; }
                    .sig-block { width: 30%; }
                    .sig-title { font-weight: bold; margin-bottom: 60px; }
                    @media print {
                        body { padding: 0; }
                        button { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="company">${data.ownerName || "HỆ THỐNG TRUY XUẤT NÔNG SẢN TRÍ VIỆT"}</div>
                    <div class="title">${slipTitle}</div>
                    <div class="meta">Mã lô xuất: <b>${data.lotCode}</b> &nbsp;|&nbsp; Ngày xuất: <b>${formattedDate}</b></div>
                </div>

                <table class="table">
                    <tr>
                        <td class="label">Mã lô hàng:</td>
                        <td class="val"><b>${data.lotCode}</b></td>
                    </tr>
                    <tr>
                        <td class="label">Tên sản phẩm:</td>
                        <td class="val">${data.productName}</td>
                    </tr>
                    <tr>
                        <td class="label">Tồn kho trước xuất:</td>
                        <td class="val">${stockBefore.toLocaleString("vi-VN")} ${unit}</td>
                    </tr>
                    <tr>
                        <td class="label">Bên mua (Khách hàng):</td>
                        <td class="val"><b>${data.buyerName || "Chưa có thông tin"}</b></td>
                    </tr>
                    ${data.buyerPhone ? `<tr><td class="label">Số điện thoại bên mua:</td><td class="val">${data.buyerPhone}</td></tr>` : ''}
                    ${data.buyerAddress ? `<tr><td class="label">Địa chỉ giao nhận:</td><td class="val">${data.buyerAddress}</td></tr>` : ''}
                    <tr>
                        <td class="label">Khối lượng xuất bán:</td>
                        <td class="val"><b style="font-size: 14px;">${quantity.toLocaleString("vi-VN")} ${unit}</b></td>
                    </tr>
                    <tr>
                        <td class="label">Đơn giá xuất bán:</td>
                        <td class="val">${unitPrice > 0 ? `${unitPrice.toLocaleString("vi-VN")} đ/${unit}` : "Thỏa thuận"}</td>
                    </tr>
                    <tr>
                        <td class="label">Thành tiền:</td>
                        <td class="val">${subtotal > 0 ? `${subtotal.toLocaleString("vi-VN")} đ` : "—"}</td>
                    </tr>
                    <tr>
                        <td class="label">Chiết khấu / Giảm giá:</td>
                        <td class="val">${discount > 0 ? `${discount.toLocaleString("vi-VN")} đ` : "0 đ"}</td>
                    </tr>
                    <tr class="highlight-row">
                        <td>TỔNG PHẢI THU:</td>
                        <td class="val">${totalAmount > 0 ? `${totalAmount.toLocaleString("vi-VN")} đ` : "—"}</td>
                    </tr>
                    <tr>
                        <td class="label">Tình trạng thanh toán:</td>
                        <td class="val"><b>${paymentStatusText}</b></td>
                    </tr>
                    <tr>
                        <td class="label">Đã nhận / Đã thanh toán:</td>
                        <td class="val" style="color: #2e7d32;">${paidAmount > 0 ? `${paidAmount.toLocaleString("vi-VN")} đ` : "0 đ"}</td>
                    </tr>
                    <tr>
                        <td class="label">Còn phải thu / Công nợ:</td>
                        <td class="val" style="color: ${debtAmount > 0 ? '#c62828' : '#2e7d32'};">
                            ${debtAmount > 0 ? `${debtAmount.toLocaleString("vi-VN")} đ` : "0 đ (Đã tất toán)"}
                        </td>
                    </tr>
                    <tr>
                        <td class="label">Phương thức thanh toán:</td>
                        <td class="val">${paymentMethodText}</td>
                    </tr>
                    ${data.note ? `<tr><td class="label">Ghi chú:</td><td class="val">${data.note}</td></tr>` : ''}
                </table>

                ${qrHtml}

                <div class="signatures">
                    <div class="sig-block">
                        <div class="sig-title">Người lập phiếu</div>
                        <div>(Ký, ghi rõ họ tên)</div>
                    </div>
                    <div class="sig-block">
                        <div class="sig-title">Thủ kho / Xuất hàng</div>
                        <div>(Ký, ghi rõ họ tên)</div>
                    </div>
                    <div class="sig-block">
                        <div class="sig-title">Đại diện bên mua</div>
                        <div>(Ký, ghi rõ họ tên)</div>
                    </div>
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        setTimeout(() => {
            printWindow.print();
        }, 300);
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl border border-slate-200">
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-gradient-to-r from-emerald-700 to-teal-800 px-6 py-4 text-white">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur-sm">
                            <FileText className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black tracking-tight">{slipTitle}</h2>
                            <p className="text-xs text-emerald-100 font-medium">Phiếu xuất lô bán & Ghi nhận tài chính</p>
                        </div>
                    </div>
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-full p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    )}
                </div>

                <div className="p-6 space-y-6">
                    {/* Top Alert Banner based on payment status */}
                    <div className={`flex items-center justify-between rounded-2xl p-4 border ${
                        data.paymentStatus === "PAID"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                            : data.paymentStatus === "PARTIAL"
                            ? "bg-amber-50 border-amber-200 text-amber-900"
                            : "bg-rose-50 border-rose-200 text-rose-900"
                    }`}>
                        <div className="flex items-center gap-2.5">
                            {data.paymentStatus === "PAID" ? (
                                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                            ) : data.paymentStatus === "PARTIAL" ? (
                                <Clock className="h-5 w-5 text-amber-600 shrink-0" />
                            ) : (
                                <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                            )}
                            <div>
                                <p className="text-xs uppercase tracking-wider font-bold opacity-75">Trạng thái thanh toán</p>
                                <p className="text-sm font-black">{paymentStatusText}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs opacity-75">Phương thức</p>
                            <p className="text-sm font-bold">{paymentMethodText}</p>
                        </div>
                    </div>

                    {/* Main Receipt Format */}
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 space-y-4 font-mono text-xs sm:text-sm">
                        <div className="border-b border-dashed border-slate-300 pb-3 text-center">
                            <p className="text-base font-black text-slate-900 tracking-wider uppercase font-sans">
                                {slipTitle}
                            </p>
                            <p className="text-xs text-slate-500 font-sans mt-0.5">
                                Đơn vị: {data.ownerName || "Vựa / Cơ sở đóng gói"} · Ngày: {formattedDate}
                            </p>
                        </div>

                        <div className="space-y-2.5 text-slate-700">
                            <div className="flex justify-between items-center py-0.5">
                                <span className="text-slate-500 font-sans">Lô xuất bán:</span>
                                <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                                    {data.lotCode}
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-0.5">
                                <span className="text-slate-500 font-sans">Sản phẩm:</span>
                                <span className="font-bold text-slate-900 text-right">{data.productName}</span>
                            </div>
                            <div className="flex justify-between items-center py-0.5">
                                <span className="text-slate-500 font-sans">Tồn kho trước xuất:</span>
                                <span className="text-slate-600">{stockBefore.toLocaleString("vi-VN")} {unit}</span>
                            </div>
                            <div className="flex justify-between items-center py-0.5 border-t border-slate-200 pt-2">
                                <span className="text-slate-500 font-sans">Bên mua:</span>
                                <span className="font-bold text-emerald-800 text-right">{data.buyerName || "Công ty ABC"}</span>
                            </div>
                            {data.buyerPhone && (
                                <div className="flex justify-between items-center py-0.5">
                                    <span className="text-slate-500 font-sans">Số điện thoại:</span>
                                    <span>{data.buyerPhone}</span>
                                </div>
                            )}
                            {data.buyerAddress && (
                                <div className="flex justify-between items-center py-0.5">
                                    <span className="text-slate-500 font-sans">Địa chỉ:</span>
                                    <span className="text-right text-xs max-w-[280px]">{data.buyerAddress}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center py-0.5 border-t border-slate-200 pt-2">
                                <span className="text-slate-500 font-sans">Khối lượng xuất:</span>
                                <span className="font-black text-slate-900 text-base">{quantity.toLocaleString("vi-VN")} {unit}</span>
                            </div>
                            <div className="flex justify-between items-center py-0.5">
                                <span className="text-slate-500 font-sans">Đơn giá xuất bán:</span>
                                <span>{unitPrice > 0 ? `${unitPrice.toLocaleString("vi-VN")} đ/${unit}` : "—"}</span>
                            </div>
                            <div className="flex justify-between items-center py-0.5 border-t border-dashed border-slate-300 pt-2">
                                <span className="text-slate-500 font-sans">Thành tiền:</span>
                                <span>{subtotal > 0 ? `${subtotal.toLocaleString("vi-VN")} đ` : "—"}</span>
                            </div>
                            <div className="flex justify-between items-center py-0.5">
                                <span className="text-slate-500 font-sans">Chiết khấu:</span>
                                <span className="text-rose-600">
                                    {discount > 0 ? `- ${discount.toLocaleString("vi-VN")} đ` : "0 đ"}
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-2 bg-emerald-100/70 -mx-2 px-2 rounded-xl border border-emerald-200">
                                <span className="font-bold text-emerald-900 font-sans">TỔNG PHẢI THU:</span>
                                <span className="font-black text-emerald-900 text-base">
                                    {totalAmount > 0 ? `${totalAmount.toLocaleString("vi-VN")} đ` : "—"}
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-0.5 pt-1">
                                <span className="text-slate-500 font-sans">Đã nhận / Đã thanh toán:</span>
                                <span className="font-bold text-emerald-700">
                                    {paidAmount > 0 ? `${paidAmount.toLocaleString("vi-VN")} đ` : "0 đ"}
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-0.5">
                                <span className="text-slate-500 font-sans">Còn phải thu / Công nợ:</span>
                                <span className={`font-bold ${debtAmount > 0 ? "text-rose-600" : "text-emerald-700"}`}>
                                    {debtAmount > 0 ? `${debtAmount.toLocaleString("vi-VN")} đ` : "0 đ"}
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-0.5">
                                <span className="text-slate-500 font-sans">Phương thức thanh toán:</span>
                                <span className="font-medium text-slate-800">{paymentMethodText}</span>
                            </div>
                            {data.note && (
                                <div className="border-t border-slate-200 pt-2 text-xs text-slate-500 italic font-sans">
                                    Ghi chú: {data.note}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* QR Code Section */}
                    <div className="rounded-2xl border bg-white p-4 shadow-sm">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                {qrSrc ? (
                                    <div className="relative h-20 w-20 rounded-xl border bg-white p-1 shadow-sm shrink-0">
                                        <Image
                                            unoptimized
                                            src={qrSrc}
                                            width={80}
                                            height={80}
                                            alt={`QR ${token}`}
                                            className="h-full w-full object-contain"
                                        />
                                    </div>
                                ) : (
                                    <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-slate-100 text-slate-400 shrink-0">
                                        <QrCode className="h-8 w-8" />
                                    </div>
                                )}
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-slate-900 text-sm">Mã QR Truy xuất nguồn gốc</h4>
                                        {token ? (
                                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                                                Đã phát hành
                                            </span>
                                        ) : (
                                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                                                Chưa tạo QR
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {token
                                            ? `Mã: ${token} · Quét để xem hành trình từ vườn đến xuất bán`
                                            : "Sau khi xuất bán, chuyển sang tạo QR để khách hàng tra cứu nguồn gốc"}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                                {token ? (
                                    <>
                                        <a
                                            href={`/trace/${token}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                                        >
                                            <ExternalLink className="h-3.5 w-3.5" />
                                            Xem trang
                                        </a>
                                        {qrSrc && (
                                            <a
                                                download={`QR-${data.lotCode}.png`}
                                                href={qrSrc}
                                                className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                                            >
                                                <Download className="h-3.5 w-3.5" />
                                                Tải QR
                                            </a>
                                        )}
                                    </>
                                ) : onIssueQr ? (
                                    <Button
                                        type="button"
                                        onClick={() => onIssueQr(data.id)}
                                        disabled={issuingQr}
                                        className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs px-4 py-2 flex items-center gap-1.5"
                                    >
                                        <QrCode className="h-4 w-4" />
                                        {issuingQr ? "Đang tạo QR..." : "Tạo mã QR truy xuất ngay"}
                                    </Button>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer actions */}
                <div className="sticky bottom-0 flex items-center justify-between border-t bg-slate-50 px-6 py-4 rounded-b-3xl">
                    <div className="text-xs text-slate-500 font-medium">
                        Phiếu xuất hợp lệ kèm chữ ký và mã QR truy xuất nguồn gốc.
                    </div>
                    <div className="flex items-center gap-2">
                        {onClose && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                className="rounded-xl text-xs"
                            >
                                Đóng
                            </Button>
                        )}
                        <Button
                            type="button"
                            onClick={handlePrint}
                            className="bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs px-4 flex items-center gap-1.5 shadow-sm"
                        >
                            <Printer className="h-4 w-4" />
                            In Phiếu Xuất Bán
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
