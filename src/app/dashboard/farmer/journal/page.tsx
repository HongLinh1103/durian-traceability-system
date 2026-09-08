import { redirect } from "next/navigation";

export default function Page({ searchParams = {} }: { searchParams?: Record<string, string | string[] | undefined> }) {
    const requestedTab = searchParams.tab;
    const tab = typeof requestedTab === "string" && ["weather","cultivation","pests"].includes(requestedTab) ? requestedTab : "weather";
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
        if (key === "tab" || value === undefined) continue;
        for (const item of Array.isArray(value) ? value : [value]) params.append(key, item);
    }
    redirect(`/dashboard/farmer/journal/${tab}${params.size ? `?${params}` : ""}`);
}
