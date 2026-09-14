import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { ProcessingGradingView } from "@/components/processing/processing-grading-view";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Phân loại nguyên liệu · Cơ sở Chế biến TriViet",
    description: "Phân loại nguyên liệu đầu vào: Trái tươi (chuẩn bị đóng gói) và Chế biến khác (chuẩn bị chế biến sâu).",
};

export default async function Page() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PROCESSING_FACILITY") {
        redirect("/login");
    }

    return (
        <main className="mx-auto w-full max-w-[1650px] px-3 sm:px-6 py-6 space-y-6">
            <ProcessingGradingView />
        </main>
    );
}
