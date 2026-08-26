import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSeedlings } from "@/lib/seedlings-data";
import { NurseryDashboardClient } from "@/components/nursery/NurseryDashboardClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Quản Lý Trại Giống & Đăng Bán Cây Giống | TriViet",
    description: "Trang quản trị dành cho chủ trại giống: đăng bán cây giống, cập nhật giá, quản lý tồn kho và đặc điểm cây giống.",
};

export default async function NurseryDashboardPage() {
    const session = await getServerSession(authOptions);
    const seedlings = await getSeedlings();
    const userPhone = session?.user?.phone ?? undefined;

    return (
        <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-6">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
                    <span>Hệ thống Quản lý Nhà Vườn & Trại Giống</span>
                </div>
                <h1
                    className="text-2xl font-black text-slate-950 sm:text-3xl"
                    style={{ fontFamily: "var(--font-display)" }}
                >
                    Kênh Quản Trị Trại Cây Giống
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                    Đăng bán các giống sầu riêng, cập nhật thông số kích thước, tuổi cây và quản lý số lượng khả dụng tại vườn ươm.
                </p>
            </div>

            <NurseryDashboardClient
                initialItems={seedlings}
                currentAccountPhone={userPhone}
            />
        </main>
    );
}
