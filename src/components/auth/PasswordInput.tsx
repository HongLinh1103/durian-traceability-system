"use client";

import { useState } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { Input, type InputProps } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface PasswordInputProps extends Omit<InputProps, "type" | "value" | "onChange"> {
    label: string;
    value: string;
    onValueChange: (value: string) => void;
    error?: string;
    helperText?: string;
}

export function PasswordInput({
    label,
    value,
    onValueChange,
    error,
    helperText,
    id,
    className,
    placeholder = "••••••••",
    autoComplete = "current-password",
    ...props
}: PasswordInputProps) {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <div className="space-y-2">
            <Label htmlFor={id}>{label}</Label>
            <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                    id={id}
                    type={isVisible ? "text" : "password"}
                    value={value}
                    onChange={(event) => onValueChange(event.target.value)}
                    placeholder={placeholder}
                    autoComplete={autoComplete}
                    className={cn("pr-12 pl-10", className)}
                    aria-invalid={Boolean(error)}
                    {...props}
                />
                <button
                    type="button"
                    onClick={() => setIsVisible((current) => !current)}
                    className="absolute right-2 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    aria-label={isVisible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                    {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
            </div>

            {helperText ? <p className="text-xs text-slate-500">{helperText}</p> : null}
            {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}
        </div>
    );
}
