import { redirect } from "next/navigation";

export default function StatisticsRedirectPage() {
    redirect("/dashboard/farmer/statistics");
}
