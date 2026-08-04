import { TraceResult } from "@/components/trace/trace-result";

export const metadata = { title: "Thông tin truy xuất | TriViet" };
export default function TracePage({ params }: { params: { code: string } }) { return <TraceResult code={decodeURIComponent(params.code)} />; }
