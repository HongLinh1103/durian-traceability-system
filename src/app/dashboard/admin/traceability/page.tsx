import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateTraceability } from "@/lib/traceability";
import { TraceabilityManager } from "@/components/traceability/traceability-manager";

export const dynamic = "force-dynamic";
export default async function Page() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") redirect("/login");
    const rows = await prisma.commercialLot.findMany({ include: { owner: { select: { name: true } }, farmerOwner: { select: { fullName: true } }, destination: true, traceabilityCode: true }, orderBy: { createdAt: "desc" } });
    const lots = await Promise.all(rows.map(async row => ({ ...row, owner: row.owner ?? { name: row.farmerOwner?.fullName ?? "Hộ sản xuất" }, quantity: Number(row.quantity), remainingQuantity: Number(row.remainingQuantity), validation: await validateTraceability(row.id) })));
    return <main className="mx-auto max-w-7xl space-y-5 px-4 py-7 sm:px-6"><header><p className="text-sm font-bold uppercase tracking-wide text-emerald-700">Quản trị hệ thống</p><h1 className="mt-1 text-3xl font-black">Giám sát truy xuất & QR</h1><p className="mt-2 text-slate-500">Kiểm tra tính đầy đủ và tạm khóa, thu hồi hoặc kích hoạt lại mã có ghi nhật ký kiểm toán.</p></header><TraceabilityManager initialLots={JSON.parse(JSON.stringify(lots))} admin/></main>;
}
