import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { FarmingPlanCalendar } from "@/components/farming-plan-calendar";

export const dynamic = "force-dynamic";

export default async function FarmingPlansPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard/farmer/plans");
    if (session.user.role !== "FARMER") redirect("/");
    return <FarmingPlanCalendar />;
}
