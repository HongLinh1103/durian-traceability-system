"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

const actions = [
    ["WARN", "Gửi cảnh báo"], ["REQUEST_LOG_UPDATE", "Yêu cầu cập nhật nhật ký"],
    ["REQUEST_LOG_CORRECTION", "Yêu cầu chỉnh sửa nhật ký"], ["MARK_INSPECTION", "Đánh dấu cần kiểm tra"],
    ["SUSPEND", "Tạm dừng vườn"], ["ACTIVATE", "Kích hoạt lại"],
] as const;

export function GardenActions({ gardenId, status }: { gardenId: string; status: string }) {
    const router = useRouter(); const { toast } = useToast(); const [action, setAction] = useState<(typeof actions)[number][0]>(status === "SUSPENDED" ? "ACTIVATE" : "WARN"); const [reason, setReason] = useState(""); const [busy, setBusy] = useState(false);
    async function submit() { setBusy(true); try { const response = await fetch(`/api/region-manager/gardens/${gardenId}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, reason }) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.message); toast({ title: payload.message, variant: "success" }); setReason(""); router.refresh(); } catch (error) { toast({ title: "Không thể xử lý vườn", description: error instanceof Error ? error.message : "Vui lòng thử lại.", variant: "destructive" }); } finally { setBusy(false); } }
    return <section className="rounded-3xl border bg-white p-5 shadow-sm"><h2 className="text-lg font-black">Xử lý vườn</h2><p className="mt-1 text-sm text-slate-500">Mọi thao tác đều được lưu lịch sử và gửi thông báo cho nông dân.</p><div className="mt-4 grid gap-3 sm:grid-cols-[240px_1fr_auto]"><select value={action} onChange={event => setAction(event.target.value as typeof action)} className="h-11 rounded-2xl border bg-white px-3 text-sm">{actions.filter(([value]) => status === "SUSPENDED" ? value === "ACTIVATE" || value === "WARN" : value !== "ACTIVATE").map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><Textarea value={reason} onChange={event => setReason(event.target.value)} placeholder="Nhập lý do hoặc nội dung yêu cầu..." className="min-h-11" /><Button disabled={busy || reason.trim().length < 3} onClick={() => void submit()}>Xác nhận</Button></div></section>;
}
