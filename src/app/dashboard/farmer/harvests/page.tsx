import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ClipboardPlus, Plus, Sparkles } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { FarmerHarvests } from "@/components/farmer-harvests";

export const dynamic = "force-dynamic";

export default async function Page() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "FARMER") redirect("/login");
    const rows = await prisma.harvestRecord.findMany({
        where: { farmerId: session.user.id },
        include: {
            varietyItems: true,
            farm: {
                select: {
                    id: true,
                    farmName: true,
                    farmCode: true,
                    address: true,
                    durianVariety: true,
                },
            },
            buyerFacility: {
                select: {
                    id: true,
                    name: true,
                    phone: true,
                    province: true,
                    ward: true,
                },
            },
        },
        orderBy: { createdAt: "desc" },
    });

    return (
        <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
            {/* Top Header without button */}
            <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-700">
                    <Sparkles className="h-3.5 w-3.5" />
                    Kế hoạch & Sản lượng
                </span>
                <h1 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">Phiếu thu hoạch</h1>
                <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                    Theo dõi tiến độ, khối lượng thực tế và kết nối giao nhận với bên thu mua.
                </p>
            </header>

            {/* Center Action Banner for Creating Ticket */}
            <section className="flex flex-col items-center justify-center rounded-3xl border border-brand-200 bg-gradient-to-b from-brand-50/70 to-white p-6 text-center shadow-sm">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 shadow-soft">
                    <ClipboardPlus className="h-7 w-7" />
                </div>
                <h2 className="mt-3 text-lg font-black text-slate-900 sm:text-xl">
                    Tạo phiếu thu hoạch mới
                </h2>
                <p className="mt-1 max-w-md text-xs text-slate-600 sm:text-sm">
                    Khởi tạo phiếu thu hoạch để ghi nhận giống sầu riêng, khối lượng dự kiến và gửi xác nhận tới bên thu mua.
                </p>
                <Button asChild className="mt-4 h-12 rounded-2xl bg-brand-600 px-8 font-bold text-white hover:bg-brand-700 shadow-soft">
                    <Link href="/harvests/new" className="inline-flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        <span>Tạo phiếu</span>
                    </Link>
                </Button>
            </section>

            {/* Harvest Tickets List */}
            <section className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-base font-bold text-slate-800">
                        Danh sách phiếu đã tạo ({rows.length})
                    </h2>
                </div>
                <FarmerHarvests initial={JSON.parse(JSON.stringify(rows))} />
            </section>
        </main>
    );
}

