"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
    BadgeCheck,
    Building2,
    CalendarDays,
    Camera,
    CheckCircle2,
    Edit3,
    Factory,
    KeyRound,
    LandPlot,
    Leaf,
    LockKeyhole,
    MapPin,
    Package,
    Phone,
    Save,
    ShieldCheck,
    Sprout,
    Store,
    Truck,
    UserCheck,
    UserRound,
    X,
    Boxes,
    Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { VietnameseDatePicker } from "@/components/ui/vietnamese-date-picker";
import { formatVietnameseDate, formatVietnameseDateTime } from "@/lib/date-format";

const roleLabels: Record<string, string> = {
    ADMIN: "Quản trị viên",
    FARMER: "Nông dân",
    AREA_MANAGER: "Trưởng ban quản lý vùng trồng",
    STORE_OWNER: "Chủ cửa hàng vật tư / Trại giống",
    COLLECTOR: "Vựa / Đơn vị thu mua",
    PROCESSING_FACILITY: "Cơ sở chế biến",
};

const roleSubtitles: Record<string, string> = {
    ADMIN: "Hồ sơ quản trị viên hệ thống",
    FARMER: "Hồ sơ tài khoản nhà vườn",
    AREA_MANAGER: "Hồ sơ ban quản lý vùng trồng",
    STORE_OWNER: "Hồ sơ chủ cửa hàng cung ứng vật tư & cây giống",
    COLLECTOR: "Hồ sơ đơn vị / vựa thu mua nông sản",
    PROCESSING_FACILITY: "Hồ sơ doanh nghiệp / cơ sở chế biến",
};

export type FarmInfo = {
    id: string;
    farmName: string;
    farmCode: string;
    areaSize: number;
    totalTrees: number;
    durianVariety: string;
    address: string;
    province?: string | null;
    district?: string | null;
    ward?: string | null;
    growingRegion?: string | null;
    isActive: boolean;
};

export type StoreInfo = {
    id: string;
    name: string;
    representativeName: string;
    phone: string;
    taxOrBusinessCode?: string | null;
    address: string;
    openingHours?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    status: string;
    approvedAt?: string | null;
};

export type PartnerFacilityInfo = {
    id: string;
    name: string;
    type: string;
    organizationType: string;
    taxCode?: string | null;
    businessCode?: string | null;
    phone: string;
    email?: string | null;
    address: string;
    province: string;
    ward?: string | null;
    purchasingAreas?: string[];
    processingTypes?: string[];
    expectedCapacity?: string | number | null;
    capacityUnit?: string | null;
    imageUrls?: string[];
    avatar?: string | null;
    certifications?: string[];
    description?: string | null;
    representativeName?: string | null;
    representativePhone?: string | null;
};

export type ManagedRegion = {
    code?: string;
    name?: string;
    province?: string;
    district?: string;
    ward?: string;
    areaSize?: number;
    durianVarieties?: string[];
};

export type ManagerProfileInfo = {
    organizationName: string;
    position: string;
    taxCode?: string | null;
    identityNumber: string;
    identityIssuedDate?: string | null;
    identityIssuedPlace?: string | null;
    managedRegions: ManagedRegion[];
};

export type UserProfileProps = {
    profile: {
        id: string;
        fullName: string;
        phone: string;
        email: string;
        avatar: string | null;
        birthDate: string;
        gender: string;
        role: string;
        isApproved: boolean;
        accountStatus: string;
        createdAt: string;
        approvedAt?: string | null;
        updatedAt: string;
        lastLoginAt: string | null;
        passwordUpdatedAt: string | null;
        address?: string | null;
        ward?: string | null;
        district?: string | null;
        province?: string | null;
    };
    farms?: FarmInfo[];
    stores?: StoreInfo[];
    partnerFacility?: PartnerFacilityInfo | null;
    managerProfile?: ManagerProfileInfo | null;
};

function formatDateTime(value: string | null) {
    if (!value) return "Chưa ghi nhận";
    try {
        return formatVietnameseDateTime(new Date(value));
    } catch {
        return value;
    }
}

export function UserProfile({ profile, farms = [], stores = [], partnerFacility, managerProfile }: UserProfileProps) {
    const router = useRouter();
    const { toast } = useToast();
    const fileInput = useRef<HTMLInputElement>(null);
    const [saving, setSaving] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [avatar, setAvatar] = useState(profile.avatar);

    // Editing facility state
    const [editingFacility, setEditingFacility] = useState(false);
    const [facName, setFacName] = useState(partnerFacility?.name || "");
    const [facPhone, setFacPhone] = useState(partnerFacility?.phone || profile.phone);
    const [facEmail, setFacEmail] = useState(partnerFacility?.email || profile.email);
    const [facOrgType, setFacOrgType] = useState(partnerFacility?.organizationType || "Hộ kinh doanh");
    const [facTaxCode, setFacTaxCode] = useState(partnerFacility?.taxCode || "");
    const [facBusinessCode, setFacBusinessCode] = useState(partnerFacility?.businessCode || "");
    const [facAddress, setFacAddress] = useState(partnerFacility?.address || "");
    const [facProvince, setFacProvince] = useState(partnerFacility?.province || "Đồng Nai");
    const [facWard, setFacWard] = useState(partnerFacility?.ward || "");
    const [facCapacity, setFacCapacity] = useState(partnerFacility?.expectedCapacity ? String(partnerFacility.expectedCapacity) : "50");
    const [facCapacityUnit, setFacCapacityUnit] = useState(partnerFacility?.capacityUnit || "tấn/ngày");
    const [facPurchasingAreas, setFacPurchasingAreas] = useState(partnerFacility?.purchasingAreas?.join(", ") || "");
    const [facProcessingTypes, setFacProcessingTypes] = useState(partnerFacility?.processingTypes?.join(", ") || "");
    const [facDescription, setFacDescription] = useState(partnerFacility?.description || "");

    const isCollector = profile.role === "COLLECTOR";
    const isProcessing = profile.role === "PROCESSING_FACILITY";

    async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        const form = new FormData(event.currentTarget);
        try {
            const response = await fetch("/api/account", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "profile",
                    fullName: form.get("fullName"),
                    phone: form.get("phone"),
                    email: form.get("email"),
                    birthDate: form.get("birthDate"),
                    gender: form.get("gender"),
                    avatar,
                }),
            });
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload.message || "Không thể lưu thông tin.");
            }
            toast({ title: payload.message || "Đã lưu thông tin cá nhân", variant: "success" });
            router.refresh();
        } catch (error) {
            toast({
                title: "Không thể lưu hồ sơ",
                description: error instanceof Error ? error.message : "Vui lòng thử lại.",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    }

    async function saveFacility(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        try {
            const pAreas = facPurchasingAreas
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
            const pTypes = facProcessingTypes
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);

            const response = await fetch("/api/account", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "facility",
                    name: facName,
                    phone: facPhone,
                    email: facEmail,
                    organizationType: facOrgType,
                    taxCode: facTaxCode,
                    businessCode: facBusinessCode,
                    address: facAddress,
                    province: facProvince,
                    ward: facWard,
                    expectedCapacity: facCapacity ? Number(facCapacity) : null,
                    capacityUnit: facCapacityUnit,
                    purchasingAreas: pAreas,
                    processingTypes: pTypes,
                    description: facDescription,
                }),
            });

            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload.message || "Không thể lưu thông tin cơ sở.");
            }
            toast({ title: payload.message || "Đã cập nhật thông tin cơ sở thành công", variant: "success" });
            setEditingFacility(false);
            router.refresh();
        } catch (error) {
            toast({
                title: "Lỗi cập nhật",
                description: error instanceof Error ? error.message : "Vui lòng thử lại.",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    }

    async function changePassword(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        const form = new FormData(event.currentTarget);
        try {
            const response = await fetch("/api/account", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "password",
                    currentPassword: form.get("currentPassword"),
                    newPassword: form.get("newPassword"),
                    confirmPassword: form.get("confirmPassword"),
                }),
            });
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload.message || "Không thể đổi mật khẩu.");
            }
            toast({ title: payload.message || "Đổi mật khẩu thành công", variant: "success" });
            setChangingPassword(false);
            router.refresh();
        } catch (error) {
            toast({
                title: "Không thể đổi mật khẩu",
                description: error instanceof Error ? error.message : "Vui lòng thử lại.",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    }

    function selectAvatar(file?: File) {
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            return toast({ title: "Vui lòng chọn một tệp hình ảnh.", variant: "destructive" });
        }
        if (file.size > 1_500_000) {
            return toast({ title: "Dung lượng ảnh không được vượt quá 1.5 MB.", variant: "destructive" });
        }
        const reader = new FileReader();
        reader.onload = () => setAvatar(String(reader.result));
        reader.readAsDataURL(file);
    }

    const roleName = roleLabels[profile.role] || profile.role;
    const roleSubtitle = roleSubtitles[profile.role] || "Hồ sơ người dùng TriViet";

    return (
        <div className="mx-auto max-w-5xl space-y-6 pb-12">
            {/* Header Hero Cover */}
            <section className="relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-soft">
                <div className="relative h-[180px] w-full bg-gradient-to-r from-brand-700 via-emerald-600 to-lime-500 sm:h-[190px]">
                    <div className="absolute left-6 top-5 z-10 text-white sm:left-[210px] sm:top-[34px]">
                        <p className="text-xs font-black uppercase tracking-[.18em] text-emerald-100 drop-shadow-xs">
                            {roleSubtitle}
                        </p>
                        <h1 className="mt-1 max-w-[calc(100vw-4rem)] break-words text-2xl font-black tracking-tight drop-shadow-sm sm:text-4xl">
                            {profile.fullName || profile.phone}
                        </h1>
                        <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-emerald-50 sm:text-base">
                            <Leaf className="h-4 w-4 text-emerald-200" />
                            <span>{roleName}</span>
                        </p>
                    </div>

                    <svg aria-hidden="true" viewBox="0 0 1440 120" preserveAspectRatio="none" className="absolute -bottom-px left-0 h-[48px] w-full sm:h-[56px]">
                        <path d="M0 48C235 110 420 109 650 82c263-31 520-93 790-42v80H0Z" fill="white" />
                    </svg>
                </div>

                <div className="relative min-h-[85px] bg-white px-6 pb-4 pt-2 sm:min-h-[92px] sm:px-10">
                    {/* Avatar Badge with Camera overlay */}
                    <button
                        type="button"
                        onClick={() => fileInput.current?.click()}
                        className="group absolute -top-[62px] left-6 z-20 flex h-[130px] w-[130px] items-center justify-center overflow-hidden rounded-full border-[6px] border-white bg-gradient-to-br from-emerald-50 to-white text-emerald-700 shadow-xl sm:-top-[68px] sm:left-10 sm:h-[142px] sm:w-[142px]"
                        title="Bấm để đổi ảnh đại diện"
                    >
                        {avatar ? (
                            <Image
                                src={avatar}
                                alt="Ảnh đại diện"
                                fill
                                unoptimized
                                className="object-cover transition group-hover:scale-105"
                            />
                        ) : (
                            <UserRound className="h-16 w-16 text-emerald-600 sm:h-20 sm:w-20" strokeWidth={1.8} />
                        )}
                        <span className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-slate-950/60 py-1.5 text-white transition group-hover:bg-slate-950/75">
                            <Camera className="h-4 w-4" />
                        </span>
                    </button>

                    <div className="flex min-h-[60px] items-end justify-end gap-2">
                        <Badge
                            className={`rounded-full border px-3.5 py-1.5 text-xs sm:text-sm font-bold shadow-xs ${
                                profile.isApproved
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                    : "border-amber-200 bg-amber-50 text-amber-800"
                            }`}
                        >
                            <BadgeCheck className="mr-1.5 h-4 w-4 text-emerald-600" />
                            {profile.isApproved ? "Tài khoản đã phê duyệt" : "Chờ phê duyệt"}
                        </Badge>
                    </div>
                </div>
            </section>

            {/* Profile Form (Personal Info) */}
            <form onSubmit={saveProfile} className="space-y-6">
                <input
                    ref={fileInput}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={event => selectAvatar(event.target.files?.[0])}
                />
                <ProfileCard title="Thông tin cá nhân người đại diện" icon={UserRound}>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Họ và tên *">
                            <Input
                                name="fullName"
                                required
                                defaultValue={profile.fullName}
                                className="h-11 rounded-xl"
                                placeholder="Nhập họ và tên"
                            />
                        </Field>
                        <Field label="Số điện thoại *">
                            <Input
                                name="phone"
                                required
                                inputMode="tel"
                                defaultValue={profile.phone}
                                className="h-11 rounded-xl"
                                placeholder="09xxxxxxxx"
                            />
                        </Field>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <Field label="Email *">
                            <Input
                                name="email"
                                type="email"
                                required
                                defaultValue={profile.email}
                                className="h-11 rounded-xl"
                                placeholder="email@example.com"
                            />
                        </Field>
                        <Field label="Ngày sinh">
                            <VietnameseDatePicker
                                name="birthDate"
                                defaultValue={profile.birthDate}
                                placeholder="dd/mm/yyyy"
                                max={new Date().toISOString().slice(0, 10)}
                            />
                        </Field>
                        <Field label="Giới tính">
                            <select
                                name="gender"
                                defaultValue={profile.gender}
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-xs focus:border-brand-500 focus:outline-hidden"
                            >
                                <option value="">Chưa chọn</option>
                                <option value="FEMALE">Nữ</option>
                                <option value="MALE">Nam</option>
                                <option value="OTHER">Khác</option>
                            </select>
                        </Field>
                    </div>

                    <div className="flex justify-end pt-2">
                        <Button
                            type="submit"
                            disabled={saving}
                            className="h-11 rounded-2xl bg-brand-600 px-6 font-bold text-white hover:bg-brand-700 shadow-soft"
                        >
                            <Save className="mr-2 h-4 w-4" />
                            {saving ? "Đang lưu..." : "Lưu thông tin cá nhân"}
                        </Button>
                    </div>
                </ProfileCard>
            </form>

            {/* ========================================================================= */}
            {/* ROLE SPECIFIC: COLLECTOR & PROCESSING_FACILITY FULL PROFILE SECTION       */}
            {/* ========================================================================= */}
            {(isCollector || isProcessing) && partnerFacility && (
                <ProfileCard
                    title={isCollector ? "Thông tin Vựa Thu Mua (Hiển thị Trang Khách)" : "Thông tin Xưởng Chế Biến & Đóng Gói (Hiển thị Trang Khách)"}
                    icon={isCollector ? Truck : Factory}
                >
                    {!editingFacility ? (
                        <div className="space-y-6">
                            {/* Top Banner Card with Image & Basic Info */}
                            <div className="flex flex-col sm:flex-row items-start gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                                {partnerFacility.avatar && (
                                    <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm">
                                        <Image
                                            src={partnerFacility.avatar}
                                            alt={partnerFacility.name}
                                            fill
                                            unoptimized
                                            className="object-cover"
                                        />
                                    </div>
                                )}
                                <div className="space-y-2 flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="rounded-full bg-brand-600 px-2.5 py-0.5 text-xs font-bold text-white shadow-sm">
                                            {partnerFacility.organizationType}
                                        </span>
                                        <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-800">
                                            {partnerFacility.province}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 truncate">
                                        {partnerFacility.name}
                                    </h3>
                                    <p className="text-xs text-slate-600 flex items-center gap-1.5">
                                        <MapPin className="h-4 w-4 text-brand-600 shrink-0" />
                                        <span>{[partnerFacility.address, partnerFacility.ward, partnerFacility.province].filter(Boolean).join(", ")}</span>
                                    </p>
                                </div>

                                <Button
                                    type="button"
                                    onClick={() => setEditingFacility(true)}
                                    className="rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 shrink-0"
                                >
                                    <Edit3 className="mr-1.5 h-4 w-4 text-brand-600" />
                                    Chỉnh sửa thông tin
                                </Button>
                            </div>

                            {/* Detailed Grid Matching Public Guest Cards */}
                            <div className="grid gap-4 sm:grid-cols-2 text-xs sm:text-sm">
                                {/* Capacity / Khối lượng tiếp nhận */}
                                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 space-y-1">
                                    <span className="flex items-center gap-1.5 font-bold text-emerald-900 text-xs">
                                        {isCollector ? <Truck className="h-4 w-4 text-emerald-600" /> : <Factory className="h-4 w-4 text-emerald-600" />}
                                        {isCollector ? "Khối lượng tiếp nhận hàng ngày:" : "Công suất chế biến hàng ngày:"}
                                    </span>
                                    <p className="text-lg font-black text-emerald-800">
                                        {partnerFacility.expectedCapacity || "Chưa cập nhật"} {partnerFacility.capacityUnit || "tấn/ngày"}
                                    </p>
                                </div>

                                {/* Representative & Phone */}
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-1">
                                    <span className="flex items-center gap-1.5 font-bold text-slate-700 text-xs">
                                        <UserCheck className="h-4 w-4 text-brand-600" />
                                        Người đại diện & Hotline liên hệ:
                                    </span>
                                    <p className="text-sm font-black text-slate-900">
                                        {partnerFacility.representativeName || profile.fullName} · {partnerFacility.phone || profile.phone}
                                    </p>
                                </div>

                                {/* Purchasing Areas (for Collector) */}
                                {isCollector && (
                                    <div className="col-span-1 sm:col-span-2 rounded-2xl border border-slate-200 p-4 space-y-2">
                                        <span className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                                            <Boxes className="h-4 w-4 text-brand-600" />
                                            Vùng thu mua chính (Đang bao tiêu / liên kết):
                                        </span>
                                        {partnerFacility.purchasingAreas && partnerFacility.purchasingAreas.length > 0 ? (
                                            <div className="flex flex-wrap gap-1.5">
                                                {partnerFacility.purchasingAreas.map((area) => (
                                                    <span key={area} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700">
                                                        {area}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-500 italic">Chưa khai báo vùng thu mua.</p>
                                        )}
                                    </div>
                                )}

                                {/* Processing Types (for Facility) */}
                                {isProcessing && (
                                    <div className="col-span-1 sm:col-span-2 rounded-2xl border border-slate-200 p-4 space-y-2">
                                        <span className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                                            <Layers className="h-4 w-4 text-brand-600" />
                                            Quy trình & Các dòng sản phẩm chế biến:
                                        </span>
                                        {partnerFacility.processingTypes && partnerFacility.processingTypes.length > 0 ? (
                                            <div className="flex flex-wrap gap-1.5">
                                                {partnerFacility.processingTypes.map((typeItem) => (
                                                    <span key={typeItem} className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">
                                                        {typeItem}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-500 italic">Chưa khai báo quy trình chế biến.</p>
                                        )}
                                    </div>
                                )}

                                {/* Legal codes */}
                                <Info label="Mã số thuế" value={partnerFacility.taxCode || "Đang cập nhật"} />
                                <Info label="Mã ĐKKD" value={partnerFacility.businessCode || "Đang cập nhật"} />
                                <Info label="Email liên hệ" value={partnerFacility.email || "Đang cập nhật"} />
                                <Info label="Địa chỉ cơ sở" value={[partnerFacility.address, partnerFacility.ward, partnerFacility.province].filter(Boolean).join(", ")} />

                                {/* Certifications */}
                                {partnerFacility.certifications && partnerFacility.certifications.length > 0 && (
                                    <div className="col-span-1 sm:col-span-2 rounded-2xl border border-slate-200 p-4 space-y-2">
                                        <span className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                            Tiêu chuẩn & Chứng nhận đã kiểm định:
                                        </span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {partnerFacility.certifications.map((cert) => (
                                                <span key={cert} className="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-bold text-emerald-800 flex items-center gap-1">
                                                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                                    {cert}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Description */}
                                {partnerFacility.description && (
                                    <div className="col-span-1 sm:col-span-2 rounded-2xl bg-slate-50 p-4 space-y-1">
                                        <span className="font-bold text-slate-800 text-xs block">
                                            Mô tả & Giới thiệu cơ sở:
                                        </span>
                                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                                            {partnerFacility.description}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* Edit Facility Form */
                        <form onSubmit={saveFacility} className="space-y-4 rounded-2xl border border-brand-200 bg-brand-50/20 p-5">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                                <h4 className="text-base font-black text-slate-900">
                                    {isCollector ? "Chỉnh sửa thông tin Vựa thu mua" : "Chỉnh sửa thông tin Cơ sở chế biến"}
                                </h4>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingFacility(false)}
                                    className="rounded-lg"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <Field label="Tên cơ sở / vựa thu mua *">
                                    <Input
                                        required
                                        value={facName}
                                        onChange={(e) => setFacName(e.target.value)}
                                        className="h-10 rounded-xl"
                                    />
                                </Field>

                                <Field label="Loại hình kinh doanh *">
                                    <select
                                        value={facOrgType}
                                        onChange={(e) => setFacOrgType(e.target.value)}
                                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium outline-none focus:border-brand-500"
                                    >
                                        <option value="Hộ kinh doanh">Hộ kinh doanh</option>
                                        <option value="Hợp tác xã">Hợp tác xã</option>
                                        <option value="Doanh nghiệp tư nhân">Doanh nghiệp tư nhân</option>
                                        <option value="Công ty TNHH">Công ty TNHH</option>
                                        <option value="Công ty Cổ phần">Công ty Cổ phần</option>
                                    </select>
                                </Field>

                                <Field label="Hotline liên hệ *">
                                    <Input
                                        required
                                        value={facPhone}
                                        onChange={(e) => setFacPhone(e.target.value)}
                                        className="h-10 rounded-xl"
                                    />
                                </Field>

                                <Field label="Email liên hệ">
                                    <Input
                                        type="email"
                                        value={facEmail}
                                        onChange={(e) => setFacEmail(e.target.value)}
                                        className="h-10 rounded-xl"
                                    />
                                </Field>

                                <Field label={isCollector ? "Khối lượng tiếp nhận (tấn/ngày) *" : "Công suất chế biến (tấn/ngày) *"}>
                                    <Input
                                        type="number"
                                        min={1}
                                        required
                                        value={facCapacity}
                                        onChange={(e) => setFacCapacity(e.target.value)}
                                        className="h-10 rounded-xl font-bold text-emerald-700"
                                    />
                                </Field>

                                <Field label="Tỉnh / Thành phố *">
                                    <Input
                                        required
                                        value={facProvince}
                                        onChange={(e) => setFacProvince(e.target.value)}
                                        className="h-10 rounded-xl"
                                    />
                                </Field>

                                <Field label="Địa chỉ chi tiết (Đường, Xã/Phường, Quận/Huyện) *">
                                    <Input
                                        required
                                        value={facAddress}
                                        onChange={(e) => setFacAddress(e.target.value)}
                                        className="h-10 rounded-xl"
                                    />
                                </Field>

                                <Field label="Mã số thuế / ĐKKD">
                                    <Input
                                        value={facTaxCode}
                                        onChange={(e) => setFacTaxCode(e.target.value)}
                                        className="h-10 rounded-xl font-mono"
                                    />
                                </Field>
                            </div>

                            {/* Collector purchasing areas */}
                            {isCollector && (
                                <Field label="Vùng thu mua chính (Phân cách bằng dấu phẩy, ví dụ: Đồng Nai, Bình Phước, Đắk Lắk)">
                                    <Input
                                        value={facPurchasingAreas}
                                        onChange={(e) => setFacPurchasingAreas(e.target.value)}
                                        className="h-10 rounded-xl"
                                        placeholder="Đồng Nai, Bình Phước, Lâm Đồng..."
                                    />
                                </Field>
                            )}

                            {/* Processing facility types */}
                            {isProcessing && (
                                <Field label="Quy trình & Dòng sản phẩm chế biến (Phân cách bằng dấu phẩy)">
                                    <Input
                                        value={facProcessingTypes}
                                        onChange={(e) => setFacProcessingTypes(e.target.value)}
                                        className="h-10 rounded-xl"
                                        placeholder="Sầu riêng nguyên trái, Tách múi hút chân không, Cấp đông nhanh IQF..."
                                    />
                                </Field>
                            )}

                            <Field label="Mô tả & Giới thiệu cơ sở">
                                <textarea
                                    rows={3}
                                    value={facDescription}
                                    onChange={(e) => setFacDescription(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs sm:text-sm outline-none focus:border-brand-500"
                                />
                            </Field>

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setEditingFacility(false)}
                                    className="h-10 rounded-xl"
                                >
                                    Hủy
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={saving}
                                    className="h-10 rounded-xl bg-brand-600 font-bold text-white hover:bg-brand-700 shadow-soft"
                                >
                                    <Save className="mr-1.5 h-4 w-4" />
                                    {saving ? "Đang lưu..." : "Lưu thông tin cơ sở"}
                                </Button>
                            </div>
                        </form>
                    )}
                </ProfileCard>
            )}

            {/* Role Specific Section: FARMER */}
            {profile.role === "FARMER" && farms.length > 0 && (
                <ProfileCard title={`Vườn trồng của bạn (${farms.length})`} icon={Sprout}>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {farms.map(farm => (
                            <article key={farm.id} className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="font-bold text-slate-900">{farm.farmName}</p>
                                        <span className="inline-flex items-center rounded-lg bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                                            {farm.farmCode}
                                        </span>
                                    </div>
                                    <Badge className={farm.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}>
                                        {farm.isActive ? "Đang hoạt động" : "Tạm ngưng"}
                                    </Badge>
                                </div>
                                <div className="space-y-1 text-xs sm:text-sm text-slate-700 pt-1">
                                    <p><b>Quy mô:</b> {farm.areaSize} ha · {farm.totalTrees} cây</p>
                                    <p><b>Giống sầu riêng:</b> {farm.durianVariety}</p>
                                    <p><b>Địa chỉ:</b> {[farm.address, farm.ward, farm.district, farm.province].filter(Boolean).join(", ")}</p>
                                    {farm.growingRegion && <p><b>Vùng trồng:</b> {farm.growingRegion}</p>}
                                </div>
                            </article>
                        ))}
                    </div>
                </ProfileCard>
            )}

            {/* Role Specific Section: AREA_MANAGER */}
            {profile.role === "AREA_MANAGER" && managerProfile && (
                <div className="grid gap-6 lg:grid-cols-2">
                    <ProfileCard title="Thông tin tổ chức / Hợp tác xã" icon={Building2}>
                        <Info label="Tổ chức / HTX" value={managerProfile.organizationName} />
                        <Info label="Chức vụ" value={managerProfile.position} />
                        <Info label="Mã số thuế" value={managerProfile.taxCode} />
                        <Info label="CCCD/CMND" value={managerProfile.identityNumber} />
                        <Info label="Ngày cấp" value={managerProfile.identityIssuedDate ? formatVietnameseDate(new Date(managerProfile.identityIssuedDate)) : null} />
                        <Info label="Nơi cấp" value={managerProfile.identityIssuedPlace} />
                    </ProfileCard>

                    <ProfileCard title="Vùng trồng phụ trách" icon={LandPlot}>
                        {managerProfile.managedRegions && managerProfile.managedRegions.length > 0 ? (
                            <div className="space-y-3">
                                {managerProfile.managedRegions.map((region, idx) => (
                                    <div key={idx} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs sm:text-sm space-y-1">
                                        <p className="font-bold text-brand-800">{region.code} - {region.name}</p>
                                        <p className="text-slate-600">Địa bàn: {[region.ward, region.district, region.province].filter(Boolean).join(", ")}</p>
                                        <p className="text-slate-600">Quy mô khai báo: {region.areaSize != null ? `${region.areaSize} ha` : "—"}</p>
                                        {region.durianVarieties && region.durianVarieties.length > 0 && (
                                            <p className="text-slate-600">Giống chủ lực: {region.durianVarieties.join(", ")}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-slate-500">Chưa có vùng trồng liên kết.</p>
                        )}
                    </ProfileCard>
                </div>
            )}

            {/* Role Specific Section: STORE_OWNER */}
            {profile.role === "STORE_OWNER" && stores.length > 0 && (
                <ProfileCard title="Thông tin cửa hàng / Trại giống" icon={Store}>
                    {stores.map(store => (
                        <div key={store.id} className="grid gap-3 sm:grid-cols-2 text-xs sm:text-sm">
                            <Info label="Tên cơ sở" value={store.name} />
                            <Info label="Người đại diện" value={store.representativeName} />
                            <Info label="Số điện thoại" value={store.phone} />
                            <Info label="Mã số thuế / ĐKKD" value={store.taxOrBusinessCode} />
                            <Info label="Địa chỉ" value={store.address} />
                            <Info label="Giờ mở cửa" value={store.openingHours} />
                            <Info label="Trạng thái" value={store.status === "APPROVED" ? "Đã phê duyệt" : store.status} />
                            <Info label="Ngày phê duyệt" value={store.approvedAt ? formatVietnameseDate(new Date(store.approvedAt)) : null} />
                        </div>
                    ))}
                </ProfileCard>
            )}

            {/* Account Metadata & Security Section */}
            <div className="grid gap-6 lg:grid-cols-2">
                <ProfileCard title="Thông tin hệ thống" icon={CalendarDays}>
                    <Info label="Vai trò hệ thống" value={roleName} />
                    <Info label="Trạng thái tài khoản" value={profile.isApproved ? "Đã phê duyệt" : "Chờ phê duyệt"} />
                    <Info label="Ngày đăng ký" value={formatDateTime(profile.createdAt)} />
                    <Info label="Lần đăng nhập gần nhất" value={formatDateTime(profile.lastLoginAt)} />
                    {profile.approvedAt && <Info label="Thời điểm phê duyệt" value={formatDateTime(profile.approvedAt)} />}
                </ProfileCard>

                <ProfileCard title="Bảo mật & Đổi mật khẩu" icon={LockKeyhole}>
                    <Info label="Mật khẩu hiện tại" value="••••••••••••" />
                    <Info label="Cập nhật mật khẩu lần cuối" value={formatDateTime(profile.passwordUpdatedAt)} />

                    {!changingPassword ? (
                        <div className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="h-10 rounded-xl border-slate-200 font-semibold text-slate-700 hover:bg-slate-50"
                                onClick={() => setChangingPassword(true)}
                            >
                                <KeyRound className="mr-2 h-4 w-4 text-brand-600" />
                                Đổi mật khẩu
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={changePassword} className="mt-3 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <Field label="Mật khẩu hiện tại *">
                                <Input name="currentPassword" type="password" required className="h-10 rounded-xl" />
                            </Field>
                            <Field label="Mật khẩu mới (tối thiểu 8 ký tự) *">
                                <Input name="newPassword" type="password" required minLength={8} className="h-10 rounded-xl" />
                            </Field>
                            <Field label="Xác nhận mật khẩu mới *">
                                <Input name="confirmPassword" type="password" required minLength={8} className="h-10 rounded-xl" />
                            </Field>
                            <div className="flex gap-2 pt-1">
                                <Button
                                    type="submit"
                                    disabled={saving}
                                    className="h-10 rounded-xl bg-brand-600 font-bold text-white hover:bg-brand-700 shadow-soft"
                                >
                                    {saving ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="h-10 rounded-xl border-slate-200 text-slate-700"
                                    onClick={() => setChangingPassword(false)}
                                >
                                    Hủy
                                </Button>
                            </div>
                        </form>
                    )}
                </ProfileCard>
            </div>
        </div>
    );
}

function ProfileCard({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
    return (
        <Card className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-soft">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                <CardTitle className="flex items-center gap-2.5 text-base font-black text-slate-900 sm:text-lg">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                        <Icon className="h-4 w-4" />
                    </div>
                    <span>{title}</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">{children}</CardContent>
        </Card>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">{label}</Label>
            {children}
        </div>
    );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
    return (
        <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
            <p className="mt-0.5 text-sm font-bold text-slate-900 break-words">{value || "—"}</p>
        </div>
    );
}
