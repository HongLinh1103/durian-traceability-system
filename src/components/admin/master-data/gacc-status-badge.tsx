"use client";

import { cn } from "@/lib/utils";
type GaccChemicalStatus = "ALLOWED" | "RESTRICTED" | "PROHIBITED" | "UNKNOWN";

const GACC_LABELS: Record<GaccChemicalStatus, { label: string; className: string }> = {
    ALLOWED: {
        label: "Được phép",
        className: "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20",
    },
    RESTRICTED: {
        label: "Hạn chế",
        className: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20",
    },
    PROHIBITED: {
        label: "Bị cấm",
        className: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20",
    },
    UNKNOWN: {
        label: "Chưa xác định",
        className: "bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/20",
    },
};

type GaccStatusBadgeProps = {
    status: GaccChemicalStatus;
    className?: string;
};

/**
 * Badge hiển thị trạng thái GACC của thuốc BVTV
 */
export function GaccStatusBadge({ status, className }: GaccStatusBadgeProps) {
    const config = GACC_LABELS[status] ?? GACC_LABELS.UNKNOWN;

    return (
        <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", config.className, className)}>
            {config.label}
        </span>
    );
}

