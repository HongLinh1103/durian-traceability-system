import { prisma } from "@/lib/prisma";
import { mockFarms } from "@/lib/mock-data";

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
    farmer: { fullName: string | null; phone: string };
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
    const baseDate = latestLogDate ?? farm.createdAt;

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

    try {
        const farms = (await prisma.farm.findMany({
            include: {
                farmer: true,
                farmingLogs: {
                    orderBy: { actionDate: "desc" },
                },
            },
        })) as FarmWithLogs[];

        const rows = farms
            .map((farm) => buildReminderRow(farm, referenceDate))
            .filter((row): row is ReminderRow => Boolean(row))
            .sort((left, right) => right.daysOverdue - left.daysOverdue);

        return rows;
    } catch {
        return mockFarms
            .map((farm, index) => ({
                farmId: farm.id,
                farmCode: farm.farmCode,
                farmName: farm.farmName,
                farmerId: `demo-farmer-${index + 1}`,
                farmerName: `Demo Farmer ${index + 1}`,
                daysOverdue: 2 + index,
                latestLogDate: new Date(Date.now() - (2 + index) * 24 * 60 * 60 * 1000).toISOString(),
                logCount: 3,
            }))
            .sort((left, right) => right.daysOverdue - left.daysOverdue);
    }
}

export async function loadFarmerDashboardState(userId?: string) {
    const targetUserId = userId ?? "demo-farmer-1";

    try {
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
    } catch {
        return {
            unreadCount: 3,
            shouldRemindToday: true,
            daysOverdue: 2,
            latestLogDate: null,
            notifications: [
                {
                    id: "demo-noti-1",
                    title: "Nhắc nhở cập nhật nhật ký",
                    message: "Bạn chưa cập nhật nhật ký canh tác hôm nay. Vui lòng nhập nhật ký để hệ thống theo dõi PHI.",
                    type: "REMINDER",
                    isRead: false,
                    createdAt: new Date().toISOString(),
                },
            ],
            farmName: "Vườn Sầu Riêng Hợp Tác Xanh",
            farmCode: "MSVT-001",
        };
    }
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
