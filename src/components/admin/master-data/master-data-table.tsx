"use client";

import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ColumnDef<T> = {
    key: string;
    header: string;
    render: (item: T, index: number) => ReactNode;
    className?: string;
    sortable?: boolean;
};

export type PaginationMeta = {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
};

type MasterDataTableProps<T> = {
    columns: ColumnDef<T>[];
    data: T[];
    isLoading: boolean;
    error?: string | null;
    pagination: PaginationMeta;
    onPageChange: (page: number) => void;
    emptyMessage?: string;
    keyExtractor: (item: T) => string;
};

/**
 * Bảng dữ liệu dùng chung cho Master Data
 * Hỗ trợ: loading skeleton, empty state, error state, phân trang
 */
export function MasterDataTable<T>({
    columns,
    data,
    isLoading,
    error,
    pagination,
    onPageChange,
    emptyMessage = "Chưa có dữ liệu.",
    keyExtractor,
}: MasterDataTableProps<T>) {
    // --- Loading State ---
    if (isLoading) {
        return (
            <div className="flex min-h-[300px] items-center justify-center rounded-3xl border border-slate-200 bg-white">
                <div className="text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-600" />
                    <p className="mt-3 text-sm text-slate-500">Đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }

    // --- Error State ---
    if (error) {
        return (
            <div className="flex min-h-[300px] items-center justify-center rounded-3xl border border-red-200 bg-red-50">
                <div className="text-center">
                    <p className="text-sm font-semibold text-red-700">Không thể tải dữ liệu</p>
                    <p className="mt-1 text-sm text-red-600">{error}</p>
                </div>
            </div>
        );
    }

    // --- Empty State ---
    if (data.length === 0) {
        return (
            <div className="flex min-h-[300px] items-center justify-center rounded-3xl border border-slate-200 bg-white">
                <div className="text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                        <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                    </div>
                    <p className="text-sm font-semibold text-slate-700">{emptyMessage}</p>
                    <p className="mt-1 text-xs text-slate-500">Hãy thêm dữ liệu mới để bắt đầu.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
            {/* Table - Desktop */}
            <div className="hidden overflow-x-auto sm:block">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className={cn(
                                        "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500",
                                        col.className,
                                    )}
                                >
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.map((item, index) => (
                            <tr key={keyExtractor(item)} className="hover:bg-slate-50/50">
                                {columns.map((col) => (
                                    <td key={col.key} className={cn("whitespace-nowrap px-4 py-3 text-sm text-slate-700", col.className)}>
                                        {col.render(item, index)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Cards - Mobile */}
            <div className="divide-y divide-slate-100 sm:hidden">
                {data.map((item, index) => (
                    <div key={keyExtractor(item)} className="space-y-2 p-4">
                        {columns.map((col) => (
                            <div key={col.key} className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-slate-500">{col.header}</span>
                                <span className="text-sm text-slate-900">{col.render(item, index)}</span>
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
                    <p className="text-sm text-slate-500">
                        Trang {pagination.page} / {pagination.totalPages} ({pagination.totalItems} bản ghi)
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pagination.page <= 1}
                            onClick={() => onPageChange(pagination.page - 1)}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pagination.page >= pagination.totalPages}
                            onClick={() => onPageChange(pagination.page + 1)}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

