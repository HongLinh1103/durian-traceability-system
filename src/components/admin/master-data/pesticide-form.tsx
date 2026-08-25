"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { pesticideBaseSchema, type PesticideInput } from "@/lib/validations/master-data";

const PROHIBITED_PESTICIDE_TYPES = [
    "Thuốc trừ sâu",
    "Thuốc bảo quản lâm sản",
    "Thuốc trừ bệnh",
    "Thuốc chuột",
    "Thuốc trừ cỏ",
] as const;

type PesticideFormProps = {
    initialData?: Partial<{ [K in keyof PesticideInput]: PesticideInput[K] | null }> & { id?: string };
    onSuccess: () => void;
    onCancel: () => void;
    inline?: boolean;
};

function createInternalCode() {
    return `BAN-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

export function PesticideForm({ initialData, onSuccess, onCancel, inline = false }: PesticideFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isEditing = Boolean(initialData?.id);
    const form = useForm<PesticideInput>({
        resolver: zodResolver(pesticideBaseSchema),
        defaultValues: {
            code: initialData?.code ?? createInternalCode(),
            pesticideName: initialData?.pesticideName ?? initialData?.activeIngredient ?? "",
            tradeName: initialData?.tradeName ?? "Tên thuốc cấm",
            activeIngredient: initialData?.activeIngredient ?? "",
            category: initialData?.category ?? "",
            imageUrls: [],
            gaccStatus: "PROHIBITED",
            isActive: initialData?.isActive ?? true,
        },
    });

    const onSubmit = form.handleSubmit(async (values) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            const pesticideName = values.pesticideName?.trim() ?? "";
            const response = await fetch(
                initialData?.id ? `/api/admin/master-data/pesticides/${initialData.id}` : "/api/admin/master-data/pesticides",
                {
                    method: isEditing ? "PATCH" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        ...values,
                        pesticideName,
                        tradeName: pesticideName,
                        activeIngredient: pesticideName,
                        gaccStatus: "PROHIBITED",
                    }),
                },
            );
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Không thể lưu chất cấm");
            form.reset({
                code: createInternalCode(),
                pesticideName: "",
                tradeName: "Tên thuốc cấm",
                        activeIngredient: "",
                category: "",
                imageUrls: [],
                gaccStatus: "PROHIBITED",
                isActive: true,
            });
            onSuccess();
        } catch (error) {
            alert(error instanceof Error ? error.message : "Không thể lưu chất cấm");
        } finally {
            setIsSubmitting(false);
        }
    });

    return (
        <div className={inline ? "rounded-3xl border border-brand-100 bg-brand-50/20 p-4 sm:p-5" : "fixed inset-0 z-[150] flex h-full min-h-screen w-screen items-start justify-center overflow-y-auto bg-slate-950/60 p-4 pt-10 backdrop-blur-sm"}>
            <div className={inline ? "w-full" : "mx-4 w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl"}>
                <div className="mb-5 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-900">{isEditing ? "Chỉnh sửa chất cấm" : "Thêm chất cấm mới"}</h3>
                    {!inline && <button type="button" onClick={onCancel} className="rounded-full p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>}
                </div>

                <form onSubmit={onSubmit} className="space-y-5">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="pesticideName">Hoạt chất/Tên thuốc BVTV *</Label>
                            <Input
                                id="pesticideName"
                                {...form.register("pesticideName", {
                                    required: true,
                                    onChange: (event) => form.setValue("activeIngredient", event.target.value, { shouldValidate: true }),
                                })}
                                placeholder="Ví dụ: Chlorpyrifos hoặc tên thuốc BVTV"
                            />
                            <input type="hidden" {...form.register("activeIngredient")} />
                            {(form.formState.errors.pesticideName || form.formState.errors.activeIngredient) && <p className="text-xs font-medium text-red-600">Hoạt chất hoặc tên thuốc không được để trống</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="category">Loại thuốc *</Label>
                            <select id="category" className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" {...form.register("category", { required: true })}>
                                <option value="">-- Chọn loại thuốc --</option>
                                {PROHIBITED_PESTICIDE_TYPES.map((category) => <option key={category} value={category}>{category}</option>)}
                            </select>
                            {form.formState.errors.category && <p className="text-xs font-medium text-red-600">Vui lòng chọn loại thuốc</p>}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        {isEditing && <Button type="button" variant="outline" onClick={onCancel}>Hủy chỉnh sửa</Button>}
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Đang lưu...</span> : isEditing ? "Cập nhật" : "Ghi nhận chất cấm"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
