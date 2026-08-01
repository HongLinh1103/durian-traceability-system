"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, Clock3, RefreshCcw, Send, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import type { ReminderRow } from "@/lib/reminders";

type AdminRemindersResponse = {
    ok: boolean;
    reminders: ReminderRow[];
    status: string;
};

function formatDate(value: string | null) {
    if (!value) {
        return "Chưa có nhật ký";
    }

    return new Date(value).toLocaleDateString("vi-VN");
}

export default function AdminRemindersPage() {
    const { toast } = useToast();
    const [reminders, setReminders] = useState<ReminderRow[]>([]);
    const [status, setStatus] = useState("Đang tải");
    const [loading, setLoading] = useState(true);

    const loadReminders = async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/admin/reminders");
            const payload = (await response.json()) as AdminRemindersResponse;
            setReminders(payload.reminders ?? []);
            setStatus(payload.status ?? "Ổn định");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadReminders();
    }, []);

    const hasWarnings = useMemo(() => reminders.length > 0, [reminders]);

    const handleSendReminder = async (farmId: string) => {
        try {
            const response = await fetch("/api/admin/reminders/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ farmId }),
            });

            const payload = (await response.json()) as { ok: boolean; message?: string; error?: string };

            if (!response.ok || !payload.ok) {
                throw new Error(payload.error ?? "Không thể gửi nhắc nhở");
            }

            toast({
                title: "Đã gửi nhắc nhở ngay",
                description: payload.message ?? "Thông báo tức thời đã được đẩy đến nông dân.",
                variant: "success",
            });

            await loadReminders();
        } catch (error) {
            toast({
                title: "Gửi nhắc nhở thất bại",
                description: error instanceof Error ? error.message : "Vui lòng thử lại.",
                variant: "destructive",
            });
        }
    };

    const handleRunCron = async () => {
        try {
            const response = await fetch("/api/cron/check-missing-logs");
            const payload = (await response.json()) as { ok: boolean; status?: string; totalOverdue?: number; error?: string };

            if (!response.ok || !payload.ok) {
                throw new Error(payload.error ?? "Không thể chạy cron");
            }

            toast({
                title: "Cron đã chạy",
                description: `${payload.status ?? "Đã cập nhật"}. Có ${payload.totalOverdue ?? 0} vườn cần nhắc nhở.`,
                variant: "success",
            });
            await loadReminders();
        } catch (error) {
            toast({
                title: "Cron thất bại",
                description: error instanceof Error ? error.message : "Không thể chạy kiểm tra nhật ký.",
                variant: "destructive",
            });
        }
    };

    return (
        <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <Badge className="w-fit">ADMIN · Cảnh báo & Theo dõi</Badge>
                            <CardTitle className="mt-3 text-3xl" style={{ fontFamily: "var(--font-display)" }}>
                                Danh sách vườn trễ nhật ký
                            </CardTitle>
                            <CardDescription>
                                Hệ thống quét các vườn chưa cập nhật log từ 2 ngày trở lên và đề xuất nhắc nhở tức thời cho nông dân.
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2 rounded-2xl bg-brand-50 px-4 py-3 text-brand-700">
                            <Bell className="h-5 w-5" />
                            <span className="text-sm font-semibold">{hasWarnings ? `${reminders.length} cảnh báo` : "0 cảnh báo"}</span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <Button onClick={handleRunCron}>
                            <RefreshCcw className="mr-2 h-4 w-4" />
                            Chạy kiểm tra ngay
                        </Button>
                        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                            Trạng thái dashboard: <span className="font-semibold text-slate-900">{loading ? "Đang tải" : status}</span>
                        </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                        {reminders.map((item) => {
                            const tone = item.daysOverdue >= 5 ? "bg-red-50 text-red-700 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200";

                            return (
                                <div key={item.farmId} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-lg font-bold text-slate-900">{item.farmName}</p>
                                            <p className="mt-1 text-sm text-slate-500">{item.farmCode} · {item.farmerName}</p>
                                        </div>
                                        <Badge className={tone}>{item.daysOverdue >= 5 ? `Trễ ${item.daysOverdue} ngày` : `Trễ ${item.daysOverdue} ngày`}</Badge>
                                    </div>

                                    <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                                        <div className="rounded-2xl bg-slate-50 p-3">
                                            <p className="flex items-center gap-2 font-semibold text-slate-900"><Clock3 className="h-4 w-4 text-brand-600" /> Nhật ký gần nhất</p>
                                            <p className="mt-1">{formatDate(item.latestLogDate)}</p>
                                        </div>
                                        <div className="rounded-2xl bg-slate-50 p-3">
                                            <p className="font-semibold text-slate-900">Số log đã có</p>
                                            <p className="mt-1">{item.logCount} bản ghi</p>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex items-center justify-between gap-3">
                                        <span className="text-sm text-slate-500">Nông dân đã lâu chưa cập nhật cần theo dõi.</span>
                                        <Button onClick={() => void handleSendReminder(item.farmId)}>
                                            <Send className="mr-2 h-4 w-4" />
                                            Gửi nhắc nhở ngay
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}

                        {!loading && reminders.length === 0 ? (
                            <div className="rounded-[28px] border border-brand-100 bg-brand-50 p-6 text-brand-800 lg:col-span-2">
                                <div className="flex items-center gap-3">
                                    <TriangleAlert className="h-5 w-5" />
                                    <p className="font-semibold">Không có vườn nào đang trễ nhật ký.</p>
                                </div>
                                <p className="mt-2 text-sm">Cron job vẫn có thể chạy định kỳ để duy trì cảnh báo nếu dữ liệu mới phát sinh.</p>
                            </div>
                        ) : null}
                    </div>
                </CardContent>
            </Card>
        </main>
    );
}
