import FarmerJournalPage from "@/components/farmer/farmer-journal-page-content";

export const dynamic = "force-dynamic";

export default function Page({ searchParams }: { searchParams?: { farmId?: string; seasonId?: string } }) {
    return <FarmerJournalPage searchParams={searchParams} activeTab="pests" />;
}
