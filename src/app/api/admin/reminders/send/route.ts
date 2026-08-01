import { NextResponse } from "next/server";
import { buildReminderMessage, createReminderNotification, loadReminderRows } from "@/lib/reminders";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
    try {
        const body = (await request.json().catch(() => ({}))) as { farmId?: string };
        const reminders = await loadReminderRows();
        const target = reminders.find((item) => item.farmId === body.farmId) ?? reminders[0];

        if (!target) {
            return NextResponse.json({ ok: false, error: "Không có vườn cần nhắc nhở" }, { status: 404 });
        }

        const notification = await createReminderNotification(target.farmerId, target.farmName, target.farmCode, target.daysOverdue);

        return NextResponse.json({
            ok: true,
            message: buildReminderMessage(target.farmName, target.daysOverdue),
            notificationId: notification.id,
        });
    } catch (error) {
        return NextResponse.json(
            {
                ok: false,
                error: error instanceof Error ? error.message : "Không thể gửi nhắc nhở",
            },
            { status: 500 },
        );
    }
}
