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
    fertilizerSchema,
    FERTILIZER_TYPES,
    type FertilizerInput,
} from "@/lib/validations/master-data";

type FertilizerFormProps = {
    initialData?: Partial<{ [K in keyof FertilizerInput]: FertilizerInput[K] | null }> & { id?: string };
    onSuccess: () => void;
    onCancel: () => void;
};

export function FertilizerForm({ initialData, onSuccess, onCancel }: FertilizerFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isEditing = Boolean(initialData?.id);

    const form = useForm<FertilizerInput>({
        resolver: zodResolver(fertilizerSchema),
        defaultValues: {
            code: initialData?.code ?? "",
            name: initialData?.name ?? "",
            fertilizerType: initialData?.fertilizerType ?? "",
            brand: initialData?.brand ?? "",
            manufacturer: initialData?.manufacturer ?? "",
            nutrientComposition: initialData?.nutrientComposition ?? "",
            usageInstructions: initialData?.usageInstructions ?? "",
            recommendedDosage: initialData?.recommendedDosage ?? "",
            applicationMethod: initialData?.applicationMethod ?? "",
            notes: initialData?.notes ?? "",
            isActive: initialData?.isActive ?? true,
        },
    });

    const onSubmit = form.handleSubmit(async (values) => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            const url = isEditing
                ? `/api/admin/master-data/fertilizers/${initialData?.id}`
                : "/api/admin/master-data/fertilizers";

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
            <div className="mx-4 mb-10 w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
                <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-900">
                        {isEditing ? "Chỉnh sửa phân bón" : "Thêm phân bón mới"}
                    </h3>
                    <button onClick={onCancel} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={onSubmit} className="space-y-5">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="code">Mã phân bón *</Label>
                            <Input id="code" {...form.register("code")} placeholder="VD: FER-NPK-001" />
                            {form.formState.errors.code && (
                                <p className="text-xs font-medium text-red-600">{form.formState.errors.code.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="name">Tên phân bón *</Label>
                            <Input id="name" {...form.register("name")} placeholder="VD: NPK 20-20-15" />
                            {form.formState.errors.name && (
                                <p className="text-xs font-medium text-red-600">{form.formState.errors.name.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="fertilizerType">Loại phân bón</Label>
                            <select
                                id="fertilizerType"
                                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                                {...form.register("fertilizerType")}
                            >
                                <option value="">-- Chọn loại --</option>
                                {FERTILIZER_TYPES.map((type) => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="brand">Thương hiệu</Label>
                            <Input id="brand" {...form.register("brand")} placeholder="VD: Đầu Trâu" />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="manufacturer">Nhà sản xuất</Label>
                            <Input id="manufacturer" {...form.register("manufacturer")} placeholder="VD: Công ty Phân bón X" />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="nutrientComposition">Thành phần dinh dưỡng</Label>
                            <Input id="nutrientComposition" {...form.register("nutrientComposition")} placeholder="VD: N:20%, P:20%, K:15%" />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="recommendedDosage">Liều lượng khuyến nghị</Label>
                            <Input id="recommendedDosage" {...form.register("recommendedDosage")} placeholder="VD: 500kg/ha" />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="applicationMethod">Cách bón</Label>
                            <Input id="applicationMethod" {...form.register("applicationMethod")} placeholder="VD: Bón gốc, phun qua lá" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="usageInstructions">Hướng dẫn sử dụng</Label>
                        <Textarea id="usageInstructions" {...form.register("usageInstructions")} placeholder="Hướng dẫn sử dụng chi tiết..." />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Ghi chú</Label>
                        <Textarea id="notes" {...form.register("notes")} placeholder="Ghi chú thêm..." />
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

