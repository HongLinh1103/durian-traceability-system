import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { harvestValue } from "@/lib/farmer-harvest-finance";

const schema = z.object({ harvestId: z.string().min(1), amount: z.number().positive().finite().max(999999999999), receivedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), requestId: z.string().uuid() });
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ message: "Chưa đăng nhập" }, { status: 401 });
    if (session.user.role !== "FARMER") return NextResponse.json({ message: "Không có quyền truy cập" }, { status: 403 });
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ message: "Thông tin thu tiền không hợp lệ" }, { status: 400 });
    const input = parsed.data;
    const receivedAt = new Date(`${input.receivedAt}T00:00:00+07:00`);
    if (!Number.isFinite(receivedAt.getTime()) || new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(receivedAt) !== input.receivedAt) return NextResponse.json({ message: "Ngày thu tiền không hợp lệ" }, { status: 400 });
    try {
        await prisma.$transaction(async tx => {
            const owned = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM harvest_records WHERE id = ${input.harvestId} AND "farmerId" = ${session.user.id} FOR UPDATE`;
            if (!owned.length) throw new Error("Không tìm thấy hồ sơ thu hoạch của bạn");
            const duplicate = await tx.$queryRaw<Array<{ id: string; harvestId: string }>>`SELECT id, "harvestId" FROM farmer_harvest_receipts WHERE id = ${input.requestId}`;
            if (duplicate.length) {
                if (duplicate[0].harvestId !== input.harvestId) throw new Error("Mã giao dịch đã được sử dụng");
                return;
            }
            const harvest = await tx.harvestRecord.findUniqueOrThrow({ where: { id: input.harvestId } });
            if (["DRAFT", "REJECTED", "CANCELLED"].includes(harvest.status)) throw new Error("Hồ sơ nháp hoặc đã hủy không thể thu tiền");
            const value = harvestValue(harvest);
            const paid = await tx.$queryRaw<Array<{ amount: string }>>`SELECT COALESCE(SUM(amount),0)::text AS amount FROM farmer_harvest_receipts WHERE "harvestId" = ${input.harvestId}`;
            const amount = Math.round(input.amount * 100) / 100;
            if (amount <= 0 || amount > value.amount - Number(paid[0].amount)) throw new Error("Số tiền vượt quá số còn phải thu. Vui lòng tải lại bảng.");
            await tx.$executeRaw`INSERT INTO farmer_harvest_receipts (id, "harvestId", amount, "receivedAt") VALUES (${input.requestId}, ${input.harvestId}, ${amount}, ${receivedAt})`;
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ message: error instanceof Error ? error.message : "Không thể ghi nhận thu tiền" }, { status: 400 });
    }
}
