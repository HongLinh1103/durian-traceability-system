import { AlertTriangle, CheckCircle2, Factory, MapPin, PackageCheck, Sprout } from "lucide-react";
import { notFound } from "next/navigation";
import { getPublicTrace } from "@/lib/traceability";

export const dynamic = "force-dynamic";

const eventLabels: Record<string, string> = {
    SHIPMENT_DISPATCHED: "Đã xuất hàng đến điểm bán", SHIPMENT_RECEIVED: "Đã giao thành công", QR_ISSUED: "QR được phát hành",
    COMMERCIAL_LOT_CREATED: "Lô thương mại được tạo", FINISHED_PRODUCT_CREATED: "Lô thành phẩm được tạo", PROCESSING_COMPLETED: "Chế biến hoàn tất",
    RAW_MATERIAL_QC_PASSED: "QC nguyên liệu đạt", RAW_MATERIAL_RECEIVED: "Tiếp nhận nguyên liệu", COLLECTION_LOT_FINALIZED: "Lô thu mua hoàn tất",
    COLLECTOR_QC_PASSED: "QC thu mua đạt", GOODS_RECEIVED: "Tiếp nhận nông sản", PROCUREMENT_CONFIRMED: "Xác nhận thu mua",
    HARVEST_COMPLETED: "Thu hoạch hoàn tất", HARVEST_LOT_FINALIZED: "Lô thu hoạch hoàn tất", CROP_SEASON_STARTED: "Bắt đầu vụ mùa",
};

export default async function TracePage({ params }: { params: { publicToken: string } }) {
    const trace = await getPublicTrace(params.publicToken);
    if (!trace) notFound();
    const active = trace.qrStatus === "ACTIVE";
    return <main className="min-h-screen overflow-x-hidden bg-gradient-to-b from-emerald-50 to-white px-4 py-6 text-slate-900 sm:py-10">
        <div className="mx-auto max-w-5xl space-y-5">
            <header className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-8">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">TriViet · Truy xuất nguồn gốc</p>
                <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><h1 className="text-2xl font-black sm:text-4xl">{trace.commercialLot.productName}</h1><p className="mt-2 text-slate-500">Lô thương mại <b className="text-slate-800">{trace.commercialLot.lotCode}</b></p></div><Status status={trace.qrStatus} /></div>
                {!active && <div className={`mt-5 flex gap-3 rounded-2xl p-4 text-sm font-semibold ${trace.qrStatus === "REVOKED" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-900"}`}><AlertTriangle className="h-5 w-5 shrink-0" />{trace.qrStatus === "REVOKED" ? "Mã truy xuất đã bị thu hồi. Thông tin lịch sử vẫn được giữ để đối chiếu." : "Mã truy xuất đang tạm khóa hoặc không còn hiệu lực."}</div>}
                <dl className="mt-6 grid gap-4 border-t pt-6 text-sm sm:grid-cols-2 lg:grid-cols-4"><Info label="Mã truy xuất" value={trace.code} /><Info label="Đơn vị phát hành" value={`${trace.issuerType === "FARMER" ? "Hộ sản xuất" : trace.issuerType === "COLLECTOR" ? "Vựa thu mua" : "Cơ sở chế biến"}: ${trace.issuer}`} /><Info label="Điểm đến" value={trace.destination?.name || "Chưa xác định"} /><Info label="Trạng thái hiện tại" value={trace.currentStatus} /></dl>
            </header>

            <section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-7"><div className="flex items-center gap-3"><Sprout className="h-6 w-6 text-emerald-600" /><div><h2 className="text-xl font-black">Nguồn nguyên liệu</h2><p className="text-sm text-slate-500">{trace.farms.length} vườn được liên kết trong database</p></div></div><div className="mt-5 grid gap-4 md:grid-cols-2">{trace.farms.map((farm) => <article key={`${farm.lotCode}-${farm.farmCode}`} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{farm.farmName}</h3><p className="text-xs font-semibold text-emerald-700">{farm.farmCode} · {farm.lotCode}</p></div><span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{farm.complianceStatus}</span></div><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><Info label="Vùng trồng" value={farm.region ? `${farm.region.code} · ${farm.region.name}` : "Chưa xác định"} /><Info label="Giống" value={farm.variety} /><Info label="Vụ mùa" value={farm.season} /><Info label="Ngày thu hoạch" value={new Date(farm.harvestedAt).toLocaleDateString("vi-VN")} /></dl></article>)}</div></section>

            <section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-7"><div className="flex items-center gap-3"><PackageCheck className="h-6 w-6 text-emerald-600" /><div><h2 className="text-xl font-black">Hành trình sản phẩm</h2><p className="text-sm text-slate-500">Sự kiện mới nhất được hiển thị trước</p></div></div><ol className="mt-6 space-y-0">{trace.timeline.map((event, index) => <li key={`${event.eventType}-${event.eventTime.toString()}-${index}`} className="relative grid grid-cols-[28px_1fr] gap-3 pb-6 last:pb-0"><div className="relative flex justify-center"><span className="relative z-10 mt-1 h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-emerald-50" />{index < trace.timeline.length - 1 && <span className="absolute bottom-0 top-4 w-px bg-emerald-200" />}</div><div><time className="text-xs font-semibold text-slate-400">{new Date(event.eventTime).toLocaleString("vi-VN")}</time><h3 className="mt-1 font-bold">{eventLabels[event.eventType] || event.title}</h3>{event.description && <p className="mt-1 text-sm text-slate-600">{event.description}</p>}{event.locationText && <p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><MapPin className="h-3.5 w-3.5" />{event.locationText}</p>}</div></li>)}</ol></section>

            {trace.processingSummary && <section className="rounded-3xl border bg-white p-5 shadow-sm"><p className="flex items-center gap-2 font-bold"><Factory className="h-5 w-5 text-emerald-600" />Thông tin chế biến</p><p className="mt-2 text-sm text-slate-600">{trace.processingSummary.productName} · {new Date(trace.processingSummary.manufacturedAt).toLocaleDateString("vi-VN")}</p></section>}
            <p className="px-2 pb-6 text-center text-xs leading-5 text-slate-500">TriViet đảm bảo truy xuất đến đơn vị hoặc lô hàng mà mã QR còn được gắn và duy trì. Không hiển thị thông tin liên hệ, định danh hoặc giá giao dịch của nông dân.</p>
        </div>
    </main>;
}

function Info({ label, value }: { label: string; value: string }) { return <div className="min-w-0"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 break-words font-semibold text-slate-900">{value}</dd></div>; }
function Status({ status }: { status: string }) { const active = status === "ACTIVE"; return <span className={`inline-flex h-9 w-fit items-center gap-2 whitespace-nowrap rounded-full px-3 text-sm font-bold ${active ? "bg-emerald-50 text-emerald-700" : status === "REVOKED" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"}`}>{active && <CheckCircle2 className="h-4 w-4" />}{active ? "Mã truy xuất hợp lệ" : status === "REVOKED" ? "Đã thu hồi" : "Tạm khóa"}</span>; }
