import { redirect } from "next/navigation";

export default function HarvestRedirectPage({ params }: { params: { id: string } }) {
    redirect(`/dashboard/farmer/harvests/${params.id}`);
}
