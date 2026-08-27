"use client";

import { useState } from "react";
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
    Award,
    Check,
    Cpu,
    ArrowDownRight,
    Layers,
    BadgeCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BenefitStage {
    step: string;
    role: string;
    badge: string;
    title: string;
    subtitle: string;
    description: string;
    icon: any;
    accentColor: string;
    iconBg: string;
    stat: {
        value: string;
        label: string;
    };
    points: string[];
}

const BENEFIT_STAGES: BenefitStage[] = [
    {
        step: "01",
        role: "Nhà Vườn & Hộ Nông Dân",
        badge: "Vùng Trồng Chuẩn GACC & VietGAP",
        title: "Chuẩn Hóa Nhật Ký Canh Tác Số & Tối Đa Giá Trị Vườn",
        subtitle: "Ghi chép tức thời trên di động · Tự động tính thời gian cách ly (PHI)",
        description: "Số hóa toàn bộ quy trình bón phân, phun thuốc, tưới tiêu và chăm sóc cây. Hệ thống tự động kiểm soát danh mục hoạt chất cấm, đảm bảo 100% trái sầu riêng khi thu hoạch đạt chuẩn xuất khẩu chính ngạch với mức giá cao nhất.",
        icon: Sprout,
        accentColor: "from-emerald-500 to-teal-700",
        iconBg: "bg-emerald-500/10 text-emerald-600 border-emerald-300",
        stat: {
            value: "100%",
            label: "Chuẩn Cách Ly Thuốc BVTV"
        },
        points: [
            "Tự động tính ngày cách ly (PHI) an toàn trước khi bấm máy cắt",
            "Cảnh báo tức thời danh mục 10+ hoạt chất cấm theo quy định Hải quan Trung Quốc (GACC)",
            "Gắn mã số vùng sản xuất (MSVT) điện tử trực tiếp vào từng mẻ thu hoạch",
            "Cắt giảm 35% chi phí ghi chép thủ công và loại bỏ nguy cơ thất lạc sổ sách"
        ]
    },
    {
        step: "02",
        role: "Vựa Thu Mua & Hợp Tác Xã",
        badge: "Kiểm Soát Nguồn Hàng & Gom Lô",
        title: "Minh Bạch Nguồn Hàng Tại Gốc & Quản Trị Dòng Tiền Tức Thời",
        subtitle: "Đối soát nhật ký vườn trước khi cắt · Tự động hóa phiếu xuất & công nợ",
        description: "Vựa thu mua dễ dàng kiểm chứng toàn bộ lịch sử phân thuốc của vườn trước khi chốt cọc. Tạo lô thu gom liên kết đa vườn, phân loại trái, in phiếu xuất bán chuẩn và theo dõi công nợ đối tác minh bạch.",
        icon: Building2,
        accentColor: "from-blue-500 to-indigo-700",
        iconBg: "bg-blue-500/10 text-blue-600 border-blue-300",
        stat: {
            value: "100%",
            label: "Xác Thực Vườn Liên Kết"
        },
        points: [
            "Tra cứu hồ sơ canh tác của nhà vườn trước khi ký hợp đồng thu mua",
            "Tạo mã lô thu mua (Collection Lot) đồng bộ dữ liệu nông hộ và cân nặng thực tế",
            "Tự động tính toán tổng phải thu, thực thu và quản lý công nợ khách hàng",
            "Biểu đồ phân tích doanh thu, chi phí vận hành và tỷ suất lợi nhuận trực quan"
        ]
    },
    {
        step: "03",
        role: "Cơ Sở Chế Biến & Đóng Gói",
        badge: "Mã CSĐG & Cấp Đông IQF",
        title: "Tối Ưu Định Mức Thu Hồi Cơm & Chuẩn Hóa Cấp Đông IQF",
        subtitle: "Định mức bóc múi 72-75% · Bảo quản sâu -18°C · Cấp mã thành phẩm",
        description: "Quản lý xuyên suốt từ khâu tiếp nhận trái tươi, phân loại, bóc tách múi, hút chân không đến cấp đông sâu IQF. Kiểm soát chặt chẽ tỷ lệ hao hụt từng mẻ chế biến, cấp mã QR thành phẩm xuất khẩu chuẩn GACC.",
        icon: Factory,
        accentColor: "from-purple-500 to-violet-700",
        iconBg: "bg-purple-500/10 text-purple-600 border-purple-300",
        stat: {
            value: "74.5%",
            label: "Định Mức Thu Hồi Cơm Đạt Chuẩn"
        },
        points: [
            "Kiểm soát tỷ lệ thu hồi múi & hao hụt vỏ cuống theo thời gian thực",
            "Đóng gói hút chân không, bảo quản kho lạnh -18°C đạt chuẩn mã số cơ sở đóng gói (MSCSĐG)",
            "Tự động tính chi phí nhân công, bao bì chuẩn xuất khẩu và điện kho lạnh",
            "Cấp mã định danh thành phẩm liên kết trực tiếp với lô thu mua đầu vào"
        ]
    },
    {
        step: "04",
        role: "Doanh Nghiệp Xuất Khẩu & China Port",
        badge: "Thông Quan Tốc Hành 6 Giai Đoạn",
        title: "Hồ Sơ Điện Tử Chuẩn Hóa & Thông Quan Chính Ngạch Tốc Hành",
        subtitle: "Tích hợp MSVT, MSCSĐG, Container & Seal · Đáp ứng Nghị định kiểm dịch",
        description: "Đồng bộ hóa 6 giai đoạn truy xuất nguồn gốc vào hồ sơ điện tử duy nhất. Hỗ trợ doanh nghiệp khai báo chính xác số container lạnh, niêm seal chì, chứng nhận kiểm dịch, giúp đẩy nhanh tốc độ thông quan tại các cửa khẩu quốc tế.",
        icon: Globe2,
        accentColor: "from-amber-500 to-orange-700",
        iconBg: "bg-amber-500/10 text-amber-600 border-amber-300",
        stat: {
            value: "< 3s",
            label: "Đối Soát Dữ Liệu Hải Quan"
        },
        points: [
            "Hồ sơ xuất khẩu điện tử chuẩn hóa theo yêu cầu Tổng cục Hải quan Trung Quốc (GACC)",
            "Chức năng China Port mô phỏng và kiểm tra tính hợp lệ trước khi xe lăn bánh đến biên giới",
            "Ghi nhận chính xác số container lạnh, biển số xe và nhiệt độ bảo quản suốt lộ trình",
            "Ngăn chặn triệt để hành vi mượn mã số vùng trồng và gian lận xuất xứ"
        ]
    },
    {
        step: "05",
        role: "Người Tiêu Dùng & Hệ Thống Siêu Thị",
        badge: "Truy Xuất 1 Chạm Minh Bạch",
        title: "Quét 1 Chạm — Thấu Suốt Toàn Bộ Hành Trình Trái Sầu Riêng",
        subtitle: "Minh bạch 100% từ thổ nhưỡng vườn trồng đến bàn ăn người tiêu dùng",
        description: "Người tiêu dùng chỉ cần dùng camera điện thoại quét mã QR trên từng trái hoặc khay sầu riêng để xem toàn bộ hành trình: từ ngày bón phân, phun thuốc, ngày thu hoạch, đến cơ sở đóng gói và chứng nhận kiểm định an toàn thực phẩm.",
        icon: QrCode,
        accentColor: "from-rose-500 to-pink-700",
        iconBg: "bg-rose-500/10 text-rose-600 border-rose-300",
        stat: {
            value: "0%",
            label: "Rủi Ro Hàng Kém Chất Lượng"
        },
        points: [
            "Trực quan hóa timeline hành trình liên tục từ Vườn → Vựa → Xưởng → Xuất khẩu",
            "Xem hình ảnh thực tế vườn trồng, giấy chứng nhận chất lượng và kết quả kiểm nghiệm",
            "Cam kết minh bạch thông tin, nâng cao niềm tin và giá trị thương hiệu sầu riêng Việt Nam",
            "Tương thích 100% với mọi ứng dụng quét mã QR thông dụng (Camera iOS/Android, Zalo)"
        ]
    }
];

const OVERALL_METRICS = [
    {
        value: "100%",
        title: "Minh Bạch Nguồn Gốc",
        desc: "Chuỗi liên kết số xuyên suốt từ Vườn đến Cửa khẩu",
        icon: ShieldCheck,
        color: "text-emerald-700 bg-emerald-100/80 border-emerald-300"
    },
    {
        value: "0%",
        title: "Dư Lượng Hoạt Chất Cấm",
        desc: "Kiểm soát an toàn theo quy định GACC & Bộ NN-PTNT",
        icon: Award,
        color: "text-blue-700 bg-blue-100/80 border-blue-300"
    },
    {
        value: "35%",
        title: "Tiết Kiệm Thời Gian & Chi Phí",
        desc: "Tự động hóa số liệu, báo cáo, phiếu xuất và công nợ",
        icon: TrendingUp,
        color: "text-purple-700 bg-purple-100/80 border-purple-300"
    },
    {
        value: "< 2s",
        title: "Tốc Độ Quét & Truy Xuất",
        desc: "Hiển thị trọn vẹn hành trình chỉ qua 1 lần quét QR",
        icon: QrCode,
        color: "text-amber-700 bg-amber-100/80 border-amber-300"
    }
];

export function SystemBenefitsSection() {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    return (
        <section className="relative py-12 sm:py-16 overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="pointer-events-none absolute -left-20 top-20 h-96 w-96 rounded-full bg-emerald-200/25 blur-3xl" />
            <div className="pointer-events-none absolute -right-20 top-1/2 h-96 w-96 rounded-full bg-teal-200/20 blur-3xl" />
            <div className="pointer-events-none absolute left-1/3 bottom-10 h-80 w-80 rounded-full bg-amber-100/30 blur-3xl" />

            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-12">
                {/* 1. SECTION HEADER */}
                <div className="text-center max-w-3xl mx-auto space-y-3">
                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100/90 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-emerald-800 border border-emerald-300/80 shadow-2xs">
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
                        Giải pháp công nghệ số toàn diện chuẩn hóa chuỗi giá trị sầu riêng Việt Nam — kết nối liền mạch từ người trồng vườn, đơn vị thu mua, xưởng chế biến đến thị trường quốc tế.
                    </p>
                    <div className="mx-auto h-1.5 w-24 rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400" />
                </div>

                {/* 2. OVERALL METRIC HIGHLIGHTS BAR */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 pt-2">
                    {OVERALL_METRICS.map((metric, idx) => {
                        const Icon = metric.icon;
                        return (
                            <div
                                key={idx}
                                className="group relative overflow-hidden rounded-2xl border bg-white/90 backdrop-blur-xs p-4 sm:p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md border-slate-200"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight group-hover:text-emerald-700 transition">
                                        {metric.value}
                                    </span>
                                    <div className={cn("flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border transition group-hover:scale-110 shadow-2xs", metric.color)}>
                                        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                                    </div>
                                </div>
                                <h3 className="mt-2.5 text-xs sm:text-sm font-black text-slate-800">
                                    {metric.title}
                                </h3>
                                <p className="mt-1 text-[11px] sm:text-xs text-slate-500 leading-tight">
                                    {metric.desc}
                                </p>
                            </div>
                        );
                    })}
                </div>

                {/* 3. VALUE CHAIN FLOW (DÒNG CHẢY CHUỖI GIÁ TRỊ LIỀN MẠCH - KHÔNG DÙNG CARD) */}
                <div className="relative pt-6">
                    {/* Glowing Vertical Connector Track */}
                    <div className="hidden lg:block absolute left-8 top-10 bottom-10 w-0.5 bg-gradient-to-b from-emerald-500 via-teal-400 to-amber-500" />

                    <div className="space-y-6 sm:space-y-8">
                        {BENEFIT_STAGES.map((stage, idx) => {
                            const Icon = stage.icon;
                            const isHovered = hoveredIndex === idx;

                            return (
                                <div
                                    key={stage.step}
                                    onMouseEnter={() => setHoveredIndex(idx)}
                                    onMouseLeave={() => setHoveredIndex(null)}
                                    className={cn(
                                        "relative rounded-3xl p-5 sm:p-8 transition-all duration-300 border",
                                        isHovered
                                            ? "bg-white shadow-xl border-emerald-300 ring-4 ring-emerald-500/10 -translate-y-1"
                                            : "bg-slate-50/70 hover:bg-white/90 border-slate-200/80 shadow-2xs"
                                    )}
                                >
                                    {/* Subtle Top Gradient Accent on Hover */}
                                    <div
                                        className={cn(
                                            "absolute inset-x-8 top-0 h-1 rounded-b-full bg-gradient-to-r opacity-0 transition-opacity duration-300",
                                            stage.accentColor,
                                            isHovered && "opacity-100"
                                        )}
                                    />

                                    <div className="flex flex-col lg:flex-row items-start gap-6 lg:gap-8">
                                        {/* Left Side: Step Number & Role Indicator */}
                                        <div className="flex items-center lg:flex-col lg:items-center justify-between w-full lg:w-36 shrink-0 gap-3 pb-4 lg:pb-0 border-b lg:border-b-0 lg:border-r border-slate-200/80 lg:pr-6">
                                            <div className="flex items-center gap-3 lg:flex-col">
                                                <div className={cn(
                                                    "flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl border shadow-xs transition-transform duration-300",
                                                    stage.iconBg,
                                                    isHovered && "scale-110"
                                                )}>
                                                    <Icon className="h-7 w-7 sm:h-8 sm:w-8" />
                                                </div>
                                                <div className="text-left lg:text-center">
                                                    <span className="font-mono text-2xl sm:text-3xl font-black text-slate-800 tracking-tighter">
                                                        {stage.step}
                                                    </span>
                                                    <div className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                                                        {stage.role}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Stat Indicator Badge */}
                                            <div className="rounded-xl bg-white px-3 py-1.5 text-right lg:text-center border border-slate-200/90 shadow-2xs">
                                                <div className="text-base sm:text-lg font-black text-emerald-700 leading-none">
                                                    {stage.stat.value}
                                                </div>
                                                <div className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">
                                                    {stage.stat.label}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Side: Content & Actionable Highlights */}
                                        <div className="flex-1 space-y-4">
                                            <div>
                                                <div className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-0.5 text-[11px] font-black text-emerald-800 border border-emerald-200">
                                                    <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />
                                                    {stage.badge}
                                                </div>
                                                <h3 className="mt-2 text-lg sm:text-xl font-black text-slate-900 group-hover:text-emerald-800 transition">
                                                    {stage.title}
                                                </h3>
                                                <p className="mt-1 text-xs sm:text-sm font-semibold text-emerald-700">
                                                    {stage.subtitle}
                                                </p>
                                                <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                                                    {stage.description}
                                                </p>
                                            </div>

                                            {/* Feature Points Grid */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                                                {stage.points.map((point, pIdx) => (
                                                    <div
                                                        key={pIdx}
                                                        className="flex items-start gap-2 rounded-xl bg-white/80 p-2.5 border border-slate-100 shadow-2xs"
                                                    >
                                                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                                                        <span className="text-xs text-slate-700 font-medium leading-tight">
                                                            {point}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}
