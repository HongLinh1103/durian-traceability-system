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
import { VietnameseDatePicker } from "@/components/ui/vietnamese-date-picker";

type Partner = { id: string; name: string; province: string; ward?: string | null; phone: string };
type Farm = { id: string; farmCode: string; farmName: string; durianVariety: string };

function getFarmVarieties(farm?: Farm) {
    return farm?.durianVariety.split(",").map(item => item.trim()).filter(Boolean) || [];
}

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
    const [varietyItems, setVarietyItems] = useState([{ durianVariety: "", expectedWeight: "" }]);
    const requiresBuyer = buyerType === "COLLECTOR" || buyerType === "PROCESSING_FACILITY";
    const selectedFarm = farms.find(farm => farm.id === requestedFarmId);
    const farmVarieties = getFarmVarieties(selectedFarm);

    useEffect(() => {
        fetch("/api/farming-logs", { cache: "no-store" })
            .then(response => response.json())
            .then(result => setFarms(result.data?.farms || []))
            .finally(() => setFarmsLoading(false));
    }, []);

    useEffect(() => {
        setVarietyItems([{ durianVariety: farmVarieties.length === 1 ? farmVarieties[0] : "", expectedWeight: "" }]);
    }, [selectedFarm?.id, selectedFarm?.durianVariety]);

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
        const form = new FormData(event.currentTarget);
        const body = Object.fromEntries(form.entries());
        if (!selectedFarm) {
            toast({ title: "Chưa xác định được vườn", description: "Vui lòng mở form từ vườn đang ghi nhật ký.", variant: "destructive" });
            return;
        }
        if (!body.expectedHarvestDate) {
            toast({ title: "Chưa chọn ngày thu hoạch", description: "Vui lòng chọn ngày dự kiến thu hoạch.", variant: "destructive" });
            return;
        }
        if (requiresBuyer && !body.buyerFacilityId) {
            toast({ title: "Chưa chọn đơn vị thu mua", description: "Vui lòng chọn tên Vựa hoặc Cơ sở chế biến.", variant: "destructive" });
            return;
        }
        if (varietyItems.some(item => !item.durianVariety || !Number(item.expectedWeight))) {
            toast({ title: "Thông tin giống chưa đầy đủ", description: "Vui lòng chọn giống và nhập khối lượng cho từng dòng.", variant: "destructive" });
            return;
        }
        if (new Set(varietyItems.map(item => item.durianVariety)).size !== varietyItems.length) {
            toast({ title: "Giống bị trùng", description: "Mỗi giống sầu riêng chỉ nên xuất hiện một lần trong phiếu.", variant: "destructive" });
            return;
        }
        Object.assign(body, {
            buyerType,
            varietyItems: varietyItems.map(item => ({ durianVariety: item.durianVariety, expectedWeight: Number(item.expectedWeight) })),
            expectedPricePerKg: body.expectedPricePerKg ? Number(body.expectedPricePerKg) : undefined,
        });
        setBusy(true);
        try {
            const response = await fetch("/api/harvests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
            const result = await response.json();
            toast({ title: response.ok ? "Đã tạo phiếu" : "Không thể tạo phiếu", description: response.ok ? result.data.code : result.message, variant: response.ok ? "success" : "destructive" });
            if (response.ok) router.push("/dashboard/farmer/harvests");
        } catch {
            toast({ title: "Không thể tạo phiếu", description: "Không thể kết nối máy chủ. Vui lòng thử lại.", variant: "destructive" });
        } finally {
            setBusy(false);
        }
    }

    return <main className="mx-auto max-w-4xl px-4 py-7"><Card><CardHeader><CardTitle>Tạo phiếu thu hoạch</CardTitle></CardHeader><CardContent>
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
            <div><Label>Vườn / Mã vùng trồng</Label><input type="hidden" name="farmId" value={requestedFarmId} readOnly /><div className="flex min-h-12 items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 font-semibold text-slate-700">{farmsLoading ? "Đang tải thông tin vườn..." : selectedFarm ? `${selectedFarm.farmCode} · ${selectedFarm.farmName}` : "Không xác định được vườn đang ghi nhật ký"}</div>{!farmsLoading && !selectedFarm && <p className="mt-1 text-sm text-red-600">Vui lòng quay lại trang ghi nhật ký, chọn mã MSVT rồi tạo phiếu từ mục “Chuẩn bị thu hoạch”.</p>}</div>
            <div><Label>Ngày dự kiến thu hoạch</Label><VietnameseDatePicker name="expectedHarvestDate" required /></div>
            <div className="space-y-3 md:col-span-2"><div className="flex items-center justify-between gap-3"><div><Label>Các giống sầu riêng thu hoạch</Label><p className="text-sm text-slate-500">Nhập khối lượng dự kiến riêng cho từng giống.</p></div><select name="weightUnit" className="min-h-11 rounded-2xl border px-3"><option>kg</option><option>tấn</option></select></div>{varietyItems.map((item, index) => <div key={index} className="grid gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3 sm:grid-cols-[1fr_1fr_auto]"><select aria-label={`Giống sầu riêng ${index + 1}`} required value={item.durianVariety} onChange={event => setVarietyItems(current => current.map((row, rowIndex) => rowIndex === index ? { ...row, durianVariety: event.target.value } : row))} className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4"><option value="">Chọn giống sầu riêng</option>{farmVarieties.map(variety => <option key={variety} value={variety} disabled={varietyItems.some((row, rowIndex) => rowIndex !== index && row.durianVariety === variety)}>{variety}</option>)}</select><Input aria-label={`Khối lượng giống ${index + 1}`} type="number" min="0.1" step="0.1" value={item.expectedWeight} onChange={event => setVarietyItems(current => current.map((row, rowIndex) => rowIndex === index ? { ...row, expectedWeight: event.target.value } : row))} placeholder="Khối lượng dự kiến" required /><Button type="button" variant="outline" disabled={varietyItems.length === 1} onClick={() => setVarietyItems(current => current.filter((_, rowIndex) => rowIndex !== index))}>Xóa</Button></div>)}<Button type="button" variant="outline" disabled={varietyItems.length >= farmVarieties.length} onClick={() => setVarietyItems(current => [...current, { durianVariety: "", expectedWeight: "" }])}>+ Thêm giống</Button><p className="text-sm font-semibold text-emerald-700">Tổng dự kiến: {varietyItems.reduce((total, item) => total + Number(item.expectedWeight || 0), 0).toLocaleString("vi-VN")}</p></div>
            <div><Label>Giá bán dự kiến (VNĐ/kg)</Label><CurrencyInput name="expectedPricePerKg" min={0} placeholder="Ví dụ: 80.000" /></div>
            <div><Label>Hình thức tiêu thụ</Label><select className="min-h-12 w-full rounded-2xl border px-4" value={buyerType} onChange={event => setBuyerType(event.target.value)}><option value="UNDETERMINED">Chưa xác định bên mua</option><option value="COLLECTOR">Bán cho Vựa / Đơn vị thu mua</option><option value="PROCESSING_FACILITY">Bán trực tiếp cho Cơ sở chế biến</option><option value="SELF_CONSUMPTION">Tự tiêu thụ / Khác</option></select></div>
            {requiresBuyer && <div className="md:col-span-2"><Label htmlFor="buyerFacilityId">{buyerType === "COLLECTOR" ? "Chọn tên Vựa / Đơn vị thu mua" : "Chọn tên Cơ sở chế biến"}</Label><select id="buyerFacilityId" name="buyerFacilityId" required disabled={partnersLoading || partners.length === 0} className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 disabled:bg-slate-100"><option value="">{partnersLoading ? "Đang tải danh sách..." : partners.length === 0 ? "Chưa có đơn vị nào đã được xác minh" : "Chọn đơn vị"}</option>{partners.map(partner => <option key={partner.id} value={partner.id}>{partner.name} · {[partner.ward, partner.province].filter(Boolean).join(", ")} · {partner.phone}</option>)}</select>{!partnersLoading && partners.length === 0 && <p className="mt-1 text-sm text-amber-700">Chỉ hiển thị các đơn vị đã được Admin phê duyệt.</p>}</div>}
            <div><Label>Phương thức giao</Label><select name="deliveryMethod" className="min-h-12 w-full rounded-2xl border px-4"><option value="">Chưa xác định</option><option value="BUYER_PICKUP">Bên mua đến vườn</option><option value="FARMER_DELIVERY">Nhà vườn giao hàng</option></select></div>
            <div className="md:col-span-2"><Label>Ghi chú giao dịch</Label><Textarea name="transactionNote" /></div>
            <Button type="submit" disabled={busy} className="md:col-span-2">{busy ? "Đang tạo..." : "Tạo phiếu thu hoạch"}</Button>
        </form>
    </CardContent></Card></main>;
}
