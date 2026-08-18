"use client";

import Link from "next/link";
import { useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronRight, Eye, FileText, Scale, Trees, Truck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";

type Row = {
    id: string;
    code: string;
    status: string;
    expectedWeight: string | number;
    weightUnit: string;
    expectedHarvestDate: string;
    actualWeight?: string | number | null;
    farm: { farmName: string };
    buyerFacility?: { name: string } | null;
};

const labels: Record<string, string> = {
    DRAFT: "Bản nháp",
    WAITING_CONFIRMATION: "Chờ xác nhận",
    CONFIRMED: "Đã xác nhận",
    REJECTED: "Đã từ chối",
    HARVESTING: "Đang thu hoạch",
    HARVESTED: "Đã thu hoạch",
    DELIVERY_CONFIRMED: "Đã giao hàng",
    COMPLETED: "Hoàn tất",
};

type Modal = { row: Row; mode: "FINISH" | "DELIVER" } | null;

export function FarmerHarvests({ initial }: { initial: Row[] }) {
    const [rows, setRows] = useState(initial);
    const [modal, setModal] = useState<Modal>(null);
    const [busy, setBusy] = useState(false);
    const [treeCount, setTreeCount] = useState("");
    const [fruitCount, setFruitCount] = useState("");
    const [weight, setWeight] = useState("");
    const [note, setNote] = useState("");
    const { toast } = useToast();

    async function send(row: Row, action: string, payload: Record<string, unknown> = {}) {
        setBusy(true);
        try {
            const response = await fetch(`/api/harvests/${row.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, ...payload }),
            });
            const result = (await response.json().catch(() => null)) as {
                success?: boolean;
                message?: string;
                data?: { status: string; actualWeight?: string | number | null };
            } | null;
            if (!response.ok || !result?.success || !result.data) {
                throw new Error(result?.message || "Không thể cập nhật phiếu.");
            }
            const updatedData = result.data;
            setRows(current =>
                current.map(item =>
                    item.id === row.id
                        ? { ...item, status: updatedData.status, actualWeight: updatedData.actualWeight }
                        : item,
                ),
            );
            setModal(null);
            toast({
                title: "Đã cập nhật phiếu thu hoạch",
                description: `Phiếu ${row.code} đã được lưu thành công.`,
                variant: "success",
            });
        } catch (error) {
            toast({
                title: "Không thể cập nhật",
                description: error instanceof Error ? error.message : "Vui lòng thử lại.",
                variant: "destructive",
            });
        } finally {
            setBusy(false);
        }
    }

    function open(row: Row, mode: "FINISH" | "DELIVER") {
        setTreeCount("");
        setFruitCount("");
        setWeight(mode === "DELIVER" ? String(row.actualWeight ?? "") : "");
        setNote("");
        setModal({ row, mode });
    }

    function submit() {
        if (!modal) return;
        const actualWeight = Number(weight);
        if (!actualWeight || actualWeight <= 0) {
            toast({
                title: "Chưa nhập khối lượng",
                description: "Khối lượng phải lớn hơn 0.",
                variant: "destructive",
            });
            return;
        }
        void send(
            modal.row,
            modal.mode,
            modal.mode === "FINISH"
                ? {
                      actualTreeCount: treeCount ? Number(treeCount) : undefined,
                      actualFruitCount: fruitCount ? Number(fruitCount) : undefined,
                      actualWeight,
                      note,
                  }
                : { deliveredWeight: actualWeight },
        );
    }

    return (
        <>
            <div className="space-y-4">
                {rows.map(item => (
                    <Card key={item.id} className="rounded-3xl border-slate-200 shadow-sm transition hover:border-brand-300">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <Link
                                href={`/dashboard/farmer/harvests/${item.id}`}
                                className="group flex items-center gap-2 hover:opacity-80 transition"
                            >
                                <FileText className="h-5 w-5 text-brand-600" />
                                <span className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-brand-700">
                                    {item.code}
                                </span>
                                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition" />
                            </Link>
                            <Badge className="bg-brand-50 text-brand-700">
                                {labels[item.status] || item.status}
                            </Badge>
                        </CardHeader>
                        <CardContent className="space-y-3 pt-1">
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-700">
                                <p>
                                    <b>Vườn:</b> {item.farm.farmName}
                                </p>
                                <p className="flex items-center gap-1 text-slate-500">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {new Date(item.expectedHarvestDate).toLocaleDateString("vi-VN")}
                                </p>
                                <p className="font-semibold text-brand-700">
                                    Dự kiến: {item.expectedWeight} {item.weightUnit}
                                </p>
                                {item.actualWeight != null && (
                                    <p className="font-semibold text-blue-700">
                                        Thực tế: {item.actualWeight} {item.weightUnit}
                                    </p>
                                )}
                            </div>

                            <p className="text-xs sm:text-sm text-slate-500">
                                <b>Bên mua:</b> {item.buyerFacility?.name || "Chưa xác định"}
                            </p>

                            <div className="flex flex-wrap items-center gap-2 pt-2">
                                <Button
                                    asChild
                                    variant="outline"
                                    size="sm"
                                    className="h-10 rounded-2xl border-slate-200 font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    <Link href={`/dashboard/farmer/harvests/${item.id}`}>
                                        <Eye className="mr-1.5 h-4 w-4 text-brand-600" />
                                        Xem chi tiết
                                    </Link>
                                </Button>

                                {["DRAFT", "CONFIRMED"].includes(item.status) && (
                                    <Button
                                        className="h-10 rounded-2xl bg-brand-600 text-white hover:bg-brand-700 shadow-soft"
                                        disabled={busy}
                                        onClick={() => void send(item, "START")}
                                    >
                                        Bắt đầu thu hoạch
                                    </Button>
                                )}
                                {item.status === "HARVESTING" && (
                                    <Button
                                        className="h-10 rounded-2xl bg-brand-600 text-white hover:bg-brand-700 shadow-soft"
                                        onClick={() => open(item, "FINISH")}
                                    >
                                        Nhập kết quả thu hoạch
                                    </Button>
                                )}
                                {item.status === "HARVESTED" && item.buyerFacility && (
                                    <Button
                                        className="h-10 rounded-2xl bg-brand-600 text-white hover:bg-brand-700 shadow-soft"
                                        onClick={() => open(item, "DELIVER")}
                                    >
                                        <Truck className="mr-1.5 h-4 w-4" />
                                        Xác nhận giao hàng
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {!rows.length && (
                    <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500">
                        <FileText className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                        <b className="text-base text-slate-700">Chưa có phiếu thu hoạch nào</b>
                        <p className="mt-1 text-sm text-slate-500">
                            Bấm vào nút “Tạo phiếu” ở phía trên để lập phiếu thu hoạch mới.
                        </p>
                    </div>
                )}
            </div>

            {modal &&
                typeof document !== "undefined" &&
                createPortal(
                    <div
                        className="fixed inset-0 z-[140] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm"
                        onMouseDown={event => {
                            if (event.target === event.currentTarget) setModal(null);
                        }}
                    >
                        <section className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4">
                            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                                <div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-brand-700">
                                        {modal.row.code}
                                    </span>
                                    <h2 className="mt-1 text-xl font-black text-slate-900">
                                        {modal.mode === "FINISH" ? "Kết quả thu hoạch" : "Xác nhận giao hàng"}
                                    </h2>
                                </div>
                                <button
                                    className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                    onClick={() => setModal(null)}
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {modal.mode === "FINISH" && (
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <Label htmlFor="actualTreeCount">Số cây thực tế</Label>
                                            <div className="relative mt-1">
                                                <Trees className="absolute left-3 top-3.5 h-4 w-4 text-brand-600" />
                                                <Input
                                                    id="actualTreeCount"
                                                    className="pl-9"
                                                    type="number"
                                                    min="0"
                                                    value={treeCount}
                                                    onChange={e => setTreeCount(e.target.value)}
                                                    placeholder="Không bắt buộc"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <Label htmlFor="actualFruitCount">Số trái thực tế</Label>
                                            <Input
                                                id="actualFruitCount"
                                                className="mt-1"
                                                type="number"
                                                min="0"
                                                value={fruitCount}
                                                onChange={e => setFruitCount(e.target.value)}
                                                placeholder="Không bắt buộc"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <Label htmlFor="actualWeight">
                                        {modal.mode === "FINISH"
                                            ? "Khối lượng thu hoạch thực tế (kg) *"
                                            : "Khối lượng giao (kg) *"}
                                    </Label>
                                    <div className="relative mt-1">
                                        <Scale className="absolute left-3 top-3.5 h-4 w-4 text-brand-600" />
                                        <Input
                                            id="actualWeight"
                                            className="pl-9"
                                            type="number"
                                            min="0.1"
                                            step="0.1"
                                            value={weight}
                                            onChange={e => setWeight(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                {modal.mode === "FINISH" && (
                                    <div>
                                        <Label htmlFor="actualNote">Ghi chú</Label>
                                        <Textarea
                                            id="actualNote"
                                            className="mt-1 min-h-20"
                                            value={note}
                                            onChange={e => setNote(e.target.value)}
                                            placeholder="Tình trạng trái, ghi chú thực tế..."
                                        />
                                    </div>
                                )}

                                <div className="flex gap-3 pt-2">
                                    <Button
                                        variant="outline"
                                        className="flex-1 h-12 rounded-2xl"
                                        onClick={() => setModal(null)}
                                    >
                                        Hủy
                                    </Button>
                                    <Button
                                        className="flex-1 h-12 rounded-2xl bg-brand-600 font-bold text-white hover:bg-brand-700 shadow-soft"
                                        disabled={busy}
                                        onClick={submit}
                                    >
                                        {busy ? "Đang lưu..." : "Lưu kết quả"}
                                    </Button>
                                </div>
                            </div>
                        </section>
                    </div>,
                    document.body,
                )}
        </>
    );
}

