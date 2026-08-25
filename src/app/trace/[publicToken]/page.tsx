import { AlertTriangle, CheckCircle2, Factory, MapPin, PackageCheck, Sprout } from "lucide-react";
import { notFound } from "next/navigation";
import { getPublicTrace } from "@/lib/traceability";

export const dynamic = "force-dynamic";

const eventLabels: Record<string, string> = {
    SHIPMENT_DISPATCHED: "Đã xuất hàng đến điểm bán", SHIPMENT_RECEIVED: "Đã giao thành công", QR_ISSUED: "QR được phát hành",
    COMMERCIAL_LOT_CREATED: "Lô thương mại được tạo", FINISHED_PRODUCT_CREATED: "Lô thành phẩm được tạo", PROCESSING_COMPLETED: "Chế biến hoàn tất",
    RAW_MATERIAL_QC_PASSED: "QC nguyên liệu đạt", RAW_MATERIAL_RECEIVED: "Tiếp nhận nguyên liệu", COLLECTION_LOT_FINALIZED: "Lô thu mua hoàn tất",
    COLLECTOR_QC_PASSED: "QC thu mua đạt", GOODS_RECEIVED: "Tiếp nhận nông sản", PROCUREMENT_CONFIRMED: "Xác nhận thu mua",
    FARMER_DELIVERED: "Hàng được giao khỏi vườn", PRE_HARVEST_CHECKED: "Kiểm tra trước thu hoạch", HARVEST_STARTED: "Bắt đầu thu hoạch",
    HARVEST_COMPLETED: "Thu hoạch hoàn tất", HARVEST_LOT_FINALIZED: "Lô thu hoạch hoàn tất", CROP_SEASON_STARTED: "Bắt đầu vụ mùa",
};

const stageLabels = { DISTRIBUTION: "Điểm phân phối", COLLECTOR: "Vựa thu mua", FARM: "Vườn trồng" } as const;
const activityLabels: Record<string, string> = {
    BASE_FERTILIZING: "Bón lót", PLANTING: "Trồng", MULCHING: "Tủ gốc", IRRIGATE: "Tưới nước", FERTILIZE: "Bón phân",
    FOLIAR_FERTILIZING: "Phun phân bón lá", WEEDING: "Làm cỏ", PRUNE: "Tỉa cành / tạo tán", SHOOT_MANAGEMENT: "Quản lý đọt",
    WATER_STRESS: "Xiết nước", FLOWER_INDUCTION: "Xử lý ra hoa", FLOWER_THINNING: "Tỉa bông", POLLINATION: "Thụ phấn",
    FRUIT_THINNING: "Tỉa trái", PEST_INSPECTION: "Kiểm tra sâu bệnh", TRACK_FRUIT: "Theo dõi trái", SPRAY_PESTICIDE: "Phun thuốc BVTV",
    FRUIT_BAGGING: "Bao trái", BRANCH_SUPPORT: "Chống cành", HARVEST: "Thu hoạch", FRUIT_GRADING: "Phân loại trái",
    GARDEN_SANITATION: "Vệ sinh vườn", OTHER: "Hoạt động khác",
};
function eventStage(eventType: string): keyof typeof stageLabels {
    if (["SHIPMENT_DISPATCHED", "SHIPMENT_RECEIVED", "DIRECT_RETAIL_DISPATCHED", "EXPORT_DISPATCHED", "QR_ISSUED", "COMMERCIAL_LOT_CREATED"].includes(eventType)) return "DISTRIBUTION";
    if (["COLLECTION_LOT_FINALIZED", "COLLECTOR_QC_PASSED", "GOODS_RECEIVED", "PROCUREMENT_CONFIRMED"].includes(eventType)) return "COLLECTOR";
    return "FARM";
}

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
                <dl className="mt-6 grid grid-cols-2 gap-4 border-t pt-6 text-sm lg:grid-cols-4"><Info label="Mã truy xuất" value={trace.code} /><Info label="Đơn vị phát hành" value={`${trace.issuerType === "FARMER" ? "Hộ sản xuất" : trace.issuerType === "COLLECTOR" ? "Vựa thu mua" : "Cơ sở chế biến"}: ${trace.issuer}`} /><Info label="Điểm đến" value={trace.destination?.name || "Chưa xác định"} /><Info label="Trạng thái hiện tại" value={trace.currentStatus} /></dl>
            </header>

            <section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-7"><div className="flex items-center gap-3"><Sprout className="h-6 w-6 text-emerald-600" /><div><h2 className="text-xl font-black">Nguồn nguyên liệu</h2><p className="text-sm text-slate-500">{trace.farms.length} vườn được liên kết trong database</p></div></div><div className="mt-5 grid gap-4 md:grid-cols-2">{trace.farms.map((farm) => <article key={`${farm.lotCode}-${farm.farmCode}`} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{farm.farmName}</h3><p className="text-xs font-semibold text-emerald-700">{farm.farmCode} · {farm.lotCode}</p></div><span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{farm.complianceStatus}</span></div><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><Info label="Vùng trồng" value={farm.region ? `${farm.region.code} · ${farm.region.name}` : "Chưa xác định"} /><Info label="Giống" value={farm.variety} /><Info label="Vụ mùa" value={farm.season} /><Info label="Ngày thu hoạch" value={new Date(farm.harvestedAt).toLocaleDateString("vi-VN")} /></dl></article>)}</div></section>

            <section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-7"><div className="flex items-center gap-3"><PackageCheck className="h-6 w-6 text-emerald-600" /><div><h2 className="text-xl font-black">Hành trình sản phẩm</h2><p className="text-sm text-slate-500">Theo dõi từ vườn trồng đến điểm phân phối · Sự kiện mới nhất hiển thị trước</p></div></div><ol className="mt-6 space-y-0">{trace.timeline.map((event, index) => {
                const stage = eventStage(event.eventType);
                const previousStage = index ? eventStage(trace.timeline[index - 1].eventType) : null;
                return <li key={`${event.eventType}-${event.eventTime.toString()}-${index}`} className="relative">
                    {stage !== previousStage && <div className="mb-4 flex items-center gap-3"><span className="h-px flex-1 bg-slate-200"/><span className="text-xs font-black uppercase tracking-widest text-emerald-700">{stageLabels[stage]}</span><span className="h-px flex-1 bg-slate-200"/></div>}
                    <div className="relative grid grid-cols-[28px_1fr] gap-3 pb-6 last:pb-0"><div className="relative flex justify-center"><span className="relative z-10 mt-1 h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-emerald-50" />{index < trace.timeline.length - 1 && <span className="absolute bottom-0 top-4 w-px bg-emerald-200" />}</div><div className={index === 0 ? "rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4" : "pb-1"}><time className="text-xs font-semibold text-slate-400">{new Date(event.eventTime).toLocaleString("vi-VN")}</time><h3 className="mt-1 font-black uppercase tracking-wide text-slate-900">{eventLabels[event.eventType] || event.title}</h3>{event.description && <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-600">{event.description}</p>}{event.locationText && <p className="mt-1 flex items-start gap-1 text-sm text-slate-500"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />{event.locationText}</p>}</div></div>
                </li>;
            })}</ol></section>

            <section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-7"><div className="flex items-center gap-3"><Sprout className="h-6 w-6 text-emerald-600"/><div><h2 className="text-xl font-black">Quá trình canh tác</h2><p className="text-sm text-slate-500">Nhật ký theo từng vườn và vụ mùa nguồn</p></div></div><div className="mt-5 space-y-3">{trace.farms.map(farm => <details key={`cultivation-${farm.lotCode}`} className="group rounded-2xl border border-slate-200 p-4"><summary className="cursor-pointer list-none"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{farm.farmName}</h3><p className="mt-1 text-sm text-slate-500">{farm.season} · {farm.cultivationLogs.length} hoạt động đã ghi nhận</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Đạt</span></div><p className="mt-3 text-sm font-semibold text-emerald-700 group-open:hidden">Xem chi tiết nhật ký canh tác</p></summary><div className="mt-4 border-t pt-4"><ol className="space-y-4">{farm.cultivationLogs.map((log, index) => <li key={`${farm.lotCode}-${log.actionDate.toString()}-${index}`} className="grid grid-cols-[90px_1fr] gap-3 text-sm"><time className="text-slate-400">{new Date(log.actionDate).toLocaleDateString("vi-VN")}</time><div><b>{activityLabels[log.activityType] || "Hoạt động canh tác"}</b>{log.notes && <p className="mt-1 text-slate-600">{log.notes}</p>}</div></li>)}</ol></div></details>)}</div></section>

            {trace.processingSummary && <section className="rounded-3xl border bg-white p-5 shadow-sm"><p className="flex items-center gap-2 font-bold"><Factory className="h-5 w-5 text-emerald-600" />Thông tin chế biến</p><p className="mt-2 text-sm text-slate-600">{trace.processingSummary.productName} · {new Date(trace.processingSummary.manufacturedAt).toLocaleDateString("vi-VN")}</p></section>}
            <p className="px-2 pb-6 text-center text-xs leading-5 text-slate-500">TriViet đảm bảo truy xuất đến đơn vị hoặc lô hàng mà mã QR còn được gắn và duy trì. Không hiển thị thông tin liên hệ, định danh hoặc giá giao dịch của nông dân.</p>
        </div>
    </main>;
}

function Info({ label, value }: { label: string; value: string }) { return <div className="min-w-0"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 break-words font-semibold text-slate-900">{value}</dd></div>; }
function Status({ status }: { status: string }) { const active = status === "ACTIVE"; return <span className={`inline-flex h-9 w-fit items-center gap-2 whitespace-nowrap rounded-full px-3 text-sm font-bold ${active ? "bg-emerald-50 text-emerald-700" : status === "REVOKED" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"}`}>{active && <CheckCircle2 className="h-4 w-4" />}{active ? "Mã truy xuất hợp lệ" : status === "REVOKED" ? "Đã thu hồi" : "Tạm khóa"}</span>; }
