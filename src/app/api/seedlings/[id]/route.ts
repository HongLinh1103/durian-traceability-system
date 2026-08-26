import { NextRequest, NextResponse } from "next/server";
import { getSeedlingById, updateSeedling, deleteSeedling } from "@/lib/seedlings-data";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const item = await getSeedlingById(params.id);
        if (!item) {
            return NextResponse.json({ success: false, message: "Không tìm thấy cây giống" }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: item });
    } catch (error) {
        console.error("Error getting seedling:", error);
        return NextResponse.json({ success: false, message: "Lỗi tải thông tin cây giống" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const body = await request.json();
        const updated = await updateSeedling(params.id, body);
        if (!updated) {
            return NextResponse.json({ success: false, message: "Không tìm thấy cây giống để cập nhật" }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: updated, message: "Cập nhật cây giống thành công!" });
    } catch (error) {
        console.error("Error updating seedling:", error);
        return NextResponse.json({ success: false, message: "Lỗi cập nhật cây giống" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const success = await deleteSeedling(params.id);
        if (!success) {
            return NextResponse.json({ success: false, message: "Không tìm thấy cây giống để xóa" }, { status: 404 });
        }
        return NextResponse.json({ success: true, message: "Xóa cây giống thành công!" });
    } catch (error) {
        console.error("Error deleting seedling:", error);
        return NextResponse.json({ success: false, message: "Lỗi xóa cây giống" }, { status: 500 });
    }
}
