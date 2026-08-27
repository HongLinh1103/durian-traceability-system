import { HeroBanner } from "@/components/home/HeroBanner";
import { QrStoryAnimationSection } from "@/components/home/QrStoryAnimationSection";
import { SystemBenefitsSection } from "@/components/home/SystemBenefitsSection";
import NewsSection from "@/components/home/NewsSection";

export default function HomePage() {
    return (
        <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-6 lg:px-8 space-y-10">
            <HeroBanner />
            <QrStoryAnimationSection />
            <SystemBenefitsSection />
            <NewsSection />
        </main>
    );
}
