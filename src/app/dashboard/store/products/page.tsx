import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSeedlings } from "@/lib/seedlings-data";
import { NurseryDashboardClient } from "@/components/nursery/NurseryDashboardClient";
import { StoreProductsManager } from "@/components/store/store-products-manager";

export const dynamic = "force-dynamic";

export default async function StoreProductsPage() {
    const session = await getServerSession(authOptions);
    const seedlings = await getSeedlings();
    const userPhone = session?.user?.phone ?? undefined;
    const isNurseryAccount = userPhone === "0909333001" || userPhone === "0909333002";

    if (isNurseryAccount) {
        return (
            <main className="mx-auto max-w-[1600px] px-4 py-7 sm:px-6">
                <div className="mb-6">
                    <p className="font-semibold text-emerald-700">
                        Kênh Quản Lý Trại Cây Giống
                    </p>
                    <h1 className="text-3xl font-black text-slate-950">
                        Quản lý Cây giống đã đăng bán
                    </h1>
                    <p className="mt-2 text-slate-500">
                        Cập nhật thông số kích thước, tuổi cây, giá bán và quản lý số lượng cây giống khả dụng tại vườn ươm.
                    </p>
                </div>
                <NurseryDashboardClient
                    initialItems={seedlings}
                    currentAccountPhone={userPhone}
                />
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-[1600px] px-4 py-7 sm:px-6">
            <div className="mb-6">
                <p className="font-semibold text-emerald-700">Chủ cửa hàng vật tư</p>
                <h1 className="text-3xl font-black text-slate-950">Sản phẩm cửa hàng</h1>
                <p className="mt-2 text-slate-500">
                    Thêm mới và quản lý các sản phẩm phân bón, thuốc bảo vệ thực vật của cửa hàng.
                </p>
            </div>
            <StoreProductsManager />
        </main>
    );
}
