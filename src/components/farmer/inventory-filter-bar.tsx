"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface CropSeasonOption {
    id: string;
    name: string;
}

interface FarmOption {
    id: string;
    farmName: string;
    cropSeasons: CropSeasonOption[];
}

interface InventoryFilterBarProps {
    type: "IN" | "OUT";
    labels: Record<string, string>;
    exportPurposeLabels?: Record<string, string>;
    farms?: FarmOption[];
}

export function InventoryFilterBar({
    type,
    labels,
    exportPurposeLabels = {},
    farms = [],
}: InventoryFilterBarProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const currentQ = searchParams.get("q") || "";
    const currentKind = searchParams.get("kind") || "";
    const currentSeason = searchParams.get("season") || "";
    const currentPurpose = searchParams.get("purpose") || "";

    const [searchTerm, setSearchTerm] = useState(currentQ);

    useEffect(() => {
        setSearchTerm(currentQ);
    }, [currentQ]);

    const handleSelectChange = useCallback(
        (key: string, value: string) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set("tab", type);
            params.delete("page");

            if (value) {
                params.set(key, value);
            } else {
                params.delete(key);
            }

            router.push(`/materials/inventory?${params.toString()}`, { scroll: false });
        },
        [router, searchParams, type]
    );

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", type);
        params.delete("page");

        if (searchTerm.trim()) {
            params.set("q", searchTerm.trim());
        } else {
            params.delete("q");
        }

        router.push(`/materials/inventory?${params.toString()}`, { scroll: false });
    };

    const hasActiveFilters = Boolean(
        currentKind || currentQ || (type === "OUT" && (currentSeason || currentPurpose))
    );

    if (type === "IN") {
        return (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="grid gap-3 sm:grid-cols-3">
                    <label className="text-sm font-medium text-slate-700">
                        Loại vật tư
                        <select
                            value={currentKind}
                            onChange={(e) => handleSelectChange("kind", e.target.value)}
                            className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-brand-500 focus:outline-none"
                        >
                            <option value="">Tất cả loại</option>
                            {Object.entries(labels).map(([key, label]) => (
                                <option key={key} value={key}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </label>
                    <form onSubmit={handleSearchSubmit} className="text-sm font-medium text-slate-700 sm:col-span-2">
                        Tìm kiếm
                        <div className="relative mt-1 flex items-center">
                            <input
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Tên vật tư (ấn Enter để tìm)..."
                                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-brand-500 focus:outline-none pr-8"
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchTerm("");
                                        const params = new URLSearchParams(searchParams.toString());
                                        params.set("tab", "IN");
                                        params.delete("page");
                                        params.delete("q");
                                        router.push(`/materials/inventory?${params.toString()}`, { scroll: false });
                                    }}
                                    className="absolute right-2.5 text-slate-400 hover:text-slate-600"
                                    title="Xóa tìm kiếm"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </form>
                </div>
                {hasActiveFilters && (
                    <div className="mt-3 flex items-center justify-end border-t border-slate-100 pt-3">
                        <Link
                            href="/materials/inventory?tab=IN"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-600"
                        >
                            <X className="h-3.5 w-3.5" />
                            Đặt lại tất cả bộ lọc
                        </Link>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="text-sm font-medium text-slate-700">
                    Niên vụ
                    <select
                        value={currentSeason}
                        onChange={(e) => handleSelectChange("season", e.target.value)}
                        className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-2 text-sm focus:border-brand-500 focus:outline-none"
                    >
                        <option value="">Tất cả niên vụ</option>
                        {farms.flatMap((f) =>
                            f.cropSeasons.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {f.farmName} · {c.name}
                                </option>
                            ))
                        )}
                    </select>
                </label>
                <label className="text-sm font-medium text-slate-700">
                    Mục đích xuất
                    <select
                        value={currentPurpose}
                        onChange={(e) => handleSelectChange("purpose", e.target.value)}
                        className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-2 text-sm focus:border-brand-500 focus:outline-none"
                    >
                        <option value="">Tất cả mục đích</option>
                        {Object.entries(exportPurposeLabels).map(([key, label]) => (
                            <option key={key} value={key}>
                                {label}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="text-sm font-medium text-slate-700">
                    Loại vật tư
                    <select
                        value={currentKind}
                        onChange={(e) => handleSelectChange("kind", e.target.value)}
                        className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-2 text-sm focus:border-brand-500 focus:outline-none"
                    >
                        <option value="">Tất cả loại</option>
                        {Object.entries(labels).map(([key, label]) => (
                            <option key={key} value={key}>
                                {label}
                            </option>
                        ))}
                    </select>
                </label>
                <form onSubmit={handleSearchSubmit} className="text-sm font-medium text-slate-700">
                    Tìm kiếm
                    <div className="relative mt-1 flex items-center">
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Tên vật tư (ấn Enter để tìm)..."
                            className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-brand-500 focus:outline-none pr-8"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchTerm("");
                                    const params = new URLSearchParams(searchParams.toString());
                                    params.set("tab", "OUT");
                                    params.delete("page");
                                    params.delete("q");
                                    router.push(`/materials/inventory?${params.toString()}`, { scroll: false });
                                }}
                                className="absolute right-2.5 text-slate-400 hover:text-slate-600"
                                title="Xóa tìm kiếm"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </form>
            </div>
            {hasActiveFilters && (
                <div className="mt-3 flex items-center justify-end border-t border-slate-100 pt-3">
                    <Link
                        href="/materials/inventory?tab=OUT"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-600"
                    >
                        <X className="h-3.5 w-3.5" />
                        Đặt lại tất cả bộ lọc
                    </Link>
                </div>
            )}
        </div>
    );
}
