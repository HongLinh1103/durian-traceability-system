import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { StoreOrdersManager } from "@/components/store/store-orders-manager";

export const dynamic = "force-dynamic";

export default async function StoreOrdersPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "STORE_OWNER") {
        redirect("/login?callbackUrl=/dashboard/store/orders");
    }

    return (
        <main className="mx-auto w-full max-w-[1800px] space-y-6 px-3 py-5 sm:px-4">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Đơn hàng của cửa hàng</h1>
            <StoreOrdersManager />
        </main>
    );
}
