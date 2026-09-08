import FarmerStatisticsPage from "@/components/farmer/farmer-statistics-page-content";

export const dynamic = "force-dynamic";

export default function Page({ searchParams }: { searchParams?: { farmId?: string; seasonId?: string } }) {
    return <FarmerStatisticsPage searchParams={searchParams} activeTab="PESTICIDE" />;
}
