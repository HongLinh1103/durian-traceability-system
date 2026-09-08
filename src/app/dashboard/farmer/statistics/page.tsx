import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { FarmerStatisticsOverview } from "@/components/farmer/farmer-statistics-overview";
import { getFarmerOverviewStatistics } from "@/lib/farmer-statistics-service";

export const dynamic = "force-dynamic";

export default async function Page({
    searchParams = {},
}: {
    searchParams?: Record<string, string | string[] | undefined>;
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect(`/login?callbackUrl=${encodeURIComponent("/dashboard/farmer/statistics")}`);
    }
    if (session.user.role !== "FARMER") {
        redirect("/");
    }

    const farmIdParam = typeof searchParams.farmId === "string" ? searchParams.farmId : undefined;
    const yearParam = typeof searchParams.year === "string" ? searchParams.year : undefined;

    const initialData = await getFarmerOverviewStatistics(session.user.id, {
        farmId: farmIdParam,
        year: yearParam,
    });

    return (
        <main className="min-h-[calc(100vh-64px)] pb-12">
            <FarmerStatisticsOverview initialData={initialData} />
        </main>
    );
}
