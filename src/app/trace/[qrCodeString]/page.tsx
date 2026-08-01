"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BadgeCheck, CalendarDays, Clock3, MapPin, ScanQrCode, Trees } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { traceHistory, traceSummary } from "@/lib/mock-data";
import { buildGoogleMapsEmbed } from "@/lib/workflow";

type TraceResponse = {
    ok: boolean;
    data: {
        qrCodeString: string;
        scanCount: number;
        farmName: string;
        farmCode: string;
        latitude: number;
        longitude: number;
        packhouseName: string;
        packhouseCode: string;
        variety: string;
        gaccReady: boolean;
        mapsEmbedUrl: string;
        lastUpdatedAt: string;
        traceHistory: typeof traceHistory;
    };
};

export default function TracePage({ params }: { params: { qrCodeString: string } }) {
    const qrCodeString = decodeURIComponent(params.qrCodeString);
    const fallback = useMemo(
        () => ({
            scanCount: traceSummary.scanCount,
            farmName: traceSummary.farmName,
            farmCode: traceSummary.farmCode,
            latitude: traceSummary.latitude,
            longitude: traceSummary.longitude,
            packhouseName: traceSummary.packhouseName,
            packhouseCode: traceSummary.packhouseCode,
            variety: traceSummary.variety,
            gaccReady: traceSummary.gaccReady,
            mapsEmbedUrl: buildGoogleMapsEmbed(traceSummary.latitude, traceSummary.longitude),
            lastUpdatedAt: new Date().toISOString(),
            traceHistory,
        }),
        [],
    );
    const [record, setRecord] = useState(fallback);

    useEffect(() => {
        let isMounted = true;

        const fetchTrace = async () => {
            try {
                const response = await fetch(`/api/trace/${encodeURIComponent(qrCodeString)}`);
                if (!response.ok) {
                    throw new Error("Trace API unavailable");
                }

                const payload = (await response.json()) as TraceResponse;
                if (isMounted && payload.ok) {
                    setRecord(payload.data);
                }
            } catch {
                if (isMounted) {
                    setRecord((current) => ({ ...current, lastUpdatedAt: new Date().toISOString() }));
                }
            }
        };

        void fetchTrace();

        return () => {
            isMounted = false;
        };
    }, [qrCodeString]);

    return (
        <main className="mx-auto min-h-screen max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
            <section className="overflow-hidden rounded-[36px] border border-white/70 bg-white/90 shadow-soft backdrop-blur">
                <div className="bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.2),_transparent_40%),linear-gradient(135deg,#14532d_0%,#16a34a_45%,#dcfce7_100%)] px-6 py-8 text-white sm:px-8">
                    <div className="flex items-center gap-3 text-white/90">
                        <div className="rounded-2xl bg-white/15 p-3 backdrop-blur">
                            <Trees className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm uppercase tracking-[0.3em] text-white/70">Durian Trace</p>
                            <h1 className="text-3xl font-black" style={{ fontFamily: "var(--font-display)" }}>
                                Truy xuất nguồn gốc sầu riêng
                            </h1>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-wrap items-center gap-3">
                        <Badge className="border-white/30 bg-white/15 text-white">Đạt chuẩn GACC</Badge>
                        <Badge className="border-white/30 bg-white/15 text-white">Số lượt quét: {record.scanCount}</Badge>
                    </div>
                </div>

                <CardContent className="space-y-6 px-4 py-6 sm:px-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Card className="border-brand-100 bg-brand-50/60">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <MapPin className="h-4 w-4 text-brand-700" />
                                    Vườn trồng
                                </CardTitle>
                                <CardDescription>Thông tin MSVT, GPS và vùng canh tác</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm text-slate-700">
                                <p className="font-semibold text-slate-900">{record.farmName}</p>
                                <p>Mã MSVT: {record.farmCode}</p>
                                <p>Giống: {record.variety}</p>
                                <p>Tọa độ GPS: {record.latitude}, {record.longitude}</p>
                            </CardContent>
                        </Card>

                        <Card className="border-brand-100 bg-brand-50/60">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <ScanQrCode className="h-4 w-4 text-brand-700" />
                                    Cơ sở đóng gói
                                </CardTitle>
                                <CardDescription>Thông tin MSCSĐG và đơn vị xử lý</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm text-slate-700">
                                <p className="font-semibold text-slate-900">{record.packhouseName}</p>
                                <p>Mã MSCSĐG: {record.packhouseCode}</p>
                                <p>Mã QR: {qrCodeString}</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <Clock3 className="h-5 w-5 text-brand-600" />
                                Timeline chăm sóc và thu hoạch
                            </CardTitle>
                            <CardDescription>Lịch sử chăm sóc từ khi ra hoa đến khi thu hoạch, kèm trạng thái an toàn thực phẩm.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="relative space-y-6 pl-4 before:absolute before:left-[11px] before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-brand-200">
                                {record.traceHistory.map((item, index) => (
                                    <div key={item.title} className="relative pl-8">
                                        <span className="absolute left-0 top-1 h-6 w-6 rounded-full border-4 border-brand-50 bg-brand-600 shadow" />
                                        <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge className="bg-white text-brand-700">Bước {index + 1}</Badge>
                                                <span className="text-sm font-semibold text-slate-500">{item.time}</span>
                                            </div>
                                            <h3 className="mt-2 text-base font-bold text-slate-900">{item.title}</h3>
                                            <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid gap-4 sm:grid-cols-3">
                        {[
                            { icon: BadgeCheck, label: "Tuân thủ", value: record.gaccReady ? "GACC" : "Cảnh báo" },
                            { icon: CalendarDays, label: "Cập nhật", value: new Date(record.lastUpdatedAt).toLocaleString("vi-VN") },
                            { icon: ArrowRight, label: "Trạng thái", value: "Sẵn sàng phân phối" },
                        ].map((item) => {
                            const Icon = item.icon;
                            return (
                                <div key={item.label} className="rounded-3xl border border-brand-100 bg-white p-4 shadow-sm">
                                    <Icon className="h-5 w-5 text-brand-600" />
                                    <p className="mt-3 text-sm text-slate-500">{item.label}</p>
                                    <p className="mt-1 text-lg font-bold text-slate-900">{item.value}</p>
                                </div>
                            );
                        })}
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xl">Bản đồ vị trí vườn</CardTitle>
                            <CardDescription>Hiển thị tọa độ GPS của vườn để hỗ trợ kiểm dịch và tra cứu nhanh.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-hidden rounded-[28px] border border-brand-100">
                                <iframe title="Google Maps view" src={record.mapsEmbedUrl} className="h-72 w-full" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                            </div>
                        </CardContent>
                    </Card>
                </CardContent>
            </section>
        </main>
    );
}
