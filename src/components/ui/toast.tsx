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
};

type ToastContextValue = {
    toast: (toast: Omit<ToastItem, "id">) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

function ToastViewport({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
    return (
        <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3 sm:w-full">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={cn(
                        "pointer-events-auto rounded-3xl border bg-white p-4 shadow-2xl transition-all",
                        toast.variant === "success" && "border-brand-200",
                        toast.variant === "destructive" && "border-red-200",
                        toast.variant === "default" && "border-slate-200",
                    )}
                >
                    <div className="flex items-start gap-3">
                        <div className={cn("mt-0.5 rounded-full p-2", toast.variant === "destructive" ? "bg-red-50 text-red-600" : "bg-brand-50 text-brand-600")}>
                            {toast.variant === "destructive" ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
                            {toast.description ? <p className="mt-1 text-sm text-slate-500">{toast.description}</p> : null}
                        </div>
                        <button className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={() => onDismiss(toast.id)} aria-label="Đóng thông báo">
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
