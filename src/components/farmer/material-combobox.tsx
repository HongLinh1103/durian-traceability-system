"use client";
import React, { useId, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { selfOwnedMaterial } from "@/lib/self-owned-materials";

export type MaterialOption = {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    type?: string;
    packaging?: string | null;
    source?: "WAREHOUSE" | "SELF_OWNED";
};

interface MaterialComboboxProps {
    supplies: MaterialOption[];
    selfOwnedSupplies?: MaterialOption[];
    allowSelfOwned?: boolean;
    value: string;
    onChange: (id: string) => void;
    onAddSelfOwned?: (item: MaterialOption) => void;
}

export function MaterialCombobox({
    supplies,
    selfOwnedSupplies = [],
    allowSelfOwned = false,
    value,
    onChange,
    onAddSelfOwned,
}: MaterialComboboxProps) {
    const id = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [open, setOpen] = useState(false);
    const [customNameInput, setCustomNameInput] = useState("");

    const effectiveSelfOwnedSupplies = useMemo(() => {
        const list = [...selfOwnedSupplies];
        if (!list.some((s) => s.name.toLowerCase().includes("chuồng") || s.id === "self-owned:composted-manure")) {
            list.unshift({
                id: "self-owned:composted-manure",
                name: "Phân chuồng ủ hoai mục",
                unit: "kg",
                quantity: 0,
                type: "FERTILIZER",
                source: "SELF_OWNED",
            });
        }
        return list;
    }, [selfOwnedSupplies]);

    const selected =
        supplies.find((s) => s.id === value) ||
        effectiveSelfOwnedSupplies.find((s) => s.id === value) ||
        (value.startsWith("self-owned:") ? selfOwnedMaterial(value) : undefined);

    const normalizedQuery = isSearching ? query.trim().toLocaleLowerCase("vi") : "";

    const warehouseFiltered = supplies.filter(
        (s) =>
            (!normalizedQuery || s.name.toLocaleLowerCase("vi").includes(normalizedQuery)) &&
            !s.name.toLocaleLowerCase("vi").includes("chuồng")
    );
    const inStock = warehouseFiltered.filter((s) => Number(s.quantity ?? 0) > 2);
    const lowStock = warehouseFiltered.filter(
        (s) => !Number.isFinite(Number(s.quantity ?? 0)) || Number(s.quantity ?? 0) <= 2
    );
    const warehouseOptions = [...inStock, ...lowStock];

    const selfOwnedOptions = allowSelfOwned
        ? effectiveSelfOwnedSupplies.filter(
              (s) => !normalizedQuery || s.name.toLocaleLowerCase("vi").includes(normalizedQuery)
          )
        : [];

    const choose = (s: MaterialOption) => {
        onChange(s.id);
        setOpen(false);
        setIsSearching(false);
        setQuery("");
    };

    const handleOpen = () => {
        setOpen(true);
        setIsSearching(false);
    };

    const handleAddCustomMaterial = () => {
        const trimmed = customNameInput.trim();
        if (!trimmed) return;
        const newId = `self-owned:${encodeURIComponent(trimmed)}`;
        const newItem: MaterialOption = {
            id: newId,
            name: trimmed,
            quantity: 0,
            unit: "kg",
            type: "FERTILIZER",
            source: "SELF_OWNED",
        };
        onAddSelfOwned?.(newItem);
        choose(newItem);
        setCustomNameInput("");
    };

    return (
        <div
            className="relative"
            onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) {
                    setOpen(false);
                    setIsSearching(false);
                    setQuery("");
                }
            }}
        >
            <div className="relative flex items-center">
                <input
                    ref={inputRef}
                    aria-label="Tên vật tư"
                    role="combobox"
                    aria-expanded={open}
                    aria-controls={id}
                    aria-autocomplete="list"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-3 pr-10 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
                    placeholder="Tìm kiếm hoặc chọn vật tư..."
                    value={isSearching ? query : (selected?.name || "")}
                    onClick={() => {
                        if (!open) {
                            handleOpen();
                        }
                    }}
                    onFocus={() => {
                        if (!open) {
                            handleOpen();
                        }
                    }}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsSearching(true);
                        setOpen(true);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Escape") {
                            setOpen(false);
                            setIsSearching(false);
                            setQuery("");
                        }
                    }}
                />
                <button
                    type="button"
                    tabIndex={-1}
                    aria-label="Mở danh sách vật tư"
                    className="absolute right-0 top-0 flex h-11 w-10 items-center justify-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setOpen((prev) => {
                            if (!prev) {
                                setIsSearching(false);
                                inputRef.current?.focus();
                                return true;
                            }
                            setIsSearching(false);
                            setQuery("");
                            return false;
                        });
                    }}
                >
                    <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ${
                            open ? "rotate-180 text-brand-600" : "text-slate-400"
                        }`}
                    />
                </button>
            </div>
            {open && (
                <div
                    id={id}
                    role="listbox"
                    className="absolute z-30 mt-1 max-h-80 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl"
                >
                    {/* NHÓM 1: VẬT TƯ TRONG KHO */}
                    <div className="sticky top-0 z-10 flex items-center justify-between rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm">
                        <span>VẬT TƯ TRONG KHO</span>
                        <span className="text-[11px] font-normal text-slate-500">
                            {warehouseOptions.length} vật tư
                        </span>
                    </div>

                    <div className="py-1">
                        {warehouseOptions.map((s) => {
                            const qty = Number(s.quantity ?? 0);
                            const isLowStock = !Number.isFinite(qty) || qty <= 2;
                            const isSelected = s.id === value;

                            return (
                                <div
                                    key={s.id}
                                    role="option"
                                    aria-selected={isSelected}
                                    className={`cursor-pointer rounded-lg p-2.5 text-sm transition-colors hover:bg-slate-100 ${
                                        isSelected ? "bg-slate-100/80 font-medium" : ""
                                    }`}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => choose(s)}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className={`block font-semibold ${isSelected ? "text-slate-900" : "text-slate-800"}`}>
                                            {s.name}
                                        </span>
                                    </div>
                                    <span className="mt-0.5 block text-xs text-slate-500">
                                        <span className={isLowStock ? "font-semibold text-red-600" : ""}>
                                            Tồn: {qty.toLocaleString("vi-VN")} {s.unit}
                                        </span>
                                        {s.packaging ? ` · Quy cách: ${s.packaging}` : ""}
                                    </span>
                                </div>
                            );
                        })}
                        {!warehouseOptions.length && (
                            <div className="p-2.5 text-center text-xs text-slate-400">
                                Không tìm thấy vật tư trong kho phù hợp.
                            </div>
                        )}
                    </div>

                    {/* NHÓM 2: VẬT TƯ TỰ CÓ */}
                    {allowSelfOwned && (
                        <div className="mt-2 border-t-2 border-emerald-200/80 pt-2">
                            {/* Tiêu đề nhóm Vật tư tự có */}
                            <div className="sticky top-0 z-10 flex items-center justify-between rounded-lg bg-emerald-100/90 px-3 py-1.5 text-xs font-bold text-emerald-900 shadow-sm">
                                <span>VẬT TƯ TỰ CHUẨN BỊ/TỰ Ủ</span>
                            </div>

                            {/* Ô text đơn thuần, có placeholder bên trong */}
                            <div className="py-2 px-1" onMouseDown={(e) => e.stopPropagation()}>
                                <div className="relative flex items-center">
                                    <input
                                        type="text"
                                        placeholder="Nhập tên vật tư tự có..."
                                        value={customNameInput}
                                        onChange={(e) => setCustomNameInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                handleAddCustomMaterial();
                                            }
                                        }}
                                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 pr-14 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                                    />
                                    {customNameInput.trim() && (
                                        <button
                                            type="button"
                                            onClick={handleAddCustomMaterial}
                                            className="absolute right-1 top-1 bottom-1 rounded-md bg-emerald-600 px-2.5 text-xs font-semibold text-white hover:bg-emerald-700 transition cursor-pointer"
                                        >
                                            Chọn
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Dòng chữ nhỏ Các vật tư đã thêm bên dưới tiêu đề Vật tư tự có */}
                            <div className="px-2 pt-1 pb-1">
                                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                                    Các vật tư đã thêm
                                </span>
                            </div>

                            {/* Liệt kê những vật tư tự có mà nông dân đã nhập trước đây */}
                            <div className="py-1">
                                {selfOwnedOptions.length > 0 ? (
                                    selfOwnedOptions.map((s) => {
                                        const isSelected = s.id === value;

                                        return (
                                            <div
                                                key={s.id}
                                                role="option"
                                                aria-selected={isSelected}
                                                className={`cursor-pointer rounded-lg p-2.5 text-sm transition-colors hover:bg-emerald-50 ${
                                                    isSelected ? "bg-emerald-50/90 font-medium" : ""
                                                }`}
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={() => choose(s)}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className={`block font-semibold ${isSelected ? "text-emerald-950" : "text-slate-800"}`}>
                                                        {s.name}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="px-3 py-2 text-xs text-slate-400 italic">
                                        Chưa có vật tư tự có nào trước đây.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
