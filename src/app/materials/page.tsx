import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MaterialCatalog, type MaterialCardItem } from "@/components/materials/material-catalog";

export const dynamic = "force-dynamic";
export const metadata = { title: "Danh mục vật tư nông nghiệp | TriViet" };

export default async function MaterialsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/login?callbackUrl=/materials");
    if (!['FARMER', 'AREA_MANAGER'].includes(session.user.role)) redirect("/dashboard/admin/master-data");
    const [fertilizers, pesticides] = await Promise.all([
        prisma.fertilizer.findMany({ where: { deletedAt: null, isActive: true }, orderBy: { name: "asc" } }),
        prisma.pesticide.findMany({ where: { deletedAt: null, isActive: true, gaccStatus: "ALLOWED" }, orderBy: { tradeName: "asc" } }),
    ]);
    const items: MaterialCardItem[] = [
        ...fertilizers.map((item) => ({ id: item.id, kind: "fertilizer" as const, name: item.name, type: "Phân bón", manufacturer: item.manufacturer ?? item.brand ?? "", composition: item.nutrientComposition ?? "", purpose: item.mainUses ?? item.usageInstructions ?? "", targets: item.targetCrops ?? "", imageUrl: item.imageUrls[0] ?? null })),
        ...pesticides.map((item) => ({ id: item.id, kind: "pesticide" as const, name: item.tradeName, type: "Thuốc BVTV", manufacturer: item.manufacturer ?? "", composition: [item.activeIngredient, item.concentration].filter(Boolean).join(" "), purpose: item.usagePurpose ?? "", targets: item.targetPests ?? "", imageUrl: item.imageUrls[0] ?? null })),
    ];
    return <main className="mx-auto min-h-screen max-w-[1500px] space-y-5 px-4 py-7 sm:px-6"><header><p className="text-sm font-semibold text-emerald-700">Thư viện vật tư</p><h1 className="mt-1 text-3xl font-black text-slate-900">Danh mục vật tư nông nghiệp</h1><p className="mt-2 max-w-3xl text-slate-600">Tra cứu hình ảnh, công dụng và hướng dẫn sử dụng tham khảo của phân bón và thuốc bảo vệ thực vật dùng trong canh tác sầu riêng.</p></header><div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Thông tin chỉ có tính chất tham khảo. Luôn đọc nhãn, tuân thủ đăng ký lưu hành, nguyên tắc 4 đúng và hướng dẫn của cán bộ kỹ thuật.</div><MaterialCatalog items={items} /></main>;
}
