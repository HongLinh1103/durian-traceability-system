"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Row = { id: string; code: string; status: string; expectedHarvestDate: string; expectedWeight: string | number; weightUnit: string; actualWeight?: string | number | null; farm: { farmName: string }; buyerFacility?: { name: string } | null };
const labels: Record<string, string> = { DRAFT: "Nháp", WAITING_CONFIRMATION: "Chờ bên mua xác nhận", CONFIRMED: "Đã xác nhận", REJECTED: "Đã từ chối", HARVESTING: "Đang thu hoạch", HARVESTED: "Đã thu hoạch", DELIVERY_CONFIRMED: "Đang giao nhận", COMPLETED: "Hoàn tất", CANCELLED: "Đã hủy" };

export function FarmerHarvests({ initial }: { initial: Row[] }) {
    const [rows, setRows] = useState(initial);
    async function act(item: Row, action: string) {
        const payload: Record<string, unknown> = { action };
        if (action === "FINISH") { payload.actualTreeCount = Number(prompt("Số cây thực tế") || 0) || undefined; payload.actualFruitCount = Number(prompt("Số trái thực tế") || 0) || undefined; payload.actualWeight = Number(prompt("Khối lượng thực tế (kg)") || 0); }
        if (action === "DELIVER") payload.deliveredWeight = Number(prompt("Khối lượng giao (kg)") || item.actualWeight || 0);
        const response = await fetch(`/api/harvests/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); const result = await response.json();
        if (response.ok) setRows(current => current.map(row => row.id === item.id ? { ...row, status: result.data.status, actualWeight: result.data.actualWeight } : row)); else alert(result.message);
    }
    return <div className="space-y-4">{rows.map(item => <Card key={item.id}><CardHeader><CardTitle>{item.code} · {labels[item.status] || item.status}</CardTitle></CardHeader><CardContent className="space-y-3"><p>{item.farm.farmName} · {new Date(item.expectedHarvestDate).toLocaleDateString("vi-VN")} · {item.expectedWeight} {item.weightUnit}</p><p className="text-sm text-slate-500">Bên mua: {item.buyerFacility?.name || "Chưa xác định"}</p>{["DRAFT", "CONFIRMED"].includes(item.status) && <Button onClick={() => act(item, "START")}>Bắt đầu thu hoạch</Button>}{item.status === "HARVESTING" && <Button onClick={() => act(item, "FINISH")}>Nhập kết quả thu hoạch</Button>}{item.status === "HARVESTED" && item.buyerFacility && <Button onClick={() => act(item, "DELIVER")}>Xác nhận giao hàng</Button>}</CardContent></Card>)}{!rows.length && <p>Chưa có phiếu thu hoạch.</p>}</div>;
}
