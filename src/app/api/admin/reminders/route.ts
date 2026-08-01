import { NextResponse } from "next/server";
import { loadReminderRows } from "@/lib/reminders";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
    const reminders = await loadReminderRows();

    return NextResponse.json({
        ok: true,
        reminders,
        status: reminders.length > 0 ? "Cần nhắc nhở" : "Ổn định",
    });
}
