import { prisma } from "@/lib/prisma";

export type ReminderRow = {
    farmId: string;
    farmCode: string;
    farmName: string;
    farmerId: string;
    farmerName: string;
    daysOverdue: number;
    latestLogDate: string | null;
    logCount: number;
};

export type FarmerNotificationItem = {
    id: string;
    title: string;
    message: string;
    type: string;
    isRead: boolean;
    createdAt: string;
};

type FarmWithLogs = {
    id: string;
    farmCode: string;
    farmName: string;
    farmerId: string;
    farmer: { fullName: string | null; phone: string; approvedAt: Date | null };
    createdAt: Date;
    farmingLogs: Array<{ actionDate: Date; createdAt: Date }>;
};

function startOfToday() {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
}

function daysDifference(later: Date, earlier: Date) {
    const msPerDay = 24 * 60 * 60 * 1000;
    const laterDay = new Date(later);
    const earlierDay = new Date(earlier);
    laterDay.setHours(0, 0, 0, 0);
    earlierDay.setHours(0, 0, 0, 0);
    return Math.floor((laterDay.getTime() - earlierDay.getTime()) / msPerDay);
}

function getLatestLogDate(farm: FarmWithLogs) {
    const latestLog = farm.farmingLogs.sort((left, right) => right.actionDate.getTime() - left.actionDate.getTime())[0] ?? null;
    return latestLog?.actionDate ?? null;
}

function buildReminderRow(farm: FarmWithLogs, referenceDate: Date): ReminderRow | null {
    const latestLogDate = getLatestLogDate(farm);
    const baseDate = latestLogDate ?? farm.farmer.approvedAt ?? farm.createdAt;

    const daysOverdue = daysDifference(referenceDate, baseDate);
    if (daysOverdue < 2) {
        return null;
    }

    return {
        farmId: farm.id,
        farmCode: farm.farmCode,
        farmName: farm.farmName,
        farmerId: farm.farmerId,
        farmerName: farm.farmer.fullName ?? farm.farmer.phone,
        daysOverdue,
        latestLogDate: latestLogDate ? latestLogDate.toISOString() : null,
        logCount: farm.farmingLogs.length,
    };
}

export function buildReminderTitle(farmCode: string) {
    return `Nhắc nhở cập nhật nhật ký - ${farmCode}`;
}

export function buildReminderMessage(farmName: string, daysOverdue: number) {
    return `Vườn ${farmName} đang trễ ${daysOverdue} ngày. Vui lòng cập nhật nhật ký canh tác ngay để hệ thống tiếp tục theo dõi PHI và an toàn thực phẩm.`;
}

export async function loadReminderRows() {
    const referenceDate = startOfToday();
    const farms = (await prisma.farm.findMany({
            where: {
                isActive: true,
                farmer: {
                    accountStatus: "APPROVED",
                    isApproved: true,
                    deletedAt: null,
                },
            },
            include: {
                farmer: true,
                farmingLogs: {
                    orderBy: { actionDate: "desc" },
                },
            },
    })) as FarmWithLogs[];

    return farms
        .map((farm) => buildReminderRow(farm, referenceDate))
        .filter((row): row is ReminderRow => Boolean(row))
        .sort((left, right) => right.daysOverdue - left.daysOverdue);
}

export async function loadFarmerDashboardState(userId: string) {
    const targetUserId = userId;
        const farms = await prisma.farm.findMany({
            where: { farmerId: targetUserId, isActive: true },
            orderBy: { createdAt: "asc" },
            include: {
                farmingLogs: {
                    orderBy: { actionDate: "desc" },
                    take: 1,
                },
            },
        });

        const latestFarm = farms[0] ?? null;
        const latestLogDate = latestFarm?.farmingLogs[0]?.actionDate ?? null;
        const today = startOfToday();
        const overdueFarms = farms
            .map((farm) => ({
                farm,
                daysOverdue: daysDifference(today, farm.farmingLogs[0]?.actionDate ?? farm.createdAt),
            }))
            .filter((item) => item.daysOverdue >= 2);

        for (const { farm, daysOverdue } of overdueFarms) {
            const title = buildReminderTitle(farm.farmCode);
            const existing = await prisma.notification.findFirst({
                where: {
                    userId: targetUserId,
                    type: "REMINDER",
                    title,
                    createdAt: { gte: today },
                },
                select: { id: true },
            });
            if (!existing) {
                await createReminderNotification(targetUserId, farm.farmName, farm.farmCode, daysOverdue);
            }
        }

        // Reminder cũ phải biến mất khi nông dân đã ghi bù đủ nhật ký.
        // Chỉ giữ reminder của những vườn hiện vẫn còn quá hạn.
        const activeReminderTitles = overdueFarms.map(({ farm }) => buildReminderTitle(farm.farmCode));
        await prisma.notification.deleteMany({
            where: {
                userId: targetUserId,
                type: "REMINDER",
                ...(activeReminderTitles.length > 0
                    ? { title: { notIn: activeReminderTitles } }
                    : {}),
            },
        });

        // Admin/Trưởng ban tạo loại FARMING_LOG_REMINDER. Các bản ghi cũ có thể
        // không chứa mã vườn trong tiêu đề, nên đối chiếu thêm tên vườn trong nội dung.
        const overdueFarmIds = new Set(overdueFarms.map(({ farm }) => farm.id));
        const resolvedFarms = farms.filter((farm) => !overdueFarmIds.has(farm.id));
        await prisma.notification.deleteMany({
            where: {
                userId: targetUserId,
                type: "FARMING_LOG_REMINDER",
                ...(overdueFarms.length === 0
                    ? {}
                    : {
                        OR: resolvedFarms.flatMap((farm) => [
                            { title: { contains: farm.farmCode, mode: "insensitive" as const } },
                            { message: { contains: farm.farmName, mode: "insensitive" as const } },
                        ]),
                    }),
            },
        });

        const notifications = await prisma.notification.findMany({
            where: { userId: targetUserId },
            orderBy: { createdAt: "desc" },
            take: 8,
        });
        const mostOverdue = overdueFarms.sort((left, right) => right.daysOverdue - left.daysOverdue)[0] ?? null;

    return {
            unreadCount: notifications.filter((item) => !item.isRead).length,
            shouldRemindToday: Boolean(mostOverdue),
            daysOverdue: mostOverdue?.daysOverdue ?? 0,
            latestLogDate: latestLogDate ? latestLogDate.toISOString() : null,
            notifications: notifications.map((item) => ({
                id: item.id,
                title: item.title,
                message: item.message,
                type: item.type,
                isRead: item.isRead,
                createdAt: item.createdAt.toISOString(),
            })) as FarmerNotificationItem[],
            farmName: mostOverdue?.farm.farmName ?? latestFarm?.farmName ?? "Vườn Sầu Riêng Hợp Tác Xanh",
            farmCode: mostOverdue?.farm.farmCode ?? latestFarm?.farmCode ?? "MSVT-001",
    };
}

export async function createReminderNotification(userId: string, farmName: string, farmCode: string, daysOverdue: number) {
    const title = buildReminderTitle(farmCode);
    const message = buildReminderMessage(farmName, daysOverdue);

    const notification = await prisma.notification.create({
        data: {
            userId,
            title,
            message,
            type: "REMINDER",
        },
    });

    return notification;
}
