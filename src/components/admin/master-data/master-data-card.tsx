"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type MasterDataCardProps = {
    title: string;
    description: string;
    totalItems: number;
    activeItems: number;
    inactiveItems: number;
    href: string;
    icon: React.ReactNode;
};

/**
 * Thẻ tổng quan cho một danh mục Master Data
 */
export function MasterDataCard({
    title,
    description,
    totalItems,
    activeItems,
    inactiveItems,
    href,
    icon,
}: MasterDataCardProps) {
    return (
        <Card className="flex flex-col">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-brand-50 p-3 text-brand-700">{icon}</div>
                    <div>
                        <CardTitle className="text-lg">{title}</CardTitle>
                        <CardDescription>{description}</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="mb-4 grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-2xl bg-slate-50 p-3">
                        <p className="text-2xl font-black text-slate-900">{totalItems}</p>
                        <p className="text-xs text-slate-500">Tổng số</p>
                    </div>
                    <div className="rounded-2xl bg-green-50 p-3">
                        <p className="text-2xl font-black text-green-700">{activeItems}</p>
                        <p className="text-xs text-green-600">Đang sử dụng</p>
                    </div>
                    <div className="rounded-2xl bg-gray-50 p-3">
                        <p className="text-2xl font-black text-gray-700">{inactiveItems}</p>
                        <p className="text-xs text-gray-500">Ngừng sử dụng</p>
                    </div>
                </div>
                <Button asChild className="w-full">
                    <Link href={href}>
                        Quản lý {title.toLowerCase()}
                        <ChevronRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );
}

