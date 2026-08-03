"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, ChevronRight, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HeroBanner } from "@/components/home/HeroBanner";
import type { FarmerNotificationItem } from "@/lib/reminders";

type FarmerDashboardResponse = {
    ok: boolean;
    data: {
        unreadCount: number;
        shouldRemindToday: boolean;
        daysOverdue: number;
        latestLogDate: string | null;
        notifications: FarmerNotificationItem[];
        farmName: string;
        farmCode: string;
    };
};

export default function FarmerDashboardPage() {
    const [unreadCount, setUnreadCount] = useState(0);
    const [shouldRemindToday, setShouldRemindToday] = useState(true);
    const [daysOverdue, setDaysOverdue] = useState(0);
    const [farmName, setFarmName] = useState("Vườn Sầu Riêng Hợp Tác Xanh");
    const [farmCode, setFarmCode] = useState("MSVT-001");
    const [notifications, setNotifications] = useState<FarmerNotificationItem[]>([]);

    useEffect(() => {
        const loadDashboard = async () => {
            const response = await fetch("/api/dashboard/farmer");
            const payload = (await response.json()) as FarmerDashboardResponse;

            if (payload.ok) {
                setUnreadCount(payload.data.unreadCount);
                setShouldRemindToday(payload.data.shouldRemindToday);
                setDaysOverdue(payload.data.daysOverdue);
                setFarmName(payload.data.farmName);
                setFarmCode(payload.data.farmCode);
                setNotifications(payload.data.notifications);
            }
        };

        void loadDashboard();
    }, []);

    return (
        <main className="mx-auto min-h-screen max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
            <HeroBanner compact showContent={false} />

            <div className="flex items-center justify-between rounded-[28px] border border-white/70 bg-white/90 px-5 py-4 shadow-soft backdrop-blur">
                <div>
                    <p className="text-sm font-semibold text-emerald-700">Trang chủ nông dân</p>
                    <h1 className="text-2xl font-black text-slate-900" style={{ fontFamily: "var(--font-display)" }}>{farmName}</h1>
                    <p className="text-sm text-slate-500">{farmCode}</p>
                </div>
                <div className="relative">
                    <Bell className="h-7 w-7 text-brand-700" />
                    {unreadCount > 0 ? <span className="absolute -right-2 -top-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-2 text-xs font-bold text-white">{unreadCount}</span> : null}
                </div>
            </div>

            {shouldRemindToday ? (
                <Card className="border-amber-200 bg-amber-50">
                    <CardContent className="flex flex-wrap items-center justify-between gap-4 py-5">
                        <div className="flex items-start gap-3">
                            <TriangleAlert className="mt-0.5 h-5 w-5 text-amber-600" />
                            <div>
                                <p className="font-bold text-amber-900">Vườn đã {daysOverdue} ngày chưa cập nhật nhật ký!</p>
                                <p className="text-sm text-amber-800">Hệ thống đã tự động gửi nhắc nhở. Vui lòng cập nhật để bảo đảm theo dõi PHI và tuân thủ GACC.</p>
                            </div>
                        </div>
                        <Button asChild>
                            <Link href="/dashboard/farmer/logs/new">
                                Bấm vào đây để nhập
                                <ChevronRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            ) : null}

            <div>
                <Card>
                    <CardHeader>
                        <CardTitle>Cảnh báo & theo dõi</CardTitle>
                        <CardDescription>Thông báo chưa đọc và nhắc nhở cập nhật nhật ký.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {notifications.length > 0 ? (
                            notifications.map((item) => (
                                <div key={item.id} className={`rounded-3xl border p-4 ${item.isRead ? "border-slate-200 bg-white" : "border-brand-200 bg-brand-50"}`}>
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="font-semibold text-slate-900">{item.title}</p>
                                        <Badge className={item.isRead ? "bg-slate-100 text-slate-600" : "bg-amber-100 text-amber-800"}>{item.type}</Badge>
                                    </div>
                                    <p className="mt-2 text-sm text-slate-600">{item.message}</p>
                                </div>
                            ))
                        ) : (
                            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Chưa có thông báo mới.</div>
                        )}
                    </CardContent>
                </Card>

            </div>
        </main>
    );
}
