import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { MarketplaceProducts } from "@/components/store/marketplace-products";

export const dynamic = "force-dynamic";
export const metadata = { title: "Danh mục vật tư nông nghiệp | TriViet" };

export default async function MaterialsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/login?callbackUrl=/materials");
    if (!["FARMER", "AREA_MANAGER"].includes(session.user.role)) redirect("/dashboard/admin/master-data");

    return <main className="mx-auto min-h-screen max-w-[1500px] space-y-8 px-4 py-7 sm:px-6">
        <header>
            <h1 className="mt-1 text-3xl font-black text-slate-900">Danh mục vật tư nông nghiệp</h1>
        </header>

        <section className="space-y-5">

            <MarketplaceProducts />
        </section>
    </main>;
}
