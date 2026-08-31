import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { HeroBanner } from "@/components/home/HeroBanner";
import { QrStoryAnimationSection } from "@/components/home/QrStoryAnimationSection";
import NewsSection from "@/components/home/NewsSection";

function getDashboardPath(role?: string): string {
    switch (role) {
        case "ADMIN":
            return "/dashboard/admin";
        case "AREA_MANAGER":
            return "/dashboard/area-manager";
        case "STORE_OWNER":
            return "/dashboard/store";
        case "COLLECTOR":
            return "/dashboard/partner";
        case "PROCESSING_FACILITY":
            return "/dashboard/processing";
        case "FARMER":
        default:
            return "/dashboard/farmer";
    }
}

export default async function HomePage() {
    const session = await getServerSession(authOptions);
    if (session?.user?.role) {
        redirect(getDashboardPath(session.user.role));
    }

    return (
        <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-6 lg:px-8 space-y-10">
            <HeroBanner />
            <QrStoryAnimationSection />
            <NewsSection />
        </main>
    );
}
