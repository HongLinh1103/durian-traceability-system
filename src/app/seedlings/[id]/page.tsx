import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Home, Trees } from "lucide-react";
import { getSeedlingById, getSeedlings } from "@/lib/seedlings-data";
import { SeedlingDetailClient } from "@/components/seedlings/SeedlingDetailClient";

export const dynamic = "force-dynamic";

type PageProps = {
    params: { id: string };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const item = await getSeedlingById(params.id);
    if (!item) {
        return { title: "Không tìm thấy cây giống | TriViet" };
    }
    return {
        title: `${item.title} - ${item.priceFormatted} | TriViet Trại Giống`,
        description: `Thông tin chi tiết giống sầu riêng ${item.variety}, giá ${item.priceFormatted}, cung cấp bởi ${item.nurseryName}. ${item.specifications.propagationMethod}, chiều cao ${item.specifications.treeHeight}.`,
    };
}

export default async function SeedlingDetailPage({ params }: PageProps) {
    const item = await getSeedlingById(params.id);
    if (!item) {
        notFound();
    }

    const allSeedlings = await getSeedlings();
    const relatedItems = allSeedlings.filter((s) => s.id !== item.id && (s.nurseryName === item.nurseryName || s.variety === item.variety));

    return (
        <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
            {/* BREADCRUMB */}
            <nav className="mb-6 flex items-center gap-2 text-xs font-medium text-slate-500">
                <Link href="/" className="flex items-center gap-1 hover:text-brand-600 transition">
                    <Home className="h-3.5 w-3.5" />
                    Trang chủ
                </Link>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                <Link href="/seedlings" className="hover:text-brand-600 transition">
                    Trại giống
                </Link>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-bold text-slate-800 line-clamp-1">{item.title}</span>
            </nav>

            {/* DETAIL COMPONENT */}
            <SeedlingDetailClient item={item} relatedItems={relatedItems} />
        </main>
    );
}
