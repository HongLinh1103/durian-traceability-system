"use client";

import { useState } from "react";
import { Sprout, Package } from "lucide-react";
import { StoreProductsManager } from "@/components/store/store-products-manager";
import { NurseryDashboardClient } from "@/components/nursery/NurseryDashboardClient";
import type { SeedlingItem } from "@/lib/seedlings-data";

type StoreProductsUnifiedProps = {
    seedlings: SeedlingItem[];
    userPhone?: string;
    isNurseryAccount?: boolean;
};

export function StoreProductsUnified({
    seedlings,
    userPhone,
    isNurseryAccount = false,
}: StoreProductsUnifiedProps) {
    const [activeTab, setActiveTab] = useState<"SEEDLINGS" | "STORE_PRODUCTS">(
        isNurseryAccount ? "SEEDLINGS" : "SEEDLINGS"
    );

    return (
        <div className="space-y-6">
            {/* Tab Selector */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                <button
                    type="button"
                    onClick={() => setActiveTab("SEEDLINGS")}
                    className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold transition shadow-xs ${
                        activeTab === "SEEDLINGS"
                            ? "bg-brand-600 text-white shadow-soft"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                >
                    <Sprout className="h-4 w-4" />
                    Cây giống sầu riêng đã đăng bán ({seedlings.length})
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab("STORE_PRODUCTS")}
                    className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold transition shadow-xs ${
                        activeTab === "STORE_PRODUCTS"
                            ? "bg-brand-600 text-white shadow-soft"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                >
                    <Package className="h-4 w-4" />
                    Phân bón & Thuốc BVTV
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === "SEEDLINGS" ? (
                <div className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-soft">
                    <NurseryDashboardClient
                        initialItems={seedlings}
                        currentAccountPhone={userPhone}
                    />
                </div>
            ) : (
                <StoreProductsManager />
            )}
        </div>
    );
}
