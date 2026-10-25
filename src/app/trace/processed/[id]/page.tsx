import {productionOrigins} from '@/lib/production-lots';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { OtherState, contributions } from '@/lib/other-processing';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: {
    params: {
        id: string;
    };
}) {
    if (!/^[a-f0-9-]{36}$/.test(params.id))
        notFound();
    const workspace = await prisma.processingGmpWorkspace.findFirst({ where: { data: { path: ['otherProcessing'], array_contains: [{ id: params.id, book: 'sales', confirmed: true }] } } });
    if (!workspace)
        notFound();
    const state = workspace.data as unknown as OtherState;
    const sale = state.otherProcessing?.find(r => r.id === params.id && r.book === 'sales' && r.confirmed);
    if (!sale)
        notFound();
    const chain = [];
    let record: typeof sale | undefined = sale;
    while (record && chain.length < 6) {
        chain.unshift(record);
        record = state.otherProcessing?.find(r => r.id === record?.sourceId);
    }
    return <main className="mx-auto max-w-3xl space-y-6 px-4 py-8"><h1 className="text-2xl font-bold">Truy xuất sản phẩm chế biến</h1><section className="rounded-2xl border bg-white p-6"><h2 className="text-xl font-bold">{sale.values.product}</h2><p>{sale.values.method}</p><p>Mã phiếu xuất: {sale.lotCode}</p>{contributions(sale).map(c => <p key={c.sourceId}>Lô nguyên liệu: {c.lotCode} · {c.weight} kg · Thu hoạch: {c.harvestCode} · Vùng trồng: {c.puc} · {c.origin}</p>)}{productionOrigins(sale.values).map(a=><p key={a.id}>Nguồn nhập: {a.harvestCode} · {a.puc} · {a.weight.toLocaleString('vi-VN')} kg · {a.receivedAt}</p>)}<p>Số lượng: {sale.values.quantity} {sale.values.unit}</p><p>Khối lượng tịnh: {sale.values.totalWeight} kg</p></section>{chain.map(r => <section key={r.id} className="space-y-2 rounded-2xl border p-4"><h2 className="font-bold">{r.lotCode}</h2><p>Ngày: {r.values.date}</p><p>Lô nguồn: {r.values.sourceLot}</p><p>Hồ sơ thu hoạch: {r.values.harvestCode}</p><p>Vùng trồng: {r.values.puc} · {r.values.origin}</p>{r.values.manufactured && <p>Sản xuất: {r.values.manufactured} · Hạn sử dụng: {r.values.expiry}</p>}{r.values.storage && <p>Bảo quản: {r.values.storage}</p>}</section>)}</main>;
}
