"use client";

import { useEffect, useState } from "react";
import { Sprout, FlaskConical, Leaf } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MasterDataCard } from "@/components/admin/master-data/master-data-card";

type DataItem = { isActive: boolean };

type OverviewCounts = {
    durianVarieties: { total: number; active: number; inactive: number };
    pesticides: { total: number; active: number; inactive: number };
    fertilizers: { total: number; active: number; inactive: number };
};

async function fetchCounts(url: string): Promise<{ total: number; active: number; inactive: number }> {
    try {
        const res = await fetch(url);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
            const all = json.data as DataItem[];
            return {
                total: json.pagination?.totalItems ?? all.length,
                active: all.filter((d) => d.isActive).length,
                inactive: all.filter((d) => !d.isActive).length,
            };
        }
    } catch { }
    return { total: 0, active: 0, inactive: 0 };
}

export default function MasterDataOverviewPage() {
    const [counts, setCounts] = useState<OverviewCounts | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const [durianVarieties, pesticides, fertilizers] = await Promise.all([
                fetchCounts("/api/admin/master-data/durian-varieties?pageSize=1"),
                fetchCounts("/api/admin/master-data/pesticides?pageSize=1"),
                fetchCounts("/api/admin/master-data/fertilizers?pageSize=1"),
            ]);
            setCounts({ durianVarieties, pesticides, fertilizers });
            setLoading(false);
        };
        load();
    }, []);

    return (
        <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
            <Card>
                <CardHeader>
                    <Badge className="w-fit">ADMIN · Hệ thống</Badge>
                    <CardTitle className="mt-3 text-3xl" style={{ fontFamily: "var(--font-display)" }}>
                        Danh mục dùng chung
                    </CardTitle>
                    <CardDescription>
                        Quản lý các danh mục dữ liệu dùng chung trong toàn hệ thống.
                        Dữ liệu tại đây sẽ được sử dụng trong form đăng ký vườn, nhật ký canh tác, nhật ký phun thuốc và nhật ký bón phân.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="grid gap-6 md:grid-cols-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-52 animate-pulse rounded-3xl bg-slate-100" />
                            ))}
                        </div>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-3">
                            <MasterDataCard
                                title="Giống sầu riêng"
                                description="Danh sách các giống sầu riêng"
                                totalItems={counts?.durianVarieties.total ?? 0}
                                activeItems={counts?.durianVarieties.active ?? 0}
                                inactiveItems={counts?.durianVarieties.inactive ?? 0}
                                href="/dashboard/admin/master-data/durian-varieties"
                                icon={<Sprout className="h-5 w-5" />}
                            />
                            <MasterDataCard
                                title="Thuốc BVTV"
                                description="Danh mục thuốc bảo vệ thực vật"
                                totalItems={counts?.pesticides.total ?? 0}
                                activeItems={counts?.pesticides.active ?? 0}
                                inactiveItems={counts?.pesticides.inactive ?? 0}
                                href="/dashboard/admin/master-data/pesticides"
                                icon={<FlaskConical className="h-5 w-5" />}
                            />
                            <MasterDataCard
                                title="Phân bón"
                                description="Danh mục phân bón"
                                totalItems={counts?.fertilizers.total ?? 0}
                                activeItems={counts?.fertilizers.active ?? 0}
                                inactiveItems={counts?.fertilizers.inactive ?? 0}
                                href="/dashboard/admin/master-data/fertilizers"
                                icon={<Leaf className="h-5 w-5" />}
                            />
                        </div>
                    )}
                </CardContent>
            </Card>
        </main>
    );
}

