"use client";

import * as React from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "default" | "success" | "destructive";

type ToastItem = {
    id: string;
    title: string;
    description?: string;
    variant: ToastVariant;
    action?: {
        label: string;
        onClick?: () => void;
        href?: string;
    };
};

type ToastContextValue = {
    toast: (toast: Omit<ToastItem, "id">) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

function ToastViewport({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
    return (
        <div className="pointer-events-none fixed top-4 inset-x-4 z-[9999] flex flex-col gap-2.5 sm:top-6 sm:right-6 sm:left-auto sm:inset-x-auto sm:w-full sm:max-w-sm">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={cn(
                        "pointer-events-auto rounded-2xl border bg-white/95 p-3.5 shadow-2xl backdrop-blur-md transition-all sm:rounded-3xl sm:p-4",
                        toast.variant === "success" && "border-emerald-200 bg-white ring-1 ring-emerald-200 shadow-emerald-900/10",
                        toast.variant === "destructive" && "border-red-200 bg-white ring-1 ring-red-200 shadow-red-900/10",
                        toast.variant === "default" && "border-slate-200 bg-white",
                    )}
                >
                    <div className="flex items-start gap-3">
                        <div className={cn("mt-0.5 rounded-full p-1.5 shrink-0 sm:p-2", toast.variant === "destructive" ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700")}>
                            {toast.variant === "destructive" ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-bold text-slate-900">{toast.title}</p>
                            {toast.description ? <p className="mt-0.5 text-[11px] sm:text-xs text-slate-600 leading-relaxed">{toast.description}</p> : null}
                            {toast.action && (
                                <div className="mt-2">
                                    {toast.action.href ? (
                                        <a
                                            href={toast.action.href}
                                            className="inline-flex items-center text-xs font-bold text-brand-700 underline underline-offset-2 hover:text-brand-800"
                                        >
                                            {toast.action.label} →
                                        </a>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={toast.action.onClick}
                                            className="inline-flex items-center text-xs font-bold text-brand-700 underline underline-offset-2 hover:text-brand-800"
                                        >
                                            {toast.action.label}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                        <button className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition" onClick={() => onDismiss(toast.id)} aria-label="Đóng thông báo">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = React.useState<ToastItem[]>([]);

    const dismiss = React.useCallback((id: string) => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
    }, []);

    const toast = React.useCallback(
        (input: Omit<ToastItem, "id">) => {
            const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
            setToasts((current) => [...current, { id, ...input }]);
            window.setTimeout(() => dismiss(id), 4000);
        },
        [dismiss],
    );

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            <ToastViewport toasts={toasts} onDismiss={dismiss} />
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = React.useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within ToastProvider");
    }
    return context;
}
