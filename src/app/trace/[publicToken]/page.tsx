import { notFound } from "next/navigation";
import { getPublicTrace } from "@/lib/traceability";
import { PublicTraceView } from "@/components/trace/public-trace-view";

export const dynamic = "force-dynamic";

export default async function TracePage(props: {
    params: Promise<{ publicToken: string }> | { publicToken: string };
    searchParams?: Promise<{ [key: string]: string | string[] | undefined }> | { [key: string]: string | string[] | undefined };
}) {
    const params = await Promise.resolve(props.params);
    const search = props.searchParams ? await Promise.resolve(props.searchParams) : {};
    const encodedPayload = typeof search.p === "string" ? search.p : (typeof search.preview === "string" ? search.preview : undefined);

    const trace = await getPublicTrace(params.publicToken, encodedPayload);

    if (!trace) notFound();

    return <PublicTraceView trace={JSON.parse(JSON.stringify(trace))} />;
}
