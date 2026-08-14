import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { CatalogManager } from "@/components/admin/catalog-manager";

export const dynamic = "force-dynamic";

export default async function AdminCatalogPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard/admin/catalog");
    if (session.user.role !== "ADMIN") redirect("/");
    return <CatalogManager/>;
}
