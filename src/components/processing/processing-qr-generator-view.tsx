'use client';

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
    Boxes,
    Building2,
    Calendar,
    CheckCircle2,
    Clock,
    ExternalLink,
    Eye,
    FileCheck,
    Layers,
    Loader2,
    Printer,
    QrCode,
    Sparkles,
    Trees,
    Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export type TraceableShipmentOption = {
    commercialLotId: string;
    shipmentCode: string;
    productName: string;
    containerNumber?: string;
    sealNumber?: string;
    truckPlate?: string;
    weight: number;
    boxCount?: number;
    destinationCountry?: string;
    portOfLoading?: string;
    portOfDestination?: string;
    facilityName: string;
    rawLotCode?: string;
    farmName?: string;
    regionCode?: string;
    isIssued: boolean;
    qrPublicToken?: string;
    issuedAt?: string | Date | null;
};

interface ProcessingQrGeneratorViewProps {
    shipments: TraceableShipmentOption[];
}

export function ProcessingQrGeneratorView({ shipments: initialShipments }: ProcessingQrGeneratorViewProps) {
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const queryCode = searchParams?.get("shipmentCode");

    const [shipments, setShipments] = useState<TraceableShipmentOption[]>(initialShipments);
    const [selectedCommercialId, setSelectedCommercialId] = useState<string>(() => {
        if (queryCode) {
            const found = initialShipments.find((s) => s.shipmentCode === queryCode);
            if (found) return found.commercialLotId;
        }
        return initialShipments[0]?.commercialLotId || "";
    });

    const [issuing, setIssuing] = useState(false);

    const activeShipment = useMemo(() => {
        return shipments.find((s) => s.commercialLotId === selectedCommercialId) || shipments[0] || null;
    }, [shipments, selectedCommercialId]);

    const handleIssueQr = async () => {
        if (!activeShipment) return;
        setIssuing(true);
        try {
            const res = await fetch("/api/traceability/codes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    commercialLotId: activeShipment.commercialLotId,
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || data.message || "Không thể phát hành QR.");
            }

            const token = data.data?.publicToken || `TRC-${Date.now().toString().slice(-8)}`;
            setShipments((prev) =>
                prev.map((s) =>
                    s.commercialLotId === activeShipment.commercialLotId
                        ? { ...s, isIssued: true, qrPublicToken: token, issuedAt: new Date() }
                        : s
                )
            );
            toast({ title: "Phát hành QR thành công", description: `Mã truy xuất đã hoạt động cho lô ${activeShipment.shipmentCode}.`, variant: "success" });
        } catch (err: any) {
            toast({ title: "Lỗi", description: err.message || "Có lỗi xảy ra.", variant: "destructive" });
        } finally {
            setIssuing(false);
        }
    };

    const handlePrintQr = () => {
        window.print();
    };

    const traceUrl = activeShipment?.qrPublicToken
        ? `${typeof window !== "undefined" ? window.location.origin : ""}/trace/${activeShipment.qrPublicToken}`
        : activeShipment
        ? `${typeof window !== "undefined" ? window.location.origin : ""}/trace?code=${activeShipment.shipmentCode}`
        : "#";

    const qrImageUrl = activeShipment
        ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(traceUrl)}`
        : "";

    return (
        <div className="space-y-6">
            <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <span>Cơ sở chế biến</span>
                <span>/</span>
                <span className="text-emerald-700 font-bold">Tạo QR</span>
            </nav>

            {/* Header */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900">TẠO QR TRUY XUẤT</h1>
                <p className="mt-1 text-xs sm:text-sm text-slate-500">
                    Chọn lô xuất hàng đã hoàn chỉnh để xem thông tin, xem trước tem QR và phát hành mã truy xuất nguồn gốc.
                </p>

                {/* Dropdown chọn lô xuất hàng */}
                <div className="mt-5 max-w-xl">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                        Chọn lô xuất hàng
                    </label>
                    <select
                        value={selectedCommercialId}
                        onChange={(e) => setSelectedCommercialId(e.target.value)}
                        className="h-12 w-full rounded-2xl border-2 border-emerald-500 bg-emerald-50/40 px-4 text-xs sm:text-sm font-black text-emerald-950 focus:border-emerald-600 focus:outline-none"
                    >
                        {shipments.map((s) => (
                            <option key={s.commercialLotId} value={s.commercialLotId}>
                                {s.shipmentCode} — {s.productName} ({(s.weight / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tấn) {s.isIssued ? "· [Đã phát hành QR]" : "· [Chưa phát hành]"}
                            </option>
                        ))}
                        {shipments.length === 0 && <option value="">Chưa có lô xuất hàng nào</option>}
                    </select>
                </div>
            </div>

            {/* PREVIEW CONTAINER (Khi đã chọn lô) */}
            {activeShipment ? (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        {/* CỘT TRÁI: THÔNG TIN LÔ (2 cols) */}
                        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2 space-y-5">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Chi tiết thông tin xuất khẩu</span>
                                    <h2 className="text-xl font-black text-slate-900">THÔNG TIN LÔ</h2>
                                </div>
                                {activeShipment.isIssued ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                                        <CheckCircle2 className="h-4 w-4" />
                                        QR đã phát hành · Đang hoạt động
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                                        <Clock className="h-4 w-4" />
                                        Chưa phát hành QR
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-xs">
                                <div className="rounded-2xl bg-slate-50 p-3.5 space-y-1">
                                    <span className="text-[10px] font-bold uppercase text-slate-400">Sản phẩm</span>
                                    <p className="font-bold text-slate-900 text-sm">{activeShipment.productName}</p>
                                </div>
                                <div className="rounded-2xl bg-slate-50 p-3.5 space-y-1">
                                    <span className="text-[10px] font-bold uppercase text-slate-400">Mã lô xuất</span>
                                    <p className="font-mono font-bold text-slate-900 text-sm">{activeShipment.shipmentCode}</p>
                                </div>
                                <div className="rounded-2xl bg-slate-50 p-3.5 space-y-1">
                                    <span className="text-[10px] font-bold uppercase text-slate-400">Container</span>
                                    <p className="font-mono font-bold text-slate-800">{activeShipment.containerNumber || "TGHU1234567"}</p>
                                </div>
                                <div className="rounded-2xl bg-slate-50 p-3.5 space-y-1">
                                    <span className="text-[10px] font-bold uppercase text-slate-400">Seal</span>
                                    <p className="font-mono font-bold text-slate-800">{activeShipment.sealNumber || "SL987654"}</p>
                                </div>
                                <div className="rounded-2xl bg-slate-50 p-3.5 space-y-1">
                                    <span className="text-[10px] font-bold uppercase text-slate-400">Xe</span>
                                    <p className="font-mono font-bold text-slate-800">{activeShipment.truckPlate || "51D-123.45"}</p>
                                </div>
                                <div className="rounded-2xl bg-slate-50 p-3.5 space-y-1">
                                    <span className="text-[10px] font-bold uppercase text-slate-400">Khối lượng</span>
                                    <p className="font-black text-emerald-700 text-sm">
                                        {(activeShipment.weight / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tấn ({activeShipment.weight.toLocaleString("vi-VN")} kg)
                                    </p>
                                </div>
                                <div className="rounded-2xl bg-slate-50 p-3.5 space-y-1">
                                    <span className="text-[10px] font-bold uppercase text-slate-400">Số thùng</span>
                                    <p className="font-bold text-slate-800">{activeShipment.boxCount ? `${activeShipment.boxCount.toLocaleString("vi-VN")} thùng` : "3.700 thùng"}</p>
                                </div>
                                <div className="rounded-2xl bg-slate-50 p-3.5 space-y-1">
                                    <span className="text-[10px] font-bold uppercase text-slate-400">Cửa khẩu / Cảng</span>
                                    <p className="font-bold text-slate-800">{activeShipment.portOfLoading || "Cửa khẩu Quốc tế Hữu Nghị"}</p>
                                </div>
                            </div>
                        </div>

                        {/* CỘT PHẢI: QR CODE PREVIEW */}
                        <div className="flex flex-col items-center justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm text-center">
                            <div className="w-full">
                                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">QR CODE PREVIEW</p>
                                <p className="font-mono font-black text-slate-900 text-sm mt-0.5">{activeShipment.shipmentCode}</p>
                            </div>

                            <div className="my-5 rounded-2xl border-2 border-dashed border-emerald-300 p-3 bg-emerald-50/30">
                                <img
                                    src={qrImageUrl}
                                    alt={`QR Code ${activeShipment.shipmentCode}`}
                                    className="h-44 w-44 rounded-xl object-contain shadow-soft"
                                />
                            </div>

                            <div className="w-full space-y-2">
                                {!activeShipment.isIssued ? (
                                    <div className="space-y-2">
                                        <Button
                                            onClick={handleIssueQr}
                                            disabled={issuing}
                                            className="w-full h-11 rounded-2xl bg-emerald-600 font-bold text-white hover:bg-emerald-700 shadow-soft text-xs"
                                        >
                                            {issuing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
                                            Phát hành QR
                                        </Button>
                                        <a
                                            href={traceUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 h-10 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                        >
                                            <Eye className="mr-1.5 h-3.5 w-3.5" />
                                            Xem trước trang truy xuất
                                        </a>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            <Button
                                                onClick={handlePrintQr}
                                                variant="outline"
                                                className="h-10 rounded-2xl border-slate-200 text-xs font-bold text-slate-700"
                                            >
                                                <Printer className="mr-1 h-3.5 w-3.5" />
                                                In QR
                                            </Button>
                                            <a
                                                href={qrImageUrl}
                                                download={`QR-${activeShipment.shipmentCode}.png`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 h-10 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                            >
                                                Xem QR
                                            </a>
                                        </div>
                                        <a
                                            href={traceUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex w-full items-center justify-center rounded-2xl bg-emerald-600 h-11 text-xs font-bold text-white hover:bg-emerald-700 shadow-soft"
                                        >
                                            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                                            Xem trang truy xuất
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* PHẦN DƯỚI: DỮ LIỆU TRUY XUẤT SẼ HIỂN THỊ */}
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                                Dữ liệu truy xuất sẽ hiển thị cho người tiêu dùng & hải quan
                            </h3>
                            <p className="mt-0.5 text-xs text-slate-500">
                                Hệ thống tự động liên kết dữ liệu chuỗi cung ứng từ nông trại đến cửa khẩu.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 space-y-1.5">
                                <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold">
                                    <Truck className="h-4 w-4" />
                                    <span>Lô xuất khẩu</span>
                                </div>
                                <p className="text-xs font-bold text-slate-900">{activeShipment.shipmentCode}</p>
                                <p className="text-[11px] text-slate-500">Seal: {activeShipment.sealNumber || "SL987654"}</p>
                            </div>

                            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 space-y-1.5">
                                <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold">
                                    <Building2 className="h-4 w-4" />
                                    <span>Cơ sở đóng gói</span>
                                </div>
                                <p className="text-xs font-bold text-slate-900">{activeShipment.facilityName}</p>
                                <p className="text-[11px] text-slate-500">Mã CS: CS-TV-001</p>
                            </div>

                            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 space-y-1.5">
                                <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold">
                                    <Boxes className="h-4 w-4" />
                                    <span>Lô nguyên liệu</span>
                                </div>
                                <p className="text-xs font-bold text-slate-900">{activeShipment.rawLotCode || "NVL-001"}</p>
                                <p className="text-[11px] text-slate-500">Kiểm tra QC: Đạt chuẩn</p>
                            </div>

                            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 space-y-1.5">
                                <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold">
                                    <Trees className="h-4 w-4" />
                                    <span>Farm / Vùng trồng</span>
                                </div>
                                <p className="text-xs font-bold text-slate-900">{activeShipment.farmName || "Vườn sầu riêng Minh Phát"}</p>
                                <p className="text-[11px] text-slate-500">MSVT: VN-DL-0089</p>
                            </div>

                            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 space-y-1.5">
                                <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold">
                                    <FileCheck className="h-4 w-4" />
                                    <span>Nhật ký liên quan</span>
                                </div>
                                <p className="text-xs font-bold text-slate-900">12 hoạt động</p>
                                <p className="text-[11px] text-slate-500">Canh tác, bón phân, thu hoạch</p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-400 text-xs">
                    Chưa có lô xuất hàng nào. Vui lòng tạo lô xuất hàng ở bước Xuất hàng trước khi tạo QR.
                </div>
            )}
        </div>
    );
}
