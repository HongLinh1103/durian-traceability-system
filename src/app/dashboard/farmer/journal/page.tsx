import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FarmerJournalUnifiedView } from "@/components/farmer/farmer-journal-unified-view";

export const dynamic = "force-dynamic";

export default async function FarmerJournalPage({
    searchParams = {},
}: {
    searchParams?: { tab?: string; farmId?: string; seasonId?: string; year?: string };
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard/farmer/journal");
    if (session.user.role !== "FARMER") redirect("/");

    // Lấy danh sách Vườn và Vụ mùa của nông dân
    let farms = await prisma.farm.findMany({
        where: { farmerId: session.user.id, isActive: true },
        select: {
            id: true,
            farmName: true,
            farmCode: true,
            address: true,
            cropSeasons: {
                orderBy: [{ year: "desc" }, { sequence: "desc" }],
                select: {
                    id: true,
                    name: true,
                    year: true,
                    status: true,
                    startedAt: true,
                    closedAt: true,
                    startingStage: true,
                },
            },
        },
        orderBy: { farmName: "asc" },
    });

    // Nếu chưa có vườn, tự động tạo 1 vườn mẫu
    if (farms.length === 0) {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { fullName: true, phone: true },
        });
        const farmName = user?.fullName
            ? `Vườn sầu riêng ${user.fullName} Trị An`
            : `Vườn sầu riêng Trị An (${session.user.id.slice(-4)})`;

        const newFarm = await prisma.farm.create({
            data: {
                farmCode: `VN-TRIAN-F${Math.floor(100 + Math.random() * 900)}`,
                farmName,
                areaSize: 2.5,
                totalTrees: 250,
                durianVariety: "Ri6 & Monthong",
                address: "Xã Trị An, Huyện Vĩnh Cửu, Tỉnh Đồng Nai",
                farmerId: session.user.id,
                cropSeasons: {
                    create: {
                        name: "Vụ mùa 2027",
                        year: 2027,
                        sequence: 1,
                        status: "ACTIVE",
                        startedAt: new Date("2026-09-01"),
                    },
                },
            },
            select: {
                id: true,
                farmName: true,
                farmCode: true,
                address: true,
                cropSeasons: {
                    select: {
                        id: true,
                        name: true,
                        year: true,
                        status: true,
                        startedAt: true,
                        closedAt: true,
                        startingStage: true,
                    },
                },
            },
        });
        farms = [newFarm];
    }

    const formattedFarms = farms.map((f) => ({
        ...f,
        cropSeasons: f.cropSeasons.map((s) => ({
            ...s,
            startedAt: s.startedAt ? s.startedAt.toISOString() : null,
            closedAt: s.closedAt ? s.closedAt.toISOString() : null,
        })),
    }));

    const activeTab = searchParams.tab === "cultivation" || searchParams.tab === "pests"
        ? (searchParams.tab as "cultivation" | "pests")
        : "weather";

    return (
        <main className="min-h-[calc(100vh-64px)] pb-12">
            <FarmerJournalUnifiedView
                farms={formattedFarms}
                initialActiveTab={activeTab}
                initialFarmId={searchParams.farmId}
                initialSeasonId={searchParams.seasonId}
            />
        </main>
    );
}
