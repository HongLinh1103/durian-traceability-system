import { NextResponse } from "next/server";

function retired() {
    return NextResponse.json({ success: false, message: "Chức năng nhật ký thời tiết đã được gỡ bỏ." }, { status: 410 });
}

export { retired as GET, retired as POST };
