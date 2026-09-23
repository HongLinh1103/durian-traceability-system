import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { ChinaPortView } from "@/components/china-port/china-port-view";
import { authOptions } from "@/lib/auth";

export const metadata: Metadata = {
    title: "China Port - Tra Cứu Mã Số Vùng Trồng & Cơ Sở Đóng Gói (GACC)",
    description: "Tra cứu dữ liệu chính thức từ Tổng cục Hải quan Trung Quốc (GACC - scintl.chinaport.gov.cn) phục vụ xuất khẩu sầu riêng và nông sản chính ngạch.",
};

export default async function ChinaPortPage() {
    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.role === "ADMIN";
    return (
        <main className="min-h-screen bg-slate-50/50 py-8">
            <div className="container mx-auto max-w-[1650px] px-3 sm:px-6">
                <ChinaPortView
                    canConfigureNotifications={isAdmin}
                    adminEmail={isAdmin ? session.user.email || "" : ""}
                    adminPhone={isAdmin ? session.user.phone || "" : ""}
                />
            </div>
        </main>
    );
}
