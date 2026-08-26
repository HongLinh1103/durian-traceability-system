import { HeroBanner } from "@/components/home/HeroBanner";
import { TraceSection } from "@/components/home/TraceSection";
import NewsSection from "@/components/home/NewsSection";

export default function HomePage() {
    return (
        <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
            <HeroBanner />
            <TraceSection />
            <NewsSection />
        </main>
    );
}
