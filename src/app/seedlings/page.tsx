import { Metadata } from "next";
import Link from "next/link";
import { Sprout, Sparkles, ShieldCheck, ChevronRight, Home, CheckCircle2, Trees } from "lucide-react";
import { getSeedlings } from "@/lib/seedlings-data";
import { SeedlingListClient } from "@/components/seedlings/SeedlingListClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Trại Giống Sầu Riêng | Danh Mục Cây Giống Chuẩn F1 TriViet",
    description:
        "Sàn giao dịch và danh mục cây giống sầu riêng Ri6, Monthong Dona, Musang King, Black Thorn từ các trại giống uy tín hàng đầu Đồng Nai và Bến Tre.",
};

export default async function SeedlingsPage() {
    const seedlings = await getSeedlings();

    return (
        <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
            {/* BREADCRUMB */}
            <nav className="mb-6 flex items-center gap-2 text-xs font-medium text-slate-500">
                <Link href="/" className="flex items-center gap-1 hover:text-brand-600 transition">
                    <Home className="h-3.5 w-3.5" />
                    Trang chủ
                </Link>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-bold text-slate-800">Trại giống sầu riêng</span>
            </nav>

            {/* HERO BANNER SECTION */}
            <div className="mb-8 overflow-hidden rounded-[32px] border border-emerald-900/30 bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 p-6 text-white shadow-xl sm:rounded-[36px] sm:p-8 md:p-10">
                <div className="max-w-3xl space-y-4">
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300 backdrop-blur">
                        <Trees className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Sàn Cây Giống TriViet</span>
                    </div>

                    <h1
                        className="text-2xl font-black leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl"
                        style={{ fontFamily: "var(--font-display)" }}
                    >
                        Cây Giống Sầu Riêng Tuyển Chọn Từ Các Trại Uy Tín
                    </h1>

                    <p className="max-w-2xl text-xs leading-relaxed text-emerald-100/80 sm:text-sm">
                        Tổng hợp các giống sầu riêng đầu dòng Ri6, Monthong (Dona), Musang King, Black Thorn ghép từ cây mẹ tuyển chọn. Đảm bảo tỷ lệ sống cao, sạch sâu bệnh, chuẩn giống 100%.
                    </p>

                    {/* Key Highlights */}
                    <div className="flex flex-wrap items-center gap-4 pt-2 text-xs font-medium text-emerald-200">
                        <span className="inline-flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                            Chuẩn giống F1 trọn đời
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <ShieldCheck className="h-4 w-4 text-emerald-400" />
                            Đã thuần nắng & xử lý nấm bệnh
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <Sparkles className="h-4 w-4 text-emerald-400" />
                            Hỗ trợ kỹ thuật trồng trọt trọn gói
                        </span>
                    </div>
                </div>
            </div>

            {/* 4 CARDS PER ROW LISTING COMPONENT */}
            <SeedlingListClient initialItems={seedlings} />
        </main>
    );
}
