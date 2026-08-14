"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VietnameseDatePicker } from "@/components/ui/vietnamese-date-picker";

const fields = [
    ["representativeName", "Người đại diện"], ["representativePhone", "Số điện thoại"], ["representativeEmail", "Email"],
    ["identityNumber", "CCCD"], ["name", "Tên cửa hàng"], ["taxOrBusinessCode", "Mã số thuế/đăng ký kinh doanh"],
    ["address", "Địa chỉ"], ["latitude", "Vĩ độ"], ["longitude", "Kinh độ"], ["phone", "Điện thoại cửa hàng"],
    ["openingHours", "Giờ mở cửa"], ["issuingAuthority", "Cơ quan cấp"],
] as const;

export default function StoreOwnerRegistrationPage() {
    const [message, setMessage] = useState("");
    async function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const response = await fetch("/api/auth/register/store-owner", { method: "POST", body: new FormData(event.currentTarget) });
        const payload = await response.json(); setMessage(payload.message); if (response.ok) event.currentTarget.reset();
    }
    return <main className="mx-auto max-w-3xl px-4 py-8"><h1 className="text-3xl font-black">Đăng ký Chủ cửa hàng vật tư</h1>
        <form onSubmit={submit} className="mt-6 grid gap-4 rounded-3xl border bg-white p-6 md:grid-cols-2">
            {fields.map(([name, placeholder]) => <Input key={name} name={name} placeholder={placeholder} required={["representativeName", "representativePhone", "identityNumber", "name", "address", "phone"].includes(name)} type={["latitude", "longitude"].includes(name) ? "number" : name === "representativeEmail" ? "email" : "text"} step="any" />)}
            <Input name="password" type="password" minLength={6} required placeholder="Mật khẩu (tối thiểu 6 ký tự)" />
            <VietnameseDatePicker name="issuedAt" placeholder="Ngày cấp (dd/MM/yyyy)" /><VietnameseDatePicker name="expiresAt" placeholder="Ngày hết hạn (dd/MM/yyyy)" />
            <FileField name="signboardImage" label="Ảnh biển hiệu *" accept=".jpg,.jpeg,.png" required />
            <FileField name="businessRegistration" label="Giấy đăng ký kinh doanh *" accept=".pdf,.jpg,.jpeg,.png" required />
            <FileField name="pesticideLicense" label="Giấy phép kinh doanh thuốc BVTV" accept=".pdf,.jpg,.jpeg,.png" />
            <FileField name="specializedDocument" label="Giấy tờ chuyên ngành" accept=".pdf,.jpg,.jpeg,.png" />
            <textarea name="description" className="min-h-24 rounded-2xl border p-3 md:col-span-2" placeholder="Mô tả cửa hàng" />
            <Button className="md:col-span-2">Gửi hồ sơ chờ Admin duyệt</Button>{message && <p className="md:col-span-2">{message}</p>}
        </form>
    </main>;
}

function FileField({ name, label, accept, required = false }: { name: string; label: string; accept: string; required?: boolean }) {
    return <label className="text-sm font-semibold text-slate-700">{label}<Input name={name} type="file" accept={accept} required={required} className="mt-2" /></label>;
}
