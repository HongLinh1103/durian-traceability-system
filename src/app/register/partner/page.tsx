"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

const fields = [
    ["representativeName", "Người đại diện"], ["representativePhone", "Số điện thoại đăng nhập"], ["representativeEmail", "Email đại diện"],
    ["password", "Mật khẩu"], ["identityNumber", "CCCD"], ["identityIssuedDate", "Ngày cấp CCCD"], ["identityIssuedPlace", "Nơi cấp"],
    ["name", "Tên cơ sở"], ["organizationType", "Loại hình tổ chức"], ["taxCode", "Mã số thuế"], ["businessCode", "Mã ĐKKD"],
    ["phone", "Điện thoại cơ sở"], ["email", "Email cơ sở"], ["website", "Website"], ["province", "Tỉnh/Thành phố"], ["ward", "Phường/Xã"],
    ["address", "Địa chỉ chi tiết"], ["contactPerson", "Người phụ trách"], ["expectedCapacity", "Công suất dự kiến"], ["capacityUnit", "Đơn vị công suất"],
] as const;

export default function PartnerRegisterPage() {
    const type = useSearchParams().get("type") === "PROCESSING_FACILITY" ? "PROCESSING_FACILITY" : "COLLECTOR";
    const router = useRouter(); const { toast } = useToast(); const [busy, setBusy] = useState(false);
    async function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault(); setBusy(true); const form = new FormData(event.currentTarget); const body = Object.fromEntries(form.entries());
        Object.assign(body, { type, purchasingAreas: String(body.purchasingAreas || "").split(",").map(x => x.trim()).filter(Boolean), processingTypes: String(body.processingTypes || "").split(",").map(x => x.trim()).filter(Boolean), expectedCapacity: body.expectedCapacity ? Number(body.expectedCapacity) : undefined });
        const response = await fetch("/api/auth/register/partner", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const result = await response.json(); setBusy(false); toast({ title: response.ok ? "Đã gửi hồ sơ" : "Không thể đăng ký", description: result.message, variant: response.ok ? "success" : "destructive" });
        if (response.ok) router.push("/login");
    }
    return <main className="mx-auto max-w-5xl px-4 py-8"><Card><CardHeader><CardTitle>Đăng ký {type === "COLLECTOR" ? "Vựa / Đơn vị thu mua" : "Cơ sở chế biến"}</CardTitle></CardHeader><CardContent><form onSubmit={submit} className="grid gap-4 md:grid-cols-2">{fields.map(([name,label]) => <div key={name}><Label htmlFor={name}>{label}</Label><Input id={name} name={name} type={name === "password" ? "password" : name.includes("Date") ? "date" : name === "expectedCapacity" ? "number" : "text"} required={["representativeName","representativePhone","password","identityNumber","name","organizationType","phone","province","address"].includes(name)} /></div>)}<div><Label>Khu vực thu mua</Label><Input name="purchasingAreas" placeholder="Đồng Nai, Bình Phước" /></div>{type === "PROCESSING_FACILITY" && <div><Label>Loại hình chế biến</Label><Input name="processingTypes" placeholder="Nguyên trái, Tách múi, Cấp đông..." /></div>}<div className="md:col-span-2"><Label>Mô tả</Label><Textarea name="description" /></div><Button className="md:col-span-2" disabled={busy}>{busy ? "Đang gửi..." : "Gửi hồ sơ đăng ký"}</Button></form></CardContent></Card></main>;
}
