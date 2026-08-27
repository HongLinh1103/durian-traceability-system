"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import {
    Check,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Loader2,
    LocateFixed,
    Plus,
    Send,
    Trash2,
    MapPin,
    Sprout,
    Building2,
    Scale,
    Layers,
} from "lucide-react";
import { registerSchema, type RegisterInput } from "@/lib/zod-schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { useToast } from "@/components/ui/toast";

const FarmBoundaryMapPicker = dynamic(
    () => import("@/components/farm/farm-boundary-map-picker").then((mod) => mod.FarmBoundaryMapPicker),
    {
        ssr: false,
        loading: () => (
            <div className="h-[360px] w-full rounded-2xl bg-slate-900 flex flex-col items-center justify-center text-white gap-2 border border-emerald-500/30">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
                <p className="text-xs text-slate-300 font-medium">Đang tải bản đồ vệ tinh & ranh giới vườn...</p>
            </div>
        ),
    }
);

const steps = [
    "Thông tin tài khoản",
    "Thông tin vườn",
    "Kiểm tra hồ sơ",
];

const emptyFarm = {
    farmName: "",
    province: "",
    district: "",
    ward: "",
    detailedAddress: "",
    areaSize: 0,
    areaUnit: "HECTARE" as const,
    declaredArea: 0,
    mappedArea: undefined as number | undefined,
    totalTrees: 0,
    durianVarieties: [""],
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
    centerLatitude: undefined as number | undefined,
    centerLongitude: undefined as number | undefined,
    boundary: undefined as [number, number][] | undefined,
    notes: "",
    growingRegionCode: "",
    growingRegionId: "",
    growingRegionLabel: "",
};

export default function RegisterPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [step, setStep] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [locating, setLocating] = useState<number | null>(null);

    const form = useForm<RegisterInput>({
        resolver: zodResolver(registerSchema),
        mode: "onTouched",
        defaultValues: {
            role: "FARMER",
            fullName: "",
            phone: "",
            email: "",
            password: "",
            confirmPassword: "",
            province: "",
            district: "",
            ward: "",
            detailedAddress: "",
            farms: [emptyFarm],
            confirmation: false,
        },
    });
    const { fields, append, remove } = useFieldArray({ control: form.control, name: "farms" });
    const values = form.watch();

    async function next() {
        const valid =
            step === 0
                ? await form.trigger([
                      "fullName",
                      "phone",
                      "email",
                      "password",
                      "confirmPassword",
                      "province",
                      "district",
                      "ward",
                      "detailedAddress",
                  ])
                : step === 1
                  ? await form.trigger("farms")
                  : true;
        if (valid) setStep((current) => Math.min(2, current + 1));
    }

    function getCurrentLocation(index: number) {
        if (!navigator.geolocation) {
            toast({ title: "Thiết bị không hỗ trợ định vị", variant: "destructive" });
            return;
        }
        setLocating(index);
        navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
                form.setValue(`farms.${index}.latitude`, Number(coords.latitude.toFixed(7)), { shouldValidate: true });
                form.setValue(`farms.${index}.longitude`, Number(coords.longitude.toFixed(7)), { shouldValidate: true });
                setLocating(null);
            },
            (error) => {
                setLocating(null);
                toast({
                    title: "Không lấy được vị trí",
                    description: error.message || "Vui lòng cấp quyền vị trí hoặc nhập tọa độ thủ công.",
                    variant: "destructive",
                });
            },
            { enableHighAccuracy: true, timeout: 15_000 },
        );
    }

    const submit = form.handleSubmit(async (data) => {
        if (submitting) return;
        setSubmitting(true);
        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.message);
            setSubmitted(true);
        } catch (error) {
            toast({
                title: "Không thể gửi hồ sơ",
                description: error instanceof Error ? error.message : "Vui lòng thử lại.",
                variant: "destructive",
            });
        } finally {
            setSubmitting(false);
        }
    });

    if (submitted) {
        return (
            <main className="flex min-h-[75vh] items-center justify-center bg-emerald-50 px-4 py-12">
                <Card className="w-full max-w-xl text-center">
                    <CardContent className="space-y-5 py-12">
                        <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-600" />
                        <h1 className="text-3xl font-bold text-slate-900">Gửi hồ sơ thành công</h1>
                        <p className="text-slate-600">
                            Hồ sơ đăng ký đã được gửi đến Trưởng ban quản lý vùng trồng để phê duyệt.
                            Vui lòng chờ thông báo xác nhận qua số điện thoại đã đăng ký.
                        </p>
                        <Button onClick={() => router.push("/login")}>Quay lại đăng nhập</Button>
                    </CardContent>
                </Card>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gradient-to-b from-emerald-50 to-white px-4 py-8">
            <div className="mx-auto max-w-5xl">
                <div className="mb-8 grid grid-cols-3">
                    {steps.map((label, index) => (
                        <div key={label} className="relative flex flex-col items-center text-center">
                            {index < 2 && <span className={`absolute left-1/2 top-5 h-0.5 w-full ${index < step ? "bg-emerald-600" : "bg-slate-200"}`} />}
                            <span className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold ${
                                index < step ? "border-emerald-600 bg-emerald-600 text-white" :
                                index === step ? "border-emerald-600 bg-white text-emerald-700" :
                                "border-slate-200 bg-white text-slate-400"
                            }`}>
                                {index < step ? <Check className="h-5 w-5" /> : index + 1}
                            </span>
                            <span className={`mt-2 hidden text-xs font-medium sm:block ${index <= step ? "text-emerald-800" : "text-slate-400"}`}>{label}</span>
                        </div>
                    ))}
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{steps[step]}</CardTitle>
                        <CardDescription>
                            {step === 0 && "Vui lòng nhập thông tin cá nhân để tạo tài khoản nông dân."}
                            {step === 1 && "Khai báo ít nhất một vườn bạn sở hữu hoặc trực tiếp quản lý."}
                            {step === 2 && "Rà soát toàn bộ thông tin trước khi gửi hồ sơ phê duyệt."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="space-y-6">
                            {step === 0 && (
                                <div className="grid gap-5 md:grid-cols-2">
                                    <Field label="Họ và tên" error={form.formState.errors.fullName?.message}>
                                        <Input {...form.register("fullName")} autoComplete="name" />
                                    </Field>
                                    <Field label="Số điện thoại" error={form.formState.errors.phone?.message}>
                                        <Input {...form.register("phone")} inputMode="tel" autoComplete="tel" />
                                    </Field>
                                    <Field label="Email (không bắt buộc)" error={form.formState.errors.email?.message}>
                                        <Input {...form.register("email")} type="email" autoComplete="email" />
                                    </Field>
                                    <div />
                                    <PasswordInput id="password" label="Mật khẩu" value={form.watch("password")} onValueChange={(value) => form.setValue("password", value, { shouldValidate: true })} error={form.formState.errors.password?.message} helperText="Tối thiểu 6 ký tự." />
                                    <PasswordInput id="confirmPassword" label="Xác nhận mật khẩu" value={form.watch("confirmPassword")} onValueChange={(value) => form.setValue("confirmPassword", value, { shouldValidate: true })} error={form.formState.errors.confirmPassword?.message} />
                                    <Field label="Tỉnh hoặc thành phố" error={form.formState.errors.province?.message}><Input {...form.register("province")} /></Field>
                                    <Field label="Quận hoặc huyện" error={form.formState.errors.district?.message}><Input {...form.register("district")} /></Field>
                                    <Field label="Xã hoặc phường" error={form.formState.errors.ward?.message}><Input {...form.register("ward")} /></Field>
                                    <Field label="Địa chỉ cư trú chi tiết" error={form.formState.errors.detailedAddress?.message}><Input {...form.register("detailedAddress")} /></Field>
                                </div>
                            )}

                            {step === 1 && (
                                <div className="space-y-8">
                                    {fields.map((field, index) => {
                                        const error = form.formState.errors.farms?.[index];
                                        return (
                                            <section key={field.id} className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm space-y-6">
                                                {/* Card Header */}
                                                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-700 text-white font-black text-xs shadow-xs">
                                                            {index + 1}
                                                        </span>
                                                        <div>
                                                            <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase">
                                                                {values.farms[index]?.farmName || `Vườn ${index + 1}`}
                                                            </h2>
                                                            <p className="text-xs text-slate-500">
                                                                Khai báo thông tin cơ bản và vẽ ranh giới vườn trên bản đồ vệ tinh
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {fields.length > 1 && (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => remove(index)}
                                                            className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50 rounded-xl text-xs font-bold"
                                                        >
                                                            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                                            Xóa vườn
                                                        </Button>
                                                    )}
                                                </div>

                                                {/* PHẦN 1: THÔNG TIN CƠ BẢN */}
                                                <div className="space-y-4 rounded-2xl bg-slate-50/70 p-4 sm:p-5 border border-slate-200/80">
                                                    <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2.5">
                                                        <Sprout className="h-4 w-4 text-emerald-700" />
                                                        <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800">
                                                            Thông Tin Cơ Bản Vườn
                                                        </h3>
                                                    </div>

                                                    <div className="grid gap-4 md:grid-cols-2">
                                                        <Field label="Tên vườn *" error={error?.farmName?.message}>
                                                            <Input placeholder="Ví dụ: Vườn sầu riêng Minh Phát" {...form.register(`farms.${index}.farmName`)} />
                                                        </Field>
                                                        <Field label="Tỉnh hoặc thành phố *" error={error?.province?.message}>
                                                            <Input placeholder="Ví dụ: Đồng Nai" {...form.register(`farms.${index}.province`)} />
                                                        </Field>
                                                        <Field label="Quận hoặc huyện *" error={error?.district?.message}>
                                                            <Input placeholder="Ví dụ: Long Khánh" {...form.register(`farms.${index}.district`)} />
                                                        </Field>
                                                        <Field label="Xã hoặc phường *" error={error?.ward?.message}>
                                                            <Input placeholder="Ví dụ: Bình Lộc" {...form.register(`farms.${index}.ward`)} />
                                                        </Field>
                                                        <Field label="Địa chỉ chi tiết *" error={error?.detailedAddress?.message}>
                                                            <Input placeholder="Số nhà, ấp, tổ, đường..." {...form.register(`farms.${index}.detailedAddress`)} />
                                                        </Field>
                                                        <Field label="Mã vùng trồng *" error={error?.growingRegionCode?.message}>
                                                            <Input placeholder="Ví dụ: MSVT-DN-TRIAN-001" {...form.register(`farms.${index}.growingRegionCode`)} />
                                                        </Field>

                                                        {/* Giống sầu riêng */}
                                                        <div className="space-y-2 md:col-span-2">
                                                            <Label>Giống sầu riêng *</Label>
                                                            <div className="space-y-2">
                                                                {values.farms[index].durianVarieties.map((_, varietyIndex) => (
                                                                    <div key={varietyIndex} className="flex gap-2">
                                                                        <Input
                                                                            aria-label={`Giống sầu riêng ${varietyIndex + 1}`}
                                                                            placeholder="Ví dụ: Ri6, Dona, Monthong..."
                                                                            {...form.register(`farms.${index}.durianVarieties.${varietyIndex}`)}
                                                                        />
                                                                        {values.farms[index].durianVarieties.length > 1 && (
                                                                            <Button
                                                                                type="button"
                                                                                variant="outline"
                                                                                size="sm"
                                                                                className="h-11 px-3"
                                                                                title="Xóa giống này"
                                                                                aria-label="Xóa giống này"
                                                                                onClick={() => {
                                                                                    const nextVarieties = values.farms[index].durianVarieties.filter((_, currentIndex) => currentIndex !== varietyIndex);
                                                                                    form.setValue(`farms.${index}.durianVarieties`, nextVarieties, { shouldDirty: true, shouldValidate: true });
                                                                                }}
                                                                            >
                                                                                <Trash2 className="h-4 w-4" />
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <Button type="button" variant="outline" size="sm" onClick={() => form.setValue(`farms.${index}.durianVarieties`, [...values.farms[index].durianVarieties, ""], { shouldDirty: true, shouldValidate: true })}>
                                                                <Plus className="mr-2 h-4 w-4" />Thêm giống sầu riêng khác
                                                            </Button>
                                                            {error?.durianVarieties?.message && <p className="text-xs font-medium text-red-600">{String(error.durianVarieties.message)}</p>}
                                                        </div>

                                                        {/* Số cây & Diện tích khai báo */}
                                                        <Field label="Tổng số cây" error={error?.totalTrees?.message}>
                                                            <Input type="number" min="0" placeholder="Ví dụ: 120" {...form.register(`farms.${index}.totalTrees`)} />
                                                        </Field>

                                                        <div className="grid grid-cols-[1fr_150px] gap-2">
                                                            <Field label="Diện tích khai báo (Hồ sơ) *" error={error?.areaSize?.message}>
                                                                <Input
                                                                    type="number"
                                                                    min="0"
                                                                    step="0.0001"
                                                                    placeholder="Ví dụ: 1.6"
                                                                    {...form.register(`farms.${index}.areaSize`, {
                                                                        onChange: (e) => {
                                                                            form.setValue(`farms.${index}.declaredArea`, parseFloat(e.target.value) || 0);
                                                                        },
                                                                    })}
                                                                />
                                                            </Field>
                                                            <Field label="Đơn vị">
                                                                <select className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm" {...form.register(`farms.${index}.areaUnit`)}>
                                                                    <option value="HECTARE">Héc-ta (ha)</option>
                                                                    <option value="SQUARE_METER">Mét vuông (m²)</option>
                                                                </select>
                                                            </Field>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* PHẦN 2: VỊ TRÍ & RANH GIỚI VƯỜN (BẢN ĐỒ) */}
                                                <div className="space-y-4 rounded-2xl bg-white p-4 sm:p-5 border border-emerald-200/80 shadow-xs">
                                                    <FarmBoundaryMapPicker
                                                        declaredArea={values.farms[index]?.areaSize || 0}
                                                        declaredUnit={values.farms[index]?.areaUnit || "HECTARE"}
                                                        province={values.farms[index]?.province}
                                                        district={values.farms[index]?.district}
                                                        ward={values.farms[index]?.ward}
                                                        detailedAddress={values.farms[index]?.detailedAddress}
                                                        initialBoundary={values.farms[index]?.boundary as any}
                                                        initialCenter={
                                                            values.farms[index]?.latitude && values.farms[index]?.longitude
                                                                ? { lat: values.farms[index].latitude!, lng: values.farms[index].longitude! }
                                                                : null
                                                        }
                                                        onBoundaryChange={({ boundary, mappedAreaHa, mappedAreaM2, centerLat, centerLng }) => {
                                                            form.setValue(`farms.${index}.boundary`, boundary, { shouldDirty: true });
                                                            form.setValue(`farms.${index}.mappedArea`, mappedAreaHa, { shouldDirty: true });
                                                            if (centerLat && centerLng) {
                                                                form.setValue(`farms.${index}.latitude`, centerLat, { shouldValidate: true });
                                                                form.setValue(`farms.${index}.longitude`, centerLng, { shouldValidate: true });
                                                                form.setValue(`farms.${index}.centerLatitude`, centerLat);
                                                                form.setValue(`farms.${index}.centerLongitude`, centerLng);
                                                            }
                                                        }}
                                                    />

                                                    {/* Ghi chú */}
                                                    <div className="pt-2">
                                                        <Field label="Ghi chú thêm về vườn">
                                                            <textarea
                                                                className="min-h-20 w-full rounded-2xl border border-slate-200 p-3 text-sm bg-slate-50/50 focus:bg-white"
                                                                placeholder="Ghi chú thêm về địa hình, bờ bao, nguồn nước tưới hoặc thông tin đặc thù của vườn..."
                                                                {...form.register(`farms.${index}.notes`)}
                                                            />
                                                        </Field>
                                                    </div>
                                                </div>
                                            </section>
                                        );
                                    })}
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => append({ ...emptyFarm, durianVarieties: [...emptyFarm.durianVarieties] })}
                                        className="w-full sm:w-auto rounded-2xl font-bold text-xs h-11 px-5 border-dashed border-slate-300 hover:border-emerald-500 hover:text-emerald-700"
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Thêm vườn sầu riêng khác
                                    </Button>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-5">
                                    <ReviewSection title="Thông tin tài khoản" onEdit={() => setStep(0)}>
                                        <p><b>Họ tên:</b> {values.fullName}</p>
                                        <p><b>Điện thoại:</b> {values.phone}</p>
                                        <p><b>Email:</b> {values.email || "Không cung cấp"}</p>
                                        <p><b>Địa chỉ cư trú:</b> {values.detailedAddress}, {values.ward}, {values.district}, {values.province}</p>
                                    </ReviewSection>

                                    <ReviewSection title="Thông tin vườn trồng & Ranh giới bản đồ" onEdit={() => setStep(1)}>
                                        {values.farms.map((farm, index) => (
                                            <div key={index} className="border-b py-3 last:border-0 space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <b className="text-base text-slate-900">{farm.farmName}</b>
                                                    {farm.mappedArea ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5">
                                                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                                            Đã vẽ ranh giới ({farm.mappedArea} ha)
                                                        </span>
                                                    ) : (
                                                        <span className="text-[11px] text-slate-400 font-medium">Chưa vẽ ranh giới</span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-600">
                                                    <b>Diện tích khai báo (Hồ sơ):</b> {farm.areaSize} {farm.areaUnit === "HECTARE" ? "ha" : "m²"}
                                                    {farm.mappedArea ? ` · Diện tích bản đồ: ${farm.mappedArea} ha` : ""}
                                                    {` · ${farm.totalTrees} cây · Giống: ${farm.durianVarieties.filter(Boolean).join(", ")}`}
                                                </p>
                                                <p className="text-xs text-slate-600">
                                                    <b>Mã vùng trồng:</b> {farm.growingRegionCode}
                                                    {farm.latitude && farm.longitude ? ` · Tọa độ tâm GPS: ${farm.latitude}, ${farm.longitude}` : ""}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    <b>Địa chỉ vườn:</b> {farm.detailedAddress}, {farm.ward}, {farm.district}, {farm.province}
                                                </p>
                                            </div>
                                        ))}
                                    </ReviewSection>

                                    <label className="flex cursor-pointer gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-950">
                                        <input type="checkbox" className="mt-1 h-4 w-4" {...form.register("confirmation")} />
                                        <span>Tôi xác nhận các thông tin trên là chính xác và đồng ý gửi hồ sơ để xét duyệt.</span>
                                    </label>
                                    {form.formState.errors.confirmation && <p className="text-sm text-red-600">{form.formState.errors.confirmation.message}</p>}
                                </div>
                            )}

                            <div className="flex items-center justify-between border-t pt-6">
                                {step === 0 ? <Button type="button" variant="outline" asChild><Link href="/login"><ChevronLeft className="mr-2 h-4 w-4" />Quay lại đăng nhập</Link></Button> : <Button type="button" variant="outline" onClick={() => setStep((current) => current - 1)}><ChevronLeft className="mr-2 h-4 w-4" />Quay lại</Button>}
                                {step < 2 ? <Button type="button" onClick={next}>Tiếp tục<ChevronRight className="ml-2 h-4 w-4" /></Button> : <Button type="submit" disabled={submitting || !values.confirmation}>{submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Gửi hồ sơ đăng ký</Button>}
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
    return <div className="space-y-2"><Label>{label}</Label>{children}{error && <p className="text-xs font-medium text-red-600">{error}</p>}</div>;
}

function ReviewSection({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
    return <section className="rounded-2xl border p-5 text-sm text-slate-700"><div className="mb-3 flex items-center justify-between"><h2 className="text-base font-semibold text-slate-900">{title}</h2><Button type="button" variant="outline" size="sm" onClick={onEdit}>Chỉnh sửa</Button></div><div className="space-y-1">{children}</div></section>;
}
