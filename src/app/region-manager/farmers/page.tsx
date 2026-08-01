import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { FarmerAccountsManager } from "@/components/region-manager/farmer-accounts-manager";
import { authOptions } from "@/lib/auth";

export default async function RegionManagerFarmersPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/login");
    if (session.user.role !== "AREA_MANAGER") redirect("/");
    return <FarmerAccountsManager />;
}
