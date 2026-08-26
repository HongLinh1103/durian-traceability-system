"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
    Sprout,
    Plus,
    Edit3,
    Trash2,
    CheckCircle2,
    AlertCircle,
    Building2,
    Phone,
    MapPin,
    Eye,
    Package,
    Trees,
    X,
    Loader2,
} from "lucide-react";
import type { SeedlingItem } from "@/lib/seedlings-data";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NurseryDashboardClientProps = {
    initialItems: SeedlingItem[];
    currentAccountPhone?: string;
};

const NURSERY_ACCOUNTS = [
    {
        name: "Trại giống sầu riêng Minh Phát",
        phone: "0909333001",
        email: "minhphat.seedling@triviet.vn",
        address: "45 Đường CMT8, Phường Xuân Bình, TP. Long Khánh, Tỉnh Đồng Nai",
        province: "Đồng Nai",
        representative: "Hoàng Minh Phát",
    },
    {
        name: "Trại cây giống Tân Phú Bến Tre",
        phone: "0909333002",
        email: "tanphu.seedling@triviet.vn",
        address: "Quốc lộ 57, Xã Phú Sơn, Huyện Chợ Lách, Tỉnh Bến Tre",
        province: "Bến Tre",
        representative: "Nguyễn Văn Tân",
    },
];

export function NurseryDashboardClient({ initialItems, currentAccountPhone }: NurseryDashboardClientProps) {
    const [items, setItems] = useState<SeedlingItem[]>(initialItems);
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<SeedlingItem | null>(null);

    // Form state (all empty by default for new creations)
    const [formTitle, setFormTitle] = useState("");
    const [formCode, setFormCode] = useState("");
    const [formVariety, setFormVariety] = useState("");
    const [formPrice, setFormPrice] = useState("");
    const [formQuantity, setFormQuantity] = useState("");
    const [formStatus, setFormStatus] = useState<"IN_STOCK" | "OUT_OF_STOCK">("IN_STOCK");
    const [formImages, setFormImages] = useState("");
    const [formPropagation, setFormPropagation] = useState("");
    const [formTreeAge, setFormTreeAge] = useState("");
    const [formTreeHeight, setFormTreeHeight] = useState("");
    const [formRootstock, setFormRootstock] = useState("");
    const [formPlantHealth, setFormPlantHealth] = useState("");
    const [formPackaging, setFormPackaging] = useState("");
    const [formPotSize, setFormPotSize] = useState("");
    const [formDescription, setFormDescription] = useState("");

    const currentNursery =
        NURSERY_ACCOUNTS.find((n) => n.phone === currentAccountPhone) || NURSERY_ACCOUNTS[0];

    // Filter items belonging to the current nursery
    const nurseryItems = items.filter(
        (it) => it.ownerPhone === currentNursery.phone || it.nurseryPhone === currentNursery.phone
    );

    const totalStock = nurseryItems.reduce((sum, it) => sum + (it.availableQuantity || 0), 0);
    const inStockCount = nurseryItems.filter((it) => it.status === "IN_STOCK").length;

    const resetForm = () => {
        setEditingItem(null);
        setFormTitle("");
        setFormCode("");
        setFormVariety("");
        setFormPrice("");
        setFormQuantity("");
        setFormStatus("IN_STOCK");
        setFormImages("");
        setFormPropagation("");
        setFormTreeAge("");
        setFormTreeHeight("");
        setFormRootstock("");
        setFormPlantHealth("");
        setFormPackaging("");
        setFormPotSize("");
        setFormDescription("");
    };

    const openCreateModal = () => {
        resetForm();
        setIsModalOpen(true);
    };

    const openEditModal = (item: SeedlingItem) => {
        setEditingItem(item);
        setFormTitle(item.title);
        setFormCode(item.code);
        setFormVariety(item.variety);
        setFormPrice(item.price.toString());
        setFormQuantity(item.availableQuantity.toString());
        setFormStatus(item.status);
        setFormImages(item.imageUrls.join("\n"));
        setFormPropagation(item.specifications.propagationMethod);
        setFormTreeAge(item.specifications.treeAge);
        setFormTreeHeight(item.specifications.treeHeight);
        setFormRootstock(item.specifications.rootstock);
        setFormPlantHealth(item.specifications.plantHealth);
        setFormPackaging(item.specifications.packagingSpec);
        setFormPotSize(item.specifications.potSize);
        setFormDescription(item.description);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const imgList = formImages
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean);

        const payload = {
            title: formTitle,
            code: formCode,
            variety: formVariety,
            price: Number(formPrice),
            availableQuantity: Number(formQuantity),
            status: formStatus,
            imageUrls: imgList.length ? imgList : ["https://images.unsplash.com/photo-1595246140625-573b715d11dc?auto=format&fit=crop&w=800&q=80"],
            nurseryName: currentNursery.name,
            nurseryPhone: currentNursery.phone,
            nurseryAddress: currentNursery.address,
            nurseryProvince: currentNursery.province,
            nurseryAvatar: imgList[0] || "https://images.unsplash.com/photo-1595246140625-573b715d11dc?auto=format&fit=crop&w=400&q=80",
            ownerPhone: currentNursery.phone,
            specifications: {
                variety: formVariety,
                propagationMethod: formPropagation,
                treeAge: formTreeAge,
                treeHeight: formTreeHeight,
                rootstock: formRootstock,
                plantHealth: formPlantHealth,
                packagingSpec: formPackaging,
                potSize: formPotSize,
            },
            description: formDescription,
            guarantees: [
                "Bảo hành chuẩn giống 100% trọn đời",
                "Cây đã thuần nắng, rễ ăn kín bầu khỏe mạnh",
                "Hỗ trợ kỹ thuật trồng và chăm sóc cây giống",
            ],
        };

        try {
            if (editingItem) {
                // Update
                const res = await fetch(`/api/seedlings/${editingItem.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                const data = await res.json();
                if (data.success) {
                    setItems((prev) =>
                        prev.map((it) => (it.id === editingItem.id ? data.data : it))
                    );
                }
            } else {
                // Create
                const res = await fetch("/api/seedlings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                const data = await res.json();
                if (data.success) {
                    setItems((prev) => [data.data, ...prev]);
                }
            }
            setIsModalOpen(false);
        } catch (err) {
            console.error("Error saving seedling:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Bạn có chắc chắn muốn xóa giống cây trồng này không?")) return;
        try {
            const res = await fetch(`/api/seedlings/${id}`, { method: "DELETE" });
            const data = await res.json();
            if (data.success) {
                setItems((prev) => prev.filter((it) => it.id !== id));
            }
        } catch (err) {
            console.error("Error deleting:", err);
        }
    };

    const handleToggleStatus = async (item: SeedlingItem) => {
        const newStatus = item.status === "IN_STOCK" ? "OUT_OF_STOCK" : "IN_STOCK";
        try {
            const res = await fetch(`/api/seedlings/${item.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });
            const data = await res.json();
            if (data.success) {
                setItems((prev) =>
                    prev.map((it) => (it.id === item.id ? { ...it, status: newStatus } : it))
                );
            }
        } catch (err) {
            console.error("Error toggling status:", err);
        }
    };

    return (
        <div className="space-y-8">
            {/* NURSERY ACCOUNT SELECTOR & STATS BANNER */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* Account Info Box (7 cols) */}
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-7">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white font-black">
                                <Trees className="h-6 w-6" />
                            </div>
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-brand-700">
                                    Tài khoản Trại giống
                                </span>
                                <h2 className="text-lg font-black text-slate-950">
                                    {currentNursery.name}
                                </h2>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <span className="rounded-full bg-brand-50 border border-brand-200 px-3 py-1 text-xs font-bold text-brand-800 flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5 text-brand-600" />
                                {currentNursery.province}
                            </span>
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
                        <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-brand-600 shrink-0" />
                            <span>
                                <strong>Hotline:</strong> {currentNursery.phone}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-brand-600 shrink-0" />
                            <span>
                                <strong>Đại diện:</strong> {currentNursery.representative}
                            </span>
                        </div>
                        <div className="col-span-1 sm:col-span-2 flex items-start gap-2 pt-1">
                            <MapPin className="h-4 w-4 text-brand-600 shrink-0 mt-0.5" />
                            <span>
                                <strong>Địa chỉ:</strong> {currentNursery.address}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Quick Stats Box (5 cols) */}
                <div className="grid grid-cols-2 gap-3.5 lg:col-span-5">
                    <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-emerald-800">Cây giống đăng bán</span>
                            <Sprout className="h-4 w-4 text-emerald-600" />
                        </div>
                        <p className="mt-2 text-3xl font-black text-emerald-950">
                            {nurseryItems.length}
                        </p>
                        <span className="text-[11px] text-emerald-700 font-medium">
                            {inStockCount} giống còn hàng
                        </span>
                    </div>

                    <div className="rounded-3xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-brand-800">Tổng cây sẵn có</span>
                            <Package className="h-4 w-4 text-brand-600" />
                        </div>
                        <p className="mt-2 text-3xl font-black text-brand-950">
                            {totalStock.toLocaleString("vi-VN")}
                        </p>
                        <span className="text-[11px] text-brand-700 font-medium">
                            Cây trong vườn ươm
                        </span>
                    </div>
                </div>
            </div>

            {/* ACTION BAR */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
                <div>
                    <h3 className="text-base font-black text-slate-900">
                        Danh sách giống cây trồng của trại
                    </h3>
                    <p className="text-xs text-slate-500">
                        Quản lý giá, số lượng khả dụng và thông số kỹ thuật đặc điểm cây giống
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        onClick={openCreateModal}
                        className="rounded-xl bg-brand-600 font-bold text-white shadow-sm hover:bg-brand-700"
                    >
                        <Plus className="mr-1.5 h-4 w-4" />
                        Đăng bán cây giống mới
                    </Button>
                </div>
            </div>

            {/* SEEDLING ITEMS LIST (RESPONSIVE: MOBILE CARD VIEW & DESKTOP TABLE) */}
            {nurseryItems.length === 0 ? (
                <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-400 shadow-sm">
                    Chưa có sản phẩm cây giống nào. Bấm nút &ldquo;Đăng bán cây giống mới&rdquo; ở trên để thêm.
                </div>
            ) : (
                <>
                    {/* MOBILE CARD VIEW (block md:hidden) */}
                    <div className="grid grid-cols-1 gap-4 md:hidden">
                        {nurseryItems.map((item) => (
                            <article
                                key={item.id}
                                className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm space-y-3.5 transition hover:shadow-md"
                            >
                                {/* Card Header */}
                                <div className="flex items-start gap-3">
                                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-slate-100 border border-slate-200 shadow-xs">
                                        <Image
                                            src={item.imageUrls[0] || item.nurseryAvatar}
                                            alt={item.title}
                                            fill
                                            sizes="80px"
                                            className="object-cover"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="font-mono text-[11px] font-bold text-slate-500">
                                                {item.code}
                                            </span>
                                            <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-700">
                                                {item.variety}
                                            </span>
                                        </div>
                                        <h4 className="font-bold text-slate-900 text-sm line-clamp-2 mt-1">
                                            {item.title}
                                        </h4>
                                        <p className="mt-1 text-base font-black text-emerald-700">
                                            {item.priceFormatted}
                                        </p>
                                    </div>
                                </div>

                                {/* Specs Pill Box */}
                                <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-3 text-xs text-slate-700">
                                    <div>
                                        <span className="text-[11px] text-slate-400 block">Số lượng khả dụng:</span>
                                        <span className="font-black text-slate-900">{item.availableQuantity} cây</span>
                                    </div>
                                    <div>
                                        <span className="text-[11px] text-slate-400 block">Tuổi cây:</span>
                                        <span className="font-bold text-slate-800">{item.specifications.treeAge}</span>
                                    </div>
                                    <div>
                                        <span className="text-[11px] text-slate-400 block">Chiều cao:</span>
                                        <span className="font-bold text-slate-800">{item.specifications.treeHeight}</span>
                                    </div>
                                    <div>
                                        <span className="text-[11px] text-slate-400 block">Quy cách bầu:</span>
                                        <span className="font-bold text-slate-800 truncate block">{item.specifications.potSize}</span>
                                    </div>
                                </div>

                                {/* Card Actions & Status */}
                                <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                                    <button
                                        type="button"
                                        onClick={() => handleToggleStatus(item)}
                                        className={cn(
                                            "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold transition",
                                            item.status === "IN_STOCK"
                                                ? "bg-emerald-100 text-emerald-800"
                                                : "bg-rose-100 text-rose-800"
                                        )}
                                    >
                                        {item.status === "IN_STOCK" ? (
                                            <>
                                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                                Còn hàng
                                            </>
                                        ) : (
                                            <>
                                                <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
                                                Tạm hết hàng
                                            </>
                                        )}
                                    </button>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => openEditModal(item)}
                                            className="h-8 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 border-slate-200"
                                        >
                                            <Edit3 className="mr-1 h-3.5 w-3.5 text-brand-600" />
                                            Chỉnh sửa
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleDelete(item.id)}
                                            className="h-8 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border-rose-200"
                                        >
                                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                                            Xóa
                                        </Button>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>

                    {/* DESKTOP TABLE VIEW (hidden md:block) */}
                    <div className="hidden md:block overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-700">
                                    <tr>
                                        <th className="p-4">Hình ảnh & Tên sản phẩm</th>
                                        <th className="p-4">Mã & Giống</th>
                                        <th className="p-4">Giá bán niêm yết</th>
                                        <th className="p-4">Số lượng khả dụng</th>
                                        <th className="p-4">Đặc điểm (Tuổi / Chiều cao)</th>
                                        <th className="p-4">Trạng thái</th>
                                        <th className="p-4 text-right">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {nurseryItems.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50/70 transition">
                                            {/* Image & Title */}
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100 border">
                                                        <Image
                                                            src={item.imageUrls[0] || item.nurseryAvatar}
                                                            alt={item.title}
                                                            fill
                                                            sizes="60px"
                                                            className="object-cover"
                                                        />
                                                    </div>
                                                    <div>
                                                        <span className="font-bold text-slate-900 line-clamp-1 block text-sm">
                                                            {item.title}
                                                        </span>
                                                        <span className="text-[11px] text-slate-400">
                                                            Quy cách: {item.specifications.packagingSpec} ({item.specifications.potSize})
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Code & Variety */}
                                            <td className="p-4">
                                                <span className="font-mono font-bold text-slate-700 block">
                                                    {item.code}
                                                </span>
                                                <span className="inline-block rounded bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700">
                                                    {item.variety}
                                                </span>
                                            </td>

                                            {/* Price */}
                                            <td className="p-4 font-black text-emerald-700 text-sm">
                                                {item.priceFormatted}
                                            </td>

                                            {/* Quantity */}
                                            <td className="p-4">
                                                <span className="font-bold text-slate-900">
                                                    {item.availableQuantity} cây
                                                </span>
                                            </td>

                                            {/* Specs */}
                                            <td className="p-4 text-slate-600">
                                                <div>{item.specifications.treeAge}</div>
                                                <div className="font-semibold text-slate-800">{item.specifications.treeHeight}</div>
                                            </td>

                                            {/* Status Toggle */}
                                            <td className="p-4">
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleStatus(item)}
                                                    className={cn(
                                                        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition",
                                                        item.status === "IN_STOCK"
                                                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                                            : "bg-rose-100 text-rose-800 hover:bg-rose-200"
                                                    )}
                                                >
                                                    {item.status === "IN_STOCK" ? (
                                                        <>
                                                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                                            Còn hàng
                                                        </>
                                                    ) : (
                                                        <>
                                                            <AlertCircle className="h-3 w-3 text-rose-600" />
                                                            Tạm hết hàng
                                                        </>
                                                    )}
                                                </button>
                                            </td>

                                            {/* Actions */}
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => openEditModal(item)}
                                                        className="h-8 w-8 p-0 rounded-lg text-slate-600 hover:text-brand-700 hover:bg-brand-50"
                                                        title="Chỉnh sửa"
                                                    >
                                                        <Edit3 className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleDelete(item.id)}
                                                        className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                                        title="Xóa"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* CREATE / EDIT MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-lg font-black text-slate-900">
                                {editingItem ? "Chỉnh sửa thông tin cây giống" : "Đăng bán cây giống mới"}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Section 1: Basic Info */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-black uppercase tracking-wider text-brand-700">
                                    1. Thông tin chung
                                </h4>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="sm:col-span-2">
                                        <label className="text-xs font-bold text-slate-700 block mb-1">
                                            Tên sản phẩm cây giống *:
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Ví dụ: Cây giống sầu riêng Ri6 ghép chuẩn F1"
                                            value={formTitle}
                                            onChange={(e) => setFormTitle(e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-brand-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1">
                                            Mã sản phẩm *:
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="CG-RI6-001"
                                            value={formCode}
                                            onChange={(e) => setFormCode(e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono outline-none focus:border-brand-500"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1">
                                            Tên giống *:
                                        </label>
                                        <select
                                            required
                                            value={formVariety}
                                            onChange={(e) => setFormVariety(e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-brand-500"
                                        >
                                            <option value="">-- Chọn giống cây trồng --</option>
                                            <option value="Ri6">Ri6</option>
                                            <option value="Monthong (Dona)">Monthong (Dona)</option>
                                            <option value="Musang King">Musang King (D197)</option>
                                            <option value="Black Thorn">Black Thorn (D200)</option>
                                            <option value="Sáu Hữu">Sáu Hữu</option>
                                            <option value="Chuồng Bò">Chuồng Bò</option>
                                            <option value="Khác">Giống khác</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1">
                                            Giá bán (VNĐ/cây) *:
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            min={1000}
                                            step={1000}
                                            value={formPrice}
                                            onChange={(e) => setFormPrice(e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold outline-none focus:border-brand-500 text-emerald-700"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1">
                                            Số lượng sẵn có (cây) *:
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            min={0}
                                            value={formQuantity}
                                            onChange={(e) => setFormQuantity(e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-brand-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">
                                        Hình ảnh cây giống (Mỗi dòng 1 URL ảnh):
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={formImages}
                                        onChange={(e) => setFormImages(e.target.value)}
                                        placeholder="https://... (URL ảnh 1)&#10;https://... (URL ảnh 2)"
                                        className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono outline-none focus:border-brand-500"
                                    />
                                </div>
                            </div>

                            {/* Section 2: Specifications (Đặc điểm cây giống) */}
                            <div className="space-y-3 border-t border-slate-100 pt-3">
                                <h4 className="text-xs font-black uppercase tracking-wider text-brand-700">
                                    2. Đặc điểm cây giống chi tiết
                                </h4>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1">
                                            Phương pháp nhân giống:
                                        </label>
                                        <input
                                            type="text"
                                            value={formPropagation}
                                            onChange={(e) => setFormPropagation(e.target.value)}
                                            placeholder="Ghép nêm đọt non / Ghép mắt..."
                                            className="w-full rounded-xl border border-slate-200 p-2 text-xs outline-none focus:border-brand-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1">
                                            Tuổi cây:
                                        </label>
                                        <input
                                            type="text"
                                            value={formTreeAge}
                                            onChange={(e) => setFormTreeAge(e.target.value)}
                                            placeholder="8 tháng / 10 tháng..."
                                            className="w-full rounded-xl border border-slate-200 p-2 text-xs outline-none focus:border-brand-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1">
                                            Chiều cao cây giống:
                                        </label>
                                        <input
                                            type="text"
                                            value={formTreeHeight}
                                            onChange={(e) => setFormTreeHeight(e.target.value)}
                                            placeholder="70 – 90 cm / 80 – 100 cm..."
                                            className="w-full rounded-xl border border-slate-200 p-2 text-xs outline-none focus:border-brand-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1">
                                            Gốc ghép:
                                        </label>
                                        <input
                                            type="text"
                                            value={formRootstock}
                                            onChange={(e) => setFormRootstock(e.target.value)}
                                            placeholder="Sầu riêng hạt chọn lọc..."
                                            className="w-full rounded-xl border border-slate-200 p-2 text-xs outline-none focus:border-brand-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1">
                                            Quy cách đóng gói:
                                        </label>
                                        <input
                                            type="text"
                                            value={formPackaging}
                                            onChange={(e) => setFormPackaging(e.target.value)}
                                            placeholder="Cây / bầu"
                                            className="w-full rounded-xl border border-slate-200 p-2 text-xs outline-none focus:border-brand-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1">
                                            Kích thước bầu:
                                        </label>
                                        <input
                                            type="text"
                                            value={formPotSize}
                                            onChange={(e) => setFormPotSize(e.target.value)}
                                            placeholder="15 × 25 cm"
                                            className="w-full rounded-xl border border-slate-200 p-2 text-xs outline-none focus:border-brand-500"
                                        />
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className="text-xs font-bold text-slate-700 block mb-1">
                                            Tình trạng sức khỏe cây:
                                        </label>
                                        <input
                                            type="text"
                                            value={formPlantHealth}
                                            onChange={(e) => setFormPlantHealth(e.target.value)}
                                            placeholder="Khỏe mạnh, đọt non xanh mướt, rễ kín bầu..."
                                            className="w-full rounded-xl border border-slate-200 p-2 text-xs outline-none focus:border-brand-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Description */}
                            <div className="space-y-2 border-t border-slate-100 pt-3">
                                <label className="text-xs font-bold text-slate-700 block">
                                    Mô tả chi tiết & Hướng dẫn kỹ thuật:
                                </label>
                                <textarea
                                    rows={3}
                                    value={formDescription}
                                    onChange={(e) => setFormDescription(e.target.value)}
                                    placeholder="Thông tin về năng suất, chất lượng cơm quả, hướng dẫn làm đất và bón lót..."
                                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-brand-500"
                                />
                            </div>

                            {/* Submit buttons */}
                            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsModalOpen(false)}
                                    className="rounded-xl"
                                >
                                    Hủy
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className="rounded-xl bg-brand-600 font-bold text-white shadow-sm hover:bg-brand-700"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Đang lưu...
                                        </>
                                    ) : editingItem ? (
                                        "Lưu thay đổi"
                                    ) : (
                                        "Đăng bán sản phẩm"
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
