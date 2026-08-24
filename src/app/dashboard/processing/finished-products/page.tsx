import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { PackageCheck, QrCode, Truck } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatStatusLabel } from "@/lib/processing-facility";

export default async function Page() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PROCESSING_FACILITY") redirect("/login");

    const facility = await prisma.partnerFacility.findUnique({ where: { ownerId: session.user.id } });
    const rows = facility ? await prisma.finishedProductLot.findMany({ where: { facilityId: facility.id }, include: { processingBatch: { select: { batchCode: true } }, commercialLots: { include: { traceabilityCode: true, shipmentItems: { include: { shipment: true } } } } }, orderBy: { manufacturedAt: "desc" } }) : [];
    const finishedLots = rows.map(row => { const traced = row.commercialLots.find(lot => lot.traceabilityCode); const shipment = traced?.shipmentItems[0]?.shipment; return { id: row.id, code: row.lotCode, productName: row.productName, productType: row.productType, sourceProcessingLotCode: row.processingBatch.batchCode, producedAt: row.manufacturedAt, expiresAt: row.expiryDate, packageSpec: row.packaging, quantity: Number(row.quantity), totalWeight: Number(row.netWeight), unit: "kg", storageCondition: row.storageCondition, qrIssued: Boolean(traced?.traceabilityCode), publicToken: traced?.traceabilityCode?.publicToken, dispatchStatus: shipment?.status ?? "PENDING" }; });

    return (
        <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
            <header className="rounded-3xl border bg-white p-5 shadow-sm">
                <p className="text-sm font-bold uppercase tracking-wider text-brand-700">Module thành phẩm</p>
                <h1 className="mt-1 text-3xl font-black text-slate-900">Lô thành phẩm</h1>
                <p className="mt-2 text-sm text-slate-500">Phát hành QR truy xuất cho lô thành phẩm có nguồn hợp lệ, theo chuỗi lô chế biến và lô nguyên liệu.</p>
            </header>

            <section className="grid gap-3 sm:grid-cols-3">
                <Info icon={PackageCheck} label="Tổng lô thành phẩm" value={finishedLots.length} />
                <Info icon={QrCode} label="Chưa phát hành QR" value={finishedLots.filter((lot) => !lot.qrIssued).length} />
                <Info icon={Truck} label="Chờ xuất / giao" value={finishedLots.filter((lot) => ["PENDING", "IN_TRANSIT"].includes(lot.dispatchStatus)).length} />
            </section>

            <section className="grid gap-4">
                {finishedLots.map((lot) => {
                    const traceUrl = lot.publicToken ? `/trace/${lot.publicToken}` : "/dashboard/processing/traceability";
                    return (
                        <article key={lot.id} className="rounded-3xl border bg-white p-5 shadow-sm">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-brand-700">{lot.code}</p>
                                    <h2 className="mt-1 text-lg font-black text-slate-900">{lot.productName}</h2>
                                    <p className="mt-1 text-sm text-slate-500">Nguồn chế biến: {lot.sourceProcessingLotCode}</p>
                                </div>
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{formatStatusLabel(lot.dispatchStatus)}</span>
                            </div>

                            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                                <Field label="Loại sản phẩm" value={lot.productType} />
                                <Field label="Ngày sản xuất" value={lot.producedAt.toLocaleDateString("vi-VN")} />
                                <Field label="Hạn sử dụng" value={lot.expiresAt ? lot.expiresAt.toLocaleDateString("vi-VN") : "Theo lô"} />
                                <Field label="Quy cách" value={lot.packageSpec ?? "Chưa cập nhật"} />
                                <Field label="Số lượng" value={`${lot.quantity.toLocaleString("vi-VN")} hộp`} />
                                <Field label="Khối lượng" value={`${lot.totalWeight.toLocaleString("vi-VN")} ${lot.unit}`} />
                                <Field label="Điều kiện bảo quản" value={lot.storageCondition ?? "Chưa cập nhật"} />
                                <Field label="QR" value={lot.qrIssued ? "Đã phát hành" : "Chưa phát hành"} />
                            </dl>

                            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                                <button type="button" className="rounded-xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white">Phát hành QR</button>
                                <button type="button" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">Xem QR</button>
                                <button type="button" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">In tem</button>
                                <Link href={traceUrl} className="rounded-xl border border-slate-200 px-3 py-2 text-center text-sm font-semibold text-slate-700">Xem trang truy xuất</Link>
                                <button type="button" className="rounded-xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white">Xuất / Giao lô</button>
                            </div>
                        </article>
                    );
                })}

                {!finishedLots.length && (
                    <p className="rounded-3xl border border-dashed bg-white p-10 text-center text-slate-500">Chưa có lô thành phẩm hoàn tất để phát hành QR.</p>
                )}
            </section>

            <section className="rounded-3xl border bg-brand-50 p-4 text-sm text-brand-800">
                <p className="font-semibold">Quy tắc phát hành QR (MVP)</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                    <li>Chỉ phát hành khi lô chế biến đã hoàn tất.</li>
                    <li>Lô thành phẩm phải có nguồn nguyên liệu hợp lệ.</li>
                    <li>QR chỉ chứa URL/trace code thay vì toàn bộ dữ liệu.</li>
                </ul>
            </section>
        </main>
    );
}

function Info({ icon: Icon, label, value }: { icon: typeof PackageCheck; label: string; value: number }) {
    return (
        <article className="rounded-3xl border bg-white p-4 shadow-sm">
            <Icon className="h-5 w-5 text-brand-700" />
            <p className="mt-3 text-sm text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
        </article>
    );
}

function Field({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
            <dd className="mt-1 font-semibold text-slate-700">{value}</dd>
        </div>
    );
}
