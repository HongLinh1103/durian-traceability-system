"use client";

import { useState, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

type ConfirmActionDialogProps = {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
    title: string;
    message: string | ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: "danger" | "warning" | "info";
};

/**
 * Dialog xác nhận thao tác nguy hiểm (xóa, ngừng sử dụng, kích hoạt lại, ...)
 */
export function ConfirmActionDialog({
    open,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = "Xác nhận",
    cancelLabel = "Hủy",
    variant = "danger",
}: ConfirmActionDialogProps) {
    const [isLoading, setIsLoading] = useState(false);

    if (!open) return null;

    const handleConfirm = async () => {
        setIsLoading(true);
        try {
            await onConfirm();
        } finally {
            setIsLoading(false);
            onClose();
        }
    };

    const variantStyles = {
        danger: {
            icon: "bg-red-100 text-red-600",
            button: "destructive" as const,
        },
        warning: {
            icon: "bg-amber-100 text-amber-600",
            button: "default" as const,
        },
        info: {
            icon: "bg-blue-100 text-blue-600",
            button: "default" as const,
        },
    }[variant];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
                <div className="flex items-start gap-4">
                    <div className={`rounded-full p-2 ${variantStyles.icon}`}>
                        <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                        <div className="mt-2 text-sm text-slate-600">{typeof message === "string" ? <p>{message}</p> : message}</div>
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                        {cancelLabel}
                    </Button>
                    <Button variant={variantStyles.button} onClick={handleConfirm} disabled={isLoading}>
                        {isLoading ? "Đang xử lý..." : confirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
}

