"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Clock, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type TimePicker24hProps = {
    value?: string;
    defaultValue?: string;
    onChange?: (value: string) => void;
    name?: string;
    id?: string;
    required?: boolean;
    disabled?: boolean;
    className?: string;
    placeholder?: string;
    "aria-label"?: string;
};

// Normalize any time/datetime input to "HH:mm" in 24h
function normalizeTime(val?: string): string {
    if (!val) return "";
    const trimmed = val.trim();
    // If it's an ISO datetime like "2026-09-11T14:30"
    if (trimmed.includes("T")) {
        const timePart = trimmed.split("T")[1];
        if (timePart) {
            const [h, m] = timePart.split(":");
            if (h && m) return `${h.padStart(2, "0")}:${m.slice(0, 2).padStart(2, "0")}`;
        }
    }
    const match = /^([01]?\d|2[0-3]):([0-5]\d)/.exec(trimmed);
    if (match) {
        return `${match[1].padStart(2, "0")}:${match[2]}`;
    }
    return "";
}

export function TimePicker24h({
    value,
    defaultValue = "",
    onChange,
    name,
    id,
    required,
    disabled,
    className,
    placeholder = "HH:mm (24h)",
    ...rest
}: TimePicker24hProps) {
    const controlled = value !== undefined;
    const [internal, setInternal] = useState(() => normalizeTime(defaultValue));
    const currentTime = controlled ? normalizeTime(value) : internal;
    const [text, setText] = useState(currentTime);
    const [open, setOpen] = useState(false);
    const anchor = useRef<HTMLDivElement | null>(null);

    // Current split hours and minutes
    const [hStr, mStr] = currentTime ? currentTime.split(":") : ["", ""];
    const currentHour = hStr !== "" ? parseInt(hStr, 10) : new Date().getHours();
    const currentMinute = mStr !== "" ? parseInt(mStr, 10) : new Date().getMinutes();

    useEffect(() => {
        setText(currentTime);
    }, [currentTime]);

    function commit(next: string) {
        if (!controlled) setInternal(next);
        if (onChange) {
            // Also supports synthetic event for handlers expecting e.target.value
            const evt = { target: { value: next, name: name || "" } };
            try {
                (onChange as any)(next, evt);
            } catch {
                (onChange as any)(evt);
            }
        }
    }

    function handleTypeText(inputVal: string) {
        // Strip non-digit and non-colon
        const digits = inputVal.replace(/\D/g, "").slice(0, 4);
        let formatted = digits;

        if (digits.length === 1) {
            const firstNum = parseInt(digits, 10);
            if (firstNum >= 3) {
                formatted = `0${digits}:`;
            }
        } else if (digits.length === 2) {
            const hNum = parseInt(digits, 10);
            if (hNum > 23) {
                formatted = "23:";
            } else {
                formatted = `${digits}:`;
            }
        } else if (digits.length >= 3) {
            let h = digits.slice(0, 2);
            let m = digits.slice(2, 4);
            if (parseInt(h, 10) > 23) h = "23";
            if (m.length === 2 && parseInt(m, 10) > 59) m = "59";
            formatted = `${h}:${m}`;
        }

        setText(formatted);

        // If complete "HH:mm" (5 chars)
        if (/^([01]\d|2[0-3]):[0-5]\d$/.test(formatted)) {
            commit(formatted);
        }
    }

    function handleSelectTime(h: number, m: number) {
        const next = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        setText(next);
        commit(next);
    }

    function setNow() {
        const now = new Date();
        handleSelectTime(now.getHours(), now.getMinutes());
        setOpen(false);
    }

    const rect = anchor.current?.getBoundingClientRect();

    const hours = Array.from({ length: 24 }, (_, i) => i);
    const minutes = Array.from({ length: 60 }, (_, i) => i);

    return (
        <div ref={anchor} className={cn("relative w-full", className)}>
            {name && <input type="hidden" name={name} value={currentTime} required={required} />}
            <Input
                id={id}
                inputMode="numeric"
                maxLength={5}
                disabled={disabled}
                required={required}
                placeholder={placeholder}
                value={text}
                onChange={(e) => handleTypeText(e.target.value)}
                onBlur={() => {
                    if (/^([01]\d|2[0-3]):[0-5]\d$/.test(text)) {
                        commit(text);
                    } else if (text.trim() === "") {
                        commit("");
                    } else {
                        setText(currentTime);
                    }
                }}
                aria-label={rest["aria-label"]}
                className="h-10 w-full rounded-xl border border-slate-300 bg-white pr-14 font-mono text-xs font-semibold text-slate-800 focus:border-brand-500 focus:outline-none"
            />
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <span className="text-[10px] font-bold text-slate-400 select-none">24h</span>
                <button
                    type="button"
                    disabled={disabled}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600 transition"
                    onClick={() => setOpen((v) => !v)}
                    title="Chọn giờ (24h)"
                    aria-label="Mở bảng chọn giờ 24h"
                >
                    <Clock className="h-4 w-4" />
                </button>
            </div>

            {open &&
                rect &&
                typeof document !== "undefined" &&
                createPortal(
                    <>
                        <button
                            type="button"
                            className="fixed inset-0 z-[100000] cursor-default bg-slate-950/20 backdrop-blur-[1px]"
                            onClick={() => setOpen(false)}
                            aria-label="Đóng chọn giờ"
                        />
                        <div
                            className="fixed z-[100001] w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl animate-in zoom-in-95 duration-100"
                            style={{
                                left: Math.max(8, Math.min(rect.left, window.innerWidth - 300)),
                                top: Math.max(8, Math.min(rect.bottom + 6, window.innerHeight - 340)),
                            }}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                <div className="flex items-center gap-1.5">
                                    <Clock className="h-4 w-4 text-brand-600" />
                                    <span className="text-xs font-black uppercase tracking-wide text-slate-800">
                                        Chọn giờ (24 giờ)
                                    </span>
                                </div>
                                <span className="rounded-md bg-brand-50 px-2 py-0.5 font-mono text-xs font-bold text-brand-700">
                                    {currentTime || "--:--"}
                                </span>
                            </div>

                            {/* Hour and Minute Columns */}
                            <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
                                <div>
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                                        Giờ (00 - 23)
                                    </span>
                                    <div className="h-44 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/50 p-1 space-y-0.5 [-webkit-overflow-scrolling:touch]">
                                        {hours.map((h) => {
                                            const isSelected = hStr !== "" && currentHour === h;
                                            return (
                                                <button
                                                    key={h}
                                                    type="button"
                                                    onClick={() => handleSelectTime(h, mStr !== "" ? currentMinute : 0)}
                                                    className={cn(
                                                        "w-full rounded-lg py-1 font-mono text-xs font-bold transition",
                                                        isSelected
                                                            ? "bg-brand-600 text-white shadow-xs"
                                                            : "text-slate-700 hover:bg-slate-200"
                                                    )}
                                                >
                                                    {String(h).padStart(2, "0")} : xx
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                                        Phút (00 - 59)
                                    </span>
                                    <div className="h-44 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/50 p-1 space-y-0.5 [-webkit-overflow-scrolling:touch]">
                                        {minutes.map((m) => {
                                            const isSelected = mStr !== "" && currentMinute === m;
                                            return (
                                                <button
                                                    key={m}
                                                    type="button"
                                                    onClick={() => handleSelectTime(hStr !== "" ? currentHour : 12, m)}
                                                    className={cn(
                                                        "w-full rounded-lg py-1 font-mono text-xs font-bold transition",
                                                        isSelected
                                                            ? "bg-brand-600 text-white shadow-xs"
                                                            : "text-slate-700 hover:bg-slate-200"
                                                    )}
                                                >
                                                    xx : {String(m).padStart(2, "0")}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Common Quick Hours */}
                            <div className="mt-3 border-t border-slate-100 pt-2.5">
                                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                                    Mốc giờ nhanh
                                </span>
                                <div className="grid grid-cols-4 gap-1 text-[11px]">
                                    {["06:00", "07:30", "09:00", "11:30", "13:30", "15:00", "17:00", "19:00"].map((preset) => (
                                        <button
                                            key={preset}
                                            type="button"
                                            onClick={() => {
                                                const [h, m] = preset.split(":").map((v) => parseInt(v, 10));
                                                handleSelectTime(h, m);
                                            }}
                                            className={cn(
                                                "rounded-lg py-1 font-mono text-[11px] font-bold border transition",
                                                currentTime === preset
                                                    ? "border-brand-600 bg-brand-50 text-brand-700"
                                                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                            )}
                                        >
                                            {preset}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                                <button
                                    type="button"
                                    onClick={setNow}
                                    className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700 hover:bg-brand-100 transition"
                                >
                                    Bây giờ
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    className="rounded-xl bg-brand-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-700 transition shadow-xs flex items-center gap-1"
                                >
                                    <Check className="h-3.5 w-3.5" />
                                    Xong
                                </button>
                            </div>
                        </div>
                    </>,
                    document.body
                )}
        </div>
    );
}
