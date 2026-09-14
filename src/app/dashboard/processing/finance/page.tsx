import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { ProcessingFinanceView } from "@/components/processing/processing-finance-view";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Tài chính cơ sở chế biến · TriViet",
    description: "Quản lý doanh thu bán hàng, công nợ thu mua, nhật ký dòng tiền và biểu đồ thống kê tài chính.",
};

export default async function Page() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PROCESSING_FACILITY") {
        redirect("/login");
    }

    return (
        <main className="mx-auto w-full max-w-[1650px] px-3 sm:px-6 py-6 space-y-6">
            <ProcessingFinanceView />
        </main>
    );
}
