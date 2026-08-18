import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardList, ShoppingBag, ShoppingCart, Sparkles, Store } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { MarketplaceProducts } from "@/components/store/marketplace-products";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Danh mục vật tư nông nghiệp | TriViet" };

export default async function MaterialsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/login?callbackUrl=/materials");
    if (!["FARMER", "AREA_MANAGER"].includes(session.user.role)) redirect("/dashboard/admin/master-data");

    const isFarmer = session.user.role === "FARMER";

    return (
        <main className="mx-auto min-h-screen max-w-[1500px] space-y-6 px-4 py-6 sm:px-6">
            {/* Header & Quick Actions */}
            <header className="flex flex-col gap-4 rounded-3xl bg-white p-5 border border-slate-200 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-700">
                        <Sparkles className="h-3.5 w-3.5" />
                        Chợ vật tư nông nghiệp
                    </span>
                    <h1 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">
                        Danh mục vật tư nông nghiệp
                    </h1>
                    <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                        Đặt mua phân bón, thuốc BVTV chính hãng từ các cửa hàng uy tín được kiểm định.
                    </p>
                </div>

                {isFarmer && (
                    <div className="flex flex-wrap gap-2 sm:shrink-0">
                        <Button asChild variant="outline" className="h-11 rounded-2xl border-slate-200 bg-white px-4 text-slate-800 hover:border-slate-300 hover:bg-slate-50 transition shadow-sm">
                            <Link href="/orders" className="flex items-center gap-2 font-bold text-slate-700">
                                <ClipboardList className="h-4 w-4 text-slate-500" />
                                <span>Đơn mua hàng</span>
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="h-11 rounded-2xl border-slate-200 bg-white px-4 text-slate-800 hover:border-slate-300 hover:bg-slate-50 transition shadow-sm">
                            <Link href="/cart" className="flex items-center gap-2 font-bold text-slate-700">
                                <ShoppingCart className="h-4 w-4 text-slate-500" />
                                <span>Xem giỏ hàng</span>
                            </Link>
                        </Button>
                    </div>
                )}
            </header>

            {/* Quick Filter Navigation */}
            <nav className="flex flex-wrap gap-2" aria-label="Loại vật tư">
                <Link
                    href="/materials"
                    className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-soft"
                >
                    <ShoppingBag className="h-3.5 w-3.5" />
                    Tất cả vật tư
                </Link>
                <Link
                    href="/materials/fertilizers"
                    className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-4 py-2 text-xs sm:text-sm font-bold text-slate-700 hover:bg-brand-50 hover:text-brand-700 transition"
                >
                    Phân bón
                </Link>
                <Link
                    href="/materials/pesticides"
                    className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-4 py-2 text-xs sm:text-sm font-bold text-slate-700 hover:bg-brand-50 hover:text-brand-700 transition"
                >
                    Thuốc BVTV
                </Link>
                <Link
                    href="/materials/stores"
                    className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-4 py-2 text-xs sm:text-sm font-bold text-slate-700 hover:bg-brand-50 hover:text-brand-700 transition"
                >
                    <Store className="h-3.5 w-3.5" />
                    Cửa hàng vật tư
                </Link>
            </nav>

            <section className="space-y-5">
                <MarketplaceProducts />
            </section>
        </main>
    );
}

