import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function WeatherPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/login?callbackUrl=/weather");
    if (session.user.role !== "FARMER") redirect("/");
    redirect("/dashboard/farmer/journal?tab=weather");
}
