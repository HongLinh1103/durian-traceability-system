"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { durianVarietySchema, type DurianVarietyInput } from "@/lib/validations/master-data";

type DurianVarietyFormProps = {
    initialData?: Partial<{ [K in keyof DurianVarietyInput]: DurianVarietyInput[K] | null }> & { id?: string };
    onSuccess: () => void;
    onCancel: () => void;
};

export function DurianVarietyForm({ initialData, onSuccess, onCancel }: DurianVarietyFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const editingId = initialData?.id;
    const isEditing = Boolean(editingId);

    const form = useForm<DurianVarietyInput>({
        resolver: zodResolver(durianVarietySchema),
        defaultValues: {
            code: initialData?.code ?? "",
            name: initialData?.name ?? "",
            scientificName: initialData?.scientificName ?? "",
            description: initialData?.description ?? "",
            origin: initialData?.origin ?? "",
            averageHarvestDays: initialData?.averageHarvestDays ?? undefined,
            isActive: initialData?.isActive ?? true,
        },
    });

    const onSubmit = form.handleSubmit(async (values) => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            const url = isEditing && editingId
                ? `/api/admin/master-data/durian-varieties/${editingId}`
                : "/api/admin/master-data/durian-varieties";

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
                        {isEditing ? "Chỉnh sửa giống sầu riêng" : "Thêm giống sầu riêng mới"}
                    </h3>
                    <button onClick={onCancel} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={onSubmit} className="space-y-5">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="code">Mã giống *</Label>
                            <Input id="code" {...form.register("code")} placeholder="VD: RI6" />
                            {form.formState.errors.code && (
                                <p className="text-xs font-medium text-red-600">{form.formState.errors.code.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="name">Tên giống *</Label>
                            <Input id="name" {...form.register("name")} placeholder="VD: Ri6" />
                            {form.formState.errors.name && (
                                <p className="text-xs font-medium text-red-600">{form.formState.errors.name.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="scientificName">Tên khoa học</Label>
                            <Input id="scientificName" {...form.register("scientificName")} placeholder="VD: Durio zibethinus" />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="origin">Nguồn gốc</Label>
                            <Input id="origin" {...form.register("origin")} placeholder="VD: Việt Nam" />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="averageHarvestDays">Số ngày thu hoạch trung bình</Label>
                            <Input id="averageHarvestDays" type="number" min="1" {...form.register("averageHarvestDays")} placeholder="VD: 120" />
                            {form.formState.errors.averageHarvestDays && (
                                <p className="text-xs font-medium text-red-600">{form.formState.errors.averageHarvestDays.message}</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Mô tả</Label>
                        <Textarea id="description" {...form.register("description")} placeholder="Mô tả đặc điểm giống sầu riêng..." />
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

