"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
    MapPin,
    Phone,
    User,
    Award,
    Factory,
    Truck,
    Search,
    CheckCircle2,
    Building2,
    ExternalLink,
    Filter,
    Layers,
    Boxes,
    PhoneCall,
    Sparkles,
} from "lucide-react";
import type { FacilityItem } from "@/lib/facilities-data";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FacilityListClientProps = {
    items: FacilityItem[];
    type: "COLLECTOR" | "PROCESSING_FACILITY";
};

export function FacilityListClient({ items, type }: FacilityListClientProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedProvince, setSelectedProvince] = useState<string>("ALL");

    // Extract available provinces
    const provinces = useMemo(() => {
        const set = new Set<string>();
        items.forEach((item) => {
            if (item.province) set.add(item.province);
        });
        return Array.from(set);
    }, [items]);

    // Filter items
    const filteredItems = useMemo(() => {
        return items.filter((item) => {
            const matchesSearch =
                !searchTerm.trim() ||
                item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.representativeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.phone.includes(searchTerm);

            const matchesProvince =
                selectedProvince === "ALL" || item.province === selectedProvince;

            return matchesSearch && matchesProvince;
        });
    }, [items, searchTerm, selectedProvince]);

    const isCollector = type === "COLLECTOR";

    return (
        <div className="space-y-8">
            {/* SEARCH & PROVINCE FILTER BAR */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    {/* Search Input */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={
                                isCollector
                                    ? "Tìm theo tên vựa, địa chỉ, người đại diện, số điện thoại..."
                                    : "Tìm theo tên xưởng chế biến, địa chỉ, công nghệ..."
                            }
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

                    {/* Quick Stats */}
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                        <span>Hiển thị:</span>
                        <span className="rounded-full bg-brand-50 px-2.5 py-1 font-bold text-brand-700">
                            {filteredItems.length} / {items.length} {isCollector ? "vựa thu mua" : "xưởng chế biến"}
                        </span>
                    </div>
                </div>

                {/* Province Filter Pills */}
                {provinces.length > 0 && (
                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                        <span className="flex items-center gap-1 text-xs font-bold text-slate-500 mr-1">
                            <Filter className="h-3.5 w-3.5" />
                            Khu vực:
                        </span>
                        <button
                            type="button"
                            onClick={() => setSelectedProvince("ALL")}
                            className={cn(
                                "rounded-full px-3 py-1 text-xs font-bold transition",
                                selectedProvince === "ALL"
                                    ? "bg-brand-600 text-white shadow-sm"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            )}
                        >
                            Tất cả khu vực
                        </button>
                        {provinces.map((prov) => (
                            <button
                                key={prov}
                                type="button"
                                onClick={() => setSelectedProvince(prov)}
                                className={cn(
                                    "rounded-full px-3 py-1 text-xs font-bold transition",
                                    selectedProvince === prov
                                        ? "bg-brand-600 text-white shadow-sm"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                )}
                            >
                                {prov}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* EMPTY STATE */}
            {filteredItems.length === 0 && (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                        {isCollector ? <Truck className="h-8 w-8" /> : <Factory className="h-8 w-8" />}
                    </div>
                    <h3 className="mt-4 text-base font-bold text-slate-900">
                        Không tìm thấy kết quả phù hợp
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                        Vui lòng thử tìm kiếm bằng từ khóa khác hoặc xóa bộ lọc khu vực.
                    </p>
                    <Button
                        variant="outline"
                        onClick={() => {
                            setSearchTerm("");
                            setSelectedProvince("ALL");
                        }}
                        className="mt-4 rounded-xl"
                    >
                        Đặt lại tìm kiếm
                    </Button>
                </div>
            )}

            {/* CARD GRID */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2">
                {filteredItems.map((facility) => (
                    <article
                        key={facility.id}
                        className="group flex flex-col justify-between overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-300 hover:shadow-xl"
                    >
                        <div>
                            {/* Card Image / Avatar Banner */}
                            <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                                <Image
                                    src={facility.avatar}
                                    alt={facility.name}
                                    fill
                                    sizes="(max-width: 768px) 100vw, 50vw"
                                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

                                {/* Top Badges */}
                                <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-600/90 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm backdrop-blur">
                                        <Building2 className="h-3 w-3" />
                                        {facility.organizationType}
                                    </span>
                                    <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-slate-800 shadow-sm backdrop-blur">
                                        <MapPin className="h-3 w-3 text-brand-600" />
                                        {facility.province}
                                    </span>
                                </div>

                                {/* Rating Badge */}
                                {facility.rating && (
                                    <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-[11px] font-extrabold text-slate-950 shadow-sm">
                                        <span>⭐ {facility.rating}</span>
                                    </div>
                                )}

                                {/* Bottom Overlay Title in Banner */}
                                <div className="absolute bottom-3 left-4 right-4">
                                    <h3 className="text-lg font-black leading-snug text-white drop-shadow-md">
                                        {facility.name}
                                    </h3>
                                </div>
                            </div>

                            {/* Card Content Body */}
                            <div className="space-y-4 p-5 sm:p-6">
                                {/* Contact Info Box */}
                                <div className="grid grid-cols-1 gap-2.5 rounded-2xl bg-slate-50 p-3.5 text-xs text-slate-700 sm:grid-cols-2">
                                    {/* Representative */}
                                    <div className="flex items-start gap-2">
                                        <User className="h-4 w-4 shrink-0 text-brand-600 mt-0.5" />
                                        <div>
                                            <span className="text-[11px] font-semibold text-slate-400 block">
                                                Người đại diện:
                                            </span>
                                            <span className="font-bold text-slate-900">
                                                {facility.representativeName}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Phone number */}
                                    <div className="flex items-start gap-2">
                                        <Phone className="h-4 w-4 shrink-0 text-brand-600 mt-0.5" />
                                        <div>
                                            <span className="text-[11px] font-semibold text-slate-400 block">
                                                Hotline liên hệ:
                                            </span>
                                            <a
                                                href={`tel:${facility.phone}`}
                                                className="font-black text-brand-700 hover:underline inline-flex items-center gap-1"
                                            >
                                                {facility.phone}
                                            </a>
                                        </div>
                                    </div>

                                    {/* Address */}
                                    <div className="col-span-1 sm:col-span-2 flex items-start gap-2 pt-1 border-t border-slate-200/60">
                                        <MapPin className="h-4 w-4 shrink-0 text-brand-600 mt-0.5" />
                                        <div>
                                            <span className="text-[11px] font-semibold text-slate-400 block">
                                                Địa chỉ hoạt động:
                                            </span>
                                            <span className="font-medium text-slate-800 leading-relaxed">
                                                {facility.address}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Capacity & Scale */}
                                {facility.expectedCapacity && (
                                    <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/60 px-3.5 py-2 text-xs">
                                        <span className="flex items-center gap-1.5 font-bold text-emerald-900">
                                            {isCollector ? <Truck className="h-4 w-4 text-emerald-600" /> : <Factory className="h-4 w-4 text-emerald-600" />}
                                            {isCollector ? "Khối lượng tiếp nhận:" : "Công suất chế biến:"}
                                        </span>
                                        <span className="font-black text-emerald-800">
                                            {facility.expectedCapacity} {facility.capacityUnit || "tấn/ngày"}
                                        </span>
                                    </div>
                                )}

                                {/* Purchasing Areas (for Collector) */}
                                {isCollector && facility.purchasingAreas && facility.purchasingAreas.length > 0 && (
                                    <div className="space-y-1.5">
                                        <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                            <Boxes className="h-3.5 w-3.5 text-slate-400" />
                                            Vùng thu mua chính:
                                        </span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {facility.purchasingAreas.map((area) => (
                                                <span
                                                    key={area}
                                                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-700"
                                                >
                                                    {area}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Processing Types (for Facility) */}
                                {!isCollector && facility.processingTypes && facility.processingTypes.length > 0 && (
                                    <div className="space-y-1.5">
                                        <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                            <Layers className="h-3.5 w-3.5 text-slate-400" />
                                            Quy trình & Dòng sản phẩm:
                                        </span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {facility.processingTypes.map((typeItem) => (
                                                <span
                                                    key={typeItem}
                                                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800"
                                                >
                                                    {typeItem}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Description */}
                                {facility.description && (
                                    <p className="text-xs leading-relaxed text-slate-600 line-clamp-2">
                                        {facility.description}
                                    </p>
                                )}

                                {/* Certifications Badges */}
                                {facility.certifications && facility.certifications.length > 0 && (
                                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                        {facility.certifications.map((cert) => (
                                            <span
                                                key={cert}
                                                className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700"
                                            >
                                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                                {cert}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Card Action Footer */}
                        <div className="border-t border-slate-100 bg-slate-50/80 px-5 py-3.5">
                            <Button
                                asChild
                                className="w-full rounded-xl bg-brand-600 font-bold text-white shadow-sm hover:bg-brand-700"
                            >
                                <a href={`tel:${facility.phone}`}>
                                    <PhoneCall className="mr-2 h-4 w-4" />
                                    Gọi liên hệ ({facility.phone})
                                </a>
                            </Button>
                        </div>
                    </article>
                ))}
            </div>
        </div>
    );
}
