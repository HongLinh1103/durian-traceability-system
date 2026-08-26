import { Metadata } from "next";
import Link from "next/link";
import { Factory, Sparkles, ShieldCheck, ChevronRight, Home, Boxes, CheckCircle2 } from "lucide-react";
import { getProcessingFacilities } from "@/lib/facilities-data";
import { FacilityListClient } from "@/components/facilities/FacilityListClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Xưởng Chế biến & Đóng gói Sầu riêng | TriViet Traceability",
    description:
        "Danh sách các cơ sở, xưởng chế biến và đóng gói sầu riêng đạt tiêu chuẩn an toàn thực phẩm HACCP, ISO 22000 và mã xuất khẩu GACC liên kết với hệ thống TriViet.",
};

export default async function ProcessingFacilitiesPage() {
    const facilities = await getProcessingFacilities();

    return (
        <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
            {/* BREADCRUMB */}
            <nav className="mb-6 flex items-center gap-2 text-xs font-medium text-slate-500">
                <Link href="/" className="flex items-center gap-1 hover:text-brand-600 transition">
                    <Home className="h-3.5 w-3.5" />
                    Trang chủ
                </Link>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-bold text-slate-800">Xưởng Chế biến - Đóng gói</span>
            </nav>

            {/* HERO BANNER SECTION */}
            <div className="mb-10 overflow-hidden rounded-[32px] border border-emerald-900/30 bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 p-6 text-white shadow-xl sm:rounded-[36px] sm:p-8 md:p-10">
                <div className="max-w-3xl space-y-4">
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300 backdrop-blur">
                        <Factory className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Hệ thống cơ sở chế biến TriViet</span>
                    </div>

                    <h1
                        className="text-2xl font-black leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl"
                        style={{ fontFamily: "var(--font-display)" }}
                    >
                        Mạng lưới Xưởng Chế biến & Đóng gói Sầu riêng
                    </h1>

                    <p className="max-w-2xl text-xs leading-relaxed text-emerald-100/80 sm:text-sm">
                        Kết nối trực tiếp các cơ sở chế biến, sơ chế tách múi, cấp đông sâu IQF và nhà máy đóng gói sở hữu mã GACC xuất khẩu chính ngạch sang thị trường quốc tế.
                    </p>

                    {/* Key Highlights */}
                    <div className="flex flex-wrap items-center gap-4 pt-2 text-xs font-medium text-emerald-200">
                        <span className="inline-flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                            Chuẩn HACCP & ISO 22000
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <ShieldCheck className="h-4 w-4 text-emerald-400" />
                            Đạt mã đóng gói GACC
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <Sparkles className="h-4 w-4 text-emerald-400" />
                            Minh bạch nguồn gốc từng lô
                        </span>
                    </div>
                </div>
            </div>

            {/* FACILITY LIST CONTAINER */}
            <FacilityListClient items={facilities} type="PROCESSING_FACILITY" />
        </main>
    );
}
