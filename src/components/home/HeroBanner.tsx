import Image from "next/image";

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
                        Quản lý canh tác sầu riêng
                    </span>

                    {/* Tiêu đề & Mô tả */}
                    <div className="space-y-3">
                        <h1
                            className="text-2xl font-black tracking-tight sm:text-4xl lg:text-5xl leading-tight text-white"
                            style={{ fontFamily: "var(--font-display)" }}
                        >
                            Hệ thống quản lý hồ sơ và nhật ký canh tác.
                        </h1>
                        <p className="max-w-2xl text-sm leading-relaxed text-emerald-100/80 sm:text-base">
                            Hỗ trợ nông dân và Ban quản lý kiểm soát kỹ thuật canh tác, chuẩn hóa vùng trồng và theo dõi hồ sơ thuận tiện.
                        </p>
                    </div>

                </div>
            </div>
            )}
        </section>
    );
}
