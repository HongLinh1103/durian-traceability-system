import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { ProcessingShipmentsDocumentView } from "@/components/processing/processing-shipments-document-view";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Xuất hàng & Hồ sơ xuất khẩu · Cơ sở Chế biến TriViet",
    description: "Quản lý hợp đồng xuất hàng, container, seal và phát hành mã QR truy xuất nguồn gốc.",
};

export default async function Page() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PROCESSING_FACILITY") {
        redirect("/login");
    }

    return (
        <main className="mx-auto w-full max-w-[1650px] px-3 sm:px-6 py-6 space-y-6">
            <ProcessingShipmentsDocumentView />
        </main>
    );
}
