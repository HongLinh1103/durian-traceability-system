"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
    Sprout,
    Search,
    MapPin,
    Building2,
    ArrowRight,
    Sparkles,
    CheckCircle2,
    PhoneCall,
    Filter,
    ShieldCheck,
    Boxes,
} from "lucide-react";
import type { SeedlingItem } from "@/lib/seedlings-data";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SeedlingListClientProps = {
    initialItems: SeedlingItem[];
};

export function SeedlingListClient({ initialItems }: SeedlingListClientProps) {
    const [items, setItems] = useState<SeedlingItem[]>(initialItems);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedVariety, setSelectedVariety] = useState<string>("ALL");
    const [selectedNursery, setSelectedNursery] = useState<string>("ALL");

    // Available varieties
    const varieties = useMemo(() => {
        const set = new Set<string>();
        items.forEach((item) => {
            if (item.variety) set.add(item.variety);
        });
        return Array.from(set);
    }, [items]);

    // Available nurseries
    const nurseries = useMemo(() => {
        const set = new Set<string>();
        items.forEach((item) => {
            if (item.nurseryName) set.add(item.nurseryName);
        });
        return Array.from(set);
    }, [items]);

    // Filter items
    const filteredItems = useMemo(() => {
        return items.filter((item) => {
            const matchesSearch =
                !searchTerm.trim() ||
                item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.variety.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.nurseryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.nurseryAddress.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesVariety =
                selectedVariety === "ALL" || item.variety === selectedVariety;

            const matchesNursery =
                selectedNursery === "ALL" || item.nurseryName === selectedNursery;

            return matchesSearch && matchesVariety && matchesNursery;
        });
    }, [items, searchTerm, selectedVariety, selectedNursery]);

    return (
        <div className="space-y-6">
            {/* SEARCH & VARIETY FILTER TOOLBAR */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    {/* Search Bar */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Tìm giống cây trồng, mã giống, trại giống, địa chỉ..."
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600"
                            >
                                Xóa
                            </button>
                        )}
                    </div>

                    {/* Result Counter */}
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                        <span>Số lượng giống:</span>
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-bold text-emerald-700">
                            {filteredItems.length} / {items.length} sản phẩm
                        </span>
                    </div>
                </div>

                {/* Variety Category Pills */}
                <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-4">
                    <span className="mr-1 flex items-center gap-1 text-xs font-bold text-slate-500">
                        <Filter className="h-3.5 w-3.5" />
                        Giống:
                    </span>
                    <button
                        type="button"
                        onClick={() => setSelectedVariety("ALL")}
                        className={cn(
                            "rounded-full px-3 py-1 text-xs font-bold transition",
                            selectedVariety === "ALL"
                                ? "bg-brand-600 text-white shadow-sm"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        )}
                    >
                        Tất cả giống
                    </button>
                    {varieties.map((v) => (
                        <button
                            key={v}
                            type="button"
                            onClick={() => setSelectedVariety(v)}
                            className={cn(
                                "rounded-full px-3 py-1 text-xs font-bold transition",
                                selectedVariety === v
                                    ? "bg-brand-600 text-white shadow-sm"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            )}
                        >
                            {v}
                        </button>
                    ))}
                </div>

                {/* Nursery Filter Pills */}
                {nurseries.length > 1 && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                        <span className="mr-1 flex items-center gap-1 text-xs font-bold text-slate-500">
                            <Building2 className="h-3.5 w-3.5" />
                            Trại giống:
                        </span>
                        <button
                            type="button"
                            onClick={() => setSelectedNursery("ALL")}
                            className={cn(
                                "rounded-lg px-2.5 py-0.5 text-xs font-semibold transition",
                                selectedNursery === "ALL"
                                    ? "bg-slate-800 text-white"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            )}
                        >
                            Tất cả trại
                        </button>
                        {nurseries.map((n) => (
                            <button
                                key={n}
                                type="button"
                                onClick={() => setSelectedNursery(n)}
                                className={cn(
                                    "rounded-lg px-2.5 py-0.5 text-xs font-semibold transition",
                                    selectedNursery === n
                                        ? "bg-slate-800 text-white"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            )}
                            >
                                {n}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* EMPTY STATE */}
            {filteredItems.length === 0 && (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                        <Sprout className="h-8 w-8" />
                    </div>
                    <h3 className="mt-4 text-base font-bold text-slate-900">
                        Không tìm thấy cây giống phù hợp
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                        Vui lòng kiểm tra lại từ khóa tìm kiếm hoặc chọn giống cây trồng khác.
                    </p>
                    <Button
                        variant="outline"
                        onClick={() => {
                            setSearchTerm("");
                            setSelectedVariety("ALL");
                            setSelectedNursery("ALL");
                        }}
                        className="mt-4 rounded-xl"
                    >
                        Xem tất cả cây giống
                    </Button>
                </div>
            )}

            {/* 4 CARDS PER ROW GRID (1 col mobile, 2 cols sm, 3 cols md, 4 cols lg) */}
            <div className="grid grid-cols-1 gap-4.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {filteredItems.map((item) => (
                    <article
                        key={item.id}
                        className="group flex flex-col justify-between overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-300 hover:shadow-xl"
                    >
                        <div>
                            {/* Card Image Thumbnail */}
                            <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
                                <Image
                                    src={item.imageUrls[0] || item.nurseryAvatar}
                                    alt={item.title}
                                    fill
                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />

                                {/* Top Badges */}
                                <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1">
                                    <span className="rounded-full bg-brand-600/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm backdrop-blur">
                                        {item.variety}
                                    </span>
                                </div>

                                {/* Stock Status Badge */}
                                <div className="absolute right-2.5 top-2.5">
                                    {item.status === "IN_STOCK" ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                                            <CheckCircle2 className="h-2.5 w-2.5" />
                                            Còn {item.availableQuantity} cây
                                        </span>
                                    ) : (
                                        <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                                            Tạm hết
                                        </span>
                                    )}
                                </div>

                                {/* Bottom Product Code in Image */}
                                <div className="absolute bottom-2 left-2.5">
                                    <span className="font-mono text-[10px] font-semibold text-white/90 drop-shadow">
                                        Mã: {item.code}
                                    </span>
                                </div>
                            </div>

                            {/* Card Content Body */}
                            <div className="space-y-2.5 p-4">
                                {/* Title */}
                                <h3 className="text-sm font-black leading-snug text-slate-900 line-clamp-2 min-h-[2.5rem]">
                                    <Link href={`/seedlings/${item.id}`} className="hover:text-brand-700 transition">
                                        {item.title}
                                    </Link>
                                </h3>

                                {/* Price Box */}
                                <div className="flex items-baseline justify-between border-b border-slate-100 pb-2">
                                    <div>
                                        <span className="text-[10px] font-semibold text-slate-400 block">
                                            Giá bán niêm yết:
                                        </span>
                                        <span className="text-base font-black text-emerald-700">
                                            {item.priceFormatted}
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-semibold text-slate-500">
                                        {item.specifications.treeHeight}
                                    </span>
                                </div>

                                {/* Nursery Provider Info */}
                                <div className="space-y-1 text-xs text-slate-600">
                                    <div className="flex items-start gap-1.5">
                                        <Building2 className="h-3.5 w-3.5 shrink-0 text-brand-600 mt-0.5" />
                                        <span className="font-bold text-slate-900 line-clamp-1">
                                            {item.nurseryName}
                                        </span>
                                    </div>
                                    <div className="flex items-start gap-1.5 text-[11px] text-slate-500">
                                        <MapPin className="h-3 w-3 shrink-0 text-slate-400 mt-0.5" />
                                        <span className="line-clamp-1">{item.nurseryAddress}</span>
                                    </div>
                                </div>

                                {/* Quick Spec Badges */}
                                <div className="flex flex-wrap gap-1 pt-0.5">
                                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                                        {item.specifications.treeAge}
                                    </span>
                                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                                        {item.specifications.packagingSpec}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Card Action Footer */}
                        <div className="border-t border-slate-100 bg-slate-50/60 p-3">
                            <Button
                                asChild
                                className="w-full rounded-xl bg-brand-600 text-xs font-bold text-white shadow-sm hover:bg-brand-700"
                            >
                                <Link href={`/seedlings/${item.id}`}>
                                    Xem chi tiết
                                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                                </Link>
                            </Button>
                        </div>
                    </article>
                ))}
            </div>
        </div>
    );
}
