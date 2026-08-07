import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export default async function Page() { const s = await getServerSession(authOptions); if (!s?.user?.id || s.user.role !== "STORE_OWNER") redirect("/login"); const store = await prisma.store.findFirst({ where: { ownerId: s.user.id, deletedAt: null }, include: { _count: { select: { products: true, orders: true } } } }); return <main className="mx-auto max-w-5xl space-y-5 px-4 py-7"><h1 className="text-3xl font-black">Quản lý cửa hàng vật tư</h1><p>{store?.name} · Trạng thái: <b>{store?.status}</b></p><div className="grid gap-4 md:grid-cols-3">{[["Hồ sơ cửa hàng", "/dashboard/store/profile"], ["Sản phẩm", "/dashboard/store/products"], ["Đơn hàng", "/dashboard/store/orders"]].map(([label, href]) => <Link key={href} href={href} className="rounded-2xl border bg-white p-6 font-bold hover:border-emerald-400">{label}</Link>)}</div></main>; }
