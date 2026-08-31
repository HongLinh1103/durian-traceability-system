import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { AlertTriangle, Boxes, Factory, PackageCheck, Truck, QrCode } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Page() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PROCESSING_FACILITY") redirect("/login");

    const facility = await prisma.partnerFacility.findFirst({
        where: { ownerId: session.user.id, type: "PROCESSING_FACILITY", deletedAt: null },
    });

    const [rawRows, processingRows, finishedRows, incomingActionCount] = facility
        ? await Promise.all([
              prisma.rawMaterialLot.findMany({
                  where: { facilityId: facility.id },
                  include: { rawMaterialReceipt: true },
              }),
              prisma.processingBatch.findMany({
                  where: { facilityId: facility.id },
              }),
              prisma.finishedProductLot.findMany({
                  where: { facilityId: facility.id },
                  include: {
                      commercialLots: {
                          include: {
                              traceabilityCode: true,
                              shipmentItems: { include: { shipment: true } },
                          },
                      },
                  },
              }),
              prisma.harvestRecord.count({
                  where: {
                      buyerUserId: session.user.id,
                      buyerType: "PROCESSING_FACILITY",
                      status: { in: ["WAITING_CONFIRMATION", "DELIVERY_CONFIRMED"] },
                  },
              }),
          ])
        : [[], [], [], 0];

    const rawLots = rawRows.map((row) => ({
        status: row.status,
        receivedAt: row.rawMaterialReceipt?.receivedAt ?? row.createdAt,
        actualReceivedWeight: Number(row.rawMaterialReceipt?.receivedWeight ?? row.acceptedWeight ?? 0),
    }));

    const processingLots = processingRows.map((row) => ({ status: row.status }));

    const finishedLots = finishedRows.map((row) => {
        const commercial = row.commercialLots.find((lot) => lot.traceabilityCode);
        return {
            totalWeight: Number(row.netWeight || 0),
            qrIssued: Boolean(commercial?.traceabilityCode),
            dispatchStatus: commercial?.shipmentItems?.[0]?.shipment?.status ?? "PENDING",
        };
    });

    const waitingInspection = rawLots.filter((lot) => lot.status === "PENDING_QC").length;
    const rawMaterialActionCount = incomingActionCount + waitingInspection;
    const activeProcessing = processingLots.filter((lot) => lot.status === "IN_PROGRESS").length;
    const pausedProcessing = processingLots.filter((lot) => lot.status === "CANCELLED" || lot.status === "PAUSED").length;
    const pendingDispatch = finishedLots.filter((lot) => lot.dispatchStatus === "PENDING" || lot.dispatchStatus === "IN_TRANSIT").length;
    const missingQr = finishedLots.filter((lot) => !lot.qrIssued).length;

    const today = new Date();
    let todayKey = "";
    try {
        todayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(today);
    } catch {
        todayKey = today.toISOString().slice(0, 10);
    }

    const receivedTodayWeight = rawLots
        .filter((lot) => {
            if (!lot.receivedAt) return false;
            try {
                const d = new Date(lot.receivedAt);
                return !isNaN(d.getTime()) && new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(d) === todayKey;
            } catch {
                return false;
            }
        })
        .reduce((sum, lot) => sum + (lot.actualReceivedWeight || 0), 0);

    const totalFinishedWeight = finishedLots.reduce((sum, lot) => sum + lot.totalWeight, 0);

    const tasks = [
        { label: "Lô nguyên liệu chờ kiểm tra", value: waitingInspection, tone: waitingInspection > 0 ? "amber" : "emerald" },
        { label: "Lô chế biến tạm dừng / hủy", value: pausedProcessing, tone: pausedProcessing > 0 ? "rose" : "emerald" },
        { label: "Lô thành phẩm chưa phát hành QR", value: missingQr, tone: missingQr > 0 ? "amber" : "emerald" },
        { label: "Giao nhận chờ xác nhận", value: pendingDispatch, tone: pendingDispatch > 0 ? "sky" : "emerald" },
    ];

    return (
        <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
            <header className="rounded-3xl bg-gradient-to-br from-brand-700 to-brand-500 p-6 text-white shadow-lg">
                <p className="text-sm font-bold text-brand-100">{facility?.name ?? "Cơ sở chế biến"}</p>
                <h1 className="mt-2 text-3xl font-black">Tổng quan cơ sở chế biến</h1>
                <p className="mt-2 text-brand-50">Theo dõi tiếp nhận nguyên liệu, mẻ chế biến, thành phẩm và công việc ưu tiên trong ngày.</p>
            </header>

            <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
                <KpiCard icon={Boxes} label="Nguyên liệu cần xử lý" value={String(rawMaterialActionCount)} />
                <KpiCard icon={Factory} label="Lô đang chế biến" value={String(activeProcessing)} />
                <KpiCard icon={PackageCheck} label="Lô thành phẩm" value={String(finishedLots.length)} />
                <KpiCard icon={Truck} label="Lô chờ xuất / giao" value={String(pendingDispatch)} />
                <KpiCard icon={Boxes} label="Khối lượng tiếp nhận hôm nay" value={`${receivedTodayWeight.toLocaleString("vi-VN")} kg`} />
                <KpiCard icon={PackageCheck} label="Tổng sản lượng thành phẩm" value={`${totalFinishedWeight.toLocaleString("vi-VN")} kg`} />
                <KpiCard icon={QrCode} label="QR đã phát hành" value={String(finishedLots.filter((lot) => lot.qrIssued).length)} />
                <KpiCard icon={AlertTriangle} label="Mục cần xử lý" value={String(tasks.filter((task) => task.value > 0).length)} />
            </section>

            <section className="rounded-3xl border bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-black text-slate-900">Cần xử lý</h2>
                        <p className="mt-1 text-sm text-slate-500">Hiển thị trực tiếp các việc cần thao tác để không bỏ sót công đoạn.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Link href="/dashboard/processing/raw-materials?filter=action-required" className="rounded-xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white">Xem nguyên liệu</Link>
                        <Link href="/dashboard/processing/shipments" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">Xem xuất hàng</Link>
                    </div>
                </div>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                    {tasks.map((task) => (
                        <li key={task.label} className={`rounded-2xl border px-4 py-3 ${task.tone === "rose" ? "border-rose-200 bg-rose-50 text-rose-800" : task.tone === "amber" ? "border-amber-200 bg-amber-50 text-amber-800" : task.tone === "sky" ? "border-sky-200 bg-sky-50 text-sky-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
                            <p className="text-sm font-semibold">{task.label}</p>
                            <p className="mt-1 text-2xl font-black">{task.value}</p>
                        </li>
                    ))}
                </ul>
            </section>
        </main>
    );
}

function KpiCard({ icon: Icon, label, value }: { icon: typeof Boxes; label: string; value: string }) {
    return (
        <article className="min-w-0 overflow-hidden rounded-2xl border bg-white p-3 shadow-sm sm:rounded-3xl sm:p-5">
            <Icon className="h-5 w-5 shrink-0 text-brand-700 sm:h-6 sm:w-6" />
            <p className="mt-3 min-h-10 break-words text-xs leading-5 text-slate-500 sm:mt-4 sm:min-h-0 sm:text-sm">{label}</p>
            <p className="mt-1 break-words text-xl font-black leading-tight text-slate-900 sm:text-2xl">{value}</p>
        </article>
    );
}
