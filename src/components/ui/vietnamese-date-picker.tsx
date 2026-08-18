"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
    value?: string;
    defaultValue?: string;
    onChange?: (value: string) => void;
    name?: string;
    id?: string;
    required?: boolean;
    min?: string;
    max?: string;
    className?: string;
    placeholder?: string;
    "aria-label"?: string;
};

const display = (iso: string) => {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    return y && m && d ? `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}` : "";
};

const parse = (text: string) => {
    const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) return null;
    const [, d, m, y] = match;
    const date = new Date(+y, +m - 1, +d);
    if (
        date.getFullYear() === +y &&
        date.getMonth() === +m - 1 &&
        date.getDate() === +d
    ) {
        return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
    return null;
};

const localToday = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function VietnameseDatePicker({
    value,
    defaultValue = "",
    onChange,
    name,
    id,
    required,
    min = "1900-01-01",
    max = "2100-12-31",
    className,
    placeholder = "dd/mm/yyyy",
    ...rest
}: Props) {
    const controlled = value !== undefined;
    const [internal, setInternal] = useState(defaultValue);
    const iso = controlled ? value : internal;
    const [text, setText] = useState(display(iso));
    const [open, setOpen] = useState(false);
    const [view, setView] = useState(() => (iso ? new Date(`${iso}T00:00:00`) : new Date()));
    const anchor = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        setText(display(iso));
    }, [iso]);

    function commit(next: string) {
        if (min && next < min) return;
        if (max && next > max) return;
        if (!controlled) setInternal(next);
        onChange?.(next);
    }

    function type(textValue: string) {
        const digits = textValue.replace(/\D/g, "").slice(0, 8);
        const next = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)]
            .filter(Boolean)
            .join("/");
        setText(next);
        const parsed = parse(next);
        if (parsed) commit(parsed);
    }

    function choose(day: number) {
        const next = `${view.getFullYear()}-${String(view.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        commit(next);
        setOpen(false);
    }

    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const total = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    const cells = Array.from({ length: offset + total }, (_, i) =>
        i < offset ? null : i - offset + 1,
    );
    const rect = anchor.current?.getBoundingClientRect();

    // Generate year range for easy birthdate / historical selection
    const currentYear = new Date().getFullYear();
    const minYear = min ? parseInt(min.slice(0, 4), 10) : 1930;
    const maxYear = max ? parseInt(max.slice(0, 4), 10) : currentYear + 20;
    const years: number[] = [];
    for (let y = maxYear; y >= minYear; y--) {
        years.push(y);
    }

    return (
        <div ref={anchor} className={cn("relative w-full", className)}>
            <input type="hidden" name={name} value={iso} required={required} />
            <Input
                id={id}
                inputMode="numeric"
                maxLength={10}
                placeholder={placeholder}
                value={text}
                onChange={(e) => type(e.target.value)}
                onBlur={() => setText(display(iso))}
                aria-label={rest["aria-label"]}
                className="h-11 rounded-xl pr-10 text-sm font-medium"
            />
            <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-brand-700 hover:bg-brand-50"
                onClick={() => {
                    setView(iso ? new Date(`${iso}T00:00:00`) : new Date());
                    setOpen((v) => !v);
                }}
                aria-label="Mở lịch chọn ngày"
            >
                <CalendarDays className="h-4 w-4" />
            </button>

            {open &&
                rect &&
                typeof document !== "undefined" &&
                createPortal(
                    <>
                        <button
                            type="button"
                            className="fixed inset-0 z-[209] cursor-default bg-slate-950/20 backdrop-blur-[1px]"
                            onClick={() => setOpen(false)}
                            aria-label="Đóng lịch"
                        />
                        <div
                            className="fixed z-[210] w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
                            style={{
                                left: Math.max(8, Math.min(rect.left, window.innerWidth - 328)),
                                top: Math.max(8, Math.min(rect.bottom + 8, window.innerHeight - 380)),
                            }}
                        >
                            {/* Header with Month and Year Selectors */}
                            <div className="flex items-center justify-between gap-1 border-b border-slate-100 pb-3">
                                <button
                                    type="button"
                                    className="rounded-lg p-1.5 hover:bg-slate-100 text-slate-600"
                                    onClick={() =>
                                        setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))
                                    }
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>

                                <div className="flex items-center gap-1.5">
                                    <select
                                        value={view.getMonth()}
                                        onChange={(e) =>
                                            setView(new Date(view.getFullYear(), parseInt(e.target.value, 10), 1))
                                        }
                                        className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-bold text-slate-800"
                                    >
                                        {[
                                            "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4",
                                            "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8",
                                            "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
                                        ].map((m, idx) => (
                                            <option key={idx} value={idx}>{m}</option>
                                        ))}
                                    </select>

                                    <select
                                        value={view.getFullYear()}
                                        onChange={(e) =>
                                            setView(new Date(parseInt(e.target.value, 10), view.getMonth(), 1))
                                        }
                                        className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-bold text-slate-800"
                                    >
                                        {years.map((yr) => (
                                            <option key={yr} value={yr}>{yr}</option>
                                        ))}
                                    </select>
                                </div>

                                <button
                                    type="button"
                                    className="rounded-lg p-1.5 hover:bg-slate-100 text-slate-600"
                                    onClick={() =>
                                        setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))
                                    }
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Days of week */}
                            <div className="mt-2.5 grid grid-cols-7 text-center text-[11px] font-bold text-slate-400">
                                {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => (
                                    <span key={d} className="py-1.5">{d}</span>
                                ))}
                            </div>

                            {/* Calendar Days grid */}
                            <div className="grid grid-cols-7 gap-0.5">
                                {cells.map((day, index) => {
                                    if (!day) return <span key={`e-${index}`} />;
                                    const cellIso = `${view.getFullYear()}-${String(view.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                                    const isSelected = iso === cellIso;
                                    const isDisabled =
                                        Boolean(min && cellIso < min) || Boolean(max && cellIso > max);

                                    return (
                                        <button
                                            type="button"
                                            key={day}
                                            disabled={isDisabled}
                                            onClick={() => choose(day)}
                                            className={cn(
                                                "grid h-8 w-8 place-items-center rounded-xl text-xs font-semibold transition mx-auto",
                                                isSelected
                                                    ? "bg-brand-600 font-bold text-white shadow-xs"
                                                    : "text-slate-700 hover:bg-brand-50 hover:text-brand-800",
                                                isDisabled && "text-slate-300 pointer-events-none"
                                            )}
                                        >
                                            {day}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Footer Actions */}
                            <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-2.5">
                                <button
                                    type="button"
                                    className="flex-1 rounded-xl bg-brand-50 py-1.5 text-xs font-bold text-brand-700 hover:bg-brand-100 transition"
                                    onClick={() => {
                                        const today = localToday();
                                        commit(today);
                                        setOpen(false);
                                    }}
                                >
                                    Hôm nay
                                </button>
                                <button
                                    type="button"
                                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                                    onClick={() => {
                                        commit("");
                                        setText("");
                                        setOpen(false);
                                    }}
                                >
                                    Xóa
                                </button>
                            </div>
                        </div>
                    </>,
                    document.body,
                )}
        </div>
    );
}
