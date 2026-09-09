"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type DateTimePicker24hProps = {
    value?: string;
    defaultValue?: string;
    onChange?: ((value: string) => void) | ((e: { target: { value: string; name?: string } }) => void);
    name?: string;
    id?: string;
    required?: boolean;
    disabled?: boolean;
    min?: string;
    max?: string;
    className?: string;
    placeholder?: string;
    "aria-label"?: string;
};

// Converts ISO "YYYY-MM-DDTHH:mm" to Vietnamese display "dd/mm/yyyy HH:mm"
function isoToDisplay(iso?: string): string {
    if (!iso) return "";
    const clean = iso.trim().replace("Z", "");
    const parts = clean.split("T");
    if (parts.length < 2) return "";
    const [y, m, d] = parts[0].split("-");
    const [hh, mm] = parts[1].split(":");
    if (!y || !m || !d || !hh || !mm) return "";
    return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y} ${hh.padStart(2, "0")}:${mm.slice(0, 2).padStart(2, "0")}`;
}

// Parses "dd/mm/yyyy HH:mm" back to "YYYY-MM-DDTHH:mm"
function displayToIso(text: string): string | null {
    const match = text.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+([01]?\d|2[0-3]):([0-5]\d)$/);
    if (!match) return null;
    const [, d, m, y, hh, mm] = match;
    const date = new Date(+y, +m - 1, +d);
    if (
        date.getFullYear() === +y &&
        date.getMonth() === +m - 1 &&
        date.getDate() === +d
    ) {
        return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T${hh.padStart(2, "0")}:${mm.padStart(2, "0")}`;
    }
    return null;
}

// Normalize any date/datetime input string into "YYYY-MM-DDTHH:mm"
function normalizeIso(val?: string): string {
    if (!val) return "";
    const trimmed = val.trim();
    if (trimmed.includes("T")) {
        const [dPart, tPart] = trimmed.split("T");
        const [y, m, d] = dPart.split("-");
        const [hh, mm] = (tPart || "00:00").split(":");
        if (y && m && d && hh && mm) {
            return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T${hh.padStart(2, "0")}:${mm.slice(0, 2).padStart(2, "0")}`;
        }
    }
    try {
        const parsed = new Date(trimmed);
        if (!isNaN(parsed.getTime())) {
            const y = parsed.getFullYear();
            const m = String(parsed.getMonth() + 1).padStart(2, "0");
            const d = String(parsed.getDate()).padStart(2, "0");
            const hh = String(parsed.getHours()).padStart(2, "0");
            const mm = String(parsed.getMinutes()).padStart(2, "0");
            return `${y}-${m}-${d}T${hh}:${mm}`;
        }
    } catch { }
    return "";
}

export function DateTimePicker24h({
    value,
    defaultValue = "",
    onChange,
    name,
    id,
    required,
    disabled,
    min,
    max,
    className,
    placeholder = "dd/mm/yyyy HH:mm",
    ...rest
}: DateTimePicker24hProps) {
    const controlled = value !== undefined;
    const [internal, setInternal] = useState(() => normalizeIso(defaultValue));
    const currentIso = controlled ? normalizeIso(value) : internal;
    const [text, setText] = useState(() => isoToDisplay(currentIso));
    const [open, setOpen] = useState(false);
    const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

    // Date view for calendar month/year
    const [viewDate, setViewDate] = useState(() => {
        if (currentIso) {
            const [dPart] = currentIso.split("T");
            if (dPart) return new Date(`${dPart}T00:00:00`);
        }
        return new Date();
    });

    // Time parts (24-hour)
    const [selectedHour, setSelectedHour] = useState<number>(() => {
        if (currentIso && currentIso.includes("T")) {
            const tPart = currentIso.split("T")[1];
            const h = parseInt(tPart.split(":")[0], 10);
            if (!isNaN(h)) return h;
        }
        return new Date().getHours();
    });

    const [selectedMinute, setSelectedMinute] = useState<number>(() => {
        if (currentIso && currentIso.includes("T")) {
            const tPart = currentIso.split("T")[1];
            const m = parseInt(tPart.split(":")[1], 10);
            if (!isNaN(m)) return m;
        }
        return new Date().getMinutes();
    });

    const anchor = useRef<HTMLDivElement | null>(null);

    const updateCoords = useCallback(() => {
        if (!anchor.current) return;
        const r = anchor.current.getBoundingClientRect();
        const popoverWidth = 320;
        const popoverHeight = 440;

        let top = r.bottom + 6;
        const spaceBelow = window.innerHeight - r.bottom;
        const spaceAbove = r.top;
        if (spaceBelow < popoverHeight && spaceAbove > spaceBelow) {
            top = Math.max(8, r.top - popoverHeight - 6);
        } else {
            top = Math.max(8, Math.min(top, window.innerHeight - popoverHeight - 8));
        }

        const left = Math.max(8, Math.min(r.left, window.innerWidth - popoverWidth - 8));
        setCoords({ top, left });
    }, []);

    useEffect(() => {
        if (!open) return;
        updateCoords();

        const onScrollOrResize = () => {
            updateCoords();
        };

        window.addEventListener("resize", onScrollOrResize);
        window.addEventListener("scroll", onScrollOrResize, true);

        return () => {
            window.removeEventListener("resize", onScrollOrResize);
            window.removeEventListener("scroll", onScrollOrResize, true);
        };
    }, [open, updateCoords]);

    useEffect(() => {
        setText(isoToDisplay(currentIso));
        if (currentIso && currentIso.includes("T")) {
            const [dPart, tPart] = currentIso.split("T");
            if (dPart) {
                const parsed = new Date(`${dPart}T00:00:00`);
                if (!isNaN(parsed.getTime())) setViewDate(parsed);
            }
            if (tPart) {
                const [h, m] = tPart.split(":");
                const hNum = parseInt(h, 10);
                const mNum = parseInt(m, 10);
                if (!isNaN(hNum)) setSelectedHour(hNum);
                if (!isNaN(mNum)) setSelectedMinute(mNum);
            }
        }
    }, [currentIso]);

    const handleToggle = () => {
        if (!open) {
            if (currentIso && currentIso.includes("T")) {
                const [dPart, tPart] = currentIso.split("T");
                if (dPart) {
                    const parsed = new Date(`${dPart}T00:00:00`);
                    if (!isNaN(parsed.getTime())) setViewDate(parsed);
                }
                if (tPart) {
                    const [h, m] = tPart.split(":");
                    const hNum = parseInt(h, 10);
                    const mNum = parseInt(m, 10);
                    if (!isNaN(hNum)) setSelectedHour(hNum);
                    if (!isNaN(mNum)) setSelectedMinute(mNum);
                }
            }
            updateCoords();
        }
        setOpen((v) => !v);
    };

    function commit(nextIso: string) {
        if (!controlled) setInternal(nextIso);
        if (onChange) {
            const syntheticEvent = { target: { value: nextIso, name: name || "" } };
            try {
                (onChange as any)(nextIso, syntheticEvent);
            } catch {
                (onChange as any)(syntheticEvent);
            }
        }
    }

    function handleTypeText(inputVal: string) {
        const digits = inputVal.replace(/\D/g, "").slice(0, 12);
        let formatted = "";

        if (digits.length <= 2) {
            formatted = digits;
        } else if (digits.length <= 4) {
            formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
        } else if (digits.length <= 8) {
            formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
        } else if (digits.length <= 10) {
            formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)} ${digits.slice(8)}`;
        } else {
            formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)} ${digits.slice(8, 10)}:${digits.slice(10, 12)}`;
        }

        setText(formatted);

        const parsed = displayToIso(formatted);
        if (parsed) {
            commit(parsed);
        }
    }

    function handleSelectDate(day: number) {
        const y = viewDate.getFullYear();
        const m = String(viewDate.getMonth() + 1).padStart(2, "0");
        const d = String(day).padStart(2, "0");
        const hh = String(selectedHour).padStart(2, "0");
        const mm = String(selectedMinute).padStart(2, "0");
        const nextIso = `${y}-${m}-${d}T${hh}:${mm}`;
        commit(nextIso);
    }

    function handleTimeChange(h: number, m: number) {
        setSelectedHour(h);
        setSelectedMinute(m);
        let datePart = currentIso ? currentIso.split("T")[0] : "";
        if (!datePart) {
            const now = new Date();
            datePart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        }
        const hh = String(h).padStart(2, "0");
        const mm = String(m).padStart(2, "0");
        const nextIso = `${datePart}T${hh}:${mm}`;
        commit(nextIso);
    }

    function setNow() {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, "0");
        const d = String(now.getDate()).padStart(2, "0");
        const hh = String(now.getHours()).padStart(2, "0");
        const mm = String(now.getMinutes()).padStart(2, "0");
        const nextIso = `${y}-${m}-${d}T${hh}:${mm}`;
        setViewDate(now);
        setSelectedHour(now.getHours());
        setSelectedMinute(now.getMinutes());
        commit(nextIso);
        setOpen(false);
    }

    const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const total = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
    const cells = Array.from({ length: offset + total }, (_, i) =>
        i < offset ? null : i - offset + 1
    );

    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let y = currentYear + 10; y >= currentYear - 10; y--) {
        years.push(y);
    }

    const selectedDayIso = currentIso ? currentIso.split("T")[0] : "";

    return (
        <div ref={anchor} className={cn("relative w-full", className)}>
            {name && <input type="hidden" name={name} value={currentIso} required={required} />}
            <Input
                id={id}
                inputMode="numeric"
                maxLength={16}
                disabled={disabled}
                required={required}
                placeholder={placeholder}
                value={text}
                onChange={(e) => handleTypeText(e.target.value)}
                onBlur={() => {
                    const parsed = displayToIso(text);
                    if (parsed) {
                        commit(parsed);
                    } else if (text.trim() === "") {
                        commit("");
                    } else {
                        setText(isoToDisplay(currentIso));
                    }
                }}
                aria-label={rest["aria-label"]}
                className="h-10 w-full rounded-xl border border-slate-300 bg-white pr-10 font-mono text-xs font-semibold text-slate-800 focus:border-brand-500 focus:outline-none"
            />
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center">
                <button
                    type="button"
                    disabled={disabled}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600 transition"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleToggle();
                    }}
                    title="Chọn ngày & giờ"
                    aria-label="Mở bảng chọn ngày giờ"
                >
                    <CalendarDays className="h-4 w-4" />
                </button>
            </div>

            {open &&
                typeof document !== "undefined" &&
                createPortal(
                    <>
                        <button
                            type="button"
                            className="fixed inset-0 z-[100000] cursor-default bg-slate-950/20 backdrop-blur-[1px]"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setOpen(false);
                            }}
                            aria-label="Đóng bảng chọn ngày giờ"
                        />
                        <div
                            className="fixed z-[100001] w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl animate-in zoom-in-95 duration-100"
                            style={{
                                left: coords ? coords.left : (anchor.current ? Math.max(8, Math.min(anchor.current.getBoundingClientRect().left, window.innerWidth - 328)) : 16),
                                top: coords ? coords.top : (anchor.current ? Math.min(anchor.current.getBoundingClientRect().bottom + 6, window.innerHeight - 440) : 100),
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header: Month and Year Select */}
                            <div className="flex items-center justify-between gap-1 border-b border-slate-100 pb-2.5">
                                <button
                                    type="button"
                                    className="rounded-lg p-1.5 hover:bg-slate-100 text-slate-600"
                                    onClick={() =>
                                        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))
                                    }
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>

                                <div className="flex items-center gap-1.5">
                                    <select
                                        value={viewDate.getMonth()}
                                        onChange={(e) =>
                                            setViewDate(new Date(viewDate.getFullYear(), parseInt(e.target.value, 10), 1))
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
                                        value={viewDate.getFullYear()}
                                        onChange={(e) =>
                                            setViewDate(new Date(parseInt(e.target.value, 10), viewDate.getMonth(), 1))
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
                                        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))
                                    }
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Days of week */}
                            <div className="mt-2 grid grid-cols-7 text-center text-[11px] font-bold text-slate-400">
                                {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => (
                                    <span key={d} className="py-1">{d}</span>
                                ))}
                            </div>

                            {/* Calendar Days grid */}
                            <div className="grid grid-cols-7 gap-0.5">
                                {cells.map((day, index) => {
                                    if (!day) return <span key={`e-${index}`} />;
                                    const cellIso = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                                    const isSelected = selectedDayIso === cellIso;

                                    return (
                                        <button
                                            type="button"
                                            key={day}
                                            onClick={() => handleSelectDate(day)}
                                            className={cn(
                                                "grid h-7 w-7 place-items-center rounded-lg text-xs font-semibold transition mx-auto",
                                                isSelected
                                                    ? "bg-brand-600 font-bold text-white shadow-xs"
                                                    : "text-slate-700 hover:bg-brand-50 hover:text-brand-800"
                                            )}
                                        >
                                            {day}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Time Picker Section (STRICTLY 24-HOUR FORMAT) */}
                            <div className="mt-3 border-t border-slate-100 pt-3">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                                        <Clock className="h-3.5 w-3.5 text-brand-600" />
                                        <span>Giờ thực hiện (24 giờ: 00:00 - 23:59)</span>
                                    </div>
                                    <span className="font-mono text-xs font-black text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-200">
                                        {String(selectedHour).padStart(2, "0")}:{String(selectedMinute).padStart(2, "0")}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                                            Giờ (00 - 23)
                                        </label>
                                        <select
                                            value={selectedHour}
                                            onChange={(e) => handleTimeChange(parseInt(e.target.value, 10), selectedMinute)}
                                            className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 font-mono text-xs font-bold text-slate-800 focus:border-brand-500 focus:outline-none"
                                        >
                                            {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                                                <option key={h} value={h}>
                                                    {String(h).padStart(2, "0")} giờ
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                                            Phút (00 - 59)
                                        </label>
                                        <select
                                            value={selectedMinute}
                                            onChange={(e) => handleTimeChange(selectedHour, parseInt(e.target.value, 10))}
                                            className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 font-mono text-xs font-bold text-slate-800 focus:border-brand-500 focus:outline-none"
                                        >
                                            {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                                                <option key={m} value={m}>
                                                    {String(m).padStart(2, "0")} phút
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                                <button
                                    type="button"
                                    onClick={setNow}
                                    className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700 hover:bg-brand-100 transition"
                                >
                                    Bây giờ
                                </button>
                                <div className="flex gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            commit("");
                                            setText("");
                                            setOpen(false);
                                        }}
                                        className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                                    >
                                        Xóa
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setOpen(false)}
                                        className="rounded-xl bg-brand-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-brand-700 transition shadow-xs flex items-center gap-1"
                                    >
                                        <Check className="h-3.5 w-3.5" />
                                        Xác nhận
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>,
                    document.body
                )}
        </div>
    );
}
