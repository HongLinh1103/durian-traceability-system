import Image from "next/image";
import Link from "next/link";
import { ArrowRight, QrCode } from "lucide-react";

const ctaLinks = [
    {
        href: "/trace/scan",
        label: "Tra Cứu Mã QR",
        icon: QrCode,
    },
];

type HeroBannerProps = {
    compact?: boolean;
    showContent?: boolean;
};

export function HeroBanner({ compact = false, showContent = true }: HeroBannerProps) {
    return (
        <section className="space-y-4 sm:space-y-6">
            {/* 1. KHỐI HIỂN THỊ BANNER SẠCH NGUYÊN BẢN */}
            <div className="relative w-full overflow-hidden rounded-[28px] sm:rounded-[36px] border border-slate-100 bg-white shadow-soft">
                <Image
                    src="/banner.png"
                    alt="Banner nông nghiệp sầu riêng xuất khẩu"
                    width={1920}
                    height={800}
                    priority
                    sizes="(max-width: 768px) 100vw, 1200px"
                    className={compact
                        ? "block h-[170px] w-full object-cover object-center sm:h-[220px] lg:h-[250px]"
                        : "block h-auto w-full object-contain"
                    }
                />
            </div>

            {/* 2. KHỐI THÔNG TIN VÀ NÚT BẤM (CTA) ĐẶT NGAY BÊN DƯỚI */}
            {showContent && (
            <div className="overflow-hidden rounded-[28px] sm:rounded-[36px] border border-emerald-900/30 bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 p-6 sm:p-8 md:p-10 lg:p-12 text-white shadow-xl">
                <div className="max-w-3xl space-y-5">
                    {/* Tag nhỏ */}
                    <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300 backdrop-blur">
                        Truy xuất nguồn gốc sầu riêng xuất khẩu
                    </span>

                    {/* Tiêu đề & Mô tả */}
                    <div className="space-y-3">
                        <h1
                            className="text-2xl font-black tracking-tight sm:text-4xl lg:text-5xl leading-tight text-white"
                            style={{ fontFamily: "var(--font-display)" }}
                        >
                            Hệ thống quản lý nhật ký canh tác và truy xuất nguồn gốc.
                        </h1>
                        <p className="max-w-2xl text-sm leading-relaxed text-emerald-100/80 sm:text-base">
                            Hỗ trợ nông dân và doanh nghiệp kiểm soát kỹ thuật canh tác, chuẩn hóa vùng trồng, đồng thời tạo dữ liệu tin cậy cho chuỗi sầu riêng xuất khẩu.
                        </p>
                    </div>

                    {/* Các nút bấm */}
                    <div className="pt-2 flex flex-col gap-3 sm:flex-row">
                        {ctaLinks.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.label}
                                    href={item.href}
                                    className="inline-flex h-12 items-center justify-center rounded-full bg-emerald-600 px-6 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-500 active:scale-95"
                                >
                                    <Icon className="mr-2 h-4 w-4 text-emerald-300" />
                                    {item.label}
                                    <ArrowRight className="ml-2 h-4 w-4 opacity-70" />
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>
            )}
        </section>
    );
}
