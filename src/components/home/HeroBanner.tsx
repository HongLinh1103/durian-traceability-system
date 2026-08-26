import Image from "next/image";

type HeroBannerProps = {
    compact?: boolean;
    showContent?: boolean;
};

export function HeroBanner({ compact = false, showContent = true }: HeroBannerProps) {
    return (
        <section className="space-y-3 sm:space-y-4">
            <div className="relative w-full overflow-hidden rounded-[24px] border border-slate-100 bg-white shadow-soft sm:rounded-[32px]">
                <Image
                    src="/banner.png"
                    alt="Banner nông nghiệp sầu riêng xuất khẩu"
                    width={1920}
                    height={800}
                    priority
                    sizes="(max-width: 768px) 100vw, 1200px"
                    className={compact
                        ? "block h-[140px] w-full object-cover object-center sm:h-[180px] lg:h-[210px]"
                        : "block h-[160px] w-full object-cover object-center sm:h-[220px] md:h-[260px] lg:h-[290px]"
                    }
                />
            </div>

            {showContent && (
                <div className="overflow-hidden rounded-[24px] border border-emerald-900/30 bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 p-5 text-white shadow-xl sm:rounded-[32px] sm:p-6 md:p-8">
                    <div className="max-w-3xl space-y-3 sm:space-y-4">
                        <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300 backdrop-blur">
                            Quản lý canh tác sầu riêng
                        </span>
                        <div className="space-y-2">
                            <h1 className="text-xl font-black leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl" style={{ fontFamily: "var(--font-display)" }}>
                                Hệ thống quản lý hồ sơ và nhật ký canh tác.
                            </h1>
                            <p className="max-w-2xl text-xs leading-relaxed text-emerald-100/80 sm:text-sm">
                                Hỗ trợ nông dân và Ban quản lý kiểm soát kỹ thuật canh tác, chuẩn hóa vùng trồng và theo dõi hồ sơ thuận tiện.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
