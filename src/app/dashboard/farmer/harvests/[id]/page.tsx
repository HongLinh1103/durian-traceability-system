import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { HarvestDetailView } from "@/components/harvest-detail-view";

interface PageProps {
    params: {
        id: string;
    };
}

export const dynamic = "force-dynamic";

export default async function FarmerHarvestDetailPage({ params }: PageProps) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect("/login");
    }

    const isFarmer = session.user.role === "FARMER";
    const isBuyer = ["COLLECTOR", "PROCESSING_FACILITY"].includes(session.user.role);
    const isAdmin = session.user.role === "ADMIN";

    if (!isFarmer && !isBuyer && !isAdmin) {
        redirect("/dashboard");
    }

    const harvest = await prisma.harvestRecord.findFirst({
        where: {
            id: params.id,
            ...(isFarmer ? { farmerId: session.user.id } : {}),
            ...(isBuyer ? { buyerUserId: session.user.id } : {}),
        },
        include: {
            farm: {
                select: {
                    id: true,
                    farmName: true,
                    farmCode: true,
                    address: true,
                    areaSize: true,
                    areaUnit: true,
                    durianVariety: true,
                },
            },
            farmer: {
                select: {
                    fullName: true,
                    phone: true,
                },
            },
            buyerFacility: {
                select: {
                    name: true,
                    phone: true,
                    province: true,
                    ward: true,
                    type: true,
                },
            },
            varietyItems: {
                orderBy: {
                    createdAt: "asc",
                },
            },
            histories: {
                include: {
                    actor: {
                        select: {
                            fullName: true,
                            phone: true,
                            role: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: "desc",
                },
            },
        },
    });

    if (!harvest) {
        notFound();
    }

    return <HarvestDetailView harvest={JSON.parse(JSON.stringify(harvest))} />;
}
