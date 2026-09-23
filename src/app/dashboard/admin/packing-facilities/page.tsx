import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExportWordButton from "@/components/admin/export-word-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Xưởng chế biến đóng gói | Quản trị" };

export default async function PackingFacilitiesPage({ searchParams }: { searchParams: { q?: string; page?: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") redirect("/login");
    const query = typeof searchParams.q === "string" ? searchParams.q.trim().slice(0, 200) : "";
    const requestedPage = Number(searchParams.page);
    const pageSize = 10;
    const [catalog, profiles] = await Promise.all([
        prisma.packingFacilityCatalog.findMany({ select: { id: true, normalizedCode: true, code: true, name: true, province: true, address: true, fruitType: true } }),
        prisma.partnerFacility.findMany({ where: { type: "PROCESSING_FACILITY", deletedAt: null }, select: { id: true, code: true, approvalCode: true, name: true, province: true, address: true, processingTypes: true } }),
    ]);
    const normalizeCode = (code: string) => code.replace(/\s+/g, "").toUpperCase();
    const fruitNames = ["Sầu riêng", "Xoài", "Thanh long", "Chuối", "Dừa", "Nhãn", "Vải", "Chôm chôm", "Măng cụt", "Mít", "Bưởi", "Cam", "Dứa", "Chanh leo"];
    const rows = new Map(catalog.map(row => [row.normalizedCode, row]));
    for (const profile of profiles) {
        const code = profile.code || profile.approvalCode || "";
        const key = code ? normalizeCode(code) : profile.id;
        if (rows.has(key)) continue;
        const description = profile.processingTypes.join(" ").toLocaleLowerCase("vi");
        rows.set(key, { id: profile.id, normalizedCode: key, code, name: profile.name, province: profile.province, address: profile.address, fruitType: fruitNames.filter(name => description.includes(name.toLocaleLowerCase("vi"))).join(", ") });
    }
    const keyword = query.toLocaleLowerCase("vi");
    const filtered = [...rows.values()].filter(row => !keyword || [row.name, row.code, row.province, row.address, row.fruitType].join(" ").toLocaleLowerCase("vi").includes(keyword))
        .sort((a, b) => a.province.localeCompare(b.province, "vi") || a.name.localeCompare(b.name, "vi") || a.code.localeCompare(b.code));
    const total = filtered.length;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(pages, Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1);
    const offset = (page - 1) * pageSize;
    const facilities = filtered.slice(offset, offset + pageSize);
    const pageUrl = (value: number) => "?" + new URLSearchParams({ q: query, page: String(value) }).toString();

    return <main className="mx-auto min-h-screen w-full max-w-[1650px] space-y-6 px-3 py-6 sm:px-6">
        <header><p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">Quản trị hệ thống</p><h1 className="mt-2 text-3xl font-black text-slate-900">DANH SÁCH XƯỞNG CHẾ BIẾN - ĐÓNG GÓI</h1></header>
        <ExportWordButton title="DANH SÁCH XƯỞNG CHẾ BIẾN - ĐÓNG GÓI" filename="danh-sach-xuong-che-bien-dong-goi" headers={["STT", "Tỉnh/ Thành phố", "Tên doanh nghiệp", "Mã CSĐG", "Địa chỉ", "Loại quả"]} rows={filtered.map((item, index) => [index + 1, item.province === "Dong Nai" ? "Đồng Nai" : item.province || "Chưa cập nhật", item.name, item.code || "Chưa cập nhật", item.address || "Chưa cập nhật", item.fruitType || "Chưa cập nhật"])} />
        <form className="flex flex-wrap gap-3 rounded-2xl border bg-white p-4" method="get">
            <label className="min-w-0 flex-1"><span className="sr-only">Tìm cơ sở chế biến đóng gói</span><input name="q" defaultValue={query} maxLength={200} placeholder="Tìm tỉnh/thành, doanh nghiệp, mã CSĐG hoặc địa chỉ..." className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm" /></label>
            <button type="submit" className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white">Tìm kiếm</button>
            {query && <Link href="/dashboard/admin/packing-facilities" className="rounded-xl border px-4 py-2.5 text-sm">Xóa lọc</Link>}
        </form>
        <section className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
            <p className="border-b px-4 py-3 text-sm text-slate-600">Danh sách cơ sở chế biến đóng gói · {total} cơ sở</p>
            <div className="overflow-x-auto" role="region" aria-label="Bảng cơ sở chế biến đóng gói" tabIndex={0}>
                <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
                    <caption className="sr-only">Danh sách cơ sở chế biến đóng gói</caption>
                    <thead className="bg-slate-100 text-xs text-slate-700"><tr>{["STT", "Tỉnh/ Thành phố", "Tên doanh nghiệp", "Mã CSĐG", "Địa chỉ", "Loại quả"].map(label => <th scope="col" key={label} className="border border-slate-300 px-4 py-3 text-center whitespace-nowrap">{label}</th>)}</tr></thead>
                    <tbody>{facilities.map((facility, index) => {
                        return <tr key={facility.id} className="align-top hover:bg-slate-50 [&>td]:border [&>td]:border-slate-200 [&>td]:px-4 [&>td]:py-3">
                            <td className="text-center">{offset + index + 1}</td>
                            <td className="min-w-[150px]">{facility.province === "Dong Nai" ? "Đồng Nai" : facility.province || "Chưa cập nhật"}</td>
                            <td className="min-w-[250px] text-black">{facility.name}</td>
                            <td className="whitespace-nowrap">{facility.code || "Chưa cập nhật"}</td>
                            <td className="min-w-[280px]">{facility.address || "Chưa cập nhật"}</td>
                            <td className="min-w-[140px]">{facility.fruitType || "Chưa cập nhật"}</td>
                        </tr>;
                    })}{!facilities.length && <tr><td colSpan={6} className="p-12 text-center text-slate-500">{query ? "Không có cơ sở phù hợp với tìm kiếm." : "Chưa có cơ sở chế biến đóng gói trong hệ thống."}</td></tr>}</tbody>
                </table>
            </div>
            <nav aria-label="Phân trang cơ sở đóng gói" className="flex flex-wrap items-center justify-between gap-3 border-t p-4 text-sm">
                <span>Hiển thị {total ? offset + 1 : 0}–{Math.min(offset + pageSize, total)} / {total} cơ sở</span>
                <div className="flex items-center gap-3">{page > 1 ? <Link href={pageUrl(page - 1)} className="rounded-lg border px-3 py-2">Trước</Link> : <span className="rounded-lg border px-3 py-2 text-slate-400" aria-disabled="true">Trước</span>}<span>Trang {page} / {pages}</span>{page < pages ? <Link href={pageUrl(page + 1)} className="rounded-lg border px-3 py-2">Sau</Link> : <span className="rounded-lg border px-3 py-2 text-slate-400" aria-disabled="true">Sau</span>}</div>
            </nav>
        </section>
    </main>;
}
