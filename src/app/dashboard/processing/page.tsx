import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { ProcessingOverviewDashboard } from "@/components/processing/processing-overview-dashboard";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Tổng quan Cơ sở Chế biến & Đóng gói · TriViet",
    description: "Bảng chỉ số quản trị thu mua, phân loại, chế biến đóng gói, xuất hàng và tài chính.",
};

export default async function Page() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PROCESSING_FACILITY") {
        redirect("/login");
    }

    return (
        <main className="mx-auto w-full max-w-[1650px] px-3 sm:px-6 py-6 space-y-6">
            <ProcessingOverviewDashboard />
        </main>
    );
}
