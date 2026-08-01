import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { loadFarmerDashboardState } from "@/lib/reminders";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ ok: false, error: "Chưa đăng nhập." }, { status: 401 });
    }
    const data = await loadFarmerDashboardState(session.user.id);

    return NextResponse.json({ ok: true, data });
}
