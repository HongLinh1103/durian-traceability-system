import { FlaskConical, Leaf, Sprout } from "lucide-react";
import { MasterDataCard } from "@/components/admin/master-data/master-data-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function MasterDataOverviewPage() {
    return (
        <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
            <Card>
                <CardHeader>
                    <Badge className="w-fit">ADMIN · Hệ thống</Badge>
                    <CardTitle className="mt-3 text-3xl" style={{ fontFamily: "var(--font-display)" }}>
                        Danh mục dùng chung
                    </CardTitle>
                    <CardDescription>
                        Quản lý các danh mục dữ liệu dùng chung trong toàn hệ thống. Dữ liệu tại đây sẽ được sử dụng trong form đăng ký vườn, nhật ký canh tác, nhật ký phun thuốc và nhật ký bón phân.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-6 md:grid-cols-3">
                        <MasterDataCard
                            title="Giống sầu riêng"
                            description="Danh sách các giống sầu riêng"
                            href="/dashboard/admin/master-data/durian-varieties"
                            icon={<Sprout className="h-5 w-5" />}
                        />
                        <MasterDataCard
                            title="Thuốc BVTV"
                            description="Danh mục thuốc bảo vệ thực vật"
                            href="/dashboard/admin/master-data/pesticides"
                            icon={<FlaskConical className="h-5 w-5" />}
                        />
                        <MasterDataCard
                            title="Phân bón"
                            description="Danh mục phân bón"
                            href="/dashboard/admin/master-data/fertilizers"
                            icon={<Leaf className="h-5 w-5" />}
                        />
                    </div>
                </CardContent>
            </Card>
        </main>
    );
}
