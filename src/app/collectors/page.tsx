import { Metadata } from "next";
import Link from "next/link";
import { Truck, Sparkles, ShieldCheck, ChevronRight, Home, Boxes, CheckCircle2 } from "lucide-react";
import { getCollectors } from "@/lib/facilities-data";
import { FacilityListClient } from "@/components/facilities/FacilityListClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Danh Sách Vựa Thu Mua Sầu Riêng | TriViet Traceability",
    description:
        "Tổng hợp danh sách các vựa thu mua sầu riêng uy tín, liên kết trực tiếp với nhà vườn chuẩn VietGAP tại Đồng Nai, Bình Phước, Tây Nguyên và Miền Tây.",
};

export default async function CollectorsPage() {
    const collectors = await getCollectors();

    return (
        <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
            {/* BREADCRUMB */}
            <nav className="mb-6 flex items-center gap-2 text-xs font-medium text-slate-500">
                <Link href="/" className="flex items-center gap-1 hover:text-brand-600 transition">
                    <Home className="h-3.5 w-3.5" />
                    Trang chủ
                </Link>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-bold text-slate-800">Vựa thu mua</span>
            </nav>

            {/* HERO BANNER SECTION */}
            <div className="mb-10 overflow-hidden rounded-[32px] border border-emerald-900/30 bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 p-6 text-white shadow-xl sm:rounded-[36px] sm:p-8 md:p-10">
                <div className="max-w-3xl space-y-4">
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300 backdrop-blur">
                        <Truck className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Mạng lưới vựa thu mua liên kết</span>
                    </div>

                    <h1
                        className="text-2xl font-black leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl"
                        style={{ fontFamily: "var(--font-display)" }}
                    >
                        Hệ thống Vựa Thu Mua Sầu Riêng Uy Tín
                    </h1>

                    <p className="max-w-2xl text-xs leading-relaxed text-emerald-100/80 sm:text-sm">
                        Danh bạ các vựa thu mua đầu mối tại các vùng trồng trọng điểm Đồng Nai, Bình Phước, Đắk Lắk và Tiền Giang. Cam kết giá thu mua minh bạch, cân điện tử chuẩn xác và hỗ trợ nhà vườn kỹ thuật thu hoạch.
                    </p>

                    {/* Key Highlights */}
                    <div className="flex flex-wrap items-center gap-4 pt-2 text-xs font-medium text-emerald-200">
                        <span className="inline-flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                            Bao tiêu vườn trồng chuẩn VietGAP
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <Boxes className="h-4 w-4 text-emerald-400" />
                            Tiếp nhận số lượng lớn hàng ngày
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <ShieldCheck className="h-4 w-4 text-emerald-400" />
                            Kiểm định chất lượng & đối soát minh bạch
                        </span>
                    </div>
                </div>
            </div>

            {/* COLLECTORS LIST CONTAINER */}
            <FacilityListClient items={collectors} type="COLLECTOR" />
        </main>
    );
}
