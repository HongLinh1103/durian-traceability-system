import { NextResponse } from "next/server";
import { getPublicTrace } from "@/lib/traceability";

export const dynamic = "force-dynamic";

export async function GET(
    _: Request,
    props: { params: Promise<{ publicToken: string }> | { publicToken: string } }
) {
    const params = await Promise.resolve(props.params);
    const data = await getPublicTrace(params.publicToken);
    if (!data) {
        return NextResponse.json(
            { success: false, message: "Mã truy xuất không tồn tại." },
            { status: 404 }
        );
    }
    return NextResponse.json({ success: true, data });
}
