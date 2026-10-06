"use client";

import { MaterialCombobox } from "@/components/farmer/material-combobox";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { ArrowUpFromLine, Plus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

export type SupplyOption = {
    id: string;
    name: string;
    type: string;
    unit: string;
    quantity: number;
    unitPrice: number | string;
};

export type FarmOption = {
    id: string;
    farmName: string;
    cropSeasons: {
        id: string;
        name: string;
        year: number;
        status: string;
    }[];
};

interface FarmerInventoryActionModalProps {
    mode: "IN" | "OUT";
    supplies: SupplyOption[];
    farms: FarmOption[];
}

const SUPPLY_TYPE_LABELS: Record<string, string> = {
    FERTILIZER: "Phân bón",
    PESTICIDE: "Thuốc BVTV",
    EQUIPMENT: "Thiết bị",
    OTHER: "Khác",
};

export function FarmerInventoryActionModal({
    mode,
    supplies,
    farms,
}: FarmerInventoryActionModalProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form IN state
    const [inSource, setInSource] = useState<"NEW" | "EXISTING">(
        supplies.length > 0 ? "EXISTING" : "NEW"
    );
    const [selectedSupplyIdIn, setSelectedSupplyIdIn] = useState<string>(
        supplies[0]?.id || ""
    );
    const [name, setName] = useState("");
    const [type, setType] = useState<string>("FERTILIZER");
    const [brand, setBrand] = useState("");
    const [unit, setUnit] = useState("bao");
    const [quantityIn, setQuantityIn] = useState<string>("1");
    const [unitPrice, setUnitPrice] = useState<string>("0");
    const [phiDays, setPhiDays] = useState<string>("");
    const [activeIngredients, setActiveIngredients] = useState("");
    const [actionDateIn, setActionDateIn] = useState<string>(
        new Date().toISOString().slice(0, 10)
    );
    const [notesIn, setNotesIn] = useState("");
    const [expiryDateIn, setExpiryDateIn] = useState("");

    // Form OUT state
    const [selectedSupplyIdOut, setSelectedSupplyIdOut] = useState<string>(
        supplies[0]?.id || ""
    );
    const [quantityOut, setQuantityOut] = useState<string>("1");
    const [farmId, setFarmId] = useState<string>(farms[0]?.id || "");
    const [cropSeasonId, setCropSeasonId] = useState<string>(
        farms[0]?.cropSeasons[0]?.id || ""
    );
    const [activityType, setActivityType] = useState<string>("FERTILIZE");
    const [purpose, setPurpose] = useState<string>("CULTIVATION");
    const [actionDateOut, setActionDateOut] = useState<string>(
        new Date().toISOString().slice(0, 10)
    );
    const [notesOut, setNotesOut] = useState("");

    const selectedSupplyForOut = supplies.find((s) => s.id === selectedSupplyIdOut);
    const selectedSupplyForIn = supplies.find((s) => s.id === selectedSupplyIdIn);

    const handleOpen = () => {
        if (mode === "IN") {
            if (supplies.length > 0) {
                setInSource("EXISTING");
                setSelectedSupplyIdIn(supplies[0].id);
                setUnit(supplies[0].unit);
                setUnitPrice(String(supplies[0].unitPrice || 0));
            } else {
                setInSource("NEW");
            }
            setQuantityIn("1");
            setActionDateIn(new Date().toISOString().slice(0, 10));
            setNotesIn("");
            setExpiryDateIn("");
        } else {
            if (supplies.length > 0) {
                setSelectedSupplyIdOut(supplies.find(s => s.quantity > 0)?.id || "");
            }
            setQuantityOut("1");
            if (farms.length > 0) {
                setFarmId(farms[0].id);
                setCropSeasonId(farms[0].cropSeasons[0]?.id || "");
            }
            setPurpose("Sử dụng cho hoạt động canh tác");
            setActionDateOut(new Date().toISOString().slice(0, 10));
            setNotesOut("");
        }
        setOpen(true);
    };

    const handleClose = () => {
        if (submitting) return;
        setOpen(false);
    };

    const handleSubmitIn = async (e: React.FormEvent) => {
        e.preventDefault();
        const qty = parseFloat(quantityIn);
        if (isNaN(qty) || qty <= 0) {
            toast({
                title: "Lỗi nhập liệu",
                description: "Vui lòng nhập số lượng nhập hợp lệ (> 0).",
                variant: "destructive",
            });
            return;
        }

        setSubmitting(true);
        try {
            if (inSource === "EXISTING" && selectedSupplyForIn) {
                const res = await fetch("/api/farmer/supplies/transactions", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        supplyId: selectedSupplyForIn.id,
                        type: "IN",
                        quantity: qty,
                        unitPrice: Number(unitPrice),
                        actionDate: actionDateIn,
                        expiryDate: expiryDateIn ? new Date(expiryDateIn).toISOString() : null,
                        purpose: "Nhập bổ sung kho vật tư",
                        notes: notesIn.trim() || undefined,
                    }),
                });
                const data = await res.json().catch(() => null);
                if (!res.ok || !data?.success) {
                    throw new Error(data?.message || "Không thể ghi nhận nhập vật tư.");
                }
            } else {
                if (!name.trim()) {
                    toast({
                        title: "Lỗi nhập liệu",
                        description: "Vui lòng nhập tên vật tư.",
                        variant: "destructive",
                    });
                    setSubmitting(false);
                    return;
                }
                const price = parseFloat(unitPrice) || 0;
                const res = await fetch("/api/farmer/supplies", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: name.trim(),
                        type,
                        brand: brand.trim() || undefined,
                        unit: unit.trim() || "bao",
                        quantity: qty,
                        unitPrice: price,
                        actionDate: actionDateIn,
                        expiryDate: expiryDateIn || null,
                        phiDays: phiDays ? parseInt(phiDays, 10) : null,
                        activeIngredients: activeIngredients.trim() || undefined,
                        notes: notesIn.trim() || undefined,
                    }),
                });
                const data = await res.json().catch(() => null);
                if (!res.ok || !data?.success) {
                    throw new Error(data?.message || "Không thể tạo mới vật tư.");
                }
            }

            toast({
                title: "Thành công",
                description: "Đã nhập vật tư vào kho thành công.",
                variant: "success",
            });
            setOpen(false);
            router.refresh();
        } catch (err: any) {
            toast({
                title: "Thao tác thất bại",
                description: err?.message || "Đã có lỗi xảy ra khi nhập vật tư.",
                variant: "destructive",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmitOut = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSupplyForOut) {
            toast({
                title: "Lỗi xuất kho",
                description: "Vui lòng chọn vật tư cần xuất.",
                variant: "destructive",
            });
            return;
        }

        const qty = parseFloat(quantityOut);
        if (isNaN(qty) || qty <= 0) {
            toast({
                title: "Lỗi nhập liệu",
                description: "Vui lòng nhập số lượng xuất hợp lệ (> 0).",
                variant: "destructive",
            });
            return;
        }

        if (qty > selectedSupplyForOut.quantity) {
            toast({
                title: "Số lượng không đủ",
                description: `Số lượng xuất (${qty}) vượt quá số lượng tồn kho (${selectedSupplyForOut.quantity} ${selectedSupplyForOut.unit}).`,
                variant: "destructive",
            });
            return;
        }

        if (!notesOut.trim() || (purpose === "CULTIVATION" && (!farmId || !cropSeasonId))) { toast({ title: "Nhập nội dung, vườn và niên vụ cho xuất phục vụ canh tác", variant: "destructive" }); return; }
        setSubmitting(true);
        try {
            const res = await fetch("/api/farmer/supplies/transactions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    supplyId: selectedSupplyForOut.id,
                    type: "OUT",
                    quantity: qty,
                    farmId: purpose === "CULTIVATION" ? farmId : null,
                    cropSeasonId: purpose === "CULTIVATION" ? cropSeasonId : null,
                    activityType: activityType || null,
                    exportPurpose: purpose,
                    actionDate: actionDateOut,
                    notes: notesOut.trim() || undefined,
                }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                throw new Error(data?.message || "Không thể xuất kho vật tư.");
            }

            toast({
                title: "Thành công",
                description: "Đã ghi nhận xuất kho vật tư thành công.",
                variant: "success",
            });
            setOpen(false);
            router.refresh();
        } catch (err: any) {
            toast({
                title: "Thao tác thất bại",
                description: err?.message || "Đã có lỗi xảy ra khi xuất kho vật tư.",
                variant: "destructive",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const activeFarm = farms.find((f) => f.id === farmId);

    return (
        <>
            {mode === "IN" ? (
                <Button
                    type="button"
                    onClick={handleOpen}
                    className="h-10 rounded-2xl bg-brand-600 px-4 font-bold text-white shadow-soft hover:bg-brand-700 transition flex items-center gap-1.5 shrink-0 text-xs sm:text-sm cursor-pointer"
                >
                    <Plus className="h-4 w-4 shrink-0" />
                    <span>Nhập vật tư</span>
                </Button>
            ) : (
                <Button
                    type="button"
                    onClick={handleOpen}
                    className="h-10 rounded-2xl bg-brand-600 px-4 font-bold text-white shadow-soft hover:bg-brand-700 transition flex items-center gap-1.5 shrink-0 text-xs sm:text-sm cursor-pointer"
                >
                    <ArrowUpFromLine className="h-4 w-4 shrink-0" />
                    <span>Xuất vật tư</span>
                </Button>
            )}

            {open &&
                typeof document !== "undefined" &&
                createPortal(
                    <div className="fixed inset-0 z-[150] flex h-full min-h-screen w-screen items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
                        <div
                            className="relative w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150 my-8"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 sm:text-xl">
                                        {mode === "IN" ? "Nhập vật tư vào kho" : "Xuất kho vật tư"}
                                    </h3>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        {mode === "IN"
                                            ? "Ghi nhận đợt nhập phân bón, thuốc BVTV hoặc thiết bị vào kho lưu trữ."
                                            : "Ghi nhận xuất kho vật tư phục vụ hoạt động canh tác tại vườn."}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    disabled={submitting}
                                    className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Form IN */}
                            {mode === "IN" ? (
                                <form onSubmit={handleSubmitIn} className="mt-5 space-y-4 text-sm">
                                    {supplies.length > 0 && (
                                        <div className="flex rounded-2xl border border-slate-200 bg-slate-50/80 p-1">
                                            <button
                                                type="button"
                                                onClick={() => setInSource("EXISTING")}
                                                className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
                                                    inSource === "EXISTING"
                                                        ? "bg-white text-brand-700 shadow-sm"
                                                        : "text-slate-600 hover:text-slate-900"
                                                }`}
                                            >
                                                Vật tư đã có trong kho
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setInSource("NEW")}
                                                className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
                                                    inSource === "NEW"
                                                        ? "bg-white text-brand-700 shadow-sm"
                                                        : "text-slate-600 hover:text-slate-900"
                                                }`}
                                            >
                                                + Thêm loại vật tư mới
                                            </button>
                                        </div>
                                    )}

                                    {inSource === "EXISTING" && supplies.length > 0 ? (
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                Chọn vật tư cần nhập thêm *
                                            </label>
                                            <select
                                                value={selectedSupplyIdIn}
                                                onChange={(e) => {
                                                    const sId = e.target.value;
                                                    setSelectedSupplyIdIn(sId);
                                                    const found = supplies.find((s) => s.id === sId);
                                                    if (found) {
                                                        setUnit(found.unit);
                                                        setUnitPrice(String(found.unitPrice || 0));
                                                    }
                                                }}
                                                className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-800 focus:border-brand-500 focus:outline-none cursor-pointer"
                                            >
                                                {supplies.map((s) => (
                                                    <option key={s.id} value={s.id}>
                                                        {s.name} ({SUPPLY_TYPE_LABELS[s.type] || s.type}) — Tồn: {s.quantity} {s.unit}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    ) : (
                                        <>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                                    Tên vật tư *
                                                </label>
                                                <Input
                                                    required
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
                                                    placeholder="Ví dụ: NPK Đầu Trâu 16-16-8, Anvil 5SC..."
                                                    className="rounded-2xl"
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                                        Phân loại *
                                                    </label>
                                                    <select
                                                        value={type}
                                                        onChange={(e) => setType(e.target.value)}
                                                        className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-800 focus:border-brand-500 focus:outline-none cursor-pointer"
                                                    >
                                                        <option value="FERTILIZER">Phân bón</option>
                                                        <option value="PESTICIDE">Thuốc BVTV</option>
                                                        <option value="EQUIPMENT">Thiết bị</option>
                                                        <option value="OTHER">Khác</option>
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                                        Thương hiệu / Hãng
                                                    </label>
                                                    <Input
                                                        value={brand}
                                                        onChange={(e) => setBrand(e.target.value)}
                                                        placeholder="Ví dụ: Đầu Trâu, Syngenta..."
                                                        className="rounded-2xl"
                                                    />
                                                </div>
                                            </div>

                                            {type === "PESTICIDE" && (
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                                            Thời gian cách ly PHI (ngày)
                                                        </label>
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            value={phiDays}
                                                            onChange={(e) => setPhiDays(e.target.value)}
                                                            placeholder="7, 14..."
                                                            className="rounded-2xl"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                                            Hoạt chất chính
                                                        </label>
                                                        <Input
                                                            value={activeIngredients}
                                                            onChange={(e) => setActiveIngredients(e.target.value)}
                                                            placeholder="Copper Hydroxide..."
                                                            className="rounded-2xl"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                Đơn vị tính *
                                            </label>
                                            <Input
                                                required
                                                disabled={inSource === "EXISTING"}
                                                value={unit}
                                                onChange={(e) => setUnit(e.target.value)}
                                                placeholder="bao, chai, gói, kg..."
                                                className="rounded-2xl"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                Số lượng nhập *
                                            </label>
                                            <Input
                                                type="number"
                                                min="0.01"
                                                step="any"
                                                required
                                                value={quantityIn}
                                                onChange={(e) => setQuantityIn(e.target.value)}
                                                className="rounded-2xl font-semibold"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                Đơn giá (đ/{unit || "ĐVT"})
                                            </label>
                                            <Input
                                                type="number"
                                                min="0"
                                                step="1000"
                                                value={unitPrice}
                                                onChange={(e) => setUnitPrice(e.target.value)}
                                                className="rounded-2xl"
                                            />
                                        </div>
                                    </div>

                                    <label className="block text-xs font-bold text-slate-700">Ngày hết hạn của lần nhập<Input type="date" value={expiryDateIn} onChange={e => setExpiryDateIn(e.target.value)} className="mt-1 rounded-xl" /></label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                Ngày nhập kho *
                                            </label>
                                            <Input
                                                type="date"
                                                required
                                                value={actionDateIn}
                                                onChange={(e) => setActionDateIn(e.target.value)}
                                                className="rounded-2xl"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                Ghi chú nhập
                                            </label>
                                            <Input
                                                value={notesIn}
                                                onChange={(e) => setNotesIn(e.target.value)}
                                                placeholder="Ví dụ: Nhập đợt vụ mới..."
                                                className="rounded-2xl"
                                            />
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex justify-end gap-2.5 border-t border-slate-100 pt-4 mt-6">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleClose}
                                            disabled={submitting}
                                            className="rounded-2xl"
                                        >
                                            Hủy
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={submitting}
                                            className="rounded-2xl bg-brand-600 px-5 font-bold text-white hover:bg-brand-700 shadow-soft"
                                        >
                                            {submitting ? (
                                                <>
                                                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                                    Đang lưu...
                                                </>
                                            ) : (
                                                "Xác nhận nhập kho"
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            ) : (
                                /* Form OUT */
                                <form onSubmit={handleSubmitOut} className="mt-5 space-y-4 text-sm">
                                    {supplies.length === 0 ? (
                                        <div className="rounded-2xl bg-amber-50 p-4 text-amber-800 text-xs font-medium border border-amber-200">
                                            Kho hiện tại chưa có mặt hàng nào để xuất kho. Vui lòng nhập vật tư trước.
                                        </div>
                                    ) : (
                                        <>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                                    Chọn vật tư trong kho *
                                                </label>
<MaterialCombobox supplies={supplies} value={selectedSupplyIdOut} onChange={setSelectedSupplyIdOut} />
                                                {selectedSupplyForOut && (
                                                    <p className="mt-1 text-xs text-slate-500">
                                                        Số lượng tồn:{" "}
                                                        <span className={`font-bold ${selectedSupplyForOut.quantity <= 2 ? "text-red-600" : "text-brand-700"}`}>
                                                            {selectedSupplyForOut.quantity} {selectedSupplyForOut.unit}
                                                        </span>
                                                        {selectedSupplyForOut.quantity <= 2 && (
                                                            <span className="ml-1 text-xs font-semibold text-red-600">(Tồn ít)</span>
                                                        )}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                                        Số lượng xuất *
                                                    </label>
                                                    <Input
                                                        type="number"
                                                        min="0.01"
                                                        max={selectedSupplyForOut?.quantity || 999999}
                                                        step="any"
                                                        required
                                                        value={quantityOut}
                                                        onChange={(e) => setQuantityOut(e.target.value)}
                                                        className="rounded-2xl font-semibold"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                                        Ngày xuất kho *
                                                    </label>
                                                    <Input
                                                        type="date"
                                                        required
                                                        value={actionDateOut}
                                                        onChange={(e) => setActionDateOut(e.target.value)}
                                                        className="rounded-2xl"
                                                    />
                                                </div>
                                            </div>

                                            {purpose === "CULTIVATION" && (
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                                            Vườn *
                                                        </label>
                                                        <select
                                                            required
                                                            value={farmId}
                                                            onChange={(e) => {
                                                                const fId = e.target.value;
                                                                setFarmId(fId);
                                                                const f = farms.find((item) => item.id === fId);
                                                                setCropSeasonId(f?.cropSeasons[0]?.id || "");
                                                            }}
                                                            className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-800 focus:border-brand-500 focus:outline-none cursor-pointer"
                                                        >
                                                            <option value="">-- Không chỉ định --</option>
                                                            {farms.map((f) => (
                                                                <option key={f.id} value={f.id}>
                                                                    {f.farmName}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                                            Niên vụ *
                                                        </label>
                                                        <select
                                                            required
                                                            value={cropSeasonId}
                                                            onChange={(e) => setCropSeasonId(e.target.value)}
                                                            disabled={!farmId}
                                                            className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-800 focus:border-brand-500 focus:outline-none cursor-pointer disabled:opacity-50"
                                                        >
                                                            <option value="">-- Không chỉ định --</option>
                                                            {(activeFarm?.cropSeasons || []).map((s) => (
                                                                <option key={s.id} value={s.id}>
                                                                    {s.name} ({s.year})
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                                        Hoạt động canh tác
                                                    </label>
                                                    <select
                                                        value={activityType}
                                                        onChange={(e) => setActivityType(e.target.value)}
                                                        className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-800 focus:border-brand-500 focus:outline-none cursor-pointer"
                                                    >
                                                        <option value="FERTILIZE">Bón phân</option>
                                                        <option value="SPRAY_PESTICIDE">Phun thuốc BVTV</option>
                                                        <option value="GARDEN_SANITATION">Vệ sinh vườn</option>
                                                        <option value="OTHER">Khác</option>
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                                        Mục đích xuất
                                                    </label>
<select required value={purpose} onChange={e => setPurpose(e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3"><option value="CULTIVATION">Phục vụ canh tác</option><option value="DISPOSAL">Hủy vật tư</option><option value="OTHER">Khác</option></select>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                                    Nội dung *
                                                </label>
                                                <Input
                                                    value={notesOut}
                                                    onChange={(e) => setNotesOut(e.target.value)}
                                                    placeholder="Nhập nội dung xuất vật tư"
                                                    className="rounded-2xl"
                                                />
                                            </div>
                                        </>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex justify-end gap-2.5 border-t border-slate-100 pt-4 mt-6">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleClose}
                                            disabled={submitting}
                                            className="rounded-2xl"
                                        >
                                            Hủy
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={submitting || supplies.length === 0}
                                            className="rounded-2xl bg-brand-600 px-5 font-bold text-white hover:bg-brand-700 shadow-soft"
                                        >
                                            {submitting ? (
                                                <>
                                                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                                    Đang lưu...
                                                </>
                                            ) : (
                                                "Xác nhận xuất kho"
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>,
                    document.body
                )}
        </>
    );
}
