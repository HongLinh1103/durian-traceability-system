"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

type CurrencyInputProps = {
    name: string;
    defaultValue?: number | string | null;
    placeholder?: string;
    required?: boolean;
    min?: number;
    className?: string;
};

function normalize(value: string | number | null | undefined) {
    const digits = String(value ?? "").replace(/\D/g, "").replace(/^0+(?=\d)/, "");
    return digits;
}

function format(value: string) {
    return value ? Number(value).toLocaleString("vi-VN") : "";
}

export function CurrencyInput({ name, defaultValue, placeholder, required, min, className }: CurrencyInputProps) {
    const initialValue = normalize(defaultValue);
    const [rawValue, setRawValue] = useState(initialValue);
    const visibleRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const form = visibleRef.current?.form;
        if (!form) return;
        const reset = () => setRawValue(initialValue);
        form.addEventListener("reset", reset);
        return () => form.removeEventListener("reset", reset);
    }, [initialValue]);

    return <>
        <Input
            ref={visibleRef}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={format(rawValue)}
            onChange={event => setRawValue(normalize(event.target.value))}
            placeholder={placeholder}
            required={required}
            className={className}
            aria-label={placeholder || name}
        />
        <input type="hidden" name={name} value={rawValue} data-min={min} />
    </>;
}
