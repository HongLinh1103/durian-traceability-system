"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import QRCode from "qrcode";
import { ArrowUpRight, BadgeCheck, Printer, Scan, Warehouse } from "lucide-react";
import { batchSchema, type BatchInput } from "@/lib/validation";
import { mockBatchDefaults, mockFarms, mockPackhouses, traceSummary } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { qualityGrades } from "@/lib/constants";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { buildTraceUrl, generateTraceCode } from "@/lib/workflow";
import { registerTraceRecord } from "@/lib/trace-store";

type ChartRow = { name: string; value: number };

export default function PackhouseBatchesPage() {
    const { toast } = useToast();
    const [qrSvg, setQrSvg] = useState<string>("");
    const [generatedCode, setGeneratedCode] = useState<string>("");

    const form = useForm<BatchInput>({
        resolver: zodResolver(batchSchema),
        defaultValues: {
            ...mockBatchDefaults,
            farmId: mockFarms[0]?.id ?? "",
            packhouseId: mockPackhouses[0]?.id ?? "",
            totalWeightKg: 0,
        },
    });

    const batchPreview = useMemo(() => {
        const farm = mockFarms.find((item) => item.id === form.watch("farmId"));
        const packhouse = mockPackhouses.find((item) => item.id === form.watch("packhouseId"));
        return { farm, packhouse };
    }, [form]);

    const chartData: ChartRow[] = [
        { name: "Loại 1", value: 48 },
        { name: "Loại 2", value: 32 },
        { name: "Loại kem", value: 20 },
    ];

    const generateQr = async (value: string) => {
        const svg = await QRCode.toString(value, { type: "svg", margin: 1, width: 220, color: { dark: "#14532d", light: "#ffffff" } });
        setQrSvg(svg);
    };

    const onSubmit = form.handleSubmit(async (values) => {
        try {
            const farm = mockFarms.find((item) => item.id === values.farmId);
            const packhouse = mockPackhouses.find((item) => item.id === values.packhouseId);
            const qrCodeString = generateTraceCode();
            const traceUrl = buildTraceUrl(qrCodeString);

            await new Promise((resolve) => window.setTimeout(resolve, 500));
            setGeneratedCode(qrCodeString);
            registerTraceRecord({
                qrCodeString,
                farmName: farm?.farmName ?? traceSummary.farmName,
                farmCode: farm?.farmCode ?? traceSummary.farmCode,
                latitude: traceSummary.latitude,
                longitude: traceSummary.longitude,
                packhouseName: packhouse?.packhouseName ?? traceSummary.packhouseName,
                packhouseCode: packhouse?.packhouseCode ?? traceSummary.packhouseCode,
                variety: farm?.durianVariety ?? traceSummary.variety,
                gaccReady: true,
            });
            await generateQr(traceUrl);

            toast({
                title: "Đã sinh mã QR",
                description: "Mã truy xuất đã sẵn sàng để in tem và dán lên thùng/trái.",
                variant: "success",
            });
        } catch {
            toast({
                title: "Không thể sinh mã QR",
                description: "Vui lòng kiểm tra dữ liệu lô hàng và thử lại.",
                variant: "destructive",
            });
        }
    });

    return (
        <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="rounded-2xl bg-brand-50 p-3 text-brand-700">
                                <Warehouse className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl" style={{ fontFamily: "var(--font-display)" }}>
                                    Quản lý lô hàng & in mã QR
                                </CardTitle>
                                <CardDescription>Nhập lô sầu riêng tại vựa, phân loại chất lượng và sinh tem QR độc bản.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <form className="space-y-5" onSubmit={onSubmit}>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <Label htmlFor="farmId">Chọn mã MSVT</Label>
                                    <select id="farmId" className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" {...form.register("farmId")}>
                                        {mockFarms.map((farm) => (
                                            <option key={farm.id} value={farm.id}>
                                                {farm.farmCode} · {farm.farmName}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <Label htmlFor="packhouseId">Chọn mã MSCSĐG</Label>
                                    <select id="packhouseId" className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" {...form.register("packhouseId")}>
                                        {mockPackhouses.map((packhouse) => (
                                            <option key={packhouse.id} value={packhouse.id}>
                                                {packhouse.packhouseCode} · {packhouse.packhouseName}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <Label htmlFor="harvestDate">Ngày thu hoạch</Label>
                                    <Input id="harvestDate" type="date" {...form.register("harvestDate")} />
                                </div>
                                <div>
                                    <Label htmlFor="totalWeightKg">Tổng khối lượng (kg)</Label>
                                    <Input id="totalWeightKg" type="number" step="0.1" {...form.register("totalWeightKg")} placeholder="850" />
                                </div>
                                <div>
                                    <Label>Phân loại chất lượng</Label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {qualityGrades.map((grade) => (
                                            <button
                                                key={grade}
                                                type="button"
                                                onClick={() => form.setValue("qualityGrade", grade)}
                                                className={`rounded-3xl border px-3 py-3 text-sm font-semibold ${form.watch("qualityGrade") === grade ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-200 bg-white text-slate-700"}`}
                                            >
                                                {grade}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <Label htmlFor="status">Trạng thái lô</Label>
                                    <select id="status" className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" {...form.register("status")}>
                                        <option value="DRAFT">Nháp</option>
                                        <option value="APPROVED">Đã duyệt</option>
                                        <option value="PACKED">Đã đóng gói</option>
                                        <option value="SHIPPED">Đã xuất hàng</option>
                                    </select>
                                </div>
                            </div>

                            <Button type="submit" size="lg" className="w-full">
                                Sinh & in mã QR
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <BadgeCheck className="h-5 w-5 text-brand-600" />
                                Xem trước QR
                            </CardTitle>
                            <CardDescription>Nội dung QR dẫn đến URL truy xuất dạng /trace/[qrCodeString].</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-[28px] border border-dashed border-brand-200 bg-brand-50 p-4 text-center">
                                {qrSvg ? (
                                    <div className="mx-auto max-w-[220px]" dangerouslySetInnerHTML={{ __html: qrSvg }} />
                                ) : (
                                    <div className="space-y-3 py-8 text-brand-700">
                                        <Scan className="mx-auto h-12 w-12" />
                                        <p className="text-sm font-medium">Bấm nút sinh QR để tạo tem SVG.</p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
                                <p className="font-semibold text-slate-900">Mã vừa sinh</p>
                                <p className="mt-1 break-all">{generatedCode || "Chưa có mã"}</p>
                            </div>

                            <Button variant="outline" className="mt-4 w-full" onClick={() => window.print()}>
                                <Printer className="mr-2 h-4 w-4" />
                                In tem QR
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xl">Phân phối chất lượng</CardTitle>
                            <CardDescription>Biểu đồ minh hoạ sử dụng recharts cho phân loại trọng lượng.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-56 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" tickLine={false} axisLine={false} />
                                        <YAxis tickLine={false} axisLine={false} />
                                        <Tooltip />
                                        <Bar dataKey="value" fill="#16a34a" radius={[10, 10, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="mt-4 flex items-center gap-2 rounded-2xl bg-brand-50 px-4 py-3 text-sm text-brand-800">
                                <ArrowUpRight className="h-4 w-4" />
                                {batchPreview.farm?.farmCode ?? "MSVT"} đang được ghép với {batchPreview.packhouse?.packhouseCode ?? "MSCSĐG"}.
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
    );
}
