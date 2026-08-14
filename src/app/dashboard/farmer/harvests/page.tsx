import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { FarmerHarvests } from "@/components/farmer-harvests";

export default async function Page() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "FARMER") redirect("/login");
    const rows = await prisma.harvestRecord.findMany({ where: { farmerId: session.user.id }, include: { varietyItems: true, farm: true, buyerFacility: true }, orderBy: { createdAt: "desc" } });
    return <main className="mx-auto max-w-5xl space-y-5 px-4 py-7"><div className="flex justify-between"><h1 className="text-3xl font-black">Phiếu thu hoạch</h1><Button asChild><Link href="/harvests/new">Tạo phiếu</Link></Button></div><FarmerHarvests initial={JSON.parse(JSON.stringify(rows))} /></main>;
}
