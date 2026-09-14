import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { ProcessingPurchasesView } from "@/components/processing/processing-purchases-view";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Hồ sơ thu mua · Cơ sở Chế biến TriViet",
    description: "Quản lý hồ sơ thu mua sầu riêng nguyên liệu từ các vùng trồng và nhà vườn.",
};

export default async function Page() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PROCESSING_FACILITY") {
        redirect("/login");
    }

    return (
        <main className="mx-auto w-full max-w-[1650px] px-3 sm:px-6 py-6 space-y-6">
            <ProcessingPurchasesView />
        </main>
    );
}
