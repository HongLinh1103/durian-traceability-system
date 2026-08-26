"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
    Sprout,
    CheckCircle2,
    ShieldCheck,
    PhoneCall,
    MapPin,
    Building2,
    PackageCheck,
    Check,
    ChevronRight,
    Phone,
} from "lucide-react";
import type { SeedlingItem } from "@/lib/seedlings-data";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SeedlingDetailClientProps = {
    item: SeedlingItem;
    relatedItems: SeedlingItem[];
};

export function SeedlingDetailClient({ item, relatedItems }: SeedlingDetailClientProps) {
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
    const [orderQuantity, setOrderQuantity] = useState(50);
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerAddress, setCustomerAddress] = useState("");
    const [orderSuccess, setOrderSuccess] = useState(false);

    const images = item.imageUrls?.length > 0 ? item.imageUrls : [item.nurseryAvatar];
    const currentImage = images[selectedImageIndex] || images[0];

    const handleOrderSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setOrderSuccess(true);
    };

    return (
        <div className="space-y-10">
            {/* MAIN PRODUCT DETAIL CARD */}
            <div className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-8 lg:p-10">
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
                    {/* ============================================================== */}
                    {/* LEFT COLUMN: MULTI-IMAGE GALLERY (5 cols)                      */}
                    {/* ============================================================== */}
                    <div className="space-y-4 lg:col-span-5">
                        {/* Main Featured Image */}
                        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-sm sm:aspect-square">
                            <Image
                                src={currentImage}
                                alt={item.title}
                                fill
                                priority
                                sizes="(max-width: 1024px) 100vw, 40vw"
                                className="object-cover transition-all duration-300"
                            />
                            {/* Stock Badge Overlay */}
                            <div className="absolute right-3.5 top-3.5">
                                {item.status === "IN_STOCK" ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/95 px-3 py-1 text-xs font-bold text-white shadow-md backdrop-blur">
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        Còn hàng ({item.availableQuantity} cây)
                                    </span>
                                ) : (
                                    <span className="rounded-full bg-rose-500/95 px-3 py-1 text-xs font-bold text-white shadow-md backdrop-blur">
                                        Tạm hết hàng
                                    </span>
                                )}
                            </div>

                            {/* Variety Badge */}
                            <div className="absolute bottom-3.5 left-3.5">
                                <span className="rounded-full bg-slate-950/80 px-3 py-1 text-xs font-black text-white shadow backdrop-blur">
                                    Giống {item.variety}
                                </span>
                            </div>
                        </div>

                        {/* Thumbnail Selector Bar (Cho phép nhiều ảnh) */}
                        {images.length > 1 && (
                            <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                                {images.map((img, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setSelectedImageIndex(idx)}
                                        className={cn(
                                            "relative h-18 w-18 shrink-0 overflow-hidden rounded-2xl border-2 transition-all duration-200 sm:h-20 sm:w-20",
                                            selectedImageIndex === idx
                                                ? "border-brand-600 ring-2 ring-brand-500/30 scale-95"
                                                : "border-slate-200 opacity-70 hover:opacity-100"
                                        )}
                                    >
                                        <Image
                                            src={img}
                                            alt={`${item.title} ảnh ${idx + 1}`}
                                            fill
                                            sizes="80px"
                                            className="object-cover"
                                        />
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Guarantee Badges */}
                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 text-xs text-emerald-900 space-y-2">
                            <div className="flex items-center gap-2 font-bold">
                                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                                <span>Cam kết từ TriViet & Trại giống:</span>
                            </div>
                            <ul className="space-y-1.5 pl-6 list-disc text-slate-700 text-[11px] leading-relaxed">
                                <li>Bảo hành chuẩn giống trọn đời cây trồng.</li>
                                <li>Cây đã thuần nắng, rễ đâm đều quanh bầu, tỷ lệ sống trên 98%.</li>
                                <li>Vận chuyển xe tải chuyên dụng có giàn đỡ chống dập gãy.</li>
                            </ul>
                        </div>
                    </div>

                    {/* ============================================================== */}
                    {/* RIGHT COLUMN: PRODUCT INFO & SPECIFICATIONS TABLE (7 cols)     */}
                    {/* ============================================================== */}
                    <div className="space-y-6 lg:col-span-7">
                        {/* Header: Code & Title */}
                        <div>
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md">
                                    Mã sản phẩm: {item.code}
                                </span>
                                <span className="text-xs font-bold text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-md">
                                    Giống sầu riêng: {item.variety}
                                </span>
                            </div>

                            <h1
                                className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl lg:text-4xl"
                                style={{ fontFamily: "var(--font-display)" }}
                            >
                                {item.title}
                            </h1>
                        </div>

                        {/* Price & Availability Banner */}
                        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-emerald-50/70 to-slate-50 p-4 border border-emerald-100">
                            <div>
                                <span className="text-xs font-semibold text-slate-500 block">
                                    Giá bán niêm yết:
                                </span>
                                <span className="text-2xl font-black text-emerald-700 sm:text-3xl">
                                    {item.priceFormatted}
                                </span>
                            </div>

                            <div className="text-right">
                                <span className="text-xs font-semibold text-slate-500 block">
                                    Số lượng khả dụng:
                                </span>
                                <span className="text-base font-black text-slate-900">
                                    {item.availableQuantity} cây tại vườn
                                </span>
                            </div>
                        </div>

                        {/* Nursery Contact Card */}
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5 space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                                <div className="flex items-center gap-2.5">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white font-black text-sm">
                                        <Building2 className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <span className="text-[11px] font-semibold text-slate-400 block">
                                            Trại giống cung cấp:
                                        </span>
                                        <h3 className="font-black text-slate-900 text-sm sm:text-base">
                                            {item.nurseryName}
                                        </h3>
                                    </div>
                                </div>
                                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                                    Đã xác thực
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                                <div className="flex items-start gap-1.5">
                                    <MapPin className="h-4 w-4 shrink-0 text-brand-600 mt-0.5" />
                                    <span>
                                        <strong>Địa chỉ:</strong> {item.nurseryAddress}
                                    </span>
                                </div>
                                <div className="flex items-start gap-1.5">
                                    <Phone className="h-4 w-4 shrink-0 text-brand-600 mt-0.5" />
                                    <span>
                                        <strong>Hotline liên hệ:</strong>{" "}
                                        <a href={`tel:${item.nurseryPhone}`} className="font-bold text-brand-700 hover:underline">
                                            {item.nurseryPhone}
                                        </a>
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* ============================================================== */}
                        {/* BẢNG ĐẶC ĐIỂM CÂY GIỐNG (QUAN TRỌNG NHẤT)                     */}
                        {/* ============================================================== */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                                    <Sprout className="h-5 w-5 text-emerald-600" />
                                    Đặc điểm cây giống chi tiết
                                </h3>
                                <span className="text-xs text-slate-500 font-medium">
                                    Thông số kiểm định
                                </span>
                            </div>

                            <div className="overflow-hidden rounded-2xl border border-slate-200">
                                <table className="w-full text-left text-xs sm:text-sm">
                                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                                        <tr>
                                            <th className="py-2.5 px-4 w-1/3">Thông tin</th>
                                            <th className="py-2.5 px-4 w-2/3">Chi tiết tại trại giống</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        <tr className="hover:bg-slate-50/80">
                                            <td className="py-2.5 px-4 font-semibold text-slate-600">Giống</td>
                                            <td className="py-2.5 px-4 font-bold text-slate-900">{item.specifications.variety}</td>
                                        </tr>
                                        <tr className="hover:bg-slate-50/80">
                                            <td className="py-2.5 px-4 font-semibold text-slate-600">Phương pháp nhân giống</td>
                                            <td className="py-2.5 px-4 text-slate-800">{item.specifications.propagationMethod}</td>
                                        </tr>
                                        <tr className="hover:bg-slate-50/80">
                                            <td className="py-2.5 px-4 font-semibold text-slate-600">Tuổi cây</td>
                                            <td className="py-2.5 px-4 font-bold text-slate-900">{item.specifications.treeAge}</td>
                                        </tr>
                                        <tr className="hover:bg-slate-50/80">
                                            <td className="py-2.5 px-4 font-semibold text-slate-600">Chiều cao</td>
                                            <td className="py-2.5 px-4 font-bold text-emerald-700">{item.specifications.treeHeight}</td>
                                        </tr>
                                        <tr className="hover:bg-slate-50/80">
                                            <td className="py-2.5 px-4 font-semibold text-slate-600">Gốc ghép</td>
                                            <td className="py-2.5 px-4 text-slate-800">{item.specifications.rootstock}</td>
                                        </tr>
                                        <tr className="hover:bg-slate-50/80">
                                            <td className="py-2.5 px-4 font-semibold text-slate-600">Tình trạng cây</td>
                                            <td className="py-2.5 px-4 text-slate-800">{item.specifications.plantHealth}</td>
                                        </tr>
                                        <tr className="hover:bg-slate-50/80">
                                            <td className="py-2.5 px-4 font-semibold text-slate-600">Quy cách</td>
                                            <td className="py-2.5 px-4 text-slate-800">{item.specifications.packagingSpec}</td>
                                        </tr>
                                        <tr className="hover:bg-slate-50/80">
                                            <td className="py-2.5 px-4 font-semibold text-slate-600">Kích thước bầu</td>
                                            <td className="py-2.5 px-4 font-mono font-semibold text-slate-800">{item.specifications.potSize}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Description */}
                        {item.description && (
                            <div className="space-y-2">
                                <h4 className="text-sm font-bold text-slate-900">Mô tả cây giống</h4>
                                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                                    {item.description}
                                </p>
                            </div>
                        )}

                        {/* Call to Actions */}
                        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                            <Button
                                asChild
                                size="lg"
                                className="w-full sm:flex-1 rounded-2xl bg-brand-600 text-sm font-black text-white shadow-md hover:bg-brand-700"
                            >
                                <a href={`tel:${item.nurseryPhone}`}>
                                    <PhoneCall className="mr-2 h-4 w-4" />
                                    Gọi đặt mua: {item.nurseryPhone}
                                </a>
                            </Button>

                            <Button
                                type="button"
                                size="lg"
                                variant="outline"
                                onClick={() => setIsOrderModalOpen(true)}
                                className="w-full sm:w-auto rounded-2xl border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-bold"
                            >
                                <PackageCheck className="mr-2 h-4 w-4" />
                                Đặt giữ cây giống
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* RELATED SEEDLINGS (4 Cards) */}
            {relatedItems.length > 0 && (
                <div className="space-y-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-black text-slate-900">
                                Các giống cây trồng khác cùng trại
                            </h2>
                            <p className="text-xs text-slate-500">
                                Cây giống tuyển chọn có sẵn tại {item.nurseryName}
                            </p>
                        </div>
                        <Button asChild variant="ghost" className="text-xs font-bold text-brand-700">
                            <Link href="/seedlings">
                                Xem tất cả
                                <ChevronRight className="ml-1 h-3.5 w-3.5" />
                            </Link>
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-4.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {relatedItems.slice(0, 4).map((rel) => (
                            <article
                                key={rel.id}
                                className="group flex flex-col justify-between overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-300 hover:shadow-xl"
                            >
                                <div>
                                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
                                        <Image
                                            src={rel.imageUrls[0] || rel.nurseryAvatar}
                                            alt={rel.title}
                                            fill
                                            sizes="25vw"
                                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                        <span className="absolute left-2.5 top-2.5 rounded-full bg-brand-600/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm backdrop-blur">
                                            {rel.variety}
                                        </span>
                                    </div>
                                    <div className="p-3.5 space-y-2">
                                        <h4 className="text-xs font-black text-slate-900 line-clamp-2 min-h-[2rem]">
                                            <Link href={`/seedlings/${rel.id}`} className="hover:text-brand-700">
                                                {rel.title}
                                            </Link>
                                        </h4>
                                        <div className="flex items-baseline justify-between">
                                            <span className="text-xs font-black text-emerald-700">
                                                {rel.priceFormatted}
                                            </span>
                                            <span className="text-[10px] text-slate-500 font-semibold">
                                                {rel.specifications.treeHeight}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-3 pt-0">
                                    <Button asChild variant="outline" className="w-full rounded-xl text-xs font-bold">
                                        <Link href={`/seedlings/${rel.id}`}>Xem chi tiết</Link>
                                    </Button>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            )}

            {/* ORDER MODAL */}
            {isOrderModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-lg font-black text-slate-900">
                                Gửi yêu cầu đặt cây giống
                            </h3>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsOrderModalOpen(false);
                                    setOrderSuccess(false);
                                }}
                                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                            >
                                ✕
                            </button>
                        </div>

                        {orderSuccess ? (
                            <div className="py-8 text-center space-y-3">
                                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                                    <Check className="h-7 w-7" />
                                </div>
                                <h4 className="text-base font-black text-slate-900">
                                    Yêu cầu đặt cây giống đã được gửi!
                                </h4>
                                <p className="text-xs text-slate-600 max-w-xs mx-auto">
                                    {item.nurseryName} sẽ liên hệ trực tiếp qua số điện thoại của quý khách để xác nhận số lượng và thỏa thuận lịch giao nhận.
                                </p>
                                <Button
                                    onClick={() => {
                                        setIsOrderModalOpen(false);
                                        setOrderSuccess(false);
                                    }}
                                    className="rounded-xl bg-brand-600 font-bold text-white"
                                >
                                    Đã hiểu
                                </Button>
                            </div>
                        ) : (
                            <form onSubmit={handleOrderSubmit} className="space-y-3.5">
                                <div className="rounded-xl bg-slate-50 p-3 text-xs space-y-1">
                                    <p className="font-bold text-slate-900">{item.title}</p>
                                    <p className="text-emerald-700 font-semibold">{item.priceFormatted} · Trại: {item.nurseryName}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1">
                                            Số lượng cây đặt:
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            min={1}
                                            max={item.availableQuantity}
                                            value={orderQuantity}
                                            onChange={(e) => setOrderQuantity(Number(e.target.value))}
                                            className="w-full rounded-xl border border-slate-200 p-2 text-sm outline-none focus:border-brand-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1">
                                            Số điện thoại nhận:
                                        </label>
                                        <input
                                            type="tel"
                                            required
                                            placeholder="09xx..."
                                            value={customerPhone}
                                            onChange={(e) => setCustomerPhone(e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 p-2 text-sm outline-none focus:border-brand-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">
                                        Họ và tên người nhận:
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Nguyễn Văn A"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        className="w-full rounded-xl border border-slate-200 p-2 text-sm outline-none focus:border-brand-500"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">
                                        Địa chỉ nhận cây (Vườn trồng):
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ấp/Xã, Huyện, Tỉnh..."
                                        value={customerAddress}
                                        onChange={(e) => setCustomerAddress(e.target.value)}
                                        className="w-full rounded-xl border border-slate-200 p-2 text-sm outline-none focus:border-brand-500"
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setIsOrderModalOpen(false)}
                                        className="rounded-xl"
                                    >
                                        Hủy
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="rounded-xl bg-brand-600 font-bold text-white hover:bg-brand-700"
                                    >
                                        Xác nhận gửi yêu cầu
                                    </Button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
