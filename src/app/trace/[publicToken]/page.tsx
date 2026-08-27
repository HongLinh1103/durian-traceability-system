import { notFound } from "next/navigation";
import { getPublicTrace } from "@/lib/traceability";
import { PublicTraceView } from "@/components/trace/public-trace-view";

export const dynamic = "force-dynamic";

export default async function TracePage(props: {
    params: Promise<{ publicToken: string }> | { publicToken: string };
}) {
    const params = await Promise.resolve(props.params);
    const trace = await getPublicTrace(params.publicToken);

    if (!trace) notFound();

    return <PublicTraceView trace={JSON.parse(JSON.stringify(trace))} />;
}
