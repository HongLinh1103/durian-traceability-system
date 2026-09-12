import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FarmerHarvests } from "@/components/farmer-harvests";

export const dynamic = "force-dynamic";

export default async function HarvestsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "FARMER") {
        redirect("/login");
    }

    // 1. Fetch farmer's farms and crop seasons
    const farms = await prisma.farm.findMany({
        where: { farmerId: session.user.id, isActive: true },
        include: {
            cropSeasons: {
                orderBy: { startedAt: "desc" },
            },
        },
    });

    const seasons = farms.flatMap(f =>
        f.cropSeasons.map(s => ({
            id: s.id,
            name: s.name,
            year: s.year,
            status: s.status,
            farmId: f.id,
            farmName: f.farmName,
        })),
    );

    // 2. Fetch approved partner facilities for buyer selection
    const facilities = await prisma.partnerFacility.findMany({
        where: { status: "APPROVED", deletedAt: null },
        select: {
            id: true,
            name: true,
            type: true,
            representativeName: true,
            phone: true,
        },
        orderBy: { name: "asc" },
    });

    // 3. Fetch harvest records belonging to this farmer
    const records = await prisma.harvestRecord.findMany({
        where: { farmerId: session.user.id },
        include: {
            cropSeason: {
                select: {
                    id: true,
                    name: true,
                    year: true,
                    status: true,
                },
            },
            farm: {
                select: {
                    id: true,
                    farmName: true,
                    durianVariety: true,
                },
            },
            buyerFacility: {
                select: {
                    id: true,
                    name: true,
                    phone: true,
                },
            },
        },
        orderBy: [
            { cropSeason: { startedAt: "desc" } },
            { createdAt: "desc" },
        ],
    });

    return (
        <main className="mx-auto w-full max-w-[1440px] space-y-6 px-2.5 sm:px-4 lg:px-6 py-5 sm:py-6">
            <FarmerHarvests
                initialRows={JSON.parse(JSON.stringify(records))}
                seasons={seasons}
                facilities={facilities}
            />
        </main>
    );
}
