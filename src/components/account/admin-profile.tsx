"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { CalendarDays, Camera, Eye, EyeOff, KeyRound, LockKeyhole, Save, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";

type AdminProfileProps = {
    fullName: string;
    phone: string;
    email: string;
    avatar: string | null;
    birthDate: string;
    gender: string;
    role: string;
    createdAt: string;
    lastLoginAt: string | null;
    passwordUpdatedAt: string | null;
};

function formatDateTime(value: string | null) {
    if (!value) return "Chưa ghi nhận";
    return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export function AdminProfile({ profile }: { profile: AdminProfileProps }) {
    const router = useRouter();
    const { toast } = useToast();
    const fileInput = useRef<HTMLInputElement>(null);
    const [saving, setSaving] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [avatar, setAvatar] = useState(profile.avatar);

    async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        const form = new FormData(event.currentTarget);
        const response = await fetch("/api/account", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "profile",
                fullName: form.get("fullName"),
                phone: form.get("phone"),
                email: form.get("email"),
                birthDate: form.get("birthDate"),
                gender: form.get("gender"),
                avatar,
            }),
        });
        const payload = await response.json();
        setSaving(false);
        if (!response.ok) return toast({ title: "Không thể lưu hồ sơ", description: payload.message, variant: "destructive" });
        toast({ title: payload.message, variant: "success" });
        router.refresh();
    }

    async function changePassword(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        const form = new FormData(event.currentTarget);
        const response = await fetch("/api/account", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "password", currentPassword: form.get("currentPassword"), newPassword: form.get("newPassword"), confirmPassword: form.get("confirmPassword") }),
        });
        const payload = await response.json();
        setSaving(false);
        if (!response.ok) return toast({ title: "Không thể đổi mật khẩu", description: payload.message, variant: "destructive" });
        toast({ title: payload.message, variant: "success" });
        setChangingPassword(false);
        router.refresh();
    }

    function selectAvatar(file?: File) {
        if (!file) return;
        if (!file.type.startsWith("image/")) return toast({ title: "Vui lòng chọn một tệp ảnh.", variant: "destructive" });
        if (file.size > 1_000_000) return toast({ title: "Ảnh không được lớn hơn 1 MB.", variant: "destructive" });
        const reader = new FileReader();
        reader.onload = () => setAvatar(String(reader.result));
        reader.readAsDataURL(file);
    }

    return (
        <main className="mx-auto max-w-6xl space-y-5 px-3 pb-28 pt-4 sm:px-6 sm:py-8">
            <header>
                <p className="text-xs font-black uppercase tracking-[.18em] text-emerald-700">Hồ sơ quản trị viên</p>
                <h1 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">Cá nhân</h1>
                <p className="mt-1 text-sm text-slate-500">Quản lý thông tin cá nhân và bảo mật tài khoản.</p>
            </header>

            <form onSubmit={saveProfile} className="space-y-5">
                <ProfileCard title="Thông tin cá nhân" icon={UserRound}>
                    <div className="mb-5 flex items-center gap-4">
                        <button type="button" onClick={() => fileInput.current?.click()} className="group relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-emerald-50 bg-emerald-100 text-emerald-700">
                            {avatar ? <Image src={avatar} alt="Ảnh đại diện" fill unoptimized className="object-cover" /> : <UserRound className="h-12 w-12" />}
                            <span className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-slate-950/60 py-1.5 text-white"><Camera className="h-4 w-4" /></span>
                        </button>
                        <div><p className="font-semibold text-slate-900">Ảnh đại diện</p><p className="mt-1 text-xs text-slate-500">JPG, PNG hoặc WEBP, tối đa 1 MB.</p><Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => fileInput.current?.click()}>Chọn ảnh</Button></div>
                        <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => selectAvatar(event.target.files?.[0])} />
                    </div>
                    <Field label="Họ và tên"><Input name="fullName" required defaultValue={profile.fullName} /></Field>
                    <div className="grid gap-4 sm:grid-cols-2"><Field label="Số điện thoại"><Input name="phone" required inputMode="tel" defaultValue={profile.phone} /></Field><Field label="Email"><Input name="email" type="email" required defaultValue={profile.email} /></Field></div>
                    <div className="grid gap-4 sm:grid-cols-2"><Field label="Ngày sinh"><Input name="birthDate" type="date" defaultValue={profile.birthDate} /></Field><Field label="Giới tính (tùy chọn)"><select name="gender" defaultValue={profile.gender} className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm shadow-sm"><option value="">Chưa chọn</option><option value="FEMALE">Nữ</option><option value="MALE">Nam</option><option value="OTHER">Khác</option></select></Field></div>
                    <Button className="mt-2 w-full sm:w-auto" disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? "Đang lưu..." : "Lưu thông tin"}</Button>
                </ProfileCard>

                <ProfileCard title="Thông tin hệ thống" icon={CalendarDays}>
                    <Info label="Vai trò hệ thống" value={profile.role} />
                    <Info label="Ngày tạo tài khoản" value={formatDateTime(profile.createdAt)} />
                    <Info label="Lần đăng nhập gần nhất" value={formatDateTime(profile.lastLoginAt)} />
                </ProfileCard>
            </form>

            <div>
                <ProfileCard title="Bảo mật" icon={LockKeyhole}>
                    <Info label="Mật khẩu" value="••••••••••••" />
                    <Info label="Cập nhật lần cuối" value={formatDateTime(profile.passwordUpdatedAt)} />
                    {!changingPassword ? <Button type="button" className="mt-3" onClick={() => setChangingPassword(true)}><KeyRound className="mr-2 h-4 w-4" />Đổi mật khẩu</Button> : (
                        <form onSubmit={changePassword} className="mt-4 space-y-4 rounded-2xl bg-slate-50 p-4">
                            <Field label="Mật khẩu hiện tại"><PasswordInput name="currentPassword" autoComplete="current-password" /></Field>
                            <Field label="Mật khẩu mới"><PasswordInput name="newPassword" autoComplete="new-password" minLength={8} /></Field>
                            <Field label="Xác nhận mật khẩu mới"><PasswordInput name="confirmPassword" autoComplete="new-password" minLength={8} /></Field>
                            <div className="flex gap-2"><Button disabled={saving}>{saving ? "Đang cập nhật..." : "Cập nhật mật khẩu"}</Button><Button type="button" variant="outline" onClick={() => setChangingPassword(false)}>Hủy</Button></div>
                        </form>
                    )}
                </ProfileCard>
            </div>
        </main>
    );
}

function ProfileCard({ title, icon: Icon, children }: { title: string; icon: typeof UserRound; children: React.ReactNode }) {
    return <Card className="rounded-3xl border-slate-100 shadow-sm"><CardHeader className="p-5 pb-3 sm:p-6 sm:pb-4"><CardTitle className="flex items-center gap-3 text-lg"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Icon className="h-5 w-5" /></span>{title}</CardTitle></CardHeader><CardContent className="space-y-4 p-5 pt-2 sm:p-6 sm:pt-2">{children}</CardContent></Card>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

function PasswordInput({ name, autoComplete, minLength }: { name: string; autoComplete: string; minLength?: number }) {
    const [visible, setVisible] = useState(false);
    return <div className="relative"><Input name={name} type={visible ? "text" : "password"} required minLength={minLength} autoComplete={autoComplete} className="pr-12" /><button type="button" onClick={() => setVisible((current) => !current)} className="absolute inset-y-0 right-1 flex w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-emerald-700" aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"} title={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>{visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div>;
}

function Info({ label, value }: { label: string; value: string }) {
    return <div className="grid gap-1 border-b border-slate-100 pb-3 text-sm last:border-0 sm:grid-cols-[180px_1fr]"><span className="text-slate-500">{label}</span><strong className="font-semibold text-slate-900">{value}</strong></div>;
}
