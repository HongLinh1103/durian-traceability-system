import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import FarmerHouseholds from "@/components/admin/farmer-households";

export const dynamic = "force-dynamic";

export default async function FarmingManagementPage({ searchParams }: { searchParams: { regionId?: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") redirect("/login");
    const regionId = typeof searchParams.regionId === "string" ? searchParams.regionId.trim() : undefined;
    return <FarmerHouseholds key={regionId || "all"} regionId={regionId} />;
}
