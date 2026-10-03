import FarmerJournalPage from "@/components/farmer/farmer-journal-page-content";
export const dynamic = "force-dynamic";
export const metadata = { title: "Sổ theo dõi sinh vật gây hại | TriViet" };
export default function Page({ searchParams }: { searchParams?: { farmId?: string; seasonId?: string } }) {
    return <FarmerJournalPage searchParams={searchParams} pageKind="pests" />;
}
