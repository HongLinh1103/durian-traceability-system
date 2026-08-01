import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildReminderTitle, createReminderNotification, loadReminderRows } from "@/lib/reminders";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function startOfToday() {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
}

export async function GET() {
    const reminders = await loadReminderRows();
    const createdNotifications: string[] = [];
    const today = startOfToday();

    try {
        for (const reminder of reminders) {
            const existing = await prisma.notification.findFirst({
                where: {
                    userId: reminder.farmerId,
                    type: "REMINDER",
                    title: buildReminderTitle(reminder.farmCode),
                    createdAt: { gte: today },
                },
            });

            if (!existing) {
                await createReminderNotification(reminder.farmerId, reminder.farmName, reminder.farmCode, reminder.daysOverdue);
                createdNotifications.push(reminder.farmId);
            }
        }

        return NextResponse.json({
            ok: true,
            status: reminders.length > 0 ? "Cần nhắc nhở" : "Không có cảnh báo",
            totalOverdue: reminders.length,
            createdNotifications,
            reminders,
        });
    } catch (error) {
        return NextResponse.json(
            {
                ok: false,
                error: error instanceof Error ? error.message : "Không thể chạy cron kiểm tra nhật ký",
            },
            { status: 500 },
        );
    }
}
