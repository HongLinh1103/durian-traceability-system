"use client";

import { useState } from "react";
import Link from "next/link";
import {
    Sprout,
    Building2,
    Factory,
    Globe2,
    ShieldCheck,
    QrCode,
    TrendingUp,
    CheckCircle2,
    Sparkles,
    BarChart3,
    Truck,
    ArrowRight,
    Award,
    Clock,
    Lock,
    Scale,
    FileCheck2,
    SearchCheck,
    Cpu,
    Boxes
} from "lucide-react";
import { cn } from "@/lib/utils";

type BenefitCategory = "ALL" | "FARMER" | "PARTNER" | "EXPORTER_CONSUMER";

interface BenefitItem {
    id: string;
    targetRole: "FARMER" | "COLLECTOR" | "PROCESSOR" | "CONSUMER" | "EXPORTER";
    targetRoleLabel: string;
    targetCategory: BenefitCategory;
    title: string;
    subtitle: string;
    description: string;
    icon: any;
    accentColor: string;
    badgeText: string;
    highlights: string[];
    statMetric?: {
        value: string;
        label: string;
    };
}

const BENEFIT_ITEMS: BenefitItem[] = [
    {
        id: "benefit-farmer",
        targetRole: "FARMER",
        targetRoleLabel: "Nhà Vườn & Hộ Nông Dân",
        targetCategory: "FARMER",
        title: "Chuẩn Hóa Canh Tác & Nâng Tầm Giá Trị Vườn",
        subtitle: "Nhật ký số thông minh · Đáp ứng tiêu chuẩn xuất khẩu GACC & VietGAP",
        description: "Ghi chép phân bón, thuốc BVTV tức thì trên điện thoại. Cảnh báo tự động thời gian cách ly (PHI) và hoạt chất cấm, giúp trái sầu riêng đạt chuẩn xuất khẩu giá cao.",
        icon: Sprout,
        accentColor: "from-emerald-500 to-teal-700",
        badgeText: "Vùng Trồng Chuẩn GACC",
        highlights: [
            "Tự động tính ngày cách ly (PHI) trước thu hoạch",
            "Cảnh báo danh mục 10+ hoạt chất cấm nhập khẩu",
            "Cấp mã số vùng trồng (MSVT) điện tử liên kết lô hàng",
            "Tiết kiệm 35% chi phí ghi chép sổ tay truyền thống"
        ],
        statMetric: {
            value: "100%",
            label: "Tuân thủ cách ly thuốc BVTV"
        }
    },
    {
        id: "benefit-collector",
        targetRole: "COLLECTOR",
        targetRoleLabel: "Vựa Thu Mua & Hợp Tác Xã",
        targetCategory: "PARTNER",
        title: "Kiểm Soát Nguồn Hàng & Minh Bạch Giao Dịch",
        subtitle: "Đối soát nhật ký tại vườn · Quản lý dòng tiền & gom lô thông minh",
        description: "Xem chi tiết lịch sử canh tác của từng vườn trước khi chốt giá cắt sầu. Tự động tạo lô thu mua, quản lý cân nặng, xuất bán và theo dõi công nợ tức thời.",
        icon: Building2,
        accentColor: "from-blue-500 to-indigo-700",
        badgeText: "Gom Lô & Quản Trị Vựa",
        highlights: [
            "Xem nhật ký vườn trước khi đặt cọc và thu hoạch",
            "Tạo lô thu gom (Collection Lot) liên kết đa vườn",
            "In phiếu xuất bán & tự động tính doanh thu, công nợ",
            "Theo dõi dòng tiền thu - chi thực tế qua biểu đồ trực quan"
        ],
        statMetric: {
            value: "100%",
            label: "Nguồn gốc vườn liên kết"
        }
    },
    {
        id: "benefit-processor",
        targetRole: "PROCESSOR",
        targetRoleLabel: "Cơ Sở Chế Biến & Đóng Gói",
        targetCategory: "PARTNER",
        title: "Tối Ưu Định Mức Thu Hồi & Quản Trị Mẻ Lạnh IQF",
        subtitle: "Định mức bóc múi 72-75% · Cấp đông sâu -18°C · Chuẩn mã CSĐG",
        description: "Quản lý toàn diện quy trình tiếp nhận, bóc múi, hút chân không và cấp đông IQF. Kiểm soát tỷ lệ hao hụt từng mẻ chế biến, cấp mã QR thành phẩm xuất khẩu.",
        icon: Factory,
        accentColor: "from-purple-500 to-violet-700",
        badgeText: "Mã CSĐG Xuất Khẩu",
        highlights: [
            "Theo dõi định mức thu hồi múi & tỷ lệ hao hụt từng mẻ",
            "Quản lý kho lạnh bảo quản -18°C & đóng gói chuẩn GACC",
            "Tự động tính chi phí nhân công, điện lạnh, bao bì",
            "Cấp mã định danh thành phẩm kết nối trực tiếp nguồn gốc"
        ],
        statMetric: {
            value: "74.5%",
            label: "Định mức thu hồi múi đạt chuẩn"
        }
    },
    {
        id: "benefit-exporter",
        targetRole: "EXPORTER",
        targetRoleLabel: "Doanh Nghiệp Xuất Khẩu & China Port",
        targetCategory: "EXPORTER_CONSUMER",
        title: "Thông Quan Tốc Hành & Tuân Thủ Nghị Quyết 36/2026/NQ-CP",
        subtitle: "Dữ liệu điện tử đối soát 6 giai đoạn · Hỗ trợ Cửa khẩu Quốc tế",
        description: "Hồ sơ điện tử chuẩn hóa tích hợp đầy đủ mã số MSVT, MSCSĐG, số container, số seal và kiểm dịch thực vật. Rút ngắn thời gian thông quan tại các cửa khẩu phía Bắc.",
        icon: Globe2,
        accentColor: "from-amber-500 to-orange-700",
        badgeText: "Thông Quan Chính Ngạch",
        highlights: [
            "Hồ sơ xuất khẩu điện tử đồng bộ dữ liệu Tổng cục Hải quan TQ",
            "Mô phỏng quy trình kiểm tra China Port chuyên nghiệp",
            "Ghi nhận thông tin container lạnh, niêm chì và cửa khẩu xuất",
            "Bảo vệ thương hiệu sầu riêng Việt Nam trước rủi ro gian lận"
        ],
        statMetric: {
            value: "< 3s",
            label: "Tra cứu hồ sơ kiểm định"
        }
    },
    {
        id: "benefit-consumer",
        targetRole: "CONSUMER",
        targetRoleLabel: "Người Tiêu Dùng & Siêu Thị",
        targetCategory: "EXPORTER_CONSUMER",
        title: "Quét 1 Chạm — Thấu Suốt Toàn Bộ Hành Trình Trái Sầu Riêng",
        subtitle: "Minh bạch 100% từ đất mẹ, cây giống đến bàn ăn gia đình",
        description: "Chỉ với 1 thao tác quét mã QR bằng camera điện thoại, người tiêu dùng dễ dàng kiểm chứng nguồn gốc vườn trồng, ngày thu hoạch, chứng nhận an toàn thực phẩm.",
        icon: QrCode,
        accentColor: "from-rose-500 to-pink-700",
        badgeText: "Truy Xuất Minh Bạch",
        highlights: [
            "Xem toàn bộ timeline 6 mốc: Vụ mùa, Thu hoạch, Thu mua, Chế biến, Xuất bán",
            "Kiểm chứng nhật ký cách ly thuốc bảo vệ thực vật đạt chuẩn",
            "Xem ảnh thực tế vườn trồng, giấy chứng nhận chất lượng",
            "An tâm tuyệt đối khi thưởng thức sầu riêng chính gốc"
        ],
        statMetric: {
            value: "0%",
            label: "Rủi ro hàng trôi nổi giả mạo"
        }
    }
];

const OVERALL_STATS = [
    {
        value: "100%",
        label: "Minh Bạch Nguồn Gốc",
        desc: "Chuỗi liên kết số từ Vườn → Vựa → Xưởng → Cửa khẩu",
        icon: ShieldCheck,
        color: "text-emerald-600 bg-emerald-50 border-emerald-200"
    },
    {
        value: "0%",
        label: "Dư Lượng Hoạt Chất Cấm",
        desc: "Hệ thống kiểm soát theo danh mục GACC & Bộ NN-PTNT",
        icon: Award,
        color: "text-blue-600 bg-blue-50 border-blue-200"
    },
    {
        value: "35%",
        label: "Tối Ưu Thời Gian & Chi Phí",
        desc: "Tự động hóa báo cáo, hóa đơn, công nợ và hồ sơ xuất khẩu",
        icon: TrendingUp,
        color: "text-purple-600 bg-purple-50 border-purple-200"
    },
    {
        value: "< 2s",
        label: "Quét QR & Truy Xuất",
        desc: "Tương thích 100% camera điện thoại Zalo / iPhone / Android",
        icon: QrCode,
        color: "text-amber-600 bg-amber-50 border-amber-200"
    }
];

export function SystemBenefitsSection() {
    const [activeTab, setActiveTab] = useState<BenefitCategory>("ALL");
    const [hoveredCard, setHoveredCard] = useState<string | null>(null);

    const filteredItems = BENEFIT_ITEMS.filter((item) => {
        if (activeTab === "ALL") return true;
        return item.targetCategory === activeTab;
    });

    return (
        <section className="relative py-12 sm:py-16 overflow-hidden rounded-3xl bg-gradient-to-b from-white via-slate-50/60 to-emerald-50/30 border border-slate-200/80 shadow-xs">
            {/* Background Decorative Blobs */}
            <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-emerald-200/30 blur-3xl" />
            <div className="pointer-events-none absolute -right-20 top-1/2 h-80 w-80 rounded-full bg-teal-200/20 blur-3xl" />

            <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10">
                {/* 1. SECTION HEADER */}
                <div className="text-center max-w-3xl mx-auto space-y-3">
                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100/80 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-emerald-800 border border-emerald-200/80 shadow-2xs">
                        <Sparkles className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
                        Giá Trị Thực Tiễn & Hiệu Quả Đột Phá
                    </div>
                    <h2
                        className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl lg:text-5xl"
                        style={{ fontFamily: "var(--font-display)" }}
                    >
                        LỢI ÍCH CỦA HỆ THỐNG
                    </h2>
                    <p className="text-sm sm:text-base text-slate-600 font-medium leading-relaxed">
                        Hệ thống Truy xuất Nguồn gốc & Quản lý Nhật ký Nông nghiệp Trí Việt kết nối toàn diện 
                        chuỗi giá trị sầu riêng Việt Nam — từ mảnh vườn của người nông dân đến bàn ăn của người tiêu dùng toàn cầu.
                    </p>
                    <div className="mx-auto h-1.5 w-24 rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400" />
                </div>

                {/* 2. OVERALL STATS HIGHLIGHT BAR */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                    {OVERALL_STATS.map((stat, idx) => {
                        const Icon = stat.icon;
                        return (
                            <div
                                key={idx}
                                className="group relative overflow-hidden rounded-2xl sm:rounded-3xl border bg-white p-4 sm:p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md border-slate-200/90"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight group-hover:text-emerald-700 transition">
                                        {stat.value}
                                    </span>
                                    <div className={cn("flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl sm:rounded-2xl border transition group-hover:scale-110", stat.color)}>
                                        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                                    </div>
                                </div>
                                <h3 className="mt-2.5 text-xs sm:text-sm font-black text-slate-800">
                                    {stat.label}
                                </h3>
                                <p className="mt-1 text-[11px] sm:text-xs text-slate-500 leading-tight">
                                    {stat.desc}
                                </p>
                            </div>
                        );
                    })}
                </div>

                {/* 3. INTERACTIVE CATEGORY FILTER TABS */}
                <div className="flex justify-center">
                    <div className="inline-flex items-center gap-1 sm:gap-1.5 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 shadow-inner max-w-full overflow-x-auto scrollbar-none">
                        <button
                            type="button"
                            onClick={() => setActiveTab("ALL")}
                            className={cn(
                                "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition-all whitespace-nowrap",
                                activeTab === "ALL"
                                    ? "bg-white text-emerald-800 shadow-xs border border-slate-200"
                                    : "text-slate-600 hover:text-slate-900"
                            )}
                        >
                            <Boxes className="h-3.5 w-3.5" />
                            Tất Cả Lợi Ích
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("FARMER")}
                            className={cn(
                                "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition-all whitespace-nowrap",
                                activeTab === "FARMER"
                                    ? "bg-white text-emerald-800 shadow-xs border border-slate-200"
                                    : "text-slate-600 hover:text-slate-900"
                            )}
                        >
                            <Sprout className="h-3.5 w-3.5 text-emerald-600" />
                            Nhà Vườn & Nông Dân
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("PARTNER")}
                            className={cn(
                                "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition-all whitespace-nowrap",
                                activeTab === "PARTNER"
                                    ? "bg-white text-emerald-800 shadow-xs border border-slate-200"
                                    : "text-slate-600 hover:text-slate-900"
                            )}
                        >
                            <Factory className="h-3.5 w-3.5 text-purple-600" />
                            Vựa Thu Mua & Cơ Sở Chế Biến
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("EXPORTER_CONSUMER")}
                            className={cn(
                                "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition-all whitespace-nowrap",
                                activeTab === "EXPORTER_CONSUMER"
                                    ? "bg-white text-emerald-800 shadow-xs border border-slate-200"
                                    : "text-slate-600 hover:text-slate-900"
                            )}
                        >
                            <Globe2 className="h-3.5 w-3.5 text-blue-600" />
                            Xuất Khẩu & Người Tiêu Dùng
                        </button>
                    </div>
                </div>

                {/* 4. BENEFIT CARDS GRID WITH HOVER & GLOW EFFECTS */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredItems.map((item) => {
                        const Icon = item.icon;
                        const isHovered = hoveredCard === item.id;

                        return (
                            <div
                                key={item.id}
                                onMouseEnter={() => setHoveredCard(item.id)}
                                onMouseLeave={() => setHoveredCard(null)}
                                className={cn(
                                    "group relative flex flex-col justify-between rounded-3xl border bg-white p-6 shadow-xs transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl",
                                    isHovered ? "border-emerald-500/50 ring-4 ring-emerald-500/10" : "border-slate-200"
                                )}
                            >
                                {/* Top Glow Accent Line */}
                                <div className={cn("absolute inset-x-6 top-0 h-1 rounded-b-full bg-gradient-to-r opacity-0 transition-opacity duration-300 group-hover:opacity-100", item.accentColor)} />

                                <div>
                                    {/* Role Badge & Target */}
                                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-4">
                                        <div className="flex items-center gap-2">
                                            <div className={cn("flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-2xs transition group-hover:scale-110", item.accentColor)}>
                                                <Icon className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                                                    {item.targetRoleLabel}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                    <span className="text-xs font-bold text-slate-700">
                                                        {item.badgeText}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {item.statMetric && (
                                            <div className="text-right">
                                                <span className="text-base sm:text-lg font-black text-emerald-700">
                                                    {item.statMetric.value}
                                                </span>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase">
                                                    {item.statMetric.label}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Main Title & Description */}
                                    <div className="mt-4 space-y-2">
                                        <h3 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-emerald-800 transition line-clamp-2">
                                            {item.title}
                                        </h3>
                                        <p className="text-xs font-semibold text-emerald-700 leading-snug">
                                            {item.subtitle}
                                        </p>
                                        <p className="text-xs text-slate-600 leading-relaxed">
                                            {item.description}
                                        </p>
                                    </div>

                                    {/* Key Highlights Checklist */}
                                    <div className="mt-4 space-y-2 pt-3 border-t border-slate-100">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                            Tính năng cốt lõi:
                                        </p>
                                        <ul className="space-y-1.5">
                                            {item.highlights.map((h, i) => (
                                                <li key={i} className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                                                    <span>{h}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                {/* Bottom Action Link */}
                                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                                    <span className="font-bold text-slate-500 group-hover:text-emerald-700 transition flex items-center gap-1">
                                        Trải nghiệm tính năng
                                        <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                                    </span>
                                    <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                                        Số hóa 100%
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* 5. CALL TO ACTION / TRUST FOOTER */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 p-6 sm:p-8 text-white shadow-lg">
                    {/* Background Pattern */}
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] opacity-10" />

                    <div className="relative flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="space-y-2 text-center sm:text-left">
                            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-0.5 text-[11px] font-bold text-emerald-300 border border-emerald-400/30">
                                <Cpu className="h-3.5 w-3.5 text-emerald-400" />
                                Nền tảng Truy xuất Nguồn gốc Tiên phong
                            </div>
                            <h3 className="text-xl sm:text-2xl font-black text-white">
                                Sẵn Sàng Số Hóa Quy Trình Canh Tác & Xuất Khẩu Sầu Riêng?
                            </h3>
                            <p className="text-xs sm:text-sm text-emerald-100 max-w-2xl">
                                Đăng ký hoặc đăng nhập để quản lý vườn, vựa thu mua, cơ sở chế biến và phát hành mã QR chuẩn quốc tế ngay hôm nay.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 shrink-0">
                            <Link
                                href="/login"
                                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-xs sm:text-sm font-black text-slate-950 shadow-md transition hover:bg-emerald-400 hover:scale-105"
                            >
                                <Lock className="h-4 w-4" />
                                Đăng Nhập Hệ Thống
                            </Link>
                            <Link
                                href="/china-port"
                                className="inline-flex items-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-xs border border-white/20 px-4 py-3 text-xs sm:text-sm font-bold text-white transition hover:scale-105"
                            >
                                <Globe2 className="h-4 w-4 text-emerald-400" />
                                Khám Phá China Port
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
