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
        <main className="mx-auto max-w-5xl px-4 py-7">
            <h1 className="mb-5 text-3xl font-black">Đơn hàng của cửa hàng</h1>
            <StoreOrdersManager />
        </main>
    );
}
