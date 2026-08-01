"use client";

import { useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { newsArticles } from "../../data/news-data";

export default function NewsSection() {
    const trackRef = useRef<HTMLDivElement | null>(null);

    const scrollByCard = (direction: -1 | 1) => {
        const track = trackRef.current;
        if (!track) return;

        const card = track.querySelector<HTMLElement>("[data-news-card]");
        const cardWidth = card ? card.clientWidth + 16 : track.clientWidth / 2;

        track.scrollBy({ left: direction * cardWidth, behavior: "smooth" });
    };

    const visibleArticles = useMemo(() => newsArticles, []);

    return (
        <section className="py-8 sm:py-12 bg-slate-50/50">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* TIÊU ĐỀ SECTION */}
                <div className="mb-8 text-center">
                    <h2
                        className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl"
                        style={{ fontFamily: "var(--font-display)" }}
                    >
                        Tin tức
                    </h2>
                    <div className="mx-auto mt-2 h-1 w-20 rounded-full bg-amber-400" />
                </div>

                {/* CONTAINER CAROUSEL */}
                <div className="relative group px-2 sm:px-6">
                    {/* NÚT BẤM BÊN TRÁI (Nằm gọn bên trong không bị chìm) */}
                    <button
                        type="button"
                        onClick={() => scrollByCard(-1)}
                        className="absolute left-0 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-slate-900/70 text-white shadow-xl backdrop-blur transition hover:bg-slate-900 active:scale-95"
                        aria-label="Xem bài viết trước"
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </button>

                    {/* DANH SÁCH BÀI VIẾT LINK TỚI BÁO THẬT */}
                    <div
                        ref={trackRef}
                        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    >
                        {visibleArticles.map((article) => (
                            <a
                                key={article.id || article.url}
                                href={article.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                data-news-card
                                className={cn(
                                    "group/card min-w-[85%] snap-start overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md flex flex-col justify-between cursor-pointer",
                                    "sm:min-w-[48%] lg:min-w-[calc(25%-0.75rem)]"
                                )}
                            >
                                <div>
                                    {/* HÌNH ẢNH BÀI BÁO */}
                                    <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
                                        <Image
                                            src={article.image}
                                            alt={article.title}
                                            fill
                                            unoptimized // Cho phép load ảnh từ các trang báo ngoài không lo lỗi Next.js config
                                            sizes="(max-width: 640px) 85vw, (max-width: 1024px) 48vw, 25vw"
                                            className="object-cover transition-transform duration-300 group-hover/card:scale-105"
                                        />
                                    </div>

                                    {/* NỘI DUNG CHỮ */}
                                    <div className="space-y-2 p-4">
                                        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-amber-600">
                                            <span>{article.source}</span>
                                            <ExternalLink className="h-3.5 w-3.5 opacity-60 group-hover/card:opacity-100 transition-opacity" />
                                        </div>
                                        <h3
                                            className="line-clamp-1 text-sm font-bold uppercase tracking-tight text-slate-900 group-hover/card:text-emerald-700 transition-colors"
                                            title={article.title}
                                        >
                                            {article.title}
                                        </h3>
                                        <p className="line-clamp-3 text-xs leading-5 text-slate-500">
                                            {article.summary}
                                        </p>
                                    </div>
                                </div>
                            </a>
                        ))}
                    </div>

                    {/* NÚT BẤM BÊN PHẢI */}
                    <button
                        type="button"
                        onClick={() => scrollByCard(1)}
                        className="absolute right-0 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-slate-900/70 text-white shadow-xl backdrop-blur transition hover:bg-slate-900 active:scale-95"
                        aria-label="Xem bài viết tiếp theo"
                    >
                        <ChevronRight className="h-6 w-6" />
                    </button>
                </div>

                {/* NÚT XEM THÊM CĂN GIỮA */}
                <div className="mt-8 text-center">
                    <Button
                        asChild
                        variant="outline"
                        className="rounded-full border-slate-300 bg-white px-8 py-2 font-bold uppercase tracking-widest text-slate-700 shadow-sm transition hover:bg-slate-900 hover:text-white"
                    >
                        <Link href="/news">XEM THÊM</Link>
                    </Button>
                </div>
            </div>
        </section>
    );
}