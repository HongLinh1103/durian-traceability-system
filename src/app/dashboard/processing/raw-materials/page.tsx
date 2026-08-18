import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Boxes, CheckCircle2, ShieldAlert } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { buildRawMaterialLots, formatStatusLabel, getProcessingHarvestSources } from "@/lib/processing-facility";

export default async function Page() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PROCESSING_FACILITY") redirect("/login");

    const sources = await getProcessingHarvestSources(session.user.id);
    const lots = buildRawMaterialLots(sources);

    return (
        <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
            <header className="rounded-3xl border bg-white p-5 shadow-sm">
                <p className="text-sm font-bold uppercase tracking-wider text-cyan-700">Module nguyên liệu</p>
                <h1 className="mt-1 text-3xl font-black text-slate-900">Nguyên liệu chờ tiếp nhận</h1>
                <p className="mt-2 text-sm text-slate-500">Quản lý nguồn đầu vào từ nông dân hoặc đối tác vựa, giữ liên kết truy xuất bằng ID phiếu nguồn.</p>
            </header>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <Summary icon={Boxes} label="Tổng lô nguồn" value={lots.length} />
                <Summary icon={CheckCircle2} label="Đạt / đang lưu" value={lots.filter((lot) => ["ACCEPTED", "STORED"].includes(lot.status)).length} />
                <Summary icon={ShieldAlert} label="Chờ kiểm tra" value={lots.filter((lot) => lot.status === "WAITING_INSPECTION").length} />
            </section>

            <section className="grid gap-4">
                {lots.map((lot) => (
                    <article key={lot.id} className="rounded-3xl border bg-white p-5 shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-cyan-700">{lot.code}</p>
                                <h2 className="mt-1 text-lg font-black text-slate-900">{lot.farmName}</h2>
                                <p className="mt-1 text-sm text-slate-500">Nguồn: {lot.sourceType} · Nhà cung cấp: {lot.supplierName} ({lot.supplierPhone})</p>
                            </div>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{formatStatusLabel(lot.status)}</span>
                        </div>

                        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                            <InfoLine label="Mã lô nguồn" value={lot.sourceCode} />
                            <InfoLine label="Giống" value={lot.durianVariety} />
                            <InfoLine label="Ngày thu hoạch" value={lot.receivedAt.toLocaleDateString("vi-VN")} />
                            <InfoLine label="Khối lượng gửi" value={`${lot.sentWeight.toLocaleString("vi-VN")} kg`} />
                            <InfoLine label="Khối lượng nhận" value={`${lot.actualReceivedWeight.toLocaleString("vi-VN")} kg`} />
                            <InfoLine label="Mã truy xuất nguồn" value={lot.sourceHarvestId} />
                            <InfoLine label="Kho lưu" value={lot.storageLocation} />
                            <InfoLine label="Kết quả kiểm tra" value={lot.qualityResult === "PASS" ? "Đạt" : lot.qualityResult === "CONDITIONAL" ? "Đạt có điều kiện" : "Không đạt"} />
                        </dl>

                        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                            <Link href="/dashboard/partner/harvests" className="rounded-xl border border-slate-200 px-3 py-2 text-center text-sm font-semibold text-slate-700">Xem chi tiết</Link>
                            <button type="button" className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">Tiếp nhận</button>
                            <button type="button" className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white">Từ chối</button>
                            <button type="button" className="rounded-xl bg-amber-500 px-3 py-2 text-sm font-semibold text-white">Yêu cầu bổ sung</button>
                        </div>
                        <p className="mt-3 text-xs text-slate-500">Liên kết nguồn được giữ theo HarvestRecord ID: {lot.sourceHarvestId}</p>
                    </article>
                ))}

                {!lots.length && (
                    <p className="rounded-3xl border border-dashed bg-white p-10 text-center text-slate-500">Chưa có nguồn nguyên liệu nào được chuyển đến cơ sở.</p>
                )}
            </section>

            <section className="rounded-3xl border bg-cyan-50 p-4 text-sm text-cyan-900">
                <p className="font-semibold">MVP note:</p>
                <p className="mt-1">Kết quả kiểm tra ngoài hệ thống (file kiểm nghiệm, ngày lấy mẫu, phòng kiểm nghiệm) sẽ được bổ sung ở API và bảng dữ liệu chuyên dụng trong bước tiếp theo.</p>
            </section>
        </main>
    );
}

function Summary({ icon: Icon, label, value }: { icon: typeof Boxes; label: string; value: number }) {
    return (
        <article className="rounded-3xl border bg-white p-4 shadow-sm">
            <Icon className="h-5 w-5 text-cyan-700" />
            <p className="mt-3 text-sm text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
        </article>
    );
}

function InfoLine({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
            <dd className="mt-1 font-semibold text-slate-700">{value}</dd>
        </div>
    );
}
