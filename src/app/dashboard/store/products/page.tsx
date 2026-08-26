import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSeedlings } from "@/lib/seedlings-data";
import { StoreProductsUnified } from "@/components/store/StoreProductsUnified";

export const dynamic = "force-dynamic";

export default async function StoreProductsPage() {
    const session = await getServerSession(authOptions);
    const seedlings = await getSeedlings();
    const userPhone = session?.user?.phone ?? undefined;
    const isNurseryAccount = userPhone === "0909333001" || userPhone === "0909333002";

    return (
        <main className="mx-auto max-w-[1600px] px-4 py-7 sm:px-6">
            <div className="mb-6">
                <p className="font-semibold text-emerald-700">
                    {isNurseryAccount ? "Kênh Quản Lý Trại Cây Giống & Vật Tư" : "Chủ cửa hàng cung ứng vật tư & Cây giống"}
                </p>
                <h1 className="text-3xl font-black text-slate-950">
                    {isNurseryAccount ? "Quản lý Cây giống & Sản phẩm" : "Sản phẩm cửa hàng & Trại giống"}
                </h1>
                <p className="mt-2 text-slate-500">
                    Quản lý danh mục cây giống sầu riêng đăng bán trên trang khách và các sản phẩm phân bón, thuốc bảo vệ thực vật.
                </p>
            </div>
            <StoreProductsUnified
                seedlings={seedlings}
                userPhone={userPhone}
                isNurseryAccount={isNurseryAccount}
            />
        </main>
    );
}
