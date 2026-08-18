import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CloudSun, Leaf, PackageOpen } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { WeatherJournal } from "@/components/weather/weather-journal";
import FarmerLogsPage from "@/app/dashboard/farmer/logs/page";

const tabs = [
    { value: "weather", label: "Thời tiết", icon: CloudSun },
    { value: "cultivation", label: "Canh tác", icon: Leaf },
    { value: "inventory", label: "Kho vật tư", icon: PackageOpen },
] as const;

export const dynamic = "force-dynamic";

export default async function FarmerJournalPage({ searchParams }: { searchParams: { tab?: string; farmId?: string; year?: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard/farmer/journal");
    if (session.user.role !== "FARMER") redirect("/");
    const active = tabs.some(tab => tab.value === searchParams.tab) ? searchParams.tab! : "weather";

    return <div className="mx-auto w-full max-w-[1800px] space-y-5 px-3 py-5 sm:px-4 [&>main]:min-h-0 [&>main]:max-w-none [&>main]:px-0 [&>main]:py-0 [&>main>header]:!items-center [&>main>header]:!rounded-[28px] [&>main>header]:!border [&>main>header]:!border-brand-100 [&>main>header]:!bg-none [&>main>header]:!bg-white [&>main>header]:!p-5 [&>main>header]:!text-slate-900 [&>main>header>div]:relative [&>main>header>div]:pl-20 [&>main>header>div]:before:absolute [&>main>header>div]:before:left-0 [&>main>header>div]:before:top-1/2 [&>main>header>div]:before:grid [&>main>header>div]:before:h-16 [&>main>header>div]:before:w-16 [&>main>header>div]:before:-translate-y-1/2 [&>main>header>div]:before:place-items-center [&>main>header>div]:before:rounded-2xl [&>main>header>div]:before:bg-brand-50 [&>main>header>div]:before:text-2xl [&>main>header>div]:before:content-['☁'] [&>main>header>div>p:first-child]:hidden [&>main>header>div>h1]:!mt-0 [&>main>header>div>h1]:!text-2xl [&>main>header>div>h1]:!text-slate-900 [&>main>header>div>p:last-child]:!mt-1 [&>main>header>div>p:last-child]:!text-sm [&>main>header>div>p:last-child]:!text-slate-500 [&>main>header>button]:!min-h-12 [&>main>header>button]:!rounded-2xl [&>main>header>button]:!bg-brand-600 [&>main>header>button]:!px-6 [&>main>header>button]:!text-white hover:[&>main>header>button]:!bg-brand-700">
        <nav className="grid grid-cols-3 gap-1 rounded-2xl border bg-white p-1.5 shadow-sm sm:gap-2 sm:rounded-3xl sm:p-2" aria-label="Loại nhật ký">
            {tabs.map(({ value, label, icon: Icon }) => <Link key={value} href={`/dashboard/farmer/journal?tab=${value}`} className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-center text-sm font-bold leading-tight transition sm:min-h-12 sm:flex-row sm:gap-2 sm:rounded-2xl sm:px-3 sm:py-3 sm:text-base ${active === value ? "bg-brand-600 text-white shadow-soft" : "text-slate-600 hover:bg-brand-50"}`}><Icon className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" /><span className="whitespace-nowrap">{label}</span></Link>)}
        </nav>
        {active === "weather" && <WeatherJournal />}
        {active === "cultivation" && <FarmerLogsPage searchParams={searchParams} />}
        {active === "inventory" && <section className="rounded-3xl border border-dashed bg-white px-6 py-16 text-center shadow-sm"><span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-amber-50 text-amber-600"><PackageOpen className="h-8 w-8" /></span><h2 className="mt-4 text-xl font-black text-slate-900">Kho vật tư</h2><p className="mx-auto mt-2 max-w-md text-slate-500">Nội dung nhật ký kho vật tư đang được xây dựng và sẽ được bổ sung sau.</p></section>}
    </div>;
}
