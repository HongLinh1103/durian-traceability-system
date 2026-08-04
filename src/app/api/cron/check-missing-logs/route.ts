import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { buildReminderTitle, createReminderNotification, loadReminderRows } from "@/lib/reminders";
import { startOfVietnamDay } from "@/lib/log-schedule";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function startOfToday() {
    return startOfVietnamDay();
}

export async function GET(request: Request) {
    const configuredSecret = process.env.CRON_SECRET;
    const authorization = request.headers.get("authorization");
    const hasCronSecret = Boolean(configuredSecret && authorization === `Bearer ${configuredSecret}`);
    const session = hasCronSecret ? null : await getServerSession(authOptions);
    if (!hasCronSecret && session?.user?.role !== "ADMIN") {
        return NextResponse.json({ ok: false, error: "Không có quyền chạy tác vụ định kỳ." }, { status: 401 });
    }

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
