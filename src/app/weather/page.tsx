import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { WeatherDashboard } from "@/components/weather/weather-dashboard";

export const dynamic = "force-dynamic";

export default async function WeatherPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/login?callbackUrl=/weather");
    if (!['FARMER', 'AREA_MANAGER'].includes(session.user.role)) redirect("/");
    return <WeatherDashboard role={session.user.role as "FARMER" | "AREA_MANAGER"} />;
}
