import { getServerSession } from "next-auth";
import type { Fertilizer, Pesticide } from "@prisma/client";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ImageIcon } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type MaterialDetail = Partial<Fertilizer & Pesticide> & {
    imageUrls: string[];
    manufacturer: string | null;
    origin: string | null;
    usageInstructions: string | null;
    recommendedDosage: string | null;
    safetyWarnings: string | null;
    storageInstructions: string | null;
    sourceReference: string | null;
};

function Row({ label, value }: { label: string; value?: string | number | null }) { return value === null || value === undefined || value === "" ? null : <div className="border-b border-slate-100 py-3"><dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt><dd className="mt-1 whitespace-pre-line text-sm text-slate-800">{value}</dd></div>; }

export default async function MaterialDetailPage({ params }: { params: { kind: string; id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect(`/login?callbackUrl=/materials/${params.kind}/${params.id}`);
    if (!['FARMER', 'AREA_MANAGER'].includes(session.user.role)) redirect("/dashboard/admin/master-data");
    if (!['fertilizer', 'pesticide'].includes(params.kind)) notFound();
    const item = (params.kind === "fertilizer" ? await prisma.fertilizer.findFirst({ where: { id: params.id, deletedAt: null } }) : await prisma.pesticide.findFirst({ where: { id: params.id, deletedAt: null } })) as MaterialDetail | null;
    if (!item) notFound();
    const isFertilizer = params.kind === "fertilizer";
    const name = isFertilizer ? item.name : item.tradeName;
    const images: string[] = item.imageUrls;
    return <main className="mx-auto max-w-6xl space-y-5 px-4 py-7 sm:px-6"><Button asChild variant="outline" size="sm"><Link href="/materials"><ArrowLeft className="mr-2 h-4 w-4" />Danh mục vật tư</Link></Button><section className="grid gap-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2 md:p-7"><div><div className="aspect-square overflow-hidden rounded-3xl bg-slate-100">{images[0] ? <a href={images[0]} target="_blank" rel="noreferrer"><img src={images[0]} alt={name} className="h-full w-full object-contain" /></a> : <div className="flex h-full items-center justify-center"><ImageIcon className="h-16 w-16 text-slate-300" /></div>}</div>{images.length > 1 && <div className="mt-3 grid grid-cols-4 gap-2">{images.slice(1).map((url) => <a href={url} target="_blank" rel="noreferrer" key={url} className="aspect-square overflow-hidden rounded-xl border"><img src={url} alt={`Ảnh phụ ${name}`} className="h-full w-full object-contain" /></a>)}</div>}<p className="mt-2 text-center text-xs text-slate-500">Chạm vào ảnh để phóng to.</p></div><div><Badge>{isFertilizer ? "Phân bón" : "Thuốc BVTV"}</Badge><h1 className="mt-3 text-3xl font-black text-slate-900">{name}</h1><dl className="mt-5">{isFertilizer ? <><Row label="Loại phân bón" value={item.fertilizerType} /><Row label="Nhà sản xuất" value={item.manufacturer} /><Row label="Xuất xứ" value={item.origin} /><Row label="Thành phần" value={item.nutrientComposition} /><Row label="Công dụng chính" value={item.mainUses} /></> : <><Row label="Hoạt chất" value={item.activeIngredient} /><Row label="Hàm lượng" value={item.concentration} /><Row label="Nhóm thuốc" value={item.category} /><Row label="Nhà sản xuất" value={item.manufacturer} /><Row label="Xuất xứ" value={item.origin} /><Row label="Đối tượng phòng trừ" value={item.targetPests} /><Row label="Công dụng" value={item.usagePurpose} /></>}</dl></div></section><section className="rounded-3xl border border-slate-200 bg-white p-5 md:p-7"><h2 className="text-xl font-bold">Hướng dẫn sử dụng tham khảo</h2><dl>{isFertilizer ? <><Row label="Đối tượng áp dụng" value={item.targetCrops} /><Row label="Hướng dẫn" value={item.usageInstructions} /><Row label="Liều lượng khuyến nghị" value={item.recommendedDosage} /><Row label="Cách bón" value={item.applicationMethod} /></> : <><Row label="Hướng dẫn" value={item.usageInstructions} /><Row label="Liều lượng hoặc tỷ lệ pha" value={item.recommendedDosage} /><Row label="Thời gian cách ly" value={item.phiDays == null ? null : `${item.phiDays} ngày`} /></>}<Row label="Cảnh báo an toàn" value={item.safetyWarnings} /><Row label="Cách bảo quản" value={item.storageInstructions} /><Row label="Nguồn tham khảo" value={item.sourceReference} /></dl><div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">Thông tin không thay thế nhãn sản phẩm hoặc tư vấn của cán bộ chuyên môn. Không sử dụng thuốc ngoài phạm vi đăng ký.</div></section></main>;
}
