"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
    AlertCircle,
    ArrowLeft,
    Calendar,
    MapPin,
    Plus,
    Sparkles,
    Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { VietnameseDatePicker } from "@/components/ui/vietnamese-date-picker";

type Partner = {
    id: string;
    name: string;
    province: string;
    ward?: string | null;
    phone: string;
};

type Farm = {
    id: string;
    farmCode: string;
    farmName: string;
    durianVariety: string;
    address?: string | null;
};

type VarietyRow = {
    durianVariety: string;
    expectedWeight: string;
    expectedPricePerKg: string;
};

function parseFarmVarieties(farm?: Farm) {
    return farm?.durianVariety.split(",").map(v => v.trim()).filter(Boolean) || [];
}

export default function NewHarvestPage() {
    const router = useRouter();
    const { toast } = useToast();

    // Data state
    const [farms, setFarms] = useState<Farm[]>([]);
    const [farmsLoading, setFarmsLoading] = useState(true);
    const [selectedFarmId, setSelectedFarmId] = useState<string>("");

    const [expectedHarvestDate, setExpectedHarvestDate] = useState<string>(
        new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    );
    const [expectedTreeCount, setExpectedTreeCount] = useState<string>("");
    const [expectedFruitCount, setExpectedFruitCount] = useState<string>("");

    const [varietyRows, setVarietyRows] = useState<VarietyRow[]>([
        { durianVariety: "", expectedWeight: "", expectedPricePerKg: "" },
    ]);

    const [buyerType, setBuyerType] = useState<string>("UNDETERMINED");
    const [buyerFacilityId, setBuyerFacilityId] = useState<string>("");
    const [partners, setPartners] = useState<Partner[]>([]);
    const [partnersLoading, setPartnersLoading] = useState(false);

    const [deliveryMethod, setDeliveryMethod] = useState<string>("");
    const [transactionNote, setTransactionNote] = useState<string>("");
    const [busy, setBusy] = useState(false);

    // Selected farm and varieties
    const selectedFarm = useMemo(
        () => farms.find(f => f.id === selectedFarmId) || farms[0],
        [farms, selectedFarmId],
    );

    const farmVarieties = useMemo(
        () => parseFarmVarieties(selectedFarm),
        [selectedFarm],
    );

    // Load farms for logged-in farmer
    useEffect(() => {
        let isMounted = true;
        setFarmsLoading(true);
        fetch("/api/farming-logs", { cache: "no-store" })
            .then(res => (res.ok ? res.json() : null))
            .then(result => {
                if (!isMounted || !result) return;
                const loadedFarms: Farm[] = result.data?.farms || [];
                setFarms(loadedFarms);
                if (loadedFarms.length > 0) {
                    const firstFarm = loadedFarms[0];
                    setSelectedFarmId(firstFarm.id);
                    const vars = parseFarmVarieties(firstFarm);
                    setVarietyRows([
                        { durianVariety: vars.length === 1 ? vars[0] : "", expectedWeight: "", expectedPricePerKg: "" },
                    ]);
                }
            })
            .catch(err => {
                console.error("Error loading farms:", err);
            })
            .finally(() => {
                if (isMounted) setFarmsLoading(false);
            });
        return () => {
            isMounted = false;
        };
    }, []);

    // When selected farm changes, update variety options
    const handleFarmChange = (newFarmId: string) => {
        setSelectedFarmId(newFarmId);
        const nextFarm = farms.find(f => f.id === newFarmId);
        const vars = parseFarmVarieties(nextFarm);
        setVarietyRows([
            { durianVariety: vars.length === 1 ? vars[0] : "", expectedWeight: "", expectedPricePerKg: "" },
        ]);
    };

    // Load partners when buyerType requires partner
    const requiresBuyer = buyerType === "COLLECTOR" || buyerType === "PROCESSING_FACILITY";
    useEffect(() => {
        if (!requiresBuyer) {
            setPartners([]);
            setBuyerFacilityId("");
            setPartnersLoading(false);
            return;
        }
        let isMounted = true;
        setPartnersLoading(true);
        setBuyerFacilityId("");
        fetch(`/api/partners?type=${buyerType}`, { cache: "no-store" })
            .then(res => (res.ok ? res.json() : null))
            .then(result => {
                if (!isMounted || !result) return;
                const partnerList: Partner[] = result.data || [];
                setPartners(partnerList);
                if (partnerList.length > 0) {
                    setBuyerFacilityId(partnerList[0].id);
                }
            })
            .catch(err => {
                console.error("Error loading partners:", err);
            })
            .finally(() => {
                if (isMounted) setPartnersLoading(false);
            });
        return () => {
            isMounted = false;
        };
    }, [buyerType, requiresBuyer]);

    // Totals calculations
    const totalExpectedWeight = useMemo(
        () => varietyRows.reduce((sum, item) => sum + (Number(item.expectedWeight) || 0), 0),
        [varietyRows],
    );

    const totalEstimatedValue = useMemo(
        () =>
            varietyRows.reduce((sum, item) => {
                const weight = Number(item.expectedWeight) || 0;
                const price = Number(item.expectedPricePerKg) || 0;
                return sum + weight * price;
            }, 0),
        [varietyRows],
    );

    // Variety row handlers
    const updateVarietyRow = (index: number, field: keyof VarietyRow, value: string) => {
        setVarietyRows(current =>
            current.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
        );
    };

    const addVarietyRow = () => {
        const remainingVarieties = farmVarieties.filter(
            v => !varietyRows.some(row => row.durianVariety === v),
        );
        setVarietyRows(current => [
            ...current,
            {
                durianVariety: remainingVarieties.length === 1 ? remainingVarieties[0] : "",
                expectedWeight: "",
                expectedPricePerKg: "",
            },
        ]);
    };

    const removeVarietyRow = (index: number) => {
        setVarietyRows(current => current.filter((_, i) => i !== index));
    };

    // Submit handler
    async function submit(event: React.FormEvent) {
        event.preventDefault();
        if (!selectedFarm) {
            toast({
                title: "Chưa chọn vườn",
                description: "Vui lòng chọn vườn sầu riêng thu hoạch.",
                variant: "destructive",
            });
            return;
        }

        if (!expectedHarvestDate) {
            toast({
                title: "Chưa chọn ngày thu hoạch",
                description: "Vui lòng chọn ngày dự kiến thu hoạch.",
                variant: "destructive",
            });
            return;
        }

        // Validate harvest date >= today
        const todayStr = new Date().toISOString().slice(0, 10);
        if (expectedHarvestDate < todayStr) {
            toast({
                title: "Ngày thu hoạch không hợp lệ",
                description: "Ngày dự kiến thu hoạch phải từ hôm nay trở đi.",
                variant: "destructive",
            });
            return;
        }

        if (varietyRows.some(row => !row.durianVariety || !Number(row.expectedWeight) || Number(row.expectedWeight) <= 0)) {
            toast({
                title: "Thông tin giống chưa đầy đủ",
                description: "Vui lòng chọn giống và nhập khối lượng (> 0 kg) cho từng dòng.",
                variant: "destructive",
            });
            return;
        }

        const selectedVars = varietyRows.map(r => r.durianVariety);
        if (new Set(selectedVars).size !== selectedVars.length) {
            toast({
                title: "Giống bị trùng lặp",
                description: "Mỗi giống sầu riêng chỉ nên xuất hiện một lần trong phiếu.",
                variant: "destructive",
            });
            return;
        }

        if (requiresBuyer && !buyerFacilityId) {
            toast({
                title: "Chưa chọn bên mua",
                description: "Vui lòng chọn tên Vựa hoặc Cơ sở chế biến.",
                variant: "destructive",
            });
            return;
        }

        const payload = {
            farmId: selectedFarm.id,
            expectedHarvestDate,
            expectedTreeCount: expectedTreeCount ? Number(expectedTreeCount) : undefined,
            expectedFruitCount: expectedFruitCount ? Number(expectedFruitCount) : undefined,
            weightUnit: "kg",
            varietyItems: varietyRows.map(row => ({
                durianVariety: row.durianVariety,
                expectedWeight: Number(row.expectedWeight),
                expectedPricePerKg: row.expectedPricePerKg ? Number(row.expectedPricePerKg) : undefined,
            })),
            buyerType,
            buyerFacilityId: requiresBuyer ? buyerFacilityId : undefined,
            deliveryMethod: deliveryMethod || undefined,
            transactionNote: transactionNote.trim() || undefined,
        };

        setBusy(true);
        try {
            const response = await fetch("/api/harvests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const result = (await response.json().catch(() => null)) as {
                success?: boolean;
                message?: string;
                data?: { id?: string; code?: string };
            } | null;

            if (!response.ok || !result?.success) {
                throw new Error(result?.message || "Không thể tạo phiếu thu hoạch.");
            }

            toast({
                title: "Đã tạo phiếu thu hoạch thành công",
                description: `Mã phiếu: ${result.data?.code || "Thành công"}`,
                variant: "success",
            });
            if (result.data?.id) {
                router.push(`/dashboard/farmer/harvests/${result.data.id}`);
            } else {
                router.push("/dashboard/farmer/harvests");
            }
            router.refresh();
        } catch (error) {
            toast({
                title: "Không thể tạo phiếu",
                description: error instanceof Error ? error.message : "Vui lòng kiểm tra lại thông tin và thử lại.",
                variant: "destructive",
            });
        } finally {
            setBusy(false);
        }
    }

    return (
        <main className="mx-auto min-h-screen max-w-3xl space-y-5 px-3 py-5 sm:px-6 sm:py-7">
            {/* Back Button */}
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Quay lại</span>
                </button>
            </div>

            <Card className="overflow-hidden border-slate-200 bg-white shadow-soft">
                {/* Header */}
                <CardHeader className="space-y-1.5 border-b border-slate-100 bg-gradient-to-r from-brand-50/50 via-white to-white pb-5">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-700">
                        <Sparkles className="h-4 w-4" />
                        Kế hoạch thu hoạch
                    </div>
                    <CardTitle className="text-xl sm:text-2xl font-black text-slate-900">
                        Tạo phiếu thu hoạch
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm text-slate-500">
                        Lập kế hoạch sản lượng, giống sầu riêng và hình thức tiêu thụ cho đợt thu hoạch.
                    </CardDescription>
                </CardHeader>

                <CardContent className="p-4 sm:p-6">
                    {/* No Farms Warning */}
                    {!farmsLoading && farms.length === 0 ? (
                        <div className="rounded-3xl border border-amber-200 bg-amber-50/70 p-6 text-center space-y-3">
                            <AlertCircle className="mx-auto h-10 w-10 text-amber-600" />
                            <h3 className="font-bold text-amber-900 text-base">
                                Bạn chưa có vườn trồng để tạo phiếu thu hoạch
                            </h3>
                            <p className="text-xs sm:text-sm text-amber-700 max-w-md mx-auto">
                                Vui lòng thêm vườn hoặc liên hệ quản trị viên phê duyệt mã số vùng trồng trước khi tạo phiếu.
                            </p>
                            <Button
                                variant="outline"
                                onClick={() => router.push("/dashboard/farmer")}
                                className="mt-2 rounded-2xl border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
                            >
                                Về trang nông dân
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={submit} className="space-y-6">
                            {/* 1. VƯỜN THU HOẠCH */}
                            <div className="space-y-2">
                                <Label htmlFor="farmId" className="text-sm font-bold text-slate-900">
                                    Vườn thu hoạch <span className="text-red-500">*</span>
                                </Label>
                                {farmsLoading ? (
                                    <div className="h-12 w-full animate-pulse rounded-2xl bg-slate-100" />
                                ) : (
                                    <select
                                        id="farmId"
                                        value={selectedFarm?.id || ""}
                                        onChange={e => handleFarmChange(e.target.value)}
                                        required
                                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                                    >
                                        {farms.map(farm => (
                                            <option key={farm.id} value={farm.id}>
                                                {farm.farmName} — {farm.farmCode}
                                            </option>
                                        ))}
                                    </select>
                                )}
                                {selectedFarm && (
                                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-500">
                                        <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 font-bold text-slate-700">
                                            <MapPin className="h-3 w-3 text-brand-600" />
                                            {selectedFarm.farmCode}
                                        </span>
                                        {farmVarieties.length > 0 && (
                                            <span>
                                                Giống trong vườn: <b>{farmVarieties.join(", ")}</b>
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* 2. NGÀY DỰ KIẾN THU HOẠCH & QUY MÔ DỰ KIẾN */}
                            <div className="grid gap-4 sm:grid-cols-3">
                                <div>
                                    <Label className="text-sm font-bold text-slate-900">
                                        Ngày dự kiến thu hoạch <span className="text-red-500">*</span>
                                    </Label>
                                    <div className="mt-1.5">
                                        <VietnameseDatePicker
                                            value={expectedHarvestDate}
                                            onChange={val => setExpectedHarvestDate(val)}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="expectedTreeCount" className="text-sm font-semibold text-slate-700">
                                            Số cây dự kiến thu
                                        </Label>
                                        <span className="text-[11px] text-slate-400">Không bắt buộc</span>
                                    </div>
                                    <div className="relative mt-1.5">
                                        <Input
                                            id="expectedTreeCount"
                                            type="number"
                                            min="1"
                                            placeholder="VD: 35"
                                            value={expectedTreeCount}
                                            onChange={e => setExpectedTreeCount(e.target.value)}
                                            className="h-12 rounded-2xl pr-12"
                                        />
                                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                            cây
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="expectedFruitCount" className="text-sm font-semibold text-slate-700">
                                            Số trái dự kiến
                                        </Label>
                                        <span className="text-[11px] text-slate-400">Không bắt buộc</span>
                                    </div>
                                    <div className="relative mt-1.5">
                                        <Input
                                            id="expectedFruitCount"
                                            type="number"
                                            min="1"
                                            placeholder="VD: 180"
                                            value={expectedFruitCount}
                                            onChange={e => setExpectedFruitCount(e.target.value)}
                                            className="h-12 rounded-2xl pr-12"
                                        />
                                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                            trái
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* 3. CÁC GIỐNG SẦU RIÊNG & GIÁ DỰ KIẾN (COMPACT 1-ROW PER VARIETY) */}
                            <div className="space-y-3 rounded-3xl border border-brand-100 bg-brand-50/40 p-4 sm:p-5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm sm:text-base font-bold text-slate-900">
                                            Các giống sầu riêng thu hoạch <span className="text-red-500">*</span>
                                        </h3>
                                        <p className="text-xs text-slate-500">
                                            Nhập khối lượng và giá dự kiến riêng cho từng giống.
                                        </p>
                                    </div>
                                </div>

                                {/* Variety Rows */}
                                <div className="space-y-2.5">
                                    {varietyRows.map((row, index) => {
                                        const availableVarieties = farmVarieties.length > 0
                                            ? farmVarieties
                                            : ["Ri6", "Monthong (Dona)", "Musang King", "Black Thorn", "Sầu riêng Khổ Qua", "Sầu riêng Chuồng Bò", "Khác"];

                                        return (
                                            <div
                                                key={index}
                                                className="flex flex-wrap sm:flex-nowrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs"
                                            >
                                                {/* Giống */}
                                                <div className="w-full sm:w-5/12 min-w-[130px]">
                                                    <select
                                                        aria-label={`Giống sầu riêng ${index + 1}`}
                                                        value={row.durianVariety}
                                                        onChange={e => updateVarietyRow(index, "durianVariety", e.target.value)}
                                                        required
                                                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs sm:text-sm font-semibold text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                                                    >
                                                        <option value="">-- Chọn giống --</option>
                                                        {availableVarieties.map(v => (
                                                            <option
                                                                key={v}
                                                                value={v}
                                                                disabled={varietyRows.some(
                                                                    (r, rIdx) => rIdx !== index && r.durianVariety === v,
                                                                )}
                                                            >
                                                                {v}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Khối lượng (kg) */}
                                                <div className="relative flex-1 min-w-[110px]">
                                                    <Input
                                                        aria-label={`Khối lượng giống ${index + 1}`}
                                                        type="number"
                                                        min="0.1"
                                                        step="0.1"
                                                        placeholder="Khối lượng"
                                                        value={row.expectedWeight}
                                                        onChange={e => updateVarietyRow(index, "expectedWeight", e.target.value)}
                                                        required
                                                        className="h-11 rounded-xl pr-9 text-xs sm:text-sm font-semibold"
                                                    />
                                                    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                                        kg
                                                    </span>
                                                </div>

                                                {/* Giá dự kiến (đ/kg) */}
                                                <div className="relative flex-1 min-w-[125px]">
                                                    <Input
                                                        aria-label={`Giá bán dự kiến giống ${index + 1}`}
                                                        type="number"
                                                        min="0"
                                                        step="500"
                                                        placeholder="Giá dự kiến"
                                                        value={row.expectedPricePerKg}
                                                        onChange={e => updateVarietyRow(index, "expectedPricePerKg", e.target.value)}
                                                        className="h-11 rounded-xl pr-11 text-xs sm:text-sm"
                                                    />
                                                    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                                                        đ/kg
                                                    </span>
                                                </div>

                                                {/* Nút xóa */}
                                                {varietyRows.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeVarietyRow(index)}
                                                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                                                        title="Xóa giống này"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Add Variety Button & Summary */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={
                                            farmVarieties.length > 0 &&
                                            varietyRows.length >= farmVarieties.length
                                        }
                                        onClick={addVarietyRow}
                                        className="h-10 rounded-xl border-brand-200 bg-white font-bold text-brand-700 hover:bg-brand-50"
                                    >
                                        <Plus className="mr-1.5 h-4 w-4" />
                                        Thêm giống
                                    </Button>

                                    {/* Real-time Summary */}
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl bg-white/90 px-4 py-2 border border-brand-100 text-xs sm:text-sm">
                                        <span className="font-semibold text-slate-700">
                                            Tổng KL:{" "}
                                            <b className="text-brand-700 font-black">
                                                {totalExpectedWeight.toLocaleString("vi-VN")} kg
                                            </b>
                                        </span>
                                        {totalEstimatedValue > 0 && (
                                            <span className="font-semibold text-slate-700">
                                                Giá trị dự kiến:{" "}
                                                <b className="text-emerald-700 font-black">
                                                    {totalEstimatedValue.toLocaleString("vi-VN")} đ
                                                </b>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* 4. HÌNH THỨC TIÊU THỤ & ĐƠN VỊ THU MUA */}
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <Label htmlFor="buyerType" className="text-sm font-bold text-slate-900">
                                        Hình thức tiêu thụ
                                    </Label>
                                    <div className="mt-1.5">
                                        <select
                                            id="buyerType"
                                            value={buyerType}
                                            onChange={e => setBuyerType(e.target.value)}
                                            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                                        >
                                            <option value="UNDETERMINED">Chưa xác định bên mua</option>
                                            <option value="COLLECTOR">Bán cho Vựa / Đơn vị thu mua</option>
                                            <option value="PROCESSING_FACILITY">Bán trực tiếp cho Cơ sở chế biến</option>
                                            <option value="SELF_CONSUMPTION">Khác</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="deliveryMethod" className="text-sm font-bold text-slate-900">
                                        Phương thức giao
                                    </Label>
                                    <div className="mt-1.5">
                                        <select
                                            id="deliveryMethod"
                                            value={deliveryMethod}
                                            onChange={e => setDeliveryMethod(e.target.value)}
                                            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                                        >
                                            <option value="">Chưa xác định</option>
                                            <option value="BUYER_PICKUP">Bên mua đến thu tại vườn</option>
                                            <option value="FARMER_DELIVERY">Nông dân giao đến bên mua</option>
                                            <option value="OTHER">Thỏa thuận khác</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Conditional Partner Selection */}
                            {requiresBuyer && (
                                <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 space-y-2">
                                    <Label htmlFor="buyerFacilityId" className="text-sm font-bold text-blue-950">
                                        {buyerType === "COLLECTOR"
                                            ? "Đơn vị thu mua / Vựa *"
                                            : "Cơ sở chế biến *"}
                                    </Label>
                                    <select
                                        id="buyerFacilityId"
                                        value={buyerFacilityId}
                                        onChange={e => setBuyerFacilityId(e.target.value)}
                                        required
                                        disabled={partnersLoading || partners.length === 0}
                                        className="h-12 w-full rounded-2xl border border-blue-200 bg-white px-4 text-sm font-semibold text-slate-800 disabled:bg-slate-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                                    >
                                        {partnersLoading ? (
                                            <option value="">Đang tải danh sách đơn vị...</option>
                                        ) : partners.length === 0 ? (
                                            <option value="">Chưa có đơn vị nào được xác minh trong hệ thống</option>
                                        ) : (
                                            partners.map(partner => (
                                                <option key={partner.id} value={partner.id}>
                                                    {partner.name} · {[partner.ward, partner.province].filter(Boolean).join(", ")} · {partner.phone}
                                                </option>
                                            ))
                                        )}
                                    </select>
                                    {!partnersLoading && partners.length === 0 && (
                                        <p className="text-xs text-blue-700">
                                            Chỉ hiển thị các đơn vị {buyerType === "COLLECTOR" ? "Vựa thu mua" : "Cơ sở chế biến"} đã được Ban quản lý phê duyệt.
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* 5. GHI CHÚ */}
                            <div className="space-y-1.5">
                                <Label htmlFor="transactionNote" className="text-sm font-bold text-slate-900">
                                    Ghi chú thu hoạch / giao dịch
                                </Label>
                                <Textarea
                                    id="transactionNote"
                                    rows={3}
                                    placeholder="Tình trạng trái, yêu cầu thu hoạch, thỏa thuận với bên mua, lưu ý giao nhận..."
                                    value={transactionNote}
                                    onChange={e => setTransactionNote(e.target.value)}
                                    className="rounded-2xl border-slate-200 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                                />
                            </div>

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                disabled={busy || farmsLoading || farms.length === 0}
                                className="h-12 w-full rounded-2xl bg-brand-600 font-bold text-white hover:bg-brand-700 shadow-soft transition"
                            >
                                {busy ? "Đang lưu phiếu..." : "Tạo phiếu thu hoạch"}
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </main>
    );
}

