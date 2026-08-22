import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function FarmerLogsPage({
    searchParams = {},
}: {
    searchParams?: { farmId?: string; year?: string; seasonId?: string };
}) {
    const params = new URLSearchParams();
    params.set("tab", "cultivation");
    if (searchParams.farmId) params.set("farmId", searchParams.farmId);
    if (searchParams.seasonId) params.set("seasonId", searchParams.seasonId);
    redirect(`/dashboard/farmer/journal?${params.toString()}`);
}

