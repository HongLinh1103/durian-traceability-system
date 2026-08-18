"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
    BadgeCheck,
    Building2,
    Calendar,
    CalendarDays,
    Camera,
    CheckCircle2,
    Clock,
    Eye,
    EyeOff,
    Factory,
    KeyRound,
    LandPlot,
    Leaf,
    LockKeyhole,
    MapPin,
    Save,
    ShoppingBag,
    Sprout,
    Store,
    Trees,
    UserCheck,
    UserRound,
    Wheat,
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
    STORE_OWNER: "Chủ cửa hàng vật tư",
    COLLECTOR: "Vựa / Đơn vị thu mua",
    PROCESSING_FACILITY: "Cơ sở chế biến",
};

const roleSubtitles: Record<string, string> = {
    ADMIN: "Hồ sơ quản trị viên hệ thống",
    FARMER: "Hồ sơ tài khoản nhà vườn",
    AREA_MANAGER: "Hồ sơ ban quản lý vùng trồng",
    STORE_OWNER: "Hồ sơ chủ cửa hàng cung ứng vật tư",
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
};

export type ManagedRegion = {
    code?: string;
    name?: string;
    province?: string;
    district?: string;
    ward?: string;
    areaSize?: number;
    farmerCount?: number;
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
    const roleSubtitle = roleSubtitles[profile.role] || "Hồ sơ cá nhân và bảo mật tài khoản";
    const fullAddress = [profile.address, profile.ward, profile.district, profile.province]
        .filter(Boolean)
        .join(", ");

    return (
        <main className="mx-auto max-w-6xl space-y-6 px-3 pb-28 pt-4 sm:px-6 sm:py-8">
            {/* Header Hero Banner */}
            <section className="relative w-full overflow-hidden rounded-[32px] bg-white shadow-soft">
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

            {/* Profile Form (Personal Info & System Info) */}
            <form onSubmit={saveProfile} className="space-y-6">
                <ProfileCard title="Thông tin cá nhân & Ảnh đại diện" icon={UserRound}>
                    {/* Avatar Selector Row */}
                    <div className="mb-4 flex flex-wrap items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                        <button
                            type="button"
                            onClick={() => fileInput.current?.click()}
                            className="group relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-emerald-100 text-emerald-700 shadow-md"
                        >
                            {avatar ? (
                                <Image src={avatar} alt="Ảnh đại diện" fill unoptimized className="object-cover" />
                            ) : (
                                <UserRound className="h-10 w-10" />
                            )}
                            <span className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-slate-950/60 py-1 text-white">
                                <Camera className="h-3.5 w-3.5" />
                            </span>
                        </button>
                        <div className="flex-1 min-w-[200px]">
                            <p className="text-sm font-bold text-slate-900">Ảnh đại diện</p>
                            <p className="mt-0.5 text-xs text-slate-500">
                                Định dạng JPG, PNG hoặc WEBP. Dung lượng tối đa 1.5 MB.
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-9 rounded-xl border-slate-200 font-semibold text-slate-700 hover:bg-white"
                                    onClick={() => fileInput.current?.click()}
                                >
                                    <Camera className="mr-1.5 h-3.5 w-3.5 text-brand-600" />
                                    Chọn ảnh mới
                                </Button>
                                {avatar && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="h-9 rounded-xl text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                                        onClick={() => setAvatar(null)}
                                    >
                                        Xóa ảnh
                                    </Button>
                                )}
                            </div>
                        </div>
                        <input
                            ref={fileInput}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={event => selectAvatar(event.target.files?.[0])}
                        />
                    </div>

                    {/* Inputs */}
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
                        <Field label="Giới tính (tùy chọn)">
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
                                        <p className="text-slate-600">Quy mô: {region.areaSize != null ? `${region.areaSize} ha` : "—"} · {region.farmerCount != null ? `${region.farmerCount} hộ thành viên` : "—"}</p>
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
                <ProfileCard title="Thông tin cửa hàng vật tư" icon={Store}>
                    {stores.map(store => (
                        <div key={store.id} className="grid gap-3 sm:grid-cols-2 text-xs sm:text-sm">
                            <Info label="Tên cửa hàng" value={store.name} />
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

            {/* Role Specific Section: COLLECTOR & PROCESSING_FACILITY */}
            {partnerFacility && (
                <ProfileCard
                    title={profile.role === "COLLECTOR" ? "Thông tin Vựa / Đơn vị thu mua" : "Thông tin Cơ sở chế biến"}
                    icon={profile.role === "COLLECTOR" ? Building2 : Factory}
                >
                    <div className="grid gap-3 sm:grid-cols-2 text-xs sm:text-sm">
                        <Info label="Tên cơ sở / doanh nghiệp" value={partnerFacility.name} />
                        <Info label="Loại hình" value={partnerFacility.organizationType} />
                        <Info label="Số điện thoại" value={partnerFacility.phone} />
                        <Info label="Email" value={partnerFacility.email} />
                        <Info label="Mã số thuế" value={partnerFacility.taxCode} />
                        <Info label="Mã ĐKKD" value={partnerFacility.businessCode} />
                        <Info label="Địa chỉ" value={[partnerFacility.address, partnerFacility.ward, partnerFacility.province].filter(Boolean).join(", ")} />
                        {partnerFacility.expectedCapacity && (
                            <Info label="Công suất dự kiến" value={`${partnerFacility.expectedCapacity} ${partnerFacility.capacityUnit || "tấn/năm"}`} />
                        )}
                        {partnerFacility.purchasingAreas && partnerFacility.purchasingAreas.length > 0 && (
                            <Info label="Địa bàn thu mua" value={partnerFacility.purchasingAreas.join(", ")} />
                        )}
                        {partnerFacility.processingTypes && partnerFacility.processingTypes.length > 0 && (
                            <Info label="Quy trình chế biến" value={partnerFacility.processingTypes.join(", ")} />
                        )}
                    </div>
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
                                <PasswordInput name="currentPassword" autoComplete="current-password" />
                            </Field>
                            <Field label="Mật khẩu mới (tối thiểu 8 ký tự) *">
                                <PasswordInput name="newPassword" autoComplete="new-password" minLength={8} />
                            </Field>
                            <Field label="Xác nhận mật khẩu mới *">
                                <PasswordInput name="confirmPassword" autoComplete="new-password" minLength={8} />
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
        </main>
    );
}

function ProfileCard({ title, icon: Icon, children }: { title: string; icon: typeof UserRound; children: React.ReactNode }) {
    return (
        <Card className="rounded-3xl border-slate-100 bg-white shadow-soft">
            <CardHeader className="p-5 pb-3 sm:p-6 sm:pb-4 border-b border-slate-100/60">
                <CardTitle className="flex items-center gap-3 text-base sm:text-lg font-bold text-slate-900">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                        <Icon className="h-5 w-5" />
                    </span>
                    <span>{title}</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-5 sm:p-6">{children}</CardContent>
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

function PasswordInput({ name, autoComplete, minLength }: { name: string; autoComplete: string; minLength?: number }) {
    const [visible, setVisible] = useState(false);
    return (
        <div className="relative">
            <Input
                name={name}
                type={visible ? "text" : "password"}
                required
                minLength={minLength}
                autoComplete={autoComplete}
                className="h-11 rounded-xl pr-12 text-sm"
            />
            <button
                type="button"
                onClick={() => setVisible(current => !current)}
                className="absolute inset-y-0 right-1 flex w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-brand-700 transition"
                aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                title={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            >
                {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
        </div>
    );
}

function Info({ label, value }: { label: string; value?: string | null }) {
    return (
        <div className="grid gap-1 border-b border-slate-100 pb-2.5 text-xs sm:text-sm last:border-0 sm:grid-cols-[180px_1fr]">
            <span className="text-slate-500 font-medium">{label}</span>
            <strong className="font-semibold text-slate-900">{value || "—"}</strong>
        </div>
    );
}
