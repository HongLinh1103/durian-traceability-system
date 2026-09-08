import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { InventoryManager } from "@/components/store/inventory-manager";

export const dynamic = "force-dynamic";

export default async function StoreInventoryPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "STORE_OWNER") {
        redirect("/login?callbackUrl=/dashboard/store/inventory");
    }

    return (
        <main className="mx-auto max-w-7xl space-y-5 px-4 py-7 sm:px-6">
            <div>
                <h1 className="text-3xl font-black text-slate-950">Quản lý kho hàng</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Theo dõi tồn kho, nhập hàng, xuất hàng và biến động từ đơn bán.
                </p>
            </div>
            <InventoryManager />
        </main>
    );
}
