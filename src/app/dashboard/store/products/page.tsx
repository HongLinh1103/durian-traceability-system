import { StoreProductsManager } from "@/components/store/store-products-manager";

export default function StoreProductsPage() {
    return <main className="mx-auto max-w-[1600px] px-4 py-7 sm:px-6">
        <div className="mb-6">
            <p className="font-semibold text-emerald-700">Chủ cửa hàng vật tư</p>
            <h1 className="text-3xl font-black text-slate-950">Sản phẩm cửa hàng</h1>
            <p className="mt-2 text-slate-500">Thêm mới và quản lý các sản phẩm phân bón, thuốc bảo vệ thực vật của cửa hàng.</p>
        </div>
        <StoreProductsManager />
    </main>;
}
