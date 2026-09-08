import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { FarmerStatisticsView } from "@/components/farmer/farmer-statistics-view";
import { getFarmerStatisticsServerData } from "@/lib/farmer-statistics-service";

export default async function FarmerStatisticsPage({ searchParams, activeTab }: { activeTab: "PESTICIDE" | "FERTILIZER" | "EXPENSE"; searchParams?: { farmId?: string; seasonId?: string } }) {
    const session = await getServerSession(authOptions);
    const tab = { PESTICIDE: "pesticides", FERTILIZER: "fertilizers", EXPENSE: "expenses" }[activeTab];
    if (!session?.user?.id) redirect(`/login?callbackUrl=${encodeURIComponent(`/dashboard/farmer/statistics/${tab}`)}`);
    if (session.user.role !== "FARMER") redirect("/");

    const initialData = await getFarmerStatisticsServerData(
        session.user.id,
        searchParams?.farmId,
        searchParams?.seasonId,
    ).catch(() => null);

    return (
        <main className="min-h-[calc(100vh-64px)] pb-12">
            <FarmerStatisticsView initialActiveTab={activeTab} initialData={initialData || undefined} />
        </main>
    );
}
