import { InventoryManager } from "@/components/store/inventory-manager";

export default function StoreInventoryPage() {
    return <main className="mx-auto max-w-7xl space-y-5 px-4 py-7 sm:px-6"><div><h1 className="text-3xl font-black text-slate-950">Quản lý kho hàng</h1><p className="mt-1 text-sm text-slate-500">Theo dõi tồn kho, nhập hàng, xuất hàng và biến động từ đơn bán.</p></div><InventoryManager /></main>;
}
