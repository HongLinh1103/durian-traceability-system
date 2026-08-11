"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type HarvestRow = { id: string; code: string; status: string; expectedWeight: string | number; weightUnit: string; expectedHarvestDate: string; farm: { farmName: string; address: string; durianVariety: string } };

export function PartnerHarvests({ initial }: { initial: HarvestRow[] }) {
    const [rows, setRows] = useState(initial);
    async function act(id: string, action: string) {
        const reason = action === "REJECT" ? prompt("Lý do từ chối") || "" : undefined;
        const receivedWeight = action === "RECEIVE" ? Number(prompt("Khối lượng thực nhận (kg)") || 0) : undefined;
        const response = await fetch(`/api/harvests/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, reason, receivedWeight }) });
        if (response.ok) { const result = await response.json(); setRows(current => current.map(item => item.id === id ? { ...item, status: result.data.status } : item)); }
    }
    return <section className="space-y-4"><h2 className="text-2xl font-bold">Phiếu thu hoạch được gửi đến</h2>{rows.map(item => <Card key={item.id}><CardHeader><CardTitle>{item.code} · {item.status}</CardTitle></CardHeader><CardContent className="space-y-3"><p>{item.farm.farmName} · {item.farm.address}</p><p>{item.farm.durianVariety} · {item.expectedWeight} {item.weightUnit} · {new Date(item.expectedHarvestDate).toLocaleDateString("vi-VN")}</p>{item.status === "WAITING_CONFIRMATION" && <div className="flex gap-2"><Button onClick={() => act(item.id, "CONFIRM")}>Quan tâm / Xác nhận</Button><Button variant="outline" onClick={() => act(item.id, "REJECT")}>Từ chối</Button></div>}{["HARVESTED", "DELIVERY_CONFIRMED"].includes(item.status) && <Button onClick={() => act(item.id, "RECEIVE")}>Xác nhận đã nhận</Button>}</CardContent></Card>)}{!rows.length && <p>Chưa có phiếu mới.</p>}</section>;
}
