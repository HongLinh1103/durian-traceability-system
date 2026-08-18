import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { StoreFinanceDashboard } from "@/components/store/store-finance-dashboard";

export const metadata = {
    title: "Tài chính & Báo cáo bán hàng | TriViet Store",
    description: "Quản lý doanh thu, chi phí, giá vốn, lợi nhuận và công nợ cửa hàng vật tư nông nghiệp.",
};

export default async function StoreFinancePage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "STORE_OWNER") {
        redirect("/login");
    }

    return <StoreFinanceDashboard />;
}
