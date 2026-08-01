"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    pesticideBaseSchema,
    GACC_STATUS_OPTIONS,
    PESTICIDE_CATEGORIES,
    type PesticideInput,
} from "@/lib/validations/master-data";

type PesticideFormProps = {
    initialData?: Partial<{ [K in keyof PesticideInput]: PesticideInput[K] | null }> & { id?: string };
    onSuccess: () => void;
    onCancel: () => void;
};

export function PesticideForm({ initialData, onSuccess, onCancel }: PesticideFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isEditing = Boolean(initialData?.id);

    const form = useForm<PesticideInput>({
        resolver: zodResolver(pesticideBaseSchema),
        defaultValues: {
            code: initialData?.code ?? "",
            tradeName: initialData?.tradeName ?? "",
            activeIngredient: initialData?.activeIngredient ?? "",
            category: initialData?.category ?? "",
            manufacturer: initialData?.manufacturer ?? "",
            registrationNumber: initialData?.registrationNumber ?? "",
            gaccStatus: initialData?.gaccStatus ?? "UNKNOWN",
            localStatus: initialData?.localStatus ?? "",
            usagePurpose: initialData?.usagePurpose ?? "",
            recommendedDosage: initialData?.recommendedDosage ?? "",
            phiDays: initialData?.phiDays ?? undefined,
            notes: initialData?.notes ?? "",
            sourceReference: initialData?.sourceReference ?? "",
            effectiveFrom: initialData?.effectiveFrom ?? "",
            effectiveTo: initialData?.effectiveTo ?? "",
            isActive: initialData?.isActive ?? true,
        },
    });

    const gaccStatus = form.watch("gaccStatus");
    const isProhibited = gaccStatus === "PROHIBITED";

    const onSubmit = form.handleSubmit(async (values) => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            // Xóa cảnh báo nếu không bị cấm
            if (!isProhibited && initialData?.notes && values.notes === initialData.notes) {
                // giữ nguyên notes
            }

            const url = initialData?.id
                ? `/api/admin/master-data/pesticides/${initialData.id}`
                : "/api/admin/master-data/pesticides";

            const method = isEditing ? "PATCH" : "POST";

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Có lỗi xảy ra");
            }

            form.reset();
            onSuccess();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Không thể lưu dữ liệu";
            alert(message);
        } finally {
            setIsSubmitting(false);
        }
    });

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 pt-10 backdrop-blur-sm">
            <div className="mx-4 mb-10 w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl">
                <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-900">
                        {isEditing ? "Chỉnh sửa thuốc BVTV" : "Thêm thuốc BVTV mới"}
                    </h3>
                    <button onClick={onCancel} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {isProhibited && (
                    <div className="mb-4 rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        <p className="font-semibold">Cảnh báo: Thuốc này đang được đánh dấu là BỊ CẤM.</p>
                        <p className="mt-1">Thuốc sẽ không xuất hiện trong form tạo nhật ký mới. Nhật ký cũ vẫn giữ nguyên dữ liệu.</p>
                    </div>
                )}

                <form onSubmit={onSubmit} className="space-y-5">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="code">Mã thuốc *</Label>
                            <Input id="code" {...form.register("code")} placeholder="VD: PEST-001" />
                            {form.formState.errors.code && (
                                <p className="text-xs font-medium text-red-600">{form.formState.errors.code.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="tradeName">Tên thương mại *</Label>
                            <Input id="tradeName" {...form.register("tradeName")} placeholder="VD: Confidor 100SL" />
                            {form.formState.errors.tradeName && (
                                <p className="text-xs font-medium text-red-600">{form.formState.errors.tradeName.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="activeIngredient">Hoạt chất *</Label>
                            <Input id="activeIngredient" {...form.register("activeIngredient")} placeholder="VD: Imidacloprid" />
                            {form.formState.errors.activeIngredient && (
                                <p className="text-xs font-medium text-red-600">{form.formState.errors.activeIngredient.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="category">Loại thuốc</Label>
                            <select
                                id="category"
                                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                                {...form.register("category")}
                            >
                                <option value="">-- Chọn loại --</option>
                                {PESTICIDE_CATEGORIES.map((cat) => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="manufacturer">Nhà sản xuất</Label>
                            <Input id="manufacturer" {...form.register("manufacturer")} placeholder="VD: Bayer" />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="registrationNumber">Số đăng ký</Label>
                            <Input id="registrationNumber" {...form.register("registrationNumber")} placeholder="VD: 1234/BVTV" />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="gaccStatus">Trạng thái GACC *</Label>
                            <select
                                id="gaccStatus"
                                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                                {...form.register("gaccStatus")}
                            >
                                {GACC_STATUS_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                            {form.formState.errors.gaccStatus && (
                                <p className="text-xs font-medium text-red-600">{form.formState.errors.gaccStatus.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phiDays">PHI (ngày cách ly)</Label>
                            <Input id="phiDays" type="number" min="0" {...form.register("phiDays")} placeholder="VD: 14" />
                            {form.formState.errors.phiDays && (
                                <p className="text-xs font-medium text-red-600">{form.formState.errors.phiDays.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="effectiveFrom">Ngày bắt đầu hiệu lực</Label>
                            <Input id="effectiveFrom" type="date" {...form.register("effectiveFrom")} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="effectiveTo">Ngày hết hiệu lực</Label>
                            <Input id="effectiveTo" type="date" {...form.register("effectiveTo")} />
                            {form.formState.errors.effectiveTo && (
                                <p className="text-xs font-medium text-red-600">{form.formState.errors.effectiveTo.message}</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="usagePurpose">Mục đích sử dụng</Label>
                        <Input id="usagePurpose" {...form.register("usagePurpose")} placeholder="VD: Trừ sâu vẽ bùa" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="recommendedDosage">Liều lượng khuyến nghị</Label>
                        <Input id="recommendedDosage" {...form.register("recommendedDosage")} placeholder="VD: 20ml/bình 16L" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="sourceReference">Nguồn tham chiếu</Label>
                        <Input id="sourceReference" {...form.register("sourceReference")} placeholder="VD: Thông tư 10/2023" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="localStatus">Trạng thái nội bộ</Label>
                        <Input id="localStatus" {...form.register("localStatus")} placeholder="Theo quy định Việt Nam" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Ghi chú</Label>
                        <Textarea id="notes" {...form.register("notes")} placeholder={isProhibited ? "Nhập lý do cấm hoặc ghi chú..." : "Ghi chú thêm..."} />
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={onCancel}>
                            Hủy
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <span className="inline-flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Đang lưu...
                                </span>
                            ) : (
                                isEditing ? "Cập nhật" : "Thêm mới"
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

