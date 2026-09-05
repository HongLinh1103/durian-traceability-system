"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import QRCode from "qrcode";
import {
    QrCode,
    Download,
    Printer,
    ExternalLink,
    Copy,
    Check,
    X,
    Sparkles,
    ShieldCheck,
    Building2,
    Calendar,
    Scale,
    Globe2,
    Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatVietnameseDate } from "@/lib/date-format";

export interface QrModalData {
    token: string;
    code?: string | null;
    lotCode: string;
    productName: string;
    quantity?: number | null;
    unit?: string | null;
    issuerName?: string | null;
    issuerType?: string | null;
    destinationName?: string | null;
    destinationCountry?: string | null;
    isExport?: boolean | null;
    issuedAt?: string | Date | null;
    status?: string | null;
}

interface QrCodeViewerModalProps {
    data: QrModalData | null;
    onClose: () => void;
}

export function QrCodeViewerModal({ data, onClose }: QrCodeViewerModalProps) {
    const [mounted, setMounted] = useState(false);
    const [qrDataUrl, setQrDataUrl] = useState<string>("");
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setMounted(true);
    }, []);

    const publicToken = data?.token || data?.code || "";
    const traceUrl = typeof window !== "undefined" && publicToken
        ? `${window.location.origin}/trace/${publicToken}`
        : `/trace/${publicToken}`;

    useEffect(() => {
        if (!data || !publicToken) return;

        setLoading(true);
        const fullUrl = typeof window !== "undefined"
            ? `${window.location.origin}/trace/${publicToken}`
            : `https://triviet.vn/trace/${publicToken}`;

        QRCode.toDataURL(fullUrl, {
            width: 512,
            margin: 2,
            color: {
                dark: "#064e3b",
                light: "#ffffff",
            },
            errorCorrectionLevel: "H",
        })
            .then((url) => {
                setQrDataUrl(url);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Error generating QR code:", err);
                setLoading(false);
            });
    }, [data, publicToken]);

    // Handle ESC key press
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    if (!mounted || typeof document === "undefined" || !data) return null;

    const handleCopyUrl = async () => {
        try {
            await navigator.clipboard.writeText(traceUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch (err) {
            console.error("Failed to copy URL:", err);
        }
    };

    const handleDownloadQr = () => {
        if (!qrDataUrl) return;
        const link = document.createElement("a");
        link.href = qrDataUrl;
        link.download = `QR_TruyXuat_${data.lotCode || "TriViet"}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrintQr = () => {
        const printWindow = window.open("", "_blank", "width=600,height=750");
        if (!printWindow) {
            alert("Vui lòng cho phép popup trình duyệt để in mã QR");
            return;
        }

        const issuedDateStr = formatVietnameseDate(data.issuedAt) || formatVietnameseDate(new Date());

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>In Tem QR Truy Xuất - ${data.lotCode}</title>
                <style>
                    @page {
                        size: A5 portrait;
                        margin: 12mm;
                    }
                    body {
                        font-family: Arial, -apple-system, BlinkMacSystemFont, sans-serif;
                        color: #1e293b;
                        background: #ffffff;
                        margin: 0;
                        padding: 0;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        box-sizing: border-box;
                    }
                    .label-card {
                        width: 100%;
                        max-width: 440px;
                        border: 2px solid #064e3b;
                        border-radius: 16px;
                        padding: 24px;
                        text-align: center;
                        box-sizing: border-box;
                    }
                    .header-logo {
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        margin-bottom: 6px;
                    }
                    .logo-box {
                        background: #064e3b;
                        color: #ffffff;
                        font-weight: 900;
                        font-size: 14px;
                        padding: 4px 8px;
                        border-radius: 6px;
                    }
                    .header-title {
                        font-size: 13px;
                        font-weight: 800;
                        letter-spacing: 1px;
                        color: #064e3b;
                        text-transform: uppercase;
                    }
                    .main-title {
                        font-size: 18px;
                        font-weight: 900;
                        color: #0f172a;
                        margin: 4px 0 2px 0;
                        text-transform: uppercase;
                    }
                    .sub-title {
                        font-size: 12px;
                        color: #64748b;
                        margin-bottom: 14px;
                    }
                    .qr-container {
                        background: #ffffff;
                        border: 1.5px solid #cbd5e1;
                        border-radius: 14px;
                        padding: 12px;
                        display: inline-block;
                        margin-bottom: 12px;
                    }
                    .qr-image {
                        width: 220px;
                        height: 220px;
                        display: block;
                    }
                    .token-code {
                        font-family: monospace;
                        font-size: 12px;
                        font-weight: bold;
                        color: #064e3b;
                        background: #f0fdf4;
                        padding: 4px 10px;
                        border-radius: 6px;
                        display: inline-block;
                        margin-bottom: 14px;
                        border: 1px dashed #86efac;
                    }
                    .info-table {
                        width: 100%;
                        border-collapse: collapse;
                        text-align: left;
                        font-size: 12px;
                        margin-bottom: 14px;
                        border-top: 1px solid #e2e8f0;
                        border-bottom: 1px solid #e2e8f0;
                    }
                    .info-table td {
                        padding: 6px 4px;
                    }
                    .info-table td.label {
                        color: #64748b;
                        font-weight: 600;
                        width: 40%;
                    }
                    .info-table td.val {
                        color: #0f172a;
                        font-weight: 700;
                    }
                    .footer-note {
                        font-size: 11px;
                        color: #064e3b;
                        font-weight: 600;
                        margin-top: 8px;
                    }
                    .footer-sub {
                        font-size: 10px;
                        color: #94a3b8;
                        margin-top: 4px;
                    }
                </style>
            </head>
            <body>
                <div class="label-card">
                    <div class="header-logo">
                        <span class="logo-box">TriViet</span>
                        <span class="header-title">Hệ Thống Truy Xuất Nguồn Gốc</span>
                    </div>
                    <div class="main-title">${data.productName}</div>
                    <div class="sub-title">Lô thương mại: <b>${data.lotCode}</b></div>

                    <div class="qr-container">
                        <img src="${qrDataUrl}" alt="Mã QR" class="qr-image" />
                    </div>

                    <div>
                        <span class="token-code">MÃ ĐỊNH DANH: ${publicToken}</span>
                    </div>

                    <table class="info-table">
                        <tr>
                            <td class="label">Sản phẩm:</td>
                            <td class="val">${data.productName}</td>
                        </tr>
                        <tr>
                            <td class="label">Mã lô hàng:</td>
                            <td class="val">${data.lotCode}</td>
                        </tr>
                        ${data.quantity ? `
                        <tr>
                            <td class="label">Khối lượng:</td>
                            <td class="val">${data.quantity.toLocaleString("vi-VN")} ${data.unit || "kg"}</td>
                        </tr>
                        ` : ""}
                        ${data.issuerName ? `
                        <tr>
                            <td class="label">Đơn vị phát hành:</td>
                            <td class="val">${data.issuerName}</td>
                        </tr>
                        ` : ""}
                        ${data.destinationName || data.destinationCountry ? `
                        <tr>
                            <td class="label">Thị trường / Điểm đến:</td>
                            <td class="val">${data.destinationCountry || data.destinationName}</td>
                        </tr>
                        ` : ""}
                        <tr>
                            <td class="label">Ngày phát hành:</td>
                            <td class="val">${issuedDateStr}</td>
                        </tr>
                    </table>

                    <div class="footer-note">
                        📱 Dùng máy ảnh điện thoại hoặc Zalo quét mã để xem toàn bộ nhật ký canh tác & kiểm định.
                    </div>
                    <div class="footer-sub">
                        Bản quyền thuộc Hệ thống Nông nghiệp & Truy xuất Nguồn gốc Trí Việt (triviet.vn)
                    </div>
                </div>
            </body>
            </html>
        `);

        printWindow.document.close();
        setTimeout(() => {
            printWindow.print();
        }, 300);
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/65 p-4 backdrop-blur-xs overflow-y-auto w-screen h-screen"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden my-auto border border-slate-200 animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Top Header */}
                <div className="flex items-center justify-between bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 px-6 py-4 text-white">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur-xs text-white border border-white/20">
                            <QrCode className="h-5 w-5 text-emerald-300" />
                        </div>
                        <div>
                            <h3 className="font-black text-sm sm:text-base leading-snug">
                                Mã QR Truy Xuất Nguồn Gốc
                            </h3>
                            <p className="text-[11px] text-emerald-200">
                                Lô hàng: <b className="font-mono text-white">{data.lotCode}</b>
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-1.5 text-white/80 hover:bg-white/15 hover:text-white transition"
                        aria-label="Đóng cửa sổ"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-5">
                    {/* QR Code Container Box */}
                    <div className="flex flex-col items-center justify-center rounded-3xl bg-gradient-to-b from-emerald-50/60 to-slate-50/80 p-6 border border-emerald-100/80 text-center">
                        <div className="relative rounded-2xl bg-white p-3.5 shadow-md border border-slate-200/80">
                            {loading ? (
                                <div className="flex h-56 w-56 items-center justify-center">
                                    <div className="h-8 w-8 animate-spin rounded-full border-3 border-emerald-600 border-t-transparent" />
                                </div>
                            ) : qrDataUrl ? (
                                <img
                                    src={qrDataUrl}
                                    alt={`Mã QR - ${data.lotCode}`}
                                    className="h-56 w-56 rounded-xl object-contain sm:h-64 sm:w-64"
                                />
                            ) : (
                                <div className="flex h-56 w-56 flex-col items-center justify-center text-xs text-slate-400">
                                    <QrCode className="h-10 w-10 text-slate-300 mb-2" />
                                    <span>Không thể tạo mã QR</span>
                                </div>
                            )}

                            {/* Floating scan hint badge */}
                            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-emerald-700 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-xs">
                                Quét bằng Camera / Zalo
                            </div>
                        </div>

                        {/* Public Token Display */}
                        <div className="mt-5 flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-1.5 border border-slate-200 text-xs font-mono text-slate-700 shadow-2xs">
                            <span className="text-slate-400 font-sans text-[11px]">Mã Token:</span>
                            <b className="text-emerald-800 font-bold">{publicToken}</b>
                        </div>
                    </div>

                    {/* Lot Details Summary */}
                    <div className="rounded-2xl bg-slate-50/90 p-4 border border-slate-100 space-y-2.5 text-xs">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
                            <span className="text-slate-500 font-medium">Tên sản phẩm:</span>
                            <b className="text-slate-900 font-black text-right">{data.productName}</b>
                        </div>

                        <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
                            <span className="text-slate-500 font-medium">Mã lô hàng:</span>
                            <span className="font-mono font-bold text-slate-800">{data.lotCode}</span>
                        </div>

                        {data.quantity !== undefined && data.quantity !== null && (
                            <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
                                <span className="text-slate-500 font-medium">Khối lượng lô:</span>
                                <b className="text-emerald-800 font-black">{data.quantity.toLocaleString("vi-VN")} {data.unit || "kg"}</b>
                            </div>
                        )}

                        {data.issuerName && (
                            <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
                                <span className="text-slate-500 font-medium">Đơn vị phát hành:</span>
                                <b className="text-slate-800">{data.issuerName}</b>
                            </div>
                        )}

                        <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-500 font-medium whitespace-nowrap">Trạng thái phát hành:</span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-black text-emerald-800 whitespace-nowrap shrink-0">
                                <ShieldCheck className="h-3 w-3 text-emerald-600 shrink-0" />
                                <span className="whitespace-nowrap">Hợp lệ & Sẵn sàng quét</span>
                            </span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2.5 pt-1">
                        <div className="grid grid-cols-2 gap-2.5">
                            {/* Nút Tải QR */}
                            <Button
                                type="button"
                                onClick={handleDownloadQr}
                                disabled={!qrDataUrl}
                                className="w-full rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs h-10 gap-1.5 shadow-xs"
                            >
                                <Download className="h-4 w-4" />
                                Tải ảnh QR (PNG)
                            </Button>

                            {/* Nút In QR */}
                            <Button
                                type="button"
                                onClick={handlePrintQr}
                                disabled={!qrDataUrl}
                                className="w-full rounded-2xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs h-10 gap-1.5 shadow-xs"
                            >
                                <Printer className="h-4 w-4" />
                                In Tem QR
                            </Button>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Nút Sao Chép Link */}
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleCopyUrl}
                                className="flex-1 rounded-2xl border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs h-9 gap-1.5"
                            >
                                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                                {copied ? "Đã sao chép link!" : "Sao chép link"}
                            </Button>

                            {/* Nút Xem Trang Truy Xuất */}
                            <Link
                                href={`/trace/${publicToken}`}
                                target="_blank"
                                className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs px-3.5 h-9 transition"
                            >
                                <ExternalLink className="h-3.5 w-3.5" />
                                Mở trang truy xuất
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
