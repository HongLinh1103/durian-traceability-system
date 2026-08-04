"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Check, CheckCircle2, ChevronLeft, ChevronRight, FileUp, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { useToast } from "@/components/ui/toast";
import { durianVarieties } from "@/lib/constants";

const steps = ["Cá nhân & tài khoản", "Thông tin tổ chức", "Vùng trồng phụ trách"];

export default function AreaManagerRegistrationPage() {
    const { toast } = useToast();
    const [step, setStep] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [confirmation, setConfirmation] = useState(false);

    function nextStep() {
        const section = document.querySelector<HTMLElement>(`[data-registration-step="${step}"]`);
        const controls = section?.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select");
        for (const control of Array.from(controls ?? [])) {
            if (!control.checkValidity()) {
                control.reportValidity();
                return;
            }
        }
        if (step === 0) {
            if (password.length < 6) {
                toast({ title: "Mật khẩu chưa đạt yêu cầu", description: "Mật khẩu cần tối thiểu 6 ký tự.", variant: "destructive" });
                return;
            }
            if (password !== confirmPassword) {
                toast({ title: "Mật khẩu không khớp", description: "Vui lòng nhập lại mật khẩu xác nhận.", variant: "destructive" });
                return;
            }
        }
        setStep((value) => value + 1);
    }

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!confirmation || submitting) return;
        const form = new FormData(event.currentTarget);
        form.set("password", password);
        form.set("confirmPassword", confirmPassword);
        form.set("confirmation", String(confirmation));
        form.set("region", JSON.stringify({
            code: form.get("regionCode"),
            name: form.get("regionName"),
            province: form.get("regionProvince"),
            district: form.get("regionDistrict"),
            ward: form.get("regionWard"),
            areaSize: form.get("regionAreaSize"),
            farmerCount: form.get("farmerCount"),
            durianVarieties: [form.get("durianVariety")],
        }));

        setSubmitting(true);
        try {
            const response = await fetch("/api/auth/register/area-manager", { method: "POST", body: form });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.message);
            setSubmitted(true);
        } catch (error) {
            toast({
                title: "Không thể gửi hồ sơ",
                description: error instanceof Error ? error.message : "Vui lòng kiểm tra lại thông tin.",
                variant: "destructive",
            });
        } finally {
            setSubmitting(false);
        }
    }

    if (submitted) {
        return <main className="flex min-h-[75vh] items-center justify-center bg-blue-50 px-4">
            <Card className="max-w-xl text-center"><CardContent className="space-y-5 py-12">
                <CheckCircle2 className="mx-auto h-16 w-16 text-blue-600" />
                <h1 className="text-3xl font-bold">Gửi hồ sơ thành công</h1>
                <p className="text-slate-600">Hồ sơ Trưởng ban quản lý vùng trồng đã được gửi đến Admin để xác minh. Tài khoản chỉ được sử dụng sau khi phê duyệt.</p>
                <Button asChild><Link href="/login">Quay lại đăng nhập</Link></Button>
            </CardContent></Card>
        </main>;
    }

    return <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white px-4 py-8">
        <div className="mx-auto max-w-5xl">
            <div className="mb-8 grid grid-cols-3">
                {steps.map((label, index) => <div key={label} className="relative flex flex-col items-center text-center">
                    {index < 2 && <span className={`absolute left-1/2 top-5 h-0.5 w-full ${index < step ? "bg-blue-600" : "bg-slate-200"}`} />}
                    <span className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 font-bold ${index < step ? "border-blue-600 bg-blue-600 text-white" : index === step ? "border-blue-600 bg-white text-blue-700" : "border-slate-200 bg-white text-slate-400"}`}>{index < step ? <Check className="h-5 w-5" /> : index + 1}</span>
                    <span className={`mt-2 text-xs font-medium ${index <= step ? "text-blue-800" : "text-slate-400"}`}>{label}</span>
                </div>)}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{steps[step]}</CardTitle>
                    <CardDescription>
                        {step === 0 && "Nhập thông tin định danh cá nhân và tài khoản đăng nhập."}
                        {step === 1 && "Cung cấp thông tin tổ chức và tài liệu chứng minh thẩm quyền."}
                        {step === 2 && "Khai báo vùng trồng sầu riêng mà bạn trực tiếp phụ trách."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={submit} className="space-y-6" noValidate>
                        <div data-registration-step="0" className={step === 0 ? "grid gap-5 md:grid-cols-2" : "hidden"}>
                            <Field label="Họ và tên"><Input name="fullName" required minLength={2} autoComplete="name" /></Field>
                            <Field label="Số điện thoại"><Input name="phone" required inputMode="tel" pattern="0[35789][0-9]{8}" autoComplete="tel" /></Field>
                            <Field label="Email"><Input name="email" required type="email" autoComplete="email" /></Field>
                            <Field label="Số CCCD / CMND"><Input name="identityNumber" required inputMode="numeric" pattern="[0-9]{9}|[0-9]{12}" /></Field>
                            <Field label="Ngày cấp"><Input name="identityIssuedDate" required type="date" max={new Date().toISOString().slice(0, 10)} /></Field>
                            <Field label="Nơi cấp"><Input name="identityIssuedPlace" required /></Field>
                            <FileField name="identityFront" label="Ảnh mặt trước CCCD" accept="image/jpeg,image/png,image/webp" />
                            <FileField name="identityBack" label="Ảnh mặt sau CCCD" accept="image/jpeg,image/png,image/webp" />
                            <PasswordInput id="managerPassword" label="Mật khẩu" value={password} onValueChange={setPassword} helperText="Tối thiểu 6 ký tự." autoComplete="new-password" />
                            <PasswordInput id="managerConfirmPassword" label="Xác nhận mật khẩu" value={confirmPassword} onValueChange={setConfirmPassword} autoComplete="new-password" />
                        </div>

                        <div data-registration-step="1" className={step === 1 ? "grid gap-5 md:grid-cols-2" : "hidden"}>
                            <Field label="Tên Tổ chức / HTX"><Input name="organizationName" required minLength={2} /></Field>
                            <Field label="Mã số thuế / Mã số doanh nghiệp (nếu có)"><Input name="taxCode" /></Field>
                            <Field label="Chức vụ / Vai trò">
                                <select name="position" required className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm">
                                    <option value="">Chọn chức vụ</option><option>Trưởng BQL</option><option>Chủ nhiệm HTX</option><option>Giám đốc HTX</option><option>Kỹ thuật viên trưởng được ủy quyền</option>
                                </select>
                            </Field>
                            <Field label="Tỉnh / Thành phố"><Input name="officeProvince" required /></Field>
                            <Field label="Quận / Huyện"><Input name="officeDistrict" required /></Field>
                            <Field label="Xã / Phường"><Input name="officeWard" required /></Field>
                            <Field label="Ấp / Thôn, địa chỉ trụ sở chi tiết"><Input name="officeDetailedAddress" required /></Field>
                            <FileField name="authorityDocument" label="Giấy tờ chứng minh thẩm quyền" accept="application/pdf,image/jpeg,image/png,image/webp" helper="Quyết định thành lập, giấy phép HTX hoặc biên bản bổ nhiệm. Tối đa 10 MB." />
                        </div>

                        <div data-registration-step="2" className={step === 2 ? "space-y-6" : "hidden"}>
                            <div className="grid gap-5 rounded-2xl border p-5 md:grid-cols-2">
                                <Field label="Mã số vùng trồng (MSVT)"><Input name="regionCode" required /></Field>
                                <Field label="Tên vùng trồng / vùng canh tác"><Input name="regionName" required /></Field>
                                <Field label="Tỉnh / Thành phố"><Input name="regionProvince" required /></Field>
                                <Field label="Quận / Huyện"><Input name="regionDistrict" required /></Field>
                                <Field label="Xã / Phường"><Input name="regionWard" required /></Field>
                                <Field label="Tổng diện tích (ha)"><Input name="regionAreaSize" required type="number" min="0.01" step="0.01" /></Field>
                                <Field label="Số hộ nông dân / thửa đất thành viên"><Input name="farmerCount" required type="number" min="0" step="1" /></Field>
                                <Field label="Giống sầu riêng chủ lực">
                                    <select name="durianVariety" required className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm">{durianVarieties.map((item) => <option key={item}>{item}</option>)}</select>
                                </Field>
                            </div>
                            <label className="flex cursor-pointer gap-3 rounded-2xl bg-blue-50 p-4 text-sm text-blue-950">
                                <input type="checkbox" className="mt-1 h-4 w-4" checked={confirmation} onChange={(event) => setConfirmation(event.target.checked)} />
                                <span>Tôi xác nhận các thông tin và tài liệu đã cung cấp là chính xác, hợp lệ và chịu trách nhiệm về nội dung hồ sơ đăng ký.</span>
                            </label>
                        </div>

                        <div className="flex justify-between border-t pt-6">
                            {step === 0 ? <Button type="button" variant="outline" asChild><Link href="/register"><ChevronLeft className="mr-2 h-4 w-4" />Quay lại</Link></Button> : <Button type="button" variant="outline" onClick={() => setStep((value) => value - 1)}><ChevronLeft className="mr-2 h-4 w-4" />Quay lại</Button>}
                            {step < 2 ? <Button type="button" onClick={nextStep}>Tiếp tục<ChevronRight className="ml-2 h-4 w-4" /></Button> : <Button type="submit" disabled={!confirmation || submitting}>{submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Gửi hồ sơ đăng ký</Button>}
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    </main>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}

function FileField({ name, label, accept, helper }: { name: string; label: string; accept: string; helper?: string }) {
    return <Field label={label}><label className="flex min-h-11 cursor-pointer items-center rounded-2xl border border-dashed border-blue-300 bg-blue-50 px-4 text-sm text-blue-800"><FileUp className="mr-2 h-4 w-4" /><input name={name} type="file" required accept={accept} className="w-full file:mr-3 file:border-0 file:bg-transparent file:font-medium" /></label>{helper && <p className="text-xs text-slate-500">{helper}</p>}</Field>;
}
