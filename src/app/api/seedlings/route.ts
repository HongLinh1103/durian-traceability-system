import { NextRequest, NextResponse } from "next/server";
import { getSeedlings, createSeedling, SeedlingItem } from "@/lib/seedlings-data";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const variety = searchParams.get("variety") || undefined;
        const nurseryPhone = searchParams.get("nurseryPhone") || undefined;
        const province = searchParams.get("province") || undefined;
        const search = searchParams.get("search") || undefined;
        const status = searchParams.get("status") || undefined;

        const items = await getSeedlings({ variety, nurseryPhone, province, search, status });
        return NextResponse.json({ success: true, data: items, total: items.length });
    } catch (error) {
        console.error("Error fetching seedlings:", error);
        return NextResponse.json({ success: false, message: "Lỗi tải danh sách cây giống" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        if (!body.title || !body.variety || !body.price || !body.nurseryName) {
            return NextResponse.json(
                { success: false, message: "Thiếu các thông tin bắt buộc: tên sản phẩm, giống, giá, tên trại" },
                { status: 400 }
            );
        }

        const newItem = await createSeedling({
            code: body.code || `CG-${Date.now().toString().slice(-4)}`,
            title: body.title,
            variety: body.variety,
            price: Number(body.price),
            status: body.status || "IN_STOCK",
            availableQuantity: Number(body.availableQuantity || 100),
            nurseryName: body.nurseryName,
            nurseryPhone: body.nurseryPhone || "0909333001",
            nurseryAddress: body.nurseryAddress || "Long Khánh, Đồng Nai",
            nurseryProvince: body.nurseryProvince || "Đồng Nai",
            nurseryAvatar: body.nurseryAvatar || "https://images.unsplash.com/photo-1595246140625-573b715d11dc?auto=format&fit=crop&w=400&q=80",
            imageUrls: body.imageUrls?.length
                ? body.imageUrls
                : ["https://images.unsplash.com/photo-1595246140625-573b715d11dc?auto=format&fit=crop&w=800&q=80"],
            specifications: {
                variety: body.variety,
                propagationMethod: body.specifications?.propagationMethod || "Ghép nêm đọt non",
                treeAge: body.specifications?.treeAge || "8 tháng",
                treeHeight: body.specifications?.treeHeight || "70 – 90 cm",
                rootstock: body.specifications?.rootstock || "Sầu riêng hạt chọn lọc",
                plantHealth: body.specifications?.plantHealth || "Khỏe mạnh, đọt non xanh mướt, sạch bệnh",
                packagingSpec: body.specifications?.packagingSpec || "Cây / bầu",
                potSize: body.specifications?.potSize || "15 × 25 cm",
            },
            description: body.description || "Cây giống sầu riêng chất lượng cao từ trại giống uy tín.",
            guarantees: body.guarantees?.length
                ? body.guarantees
                : [
                      "Bảo hành chuẩn giống 100% trọn đời cây",
                      "Cây đã thuần nắng, rễ ăn kín bầu khỏe mạnh",
                      "Hỗ trợ tư vấn kỹ thuật trồng và chăm sóc định kỳ",
                  ],
            ownerPhone: body.ownerPhone || body.nurseryPhone || "0909333001",
        });

        return NextResponse.json({ success: true, data: newItem, message: "Đăng bán cây giống thành công!" }, { status: 201 });
    } catch (error) {
        console.error("Error creating seedling:", error);
        return NextResponse.json({ success: false, message: "Lỗi đăng bán cây giống" }, { status: 500 });
    }
}
