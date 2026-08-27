import { Metadata } from "next";
import { ChinaPortView } from "@/components/china-port/china-port-view";

export const metadata: Metadata = {
    title: "China Port - Tra Cứu Mã Số Vùng Trồng & Cơ Sở Đóng Gói (GACC)",
    description: "Tra cứu dữ liệu chính thức từ Tổng cục Hải quan Trung Quốc (GACC - scintl.chinaport.gov.cn) phục vụ xuất khẩu sầu riêng và nông sản chính ngạch.",
};

export default function ChinaPortPage() {
    return (
        <main className="min-h-screen bg-slate-50/50 py-8">
            <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <ChinaPortView />
            </div>
        </main>
    );
}
