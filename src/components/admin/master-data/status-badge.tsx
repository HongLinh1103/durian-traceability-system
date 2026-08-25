"use client";

import { cn } from "@/lib/utils";

type StatusBadgeProps = {
    isActive: boolean;
    className?: string;
};

/**
 * Badge hiển thị trạng thái "Đang sử dụng" / "Ngừng sử dụng"
 */
export function StatusBadge({ isActive, className }: StatusBadgeProps) {
    return (
        <span
            className={cn(
                "inline-flex items-center whitespace-nowrap shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                isActive
                    ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20"
                    : "bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/20",
                className,
            )}
        >
            <span
                className={cn(
                    "mr-1.5 inline-block h-1.5 w-1.5 rounded-full",
                    isActive ? "bg-green-600" : "bg-gray-400",
                )}
            />
            {isActive ? "Đang sử dụng" : "Ngừng sử dụng"}
        </span>
    );
}

