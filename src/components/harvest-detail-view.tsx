"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
    ArrowLeft,
    Building2,
    Calendar,
    CheckCircle2,
    DollarSign,
    FileText,
    History,
    MapPin,
    Scale,
    Sparkles,
    Trees,
    Truck,
    Wheat,
    X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { formatVietnameseDate, formatVietnameseDateTime } from "@/lib/date-format";

const statusLabels: Record<string, { label: string; color: string; badgeBg: string }> = {
    DRAFT: { label: "Bản nháp", color: "text-slate-700", badgeBg: "bg-slate-100 text-slate-700 border-slate-200" },
    WAITING_CONFIRMATION: { label: "Chờ xác nhận", color: "text-amber-700", badgeBg: "bg-amber-50 text-amber-700 border-amber-200" },
    CONFIRMED: { label: "Đã xác nhận", color: "text-emerald-700", badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    REJECTED: { label: "Đã từ chối", color: "text-red-700", badgeBg: "bg-red-50 text-red-700 border-red-200" },
    HARVESTING: { label: "Đang thu hoạch", color: "text-blue-700", badgeBg: "bg-blue-50 text-blue-700 border-blue-200" },
    HARVESTED: { label: "Đã thu hoạch", color: "text-purple-700", badgeBg: "bg-purple-50 text-purple-700 border-purple-200" },
    DELIVERY_CONFIRMED: { label: "Đã giao hàng", color: "text-indigo-700", badgeBg: "bg-indigo-50 text-indigo-700 border-indigo-200" },
    COMPLETED: { label: "Hoàn tất", color: "text-brand-800", badgeBg: "bg-brand-50 text-brand-700 border-brand-200" },
    CANCELLED: { label: "Đã hủy", color: "text-slate-500", badgeBg: "bg-slate-100 text-slate-500 border-slate-200" },
};

const buyerTypeLabels: Record<string, string> = {
    UNDETERMINED: "Chưa xác định bên mua",
    COLLECTOR: "Bán cho Vựa / Đơn vị thu mua",
    PROCESSING_FACILITY: "Bán trực tiếp cho Cơ sở chế biến",
    SELF_CONSUMPTION: "Khác",
};

const deliveryMethodLabels: Record<string, string> = {
    BUYER_PICKUP: "Bên mua đến thu tại vườn",
    FARMER_DELIVERY: "Nông dân giao đến bên mua",
    OTHER: "Thỏa thuận khác",
};

type VarietyItem = {
    id: string;
    durianVariety: string;
    expectedWeight: number | string;
    expectedPricePerKg?: number | string | null;
};

type StatusHistory = {
    id: string;
    fromStatus?: string | null;
    toStatus: string;
    note?: string | null;
    createdAt: string;
    actor?: {
        fullName?: string | null;
        phone?: string | null;
        role?: string | null;
    } | null;
};

type HarvestData = {
    id: string;
    code: string;
    status: string;
    expectedHarvestDate: string;
    durianVariety: string;
    expectedWeight: number | string;
    weightUnit: string;
    expectedTreeCount?: number | null;
    expectedFruitCount?: number | null;
    expectedPricePerKg?: number | string | null;
    expectedSaleWeight?: number | string | null;
    expectedBuyerArrivalDate?: string | null;
    buyerType: string;
    deliveryMethod?: string | null;
    transactionNote?: string | null;
    rejectionReason?: string | null;
    actualStartedAt?: string | null;
    actualHarvestedAt?: string | null;
    actualTreeCount?: number | null;
    actualFruitCount?: number | null;
    actualWeight?: number | string | null;
    actualNote?: string | null;
    farmerDeliveredAt?: string | null;
    deliveredWeight?: number | string | null;
    buyerReceivedAt?: string | null;
    receivedWeight?: number | string | null;
    weightDifferenceReason?: string | null;
    completedAt?: string | null;
    createdAt: string;
    updatedAt: string;
    farm: {
        id: string;
        farmName: string;
        farmCode: string;
        address?: string | null;
        areaSize?: number | null;
        areaUnit?: string | null;
        durianVariety?: string | null;
    };
    farmer: {
        fullName?: string | null;
        phone?: string | null;
    };
    buyerFacility?: {
        name: string;
        phone?: string | null;
        province?: string | null;
        ward?: string | null;
        type?: string | null;
    } | null;
    varietyItems: VarietyItem[];
    histories: StatusHistory[];
};

export function HarvestDetailView({ harvest: initialData }: { harvest: HarvestData }) {
    const router = useRouter();
    const { toast } = useToast();
    const [harvest, setHarvest] = useState<HarvestData>(initialData);
    const [busy, setBusy] = useState(false);
    const [modalMode, setModalMode] = useState<"FINISH" | "DELIVER" | null>(null);
    const [actualTreeCount, setActualTreeCount] = useState(String(initialData.expectedTreeCount || ""));
    const [actualFruitCount, setActualFruitCount] = useState(String(initialData.expectedFruitCount || ""));
    const [weightInput, setWeightInput] = useState(String(initialData.expectedWeight || ""));
    const [actionNote, setActionNote] = useState("");

    const totalEstimatedValue = harvest.varietyItems.reduce((sum, item) => {
        const weight = Number(item.expectedWeight) || 0;
        const price = Number(item.expectedPricePerKg ?? harvest.expectedPricePerKg) || 0;
        return sum + weight * price;
    }, 0);

    const statusInfo = statusLabels[harvest.status] || {
        label: harvest.status,
        color: "text-slate-700",
        badgeBg: "bg-slate-100 text-slate-700",
    };

    async function sendAction(action: string, payload: Record<string, unknown> = {}) {
        setBusy(true);
        try {
            const response = await fetch(`/api/harvests/${harvest.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, ...payload }),
            });
            const result = (await response.json().catch(() => null)) as {
                success?: boolean;
                message?: string;
                data?: Partial<HarvestData>;
            } | null;

            if (!response.ok || !result?.success || !result.data) {
                throw new Error(result?.message || "Không thể cập nhật trạng thái phiếu.");
            }

            setHarvest(current => ({
                ...current,
                ...result.data,
            }));
            setModalMode(null);
            toast({
                title: "Cập nhật thành công",
                description: `Phiếu ${harvest.code} đã được cập nhật trạng thái.`,
                variant: "success",
            });
            router.refresh();
        } catch (error) {
            toast({
                title: "Không thể cập nhật",
                description: error instanceof Error ? error.message : "Vui lòng thử lại.",
                variant: "destructive",
            });
        } finally {
            setBusy(false);
        }
    }

    function handleModalSubmit() {
        const weight = Number(weightInput);
        if (!weight || weight <= 0) {
            toast({
                title: "Khối lượng không hợp lệ",
                description: "Khối lượng phải lớn hơn 0 kg.",
                variant: "destructive",
            });
            return;
        }

        if (modalMode === "FINISH") {
            void sendAction("FINISH", {
                actualTreeCount: actualTreeCount ? Number(actualTreeCount) : undefined,
                actualFruitCount: actualFruitCount ? Number(actualFruitCount) : undefined,
                actualWeight: weight,
                note: actionNote.trim() || undefined,
            });
        } else if (modalMode === "DELIVER") {
            void sendAction("DELIVER", {
                deliveredWeight: weight,
                note: actionNote.trim() || undefined,
            });
        }
    }

    return (
        <main className="mx-auto min-h-screen max-w-4xl space-y-5 px-3 py-5 sm:px-6 sm:py-7">
            {/* Top Navigation Bar */}
            <div className="flex items-center justify-between gap-3">
                <button
                    type="button"
                    onClick={() => router.push("/dashboard/farmer/harvests")}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Danh sách phiếu</span>
                </button>

                <div className="flex items-center gap-2">
                    <Badge className={`rounded-full border px-3 py-1 text-xs sm:text-sm font-bold ${statusInfo.badgeBg}`}>
                        {statusInfo.label}
                    </Badge>
                </div>
            </div>

            {/* Main Header Card */}
            <Card className="overflow-hidden border-slate-200 bg-white shadow-soft">
                <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-brand-50/60 via-white to-white pb-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-700">
                                <Sparkles className="h-3.5 w-3.5" />
                                Chi tiết phiếu thu hoạch
                            </span>
                            <CardTitle className="mt-1 text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                                <FileText className="h-6 w-6 text-brand-600" />
                                <span>{harvest.code}</span>
                            </CardTitle>
                        </div>
                        <div className="text-right text-xs text-slate-500">
                            <p>Tạo ngày: <b>{formatVietnameseDate(harvest.createdAt)}</b></p>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-6 space-y-6">
                    {/* Summary Quick Metrics */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-brand-100 bg-brand-50/40 p-3.5">
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                                <Scale className="h-4 w-4 text-brand-600" />
                                <span>Khối lượng dự kiến</span>
                            </div>
                            <p className="mt-1.5 text-base sm:text-lg font-black text-brand-700">
                                {Number(harvest.expectedWeight).toLocaleString("vi-VN")} {harvest.weightUnit}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3.5">
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                                <DollarSign className="h-4 w-4 text-emerald-600" />
                                <span>Giá trị dự kiến</span>
                            </div>
                            <p className="mt-1.5 text-base sm:text-lg font-black text-emerald-700">
                                {totalEstimatedValue > 0
                                    ? `${totalEstimatedValue.toLocaleString("vi-VN")} đ`
                                    : "Chưa định giá"}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5">
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                                <Trees className="h-4 w-4 text-slate-600" />
                                <span>Số cây dự kiến</span>
                            </div>
                            <p className="mt-1.5 text-base sm:text-lg font-black text-slate-800">
                                {harvest.expectedTreeCount ? `${harvest.expectedTreeCount} cây` : "—"}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5">
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                                <Wheat className="h-4 w-4 text-slate-600" />
                                <span>Số trái dự kiến</span>
                            </div>
                            <p className="mt-1.5 text-base sm:text-lg font-black text-slate-800">
                                {harvest.expectedFruitCount ? `${harvest.expectedFruitCount} trái` : "—"}
                            </p>
                        </div>
                    </div>

                    {/* Section 1: Thông tin Vườn & Kế hoạch */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3 shadow-xs">
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-brand-600" />
                            <span>Vườn thu hoạch & Thời gian</span>
                        </h3>
                        <div className="grid gap-3 sm:grid-cols-2 text-xs sm:text-sm">
                            <div>
                                <p className="text-slate-500">Tên vườn:</p>
                                <p className="font-bold text-slate-900">{harvest.farm.farmName}</p>
                            </div>
                            <div>
                                <p className="text-slate-500">Mã số vùng trồng (MSVT):</p>
                                <span className="inline-flex items-center rounded-lg bg-brand-50 px-2.5 py-0.5 font-bold text-brand-700">
                                    {harvest.farm.farmCode}
                                </span>
                            </div>
                            <div>
                                <p className="text-slate-500">Ngày dự kiến thu hoạch:</p>
                                <p className="font-bold text-slate-900 flex items-center gap-1.5">
                                    <Calendar className="h-4 w-4 text-brand-600" />
                                    {formatVietnameseDate(harvest.expectedHarvestDate)}
                                </p>
                            </div>
                            <div>
                                <p className="text-slate-500">Địa chỉ vườn:</p>
                                <p className="font-semibold text-slate-700">{harvest.farm.address || "Chưa cập nhật"}</p>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Chi tiết các giống sầu riêng */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3 shadow-xs">
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                            <Wheat className="h-4 w-4 text-brand-600" />
                            <span>Các giống sầu riêng thu hoạch ({harvest.varietyItems.length})</span>
                        </h3>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs sm:text-sm">
                                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                                    <tr>
                                        <th className="py-2.5 px-3 font-bold">Giống sầu riêng</th>
                                        <th className="py-2.5 px-3 font-bold text-right">Khối lượng</th>
                                        <th className="py-2.5 px-3 font-bold text-right">Giá dự kiến</th>
                                        <th className="py-2.5 px-3 font-bold text-right">Thành tiền</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {harvest.varietyItems.map(item => {
                                        const weight = Number(item.expectedWeight) || 0;
                                        const price = Number(item.expectedPricePerKg ?? harvest.expectedPricePerKg) || 0;
                                        const total = weight * price;
                                        return (
                                            <tr key={item.id} className="hover:bg-slate-50/60">
                                                <td className="py-2.5 px-3 font-bold text-slate-800">
                                                    {item.durianVariety}
                                                </td>
                                                <td className="py-2.5 px-3 text-right font-semibold text-slate-700">
                                                    {weight.toLocaleString("vi-VN")} {harvest.weightUnit}
                                                </td>
                                                <td className="py-2.5 px-3 text-right font-medium text-slate-600">
                                                    {price > 0 ? `${price.toLocaleString("vi-VN")} đ/kg` : "—"}
                                                </td>
                                                <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                                                    {total > 0 ? `${total.toLocaleString("vi-VN")} đ` : "—"}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot className="border-t-2 border-slate-200 bg-slate-50/50 font-bold">
                                    <tr>
                                        <td className="py-2.5 px-3 text-slate-800">Tổng cộng</td>
                                        <td className="py-2.5 px-3 text-right text-brand-700">
                                            {Number(harvest.expectedWeight).toLocaleString("vi-VN")} {harvest.weightUnit}
                                        </td>
                                        <td className="py-2.5 px-3 text-right text-slate-400">—</td>
                                        <td className="py-2.5 px-3 text-right text-emerald-700">
                                            {totalEstimatedValue > 0 ? `${totalEstimatedValue.toLocaleString("vi-VN")} đ` : "—"}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {/* Section 3: Thông tin Tiêu thụ & Giao nhận */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3 shadow-xs">
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                            <Truck className="h-4 w-4 text-brand-600" />
                            <span>Hình thức tiêu thụ & Giao nhận</span>
                        </h3>
                        <div className="grid gap-3 sm:grid-cols-2 text-xs sm:text-sm">
                            <div>
                                <p className="text-slate-500">Hình thức tiêu thụ:</p>
                                <p className="font-bold text-slate-900">
                                    {buyerTypeLabels[harvest.buyerType] || harvest.buyerType}
                                </p>
                            </div>
                            <div>
                                <p className="text-slate-500">Phương thức giao:</p>
                                <p className="font-bold text-slate-900">
                                    {harvest.deliveryMethod ? deliveryMethodLabels[harvest.deliveryMethod] || harvest.deliveryMethod : "Chưa xác định"}
                                </p>
                            </div>
                            {harvest.buyerFacility && (
                                <div className="sm:col-span-2 rounded-xl border border-blue-100 bg-blue-50/50 p-3">
                                    <p className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                                        <Building2 className="h-3.5 w-3.5 text-blue-600" />
                                        {harvest.buyerType === "COLLECTOR" ? "Vựa thu mua:" : "Cơ sở chế biến:"}
                                    </p>
                                    <p className="mt-1 font-bold text-slate-900">{harvest.buyerFacility.name}</p>
                                    <p className="text-xs text-slate-600">
                                        {[harvest.buyerFacility.ward, harvest.buyerFacility.province].filter(Boolean).join(", ")}
                                        {harvest.buyerFacility.phone && ` · SĐT: ${harvest.buyerFacility.phone}`}
                                    </p>
                                </div>
                            )}
                            {harvest.transactionNote && (
                                <div className="sm:col-span-2">
                                    <p className="text-slate-500">Ghi chú thu hoạch / giao dịch:</p>
                                    <p className="mt-0.5 rounded-xl bg-slate-50 p-3 text-xs sm:text-sm font-medium text-slate-700 italic">
                                        &ldquo;{harvest.transactionNote}&rdquo;
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Section 4: Kết quả thực tế (Nếu đã thực hiện) */}
                    {(harvest.actualWeight != null || harvest.actualHarvestedAt || harvest.deliveredWeight != null) && (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 sm:p-5 space-y-3 shadow-xs">
                            <h3 className="text-sm sm:text-base font-bold text-emerald-950 flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                <span>Kết quả thu hoạch & Giao nhận thực tế</span>
                            </h3>
                            <div className="grid gap-3 sm:grid-cols-3 text-xs sm:text-sm">
                                <div>
                                    <p className="text-slate-500">Khối lượng thu thực tế:</p>
                                    <p className="font-black text-base text-emerald-700">
                                        {harvest.actualWeight ? `${Number(harvest.actualWeight).toLocaleString("vi-VN")} ${harvest.weightUnit}` : "—"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Khối lượng đã giao:</p>
                                    <p className="font-black text-base text-blue-700">
                                        {harvest.deliveredWeight ? `${Number(harvest.deliveredWeight).toLocaleString("vi-VN")} ${harvest.weightUnit}` : "—"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Khối lượng bên mua nhận:</p>
                                    <p className="font-black text-base text-purple-700">
                                        {harvest.receivedWeight ? `${Number(harvest.receivedWeight).toLocaleString("vi-VN")} ${harvest.weightUnit}` : "—"}
                                    </p>
                                </div>
                                {harvest.actualTreeCount != null && (
                                    <div>
                                        <p className="text-slate-500">Số cây thực tế:</p>
                                        <p className="font-bold text-slate-800">{harvest.actualTreeCount} cây</p>
                                    </div>
                                )}
                                {harvest.actualFruitCount != null && (
                                    <div>
                                        <p className="text-slate-500">Số trái thực tế:</p>
                                        <p className="font-bold text-slate-800">{harvest.actualFruitCount} trái</p>
                                    </div>
                                )}
                                {harvest.actualHarvestedAt && (
                                    <div>
                                        <p className="text-slate-500">Thời điểm hoàn tất thu:</p>
                                        <p className="font-semibold text-slate-800">
                                            {formatVietnameseDateTime(new Date(harvest.actualHarvestedAt))}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Section 5: Lịch sử trạng thái */}
                    {harvest.histories && harvest.histories.length > 0 && (
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3 shadow-xs">
                            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                                <History className="h-4 w-4 text-brand-600" />
                                <span>Lịch sử trạng thái</span>
                            </h3>
                            <div className="relative border-l-2 border-slate-200 ml-3 space-y-4 py-1">
                                {harvest.histories.map(h => {
                                    const targetStatus = statusLabels[h.toStatus]?.label || h.toStatus;
                                    return (
                                        <div key={h.id} className="relative pl-5">
                                            <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-white bg-brand-600 shadow-xs" />
                                            <p className="text-xs sm:text-sm font-bold text-slate-900">
                                                {targetStatus}
                                            </p>
                                            <p className="text-[11px] sm:text-xs text-slate-500">
                                                {formatVietnameseDateTime(new Date(h.createdAt))}
                                                {h.actor?.fullName && ` · bởi ${h.actor.fullName}`}
                                            </p>
                                            {h.note && (
                                                <p className="mt-1 text-xs text-slate-600 italic">
                                                    Ghi chú: {h.note}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Actions Bar */}
                    <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-100">
                        {["DRAFT", "CONFIRMED"].includes(harvest.status) && (
                            <Button
                                disabled={busy}
                                onClick={() => void sendAction("START")}
                                className="h-11 rounded-2xl bg-brand-600 px-6 font-bold text-white hover:bg-brand-700 shadow-soft"
                            >
                                Bắt đầu thu hoạch
                            </Button>
                        )}

                        {harvest.status === "HARVESTING" && (
                            <Button
                                onClick={() => setModalMode("FINISH")}
                                className="h-11 rounded-2xl bg-brand-600 px-6 font-bold text-white hover:bg-brand-700 shadow-soft"
                            >
                                Nhập kết quả thu hoạch
                            </Button>
                        )}

                        {harvest.status === "HARVESTED" && harvest.buyerFacility && (
                            <Button
                                onClick={() => setModalMode("DELIVER")}
                                className="h-11 rounded-2xl bg-brand-600 px-6 font-bold text-white hover:bg-brand-700 shadow-soft"
                            >
                                <Truck className="mr-1.5 h-4 w-4" />
                                Xác nhận giao hàng
                            </Button>
                        )}

                        <Button
                            variant="outline"
                            onClick={() => router.push("/dashboard/farmer/harvests")}
                            className="h-11 rounded-2xl border-slate-200 px-5 font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            Đóng
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Action Modal */}
            {modalMode &&
                typeof document !== "undefined" &&
                createPortal(
                    <div
                        className="fixed inset-0 z-[150] flex h-full min-h-screen w-screen items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
                        onMouseDown={e => {
                            if (e.target === e.currentTarget) setModalMode(null);
                        }}
                    >
                        <section className="my-auto w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4">
                            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                                <div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-brand-700">
                                        {harvest.code}
                                    </span>
                                    <h2 className="mt-1 text-xl font-black text-slate-900">
                                        {modalMode === "FINISH" ? "Kết quả thu hoạch thực tế" : "Xác nhận giao hàng"}
                                    </h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setModalMode(null)}
                                    className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {modalMode === "FINISH" && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label htmlFor="modalActualTreeCount" className="text-xs font-bold text-slate-700">
                                                Số cây thực tế
                                            </Label>
                                            <Input
                                                id="modalActualTreeCount"
                                                type="number"
                                                min="1"
                                                placeholder="VD: 35"
                                                value={actualTreeCount}
                                                onChange={e => setActualTreeCount(e.target.value)}
                                                className="mt-1 h-11 rounded-xl"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="modalActualFruitCount" className="text-xs font-bold text-slate-700">
                                                Số trái thực tế
                                            </Label>
                                            <Input
                                                id="modalActualFruitCount"
                                                type="number"
                                                min="1"
                                                placeholder="VD: 180"
                                                value={actualFruitCount}
                                                onChange={e => setActualFruitCount(e.target.value)}
                                                className="mt-1 h-11 rounded-xl"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <Label htmlFor="modalWeight" className="text-xs font-bold text-slate-700">
                                        {modalMode === "FINISH" ? "Khối lượng thu hoạch thực tế *" : "Khối lượng giao hàng *"}
                                    </Label>
                                    <div className="relative mt-1">
                                        <Input
                                            id="modalWeight"
                                            type="number"
                                            step="0.1"
                                            min="0.1"
                                            value={weightInput}
                                            onChange={e => setWeightInput(e.target.value)}
                                            required
                                            className="h-11 rounded-xl pr-12 text-sm font-semibold"
                                        />
                                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                            {harvest.weightUnit}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="modalNote" className="text-xs font-bold text-slate-700">
                                        Ghi chú {modalMode === "FINISH" ? "thu hoạch" : "giao nhận"}
                                    </Label>
                                    <Textarea
                                        id="modalNote"
                                        rows={3}
                                        value={actionNote}
                                        onChange={e => setActionNote(e.target.value)}
                                        placeholder="Tình trạng, hao hụt hoặc lưu ý khác..."
                                        className="mt-1 rounded-xl text-sm"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setModalMode(null)}
                                    className="h-11 rounded-xl"
                                >
                                    Hủy
                                </Button>
                                <Button
                                    type="button"
                                    disabled={busy}
                                    onClick={handleModalSubmit}
                                    className="h-11 rounded-xl bg-brand-600 font-bold text-white hover:bg-brand-700 shadow-soft"
                                >
                                    {busy ? "Đang lưu..." : "Xác nhận"}
                                </Button>
                            </div>
                        </section>
                    </div>,
                    document.body,
                )}
        </main>
    );
}
