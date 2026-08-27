"use client";

import { useState, useEffect } from "react";
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
    ExternalLink,
    Ship,
    Truck,
    Globe,
    Package
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
    // Export fields (Nghị quyết 36/2026/NQ-CP & GACC Standard)
    isExport?: boolean;
    destinationCountry?: string | null;
    portOfLoading?: string | null;
    transportMethod?: string | null;
    containerNumber?: string | null;
    sealNumber?: string | null;
    vehicleReference?: string | null;
    exportStageStatus?: string | null;
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

    const isExport = Boolean(
        data.isExport ||
        data.lotCode?.startsWith("EXP-") ||
        data.lotCode?.startsWith("CM-EXP-") ||
        data.destinationCountry === "Trung Quốc" ||
        data.buyerName?.toLowerCase().includes("trung quốc")
    );
    const isProcessingFacility = data.ownerType === "PROCESSING_FACILITY" || data.lotCode?.startsWith("TP-") || data.lotCode?.startsWith("CM-FAC");
    const slipTitle = isExport
        ? "PHIẾU XUẤT HÀNG XUẤT KHẨU"
        : isProcessingFacility
        ? "XUẤT BÁN LÔ THÀNH PHẨM"
        : "XUẤT BÁN LÔ SẦU RIÊNG";

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
                    ${isExport ? `
                    <tr>
                        <td class="label">Thị trường xuất khẩu:</td>
                        <td class="val"><b>${data.destinationCountry || "Trung Quốc"}</b></td>
                    </tr>
                    <tr>
                        <td class="label">Cửa khẩu / Cảng xuất:</td>
                        <td class="val">${data.portOfLoading || "Cửa khẩu Quốc tế Hữu Nghị (Lạng Sơn)"}</td>
                    </tr>
                    ${data.containerNumber ? `<tr><td class="label">Số Container:</td><td class="val"><b>${data.containerNumber}</b></td></tr>` : ''}
                    ${data.sealNumber ? `<tr><td class="label">Số Niêm phong Seal:</td><td class="val"><b>${data.sealNumber}</b></td></tr>` : ''}
                    ${data.vehicleReference ? `<tr><td class="label">Biển số phương tiện:</td><td class="val">${data.vehicleReference}</td></tr>` : ''}
                    ` : `
                    <tr>
                        <td class="label">Bên mua (Khách hàng):</td>
                        <td class="val"><b>${data.buyerName || "Chưa có thông tin"}</b></td>
                    </tr>
                    ${data.buyerPhone ? `<tr><td class="label">Số điện thoại bên mua:</td><td class="val">${data.buyerPhone}</td></tr>` : ''}
                    ${data.buyerAddress ? `<tr><td class="label">Địa chỉ giao nhận:</td><td class="val">${data.buyerAddress}</td></tr>` : ''}
                    `}
                    <tr>
                        <td class="label">Khối lượng xuất ${isExport ? "khẩu" : "bán"}:</td>
                        <td class="val"><b style="font-size: 14px;">${quantity.toLocaleString("vi-VN")} ${unit}</b></td>
                    </tr>
                    <tr>
                        <td class="label">Đơn giá:</td>
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
                        <div class="sig-title">${isExport ? "Đại diện đơn vị xuất" : "Đại diện bên mua"}</div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
            <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl overflow-hidden my-8 border border-slate-200">
                {/* Modal Header */}
                <div className={`p-6 text-white flex items-center justify-between ${
                    isExport ? "bg-gradient-to-r from-indigo-800 to-blue-900" : "bg-gradient-to-r from-emerald-800 to-teal-900"
                }`}>
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md">
                            {isExport ? <Ship className="h-6 w-6 text-indigo-200" /> : <FileText className="h-6 w-6 text-emerald-200" />}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-md">
                                    {isExport ? "HỒ SƠ XUẤT KHẨU GACC" : "PHIẾU XUẤT KHO THƯƠNG MẠI"}
                                </span>
                                <span className="text-xs font-mono font-bold text-white/80">#{data.lotCode}</span>
                            </div>
                            <h2 className="text-xl font-black mt-0.5 tracking-tight">{slipTitle}</h2>
                        </div>
                    </div>
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl p-2 text-white/80 hover:bg-white/10 hover:text-white transition"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    )}
                </div>

                {/* Modal Content */}
                <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                    {/* General Lot Info */}
                    <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                                <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Đơn vị xuất:</span>
                                <span className="font-bold text-slate-800 text-sm block truncate">
                                    {data.ownerName || "Cơ sở xuất hàng"}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Ngày xuất:</span>
                                <span className="font-bold text-slate-800 text-sm block flex items-center gap-1">
                                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                    {formattedDate}
                                </span>
                            </div>
                            <div className="col-span-2 border-t pt-2">
                                <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Sản phẩm:</span>
                                <span className="font-black text-slate-900 text-base block">{data.productName}</span>
                            </div>
                        </div>

                        {/* Export specific details */}
                        {isExport && (
                            <div className="grid grid-cols-2 gap-3 pt-2 border-t text-xs bg-indigo-50/60 p-3 rounded-xl border-indigo-100">
                                <div>
                                    <span className="text-indigo-600 font-bold uppercase tracking-wider block text-[10px]">Thị trường:</span>
                                    <span className="font-black text-indigo-950 text-sm block">
                                        {data.destinationCountry || "Trung Quốc"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-indigo-600 font-bold uppercase tracking-wider block text-[10px]">Cửa khẩu / Cảng:</span>
                                    <span className="font-bold text-indigo-900 block truncate">
                                        {data.portOfLoading || "Cửa khẩu Hữu Nghị"}
                                    </span>
                                </div>
                                {data.containerNumber && (
                                    <div>
                                        <span className="text-indigo-600 font-bold uppercase tracking-wider block text-[10px]">Container:</span>
                                        <span className="font-mono font-bold text-slate-800">{data.containerNumber}</span>
                                    </div>
                                )}
                                {data.sealNumber && (
                                    <div>
                                        <span className="text-indigo-600 font-bold uppercase tracking-wider block text-[10px]">Seal:</span>
                                        <span className="font-mono font-bold text-slate-800">{data.sealNumber}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Quantity & Finance Breakdown */}
                    <div className="rounded-2xl border border-slate-200 overflow-hidden text-xs">
                        <div className="bg-slate-100 px-4 py-2 font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                            Chi tiết khối lượng & Thanh toán tài chính
                        </div>
                        <div className="divide-y divide-slate-100 p-4 space-y-2 text-slate-700">
                            <div className="flex justify-between py-1">
                                <span className="text-slate-500">Tồn kho trước xuất:</span>
                                <span className="font-bold text-slate-800">{stockBefore.toLocaleString("vi-VN")} {unit}</span>
                            </div>
                            <div className="flex justify-between py-1">
                                <span className="text-slate-500">Khối lượng xuất:</span>
                                <span className="font-black text-emerald-800 text-sm">{quantity.toLocaleString("vi-VN")} {unit}</span>
                            </div>
                            <div className="flex justify-between py-1">
                                <span className="text-slate-500">Đơn giá xuất:</span>
                                <span className="font-bold text-slate-800">
                                    {unitPrice > 0 ? `${unitPrice.toLocaleString("vi-VN")} đ/${unit}` : "Thỏa thuận"}
                                </span>
                            </div>
                            <div className="flex justify-between py-1">
                                <span className="text-slate-500">Thành tiền:</span>
                                <span className="font-bold text-slate-800">{subtotal > 0 ? `${subtotal.toLocaleString("vi-VN")} đ` : "—"}</span>
                            </div>
                            <div className="flex justify-between py-1">
                                <span className="text-slate-500">Chiết khấu:</span>
                                <span className="font-bold text-slate-800">{discount > 0 ? `${discount.toLocaleString("vi-VN")} đ` : "0 đ"}</span>
                            </div>
                            <div className="flex justify-between py-2 bg-emerald-50 px-3 rounded-xl border border-emerald-100">
                                <span className="font-black text-emerald-900 text-sm">TỔNG PHẢI THU:</span>
                                <span className="font-black text-emerald-900 text-base">{totalAmount > 0 ? `${totalAmount.toLocaleString("vi-VN")} đ` : "—"}</span>
                            </div>
                            <div className="flex justify-between py-1 pt-2">
                                <span className="text-slate-500">Đã thanh toán ({data.paymentMethod || "CK"}):</span>
                                <span className="font-bold text-emerald-700">{paidAmount.toLocaleString("vi-VN")} đ</span>
                            </div>
                            <div className="flex justify-between py-1">
                                <span className="text-slate-500">Còn phải thu / Công nợ:</span>
                                <span className={`font-black ${debtAmount > 0 ? "text-rose-600" : "text-emerald-700"}`}>
                                    {debtAmount > 0 ? `${debtAmount.toLocaleString("vi-VN")} đ` : "0 đ (Đã thanh toán đủ)"}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* QR Code Section */}
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 text-center space-y-3">
                        {token && qrSrc ? (
                            <div className="flex flex-col items-center">
                                <div className="p-2 bg-white rounded-2xl shadow-sm border border-emerald-200">
                                    <img src={qrSrc} alt="QR Code" width={160} height={160} className="rounded-lg" />
                                </div>
                                <span className="font-mono text-xs font-black text-emerald-900 mt-2">
                                    Mã QR: {token}
                                </span>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    Quét để xem Timeline truy xuất nguồn gốc công khai
                                </p>
                                <a
                                    href={`/trace/${token}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-900 underline"
                                >
                                    Mở trang truy xuất công khai <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                            </div>
                        ) : (
                            <div className="py-3 space-y-2">
                                <p className="text-xs font-bold text-slate-600">
                                    Lô hàng đã ghi nhận xuất bán thành công. Bạn có thể phát hành mã QR truy xuất ngay bây giờ.
                                </p>
                                {onIssueQr && (
                                    <Button
                                        type="button"
                                        onClick={() => onIssueQr(data.id)}
                                        disabled={issuingQr}
                                        className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs gap-2"
                                    >
                                        <QrCode className="h-4 w-4" />
                                        {issuingQr ? "Đang tạo mã QR..." : "Tạo & Phát hành Mã QR ngay"}
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handlePrint}
                        className="rounded-xl text-xs font-bold gap-2"
                    >
                        <Printer className="h-4 w-4 text-slate-600" />
                        In phiếu xuất hàng
                    </Button>

                    {onClose && (
                        <Button
                            type="button"
                            onClick={onClose}
                            className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold px-5"
                        >
                            Đóng
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
