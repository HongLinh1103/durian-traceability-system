"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { CurrencyInput } from "@/components/ui/currency-input";

type Partner = { id: string; name: string; province: string; ward?: string | null; phone: string };
type Farm = { id: string; farmCode: string; farmName: string };

export default function NewHarvestPage() {
    const router = useRouter();
    const query = useSearchParams();
    const { toast } = useToast();
    const requestedFarmId = query.get("gardenId") || "";
    const [buyerType, setBuyerType] = useState("UNDETERMINED");
    const [partners, setPartners] = useState<Partner[]>([]);
    const [farms, setFarms] = useState<Farm[]>([]);
    const [farmsLoading, setFarmsLoading] = useState(true);
    const [partnersLoading, setPartnersLoading] = useState(false);
    const [busy, setBusy] = useState(false);
    const requiresBuyer = buyerType === "COLLECTOR" || buyerType === "PROCESSING_FACILITY";
    const selectedFarm = farms.find(farm => farm.id === requestedFarmId);

    useEffect(() => {
        fetch("/api/farming-logs", { cache: "no-store" })
            .then(response => response.json())
            .then(result => setFarms(result.data?.farms || []))
            .finally(() => setFarmsLoading(false));
    }, []);

    useEffect(() => {
        if (!requiresBuyer) {
            setPartners([]);
            setPartnersLoading(false);
            return;
        }
        setPartnersLoading(true);
        fetch(`/api/partners?type=${buyerType}`, { cache: "no-store" })
            .then(response => response.json())
            .then(result => setPartners(result.data || []))
            .finally(() => setPartnersLoading(false));
    }, [buyerType, requiresBuyer]);

    async function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setBusy(true);
        const form = new FormData(event.currentTarget);
        const body = Object.fromEntries(form.entries());
        Object.assign(body, {
            buyerType,
            expectedWeight: Number(body.expectedWeight),
            expectedPricePerKg: body.expectedPricePerKg ? Number(body.expectedPricePerKg) : undefined,
        });
        const response = await fetch("/api/harvests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const result = await response.json();
        setBusy(false);
        toast({ title: response.ok ? "Đã tạo phiếu" : "Không thể tạo phiếu", description: response.ok ? result.data.code : result.message, variant: response.ok ? "success" : "destructive" });
        if (response.ok) router.push("/dashboard/farmer/harvests");
    }

    return <main className="mx-auto max-w-4xl px-4 py-7"><Card><CardHeader><CardTitle>Tạo phiếu thu hoạch</CardTitle></CardHeader><CardContent>
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
            <div><Label>Vườn / Mã vùng trồng</Label><input type="hidden" name="farmId" value={requestedFarmId} readOnly /><div className="flex min-h-12 items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 font-semibold text-slate-700">{farmsLoading ? "Đang tải thông tin vườn..." : selectedFarm ? `${selectedFarm.farmCode} · ${selectedFarm.farmName}` : "Không xác định được vườn đang ghi nhật ký"}</div>{!farmsLoading && !selectedFarm && <p className="mt-1 text-sm text-red-600">Vui lòng quay lại trang ghi nhật ký, chọn mã MSVT rồi tạo phiếu từ mục “Chuẩn bị thu hoạch”.</p>}</div>
            <div><Label>Ngày dự kiến thu hoạch</Label><Input name="expectedHarvestDate" type="date" required /></div>
            <div><Label>Khối lượng dự kiến</Label><div className="flex gap-2"><Input name="expectedWeight" type="number" min="0.1" step="0.1" required /><select name="weightUnit" className="rounded-2xl border px-3"><option>kg</option><option>tấn</option></select></div></div>
            <div><Label>Giá bán dự kiến (VNĐ/kg)</Label><CurrencyInput name="expectedPricePerKg" min={0} placeholder="Ví dụ: 80.000" /></div>
            <div><Label>Hình thức tiêu thụ</Label><select className="min-h-12 w-full rounded-2xl border px-4" value={buyerType} onChange={event => setBuyerType(event.target.value)}><option value="UNDETERMINED">Chưa xác định bên mua</option><option value="COLLECTOR">Bán cho Vựa / Đơn vị thu mua</option><option value="PROCESSING_FACILITY">Bán trực tiếp cho Cơ sở chế biến</option><option value="SELF_CONSUMPTION">Tự tiêu thụ / Khác</option></select></div>
            <div><Label>Ngày bên mua dự kiến đến</Label><Input name="expectedBuyerArrivalDate" type="date" /></div>
            {requiresBuyer && <div className="md:col-span-2"><Label htmlFor="buyerFacilityId">{buyerType === "COLLECTOR" ? "Chọn tên Vựa / Đơn vị thu mua" : "Chọn tên Cơ sở chế biến"}</Label><select id="buyerFacilityId" name="buyerFacilityId" required disabled={partnersLoading || partners.length === 0} className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 disabled:bg-slate-100"><option value="">{partnersLoading ? "Đang tải danh sách..." : partners.length === 0 ? "Chưa có đơn vị nào đã được xác minh" : "Chọn đơn vị"}</option>{partners.map(partner => <option key={partner.id} value={partner.id}>{partner.name} · {[partner.ward, partner.province].filter(Boolean).join(", ")} · {partner.phone}</option>)}</select>{!partnersLoading && partners.length === 0 && <p className="mt-1 text-sm text-amber-700">Chỉ hiển thị các đơn vị đã được Admin phê duyệt.</p>}</div>}
            <div><Label>Phương thức giao</Label><select name="deliveryMethod" className="min-h-12 w-full rounded-2xl border px-4"><option value="">Chưa xác định</option><option value="BUYER_PICKUP">Bên mua đến vườn</option><option value="FARMER_DELIVERY">Nhà vườn giao hàng</option></select></div>
            <div className="md:col-span-2"><Label>Ghi chú giao dịch</Label><Textarea name="transactionNote" /></div>
            <Button disabled={busy || !selectedFarm || (requiresBuyer && partners.length === 0)} className="md:col-span-2">{busy ? "Đang tạo..." : "Tạo phiếu thu hoạch"}</Button>
        </form>
    </CardContent></Card></main>;
}
