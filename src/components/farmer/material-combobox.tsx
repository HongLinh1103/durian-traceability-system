"use client";
import React, { useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export type MaterialOption = {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    packaging?: string | null;
    source?: "SELF_OWNED";
};

export function MaterialCombobox({
    supplies,
    value,
    onChange,
}: {
    supplies: MaterialOption[];
    value: string;
    onChange: (id: string) => void;
}) {
    const id = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);

    const selected = supplies.find((s) => s.id === value);

    const normalizedQuery = isSearching ? query.trim().toLocaleLowerCase("vi") : "";
    const filtered = supplies.filter(
        (s) => !normalizedQuery || s.name.toLocaleLowerCase("vi").includes(normalizedQuery)
    );

    // Hiển thị tất cả vật tư: vật tư tồn > 2 hiển thị trước, vật tư tồn <= 2 hiển thị ở cuối dropdown
    const inStock = filtered.filter((s) => !s.source && Number(s.quantity ?? 0) > 2);
    const lowStock = filtered.filter(
        (s) => !s.source && (!Number.isFinite(Number(s.quantity ?? 0)) || Number(s.quantity ?? 0) <= 2)
    );
    const options = [...inStock, ...lowStock, ...filtered.filter(s => s.source === "SELF_OWNED")];
    const grouped = supplies.some(s => s.source === "SELF_OWNED");

    const choose = (s: MaterialOption) => {
        onChange(s.id);
        setOpen(false);
        setIsSearching(false);
        setQuery("");
    };

    const handleOpen = () => {
        setOpen(true);
        setIsSearching(false);
        const idx = options.findIndex((s) => s.id === value);
        setActive(idx >= 0 ? idx : 0);
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
                    aria-activedescendant={open && options[active] ? `${id}-${active}` : undefined}
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
                        setActive(0);
                        setOpen(true);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Escape") {
                            setOpen(false);
                            setIsSearching(false);
                            setQuery("");
                        }
                        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                            e.preventDefault();
                            if (!open) {
                                handleOpen();
                            } else {
                                setActive((i) =>
                                    Math.max(0, Math.min(options.length - 1, i + (e.key === "ArrowDown" ? 1 : -1)))
                                );
                            }
                        }
                        if (e.key === "Enter" && open) {
                            e.preventDefault();
                            if (options[active]) choose(options[active]);
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
                                const idx = options.findIndex((s) => s.id === value);
                                setActive(idx >= 0 ? idx : 0);
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
                <ul
                    id={id}
                    role="listbox"
                    className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
                >
                    {options.map((s, i) => {
                        const qty = Number(s.quantity ?? 0);
                        const isLowStock = !Number.isFinite(qty) || qty <= 2;
                        const isSelected = s.id === value;

                        return (
                            <React.Fragment key={s.id}>
                            {grouped && (i === 0 || options[i - 1].source !== s.source) && <li role="presentation" className="px-3 py-2 text-xs font-bold text-slate-500">{s.source ? "VẬT TƯ TỰ CÓ / KHÔNG QUA KHO" : "VẬT TƯ TRONG KHO"}</li>}
                            <li
                                id={`${id}-${i}`}
                                key={s.id}
                                role="option"
                                aria-selected={isSelected}
                                className={`cursor-pointer rounded-lg p-3 text-sm transition-colors hover:bg-brand-50 ${
                                    isSelected
                                        ? "bg-brand-50/70"
                                        : i === active
                                        ? "bg-slate-50"
                                        : ""
                                }`}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => choose(s)}
                            >
                                <div className="flex items-center justify-between">
                                    <span className={`block font-semibold ${isSelected ? "text-brand-900" : "text-slate-800"}`}>
                                        {s.name}
                                    </span>
                                </div>
                                <span className="mt-0.5 block text-xs text-slate-500">
                                    {s.source ? "Nguồn tự có · Không qua kho" : <span className={isLowStock ? "font-semibold text-red-600" : ""}>
                                        Tồn: {qty.toLocaleString("vi-VN")} {s.unit}
                                    </span>}
                                    {s.packaging ? ` · Quy cách: ${s.packaging}` : ""}
                                </span>
                            </li>
                            </React.Fragment>
                        );
                    })}
                    {!options.length && (
                        <li className="p-3 text-sm text-slate-500 text-center">Không tìm thấy vật tư phù hợp.</li>
                    )}
                </ul>
            )}
        </div>
    );
}
