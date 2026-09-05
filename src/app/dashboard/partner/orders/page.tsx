import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatVietnameseDate } from "@/lib/date-format";

const labels: Record<string, string> = {
    CONFIRMED: "Chờ thực hiện", HARVESTING: "Đang thu mua", HARVESTED: "Chờ giao nhận",
    DELIVERY_CONFIRMED: "Đã giao nhận", COMPLETED: "Hoàn tất", CANCELLED: "Đã hủy",
};

export default async function Page() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "COLLECTOR") redirect("/login");
    const rows = await prisma.harvestRecord.findMany({
        where: { buyerUserId: session.user.id, status: { in: ["CONFIRMED", "HARVESTING", "HARVESTED", "DELIVERY_CONFIRMED", "COMPLETED", "CANCELLED"] } },
        include: { farm: true, farmer: { select: { fullName: true } } }, orderBy: { expectedHarvestDate: "asc" },
    });
    return <main className="mx-auto max-w-7xl space-y-5 px-4 py-7 sm:px-6">
        <Header title="Đơn thu mua" subtitle="Các giao dịch đã được hai bên xác nhận." />
        <div className="grid gap-4 lg:grid-cols-2">{rows.map(record => {
            const actualWeight = record.receivedWeight ?? record.actualWeight;
            const actualDate = record.buyerReceivedAt ?? record.actualHarvestedAt;
            return <article key={record.id} className="rounded-3xl border bg-white p-5 shadow-sm">
                <div className="flex justify-between gap-3"><b className="text-lg">{record.code}</b><span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">{labels[record.status] ?? record.status}</span></div>
                <p className="mt-3 font-semibold">{record.farm.farmName}</p>
                <p className="mt-1 text-sm text-slate-500">Nhà vườn: {record.farmer.fullName} · {record.farm.durianVariety}</p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <Metric label={actualDate ? "Ngày thực nhận" : "Ngày thu mua dự kiến"} value={formatVietnameseDate(actualDate ?? record.expectedHarvestDate)} />
                    <Metric label="Khối lượng dự kiến" value={`${Number(record.expectedWeight).toLocaleString("vi-VN")} ${record.weightUnit}`} />
                    <Metric label="Khối lượng thực nhận" value={actualWeight != null ? `${Number(actualWeight).toLocaleString("vi-VN")} ${record.weightUnit}` : "Chưa ghi nhận"} emphasize={actualWeight != null} />
                    <Metric label="Số trái thực tế" value={record.actualFruitCount != null ? `${record.actualFruitCount.toLocaleString("vi-VN")} trái` : "Chưa ghi nhận"} emphasize={record.actualFruitCount != null} />
                    <Metric label="Đơn giá dự kiến" value={record.expectedPricePerKg ? `${Number(record.expectedPricePerKg).toLocaleString("vi-VN")} đ/kg` : "Chưa thống nhất"} />
                    <Metric label="Hình thức nhận" value={record.deliveryMethod === "BUYER_PICKUP" ? "Vựa đến vườn" : "Nhà vườn giao"} />
                </div>
            </article>;
        })}{!rows.length && <Empty text="Chưa có đơn thu mua nào." />}</div>
    </main>;
}

function Metric({ label, value, emphasize = false }: { label: string; value: string; emphasize?: boolean }) {
    return <p className="min-w-0"><span className="text-slate-500">{label}</span><br/><b className={emphasize ? "text-brand-700" : undefined}>{value}</b></p>;
}
function Header({ title, subtitle }: { title: string; subtitle: string }) {
    return <header><p className="text-sm font-bold uppercase tracking-wider text-brand-600">Vựa / Đơn vị thu mua</p><h1 className="mt-1 text-3xl font-black">{title}</h1><p className="mt-2 text-slate-500">{subtitle}</p></header>;
}
function Empty({ text }: { text: string }) {
    return <p className="rounded-3xl border border-dashed bg-white p-10 text-center text-slate-500 lg:col-span-2">{text}</p>;
}
