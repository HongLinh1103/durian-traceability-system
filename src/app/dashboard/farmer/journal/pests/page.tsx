import { redirect } from "next/navigation";
export default function Page({ searchParams = {} }: { searchParams?: Record<string, string | string[] | undefined> }) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
        if (key === "tab" || value === undefined) continue;
        for (const item of Array.isArray(value) ? value : [value]) params.append(key, item);
    }
    redirect("/dashboard/farmer/pest-monitoring" + (params.size ? "?" + params.toString() : ""));
}
