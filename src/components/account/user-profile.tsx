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
    regionCode?: string | null;
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
    code?: string | null;
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

function formatDateTime(value: string | null | undefined) {
    if (!value) return "Chưa ghi nhận";
    try {
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return value;
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, "0");
        const minutes = String(d.getMinutes()).padStart(2, "0");
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch {
        return value;
    }
}

function formatDate(value: string | null | undefined) {
    if (!value) return "Chưa cập nhật";
    try {
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return value;
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    } catch {
        return value;
    }
}

function getGenderLabel(gender: string | null | undefined) {
    if (!gender) return "Chưa chọn";
    const g = String(gender).trim().toUpperCase();
    if (g === "MALE" || g === "NAM") return "Nam";
    if (g === "FEMALE" || g === "NU" || g === "NỮ") return "Nữ";
    if (g === "OTHER" || g === "KHAC" || g === "KHÁC") return "Khác";
    return gender;
}

export function UserProfile({ profile, farms = [], stores = [], partnerFacility, managerProfile }: UserProfileProps) {
    const router = useRouter();
    const { toast } = useToast();
    const fileInput = useRef<HTMLInputElement>(null);
    const [saving, setSaving] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [avatar, setAvatar] = useState(profile.avatar);

    // Business profile unified editing state
    const [isEditing, setIsEditing] = useState(false);
    const [editFullName, setEditFullName] = useState(profile.fullName || partnerFacility?.representativeName || "");
    const [editPhone, setEditPhone] = useState(profile.phone || partnerFacility?.phone || "");
    const [editEmail, setEditEmail] = useState(profile.email || partnerFacility?.email || "");
    const [editBirthDate, setEditBirthDate] = useState(profile.birthDate || "");
    const [editGender, setEditGender] = useState(profile.gender || "");

    // Editing facility state
    const [editingFacility, setEditingFacility] = useState(false);
    const [facName, setFacName] = useState(partnerFacility?.name || "Cơ sở Chế biến Sầu riêng Trị An");
    const [facPhone, setFacPhone] = useState(partnerFacility?.phone || profile.phone);
    const [facEmail, setFacEmail] = useState(partnerFacility?.email || profile.email);
    const [facOrgType, setFacOrgType] = useState(partnerFacility?.organizationType || "Doanh nghiệp");
    const [facTaxCode, setFacTaxCode] = useState(partnerFacility?.taxCode || "");
    const [facBusinessCode, setFacBusinessCode] = useState(partnerFacility?.businessCode || "");
    const [facAddress, setFacAddress] = useState(partnerFacility?.address || "");
    const [facProvince, setFacProvince] = useState(partnerFacility?.province || "Đồng Nai");
    const [facWard, setFacWard] = useState(partnerFacility?.ward || "");
    const [facCapacity, setFacCapacity] = useState(partnerFacility?.expectedCapacity ? String(partnerFacility.expectedCapacity) : "20");
    const [facCapacityUnit, setFacCapacityUnit] = useState(partnerFacility?.capacityUnit || "tấn/ngày");
    const [facPurchasingAreas, setFacPurchasingAreas] = useState(partnerFacility?.purchasingAreas?.join(", ") || "");
    const [facProcessingTypes, setFacProcessingTypes] = useState(partnerFacility?.processingTypes?.join(", ") || "");
    const [facDescription, setFacDescription] = useState(partnerFacility?.description || "");

    const isCollector = profile.role === "COLLECTOR";
    const isProcessing = profile.role === "PROCESSING_FACILITY";
    const isFarmer = profile.role === "FARMER";

    const primaryFarm: FarmInfo = farms[0] || {
        id: "default-farm",
        farmName: "Vườn sầu riêng Minh Phát",
        farmCode: "75-PUC-SR-00001-CHN-F01",
        regionCode: "75-PUC-SR-00001-CHN",
        areaSize: 8.5,
        totalTrees: 420,
        durianVariety: "Ri6",
        address: "Ấp 3, xã Phú Lộc",
        province: "Đồng Nai",
        district: "Tân Phú",
        ward: "Phú Lộc",
        growingRegion: "75-PUC-SR-00001-CHN - Vùng trồng sầu riêng Tân Phú",
        isActive: true,
    };

    const [farmerFarmName, setFarmerFarmName] = useState(primaryFarm.farmName || "Vườn sầu riêng Minh Phát");
    const [farmerAreaSize, setFarmerAreaSize] = useState(primaryFarm.areaSize ? String(primaryFarm.areaSize) : "8.5");
    const [farmerTotalTrees, setFarmerTotalTrees] = useState(primaryFarm.totalTrees ? String(primaryFarm.totalTrees) : "420");
    const [farmerDurianVariety, setFarmerDurianVariety] = useState(primaryFarm.durianVariety || "Ri6");
    const [farmerProvince, setFarmerProvince] = useState(primaryFarm.province || profile.province || "Đồng Nai");
    const [farmerDistrict, setFarmerDistrict] = useState(primaryFarm.district || profile.district || "Tân Phú");
    const [farmerWard, setFarmerWard] = useState(primaryFarm.ward || profile.ward || "Phú Lộc");
    const [farmerAddress, setFarmerAddress] = useState(primaryFarm.address || profile.address || "Ấp 3, xã Phú Lộc");
    const farmerFormRef = useRef<HTMLFormElement>(null);

    function cancelFarmerEditing() {
        setEditFullName(profile.fullName || "");
        setEditPhone(profile.phone || "");
        setEditEmail(profile.email || "");
        setEditBirthDate(profile.birthDate || "");
        setEditGender(profile.gender || "");
        setFarmerFarmName(primaryFarm.farmName || "Vườn sầu riêng Minh Phát");
        setFarmerAreaSize(primaryFarm.areaSize ? String(primaryFarm.areaSize) : "8.5");
        setFarmerTotalTrees(primaryFarm.totalTrees ? String(primaryFarm.totalTrees) : "420");
        setFarmerDurianVariety(primaryFarm.durianVariety || "Ri6");
        setFarmerProvince(primaryFarm.province || profile.province || "Đồng Nai");
        setFarmerDistrict(primaryFarm.district || profile.district || "Tân Phú");
        setFarmerWard(primaryFarm.ward || profile.ward || "Phú Lộc");
        setFarmerAddress(primaryFarm.address || profile.address || "Ấp 3, xã Phú Lộc");
        setIsEditing(false);
    }

    const facilityFormRef = useRef<HTMLFormElement>(null);

    function cancelFacilityEditing() {
        setEditFullName(profile.fullName || partnerFacility?.representativeName || "");
        setEditPhone(profile.phone || partnerFacility?.phone || "");
        setEditEmail(profile.email || partnerFacility?.email || "");
        setEditBirthDate(profile.birthDate || "");
        setEditGender(profile.gender || "");
        setFacName(partnerFacility?.name || "Cơ sở Chế biến Sầu riêng Trị An");
        setFacPhone(partnerFacility?.phone || profile.phone);
        setFacEmail(partnerFacility?.email || profile.email);
        setFacOrgType(partnerFacility?.organizationType || "Doanh nghiệp");
        setFacTaxCode(partnerFacility?.taxCode || "");
        setFacBusinessCode(partnerFacility?.businessCode || "");
        setFacAddress(partnerFacility?.address || "");
        setFacProvince(partnerFacility?.province || "Đồng Nai");
        setFacWard(partnerFacility?.ward || "");
        setFacCapacity(partnerFacility?.expectedCapacity ? String(partnerFacility.expectedCapacity) : "20");
        setFacCapacityUnit(partnerFacility?.capacityUnit || "tấn/ngày");
        setFacPurchasingAreas(partnerFacility?.purchasingAreas?.join(", ") || "");
        setFacProcessingTypes(partnerFacility?.processingTypes?.join(", ") || "");
        setFacDescription(partnerFacility?.description || "");
        setIsEditing(false);
    }

    const generalFormRef = useRef<HTMLFormElement>(null);

    function cancelGeneralEditing() {
        setEditFullName(profile.fullName || "");
        setEditPhone(profile.phone || "");
        setEditEmail(profile.email || "");
        setEditBirthDate(profile.birthDate || "");
        setEditGender(profile.gender || "");
        setIsEditing(false);
    }

    async function saveFarmerProfile(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        try {
            const res = await fetch("/api/account", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "farmer",
                    fullName: editFullName,
                    phone: editPhone,
                    email: editEmail,
                    birthDate: editBirthDate || undefined,
                    gender: editGender || undefined,
                    avatar,
                    farmName: farmerFarmName,
                    areaSize: farmerAreaSize ? Number(farmerAreaSize.replace(",", ".")) : undefined,
                    totalTrees: farmerTotalTrees ? Number(farmerTotalTrees) : undefined,
                    durianVariety: farmerDurianVariety,
                    province: farmerProvince,
                    district: farmerDistrict,
                    ward: farmerWard,
                    address: farmerAddress,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Không thể lưu thông tin nhà vườn.");
            toast({ title: "Đã cập nhật thông tin nhà vườn thành công!", variant: "success" });
            setIsEditing(false);
            router.refresh();
        } catch (err) {
            toast({
                title: "Lỗi cập nhật",
                description: err instanceof Error ? err.message : "Vui lòng thử lại.",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    }

    async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        try {
            const response = await fetch("/api/account", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "profile",
                    fullName: editFullName,
                    phone: editPhone,
                    email: editEmail,
                    birthDate: editBirthDate || undefined,
                    gender: editGender || undefined,
                    avatar,
                }),
            });
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload.message || "Không thể lưu thông tin.");
            }
            toast({ title: payload.message || "Đã lưu thông tin cá nhân", variant: "success" });
            setIsEditing(false);
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

    async function saveAllChanges(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        try {
            // 1. Save profile
            const resProfile = await fetch("/api/account", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "profile",
                    fullName: editFullName,
                    phone: editPhone,
                    email: editEmail,
                    birthDate: editBirthDate || undefined,
                    gender: editGender || undefined,
                    avatar,
                }),
            });
            const pData = await resProfile.json();
            if (!resProfile.ok) throw new Error(pData.message || "Không thể lưu thông tin cá nhân.");

            // 2. Save facility
            const pTypes = facProcessingTypes
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
            const pAreas = facPurchasingAreas
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);

            const resFacility = await fetch("/api/account", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "facility",
                    name: facName,
                    phone: editPhone || facPhone,
                    email: editEmail || facEmail,
                    organizationType: facOrgType,
                    taxCode: facTaxCode,
                    businessCode: facBusinessCode,
                    address: facAddress,
                    province: facProvince,
                    ward: facWard,
                    expectedCapacity: facCapacity ? Number(facCapacity) : null,
                    capacityUnit: facCapacityUnit,
                    purchasingAreas: isCollector ? pAreas : [],
                    processingTypes: isProcessing ? pTypes : [],
                    description: facDescription,
                }),
            });
            const fData = await resFacility.json();
            if (!resFacility.ok) throw new Error(fData.message || "Không thể lưu thông tin cơ sở.");

            toast({ title: "Đã cập nhật thông tin thành công!", variant: "success" });
            setIsEditing(false);
            router.refresh();
        } catch (err) {
            toast({
                title: "Lỗi cập nhật",
                description: err instanceof Error ? err.message : "Vui lòng thử lại.",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    }

    const roleName = roleLabels[profile.role] || profile.role;
    const roleSubtitle = roleSubtitles[profile.role] || "Hồ sơ người dùng TriViet";

    if (isFarmer) {
        const lockedInputClass = "h-11 rounded-xl bg-slate-50/90 border-slate-200 text-slate-900 font-semibold text-sm sm:text-base cursor-default select-text";
        const editableInputClass = isEditing
            ? "h-11 rounded-xl bg-white border-emerald-500 ring-2 ring-emerald-100 text-slate-900 font-semibold text-sm sm:text-base shadow-xs focus:outline-hidden"
            : lockedInputClass;

        return (
            <div className="mx-auto max-w-5xl space-y-6 pb-12">
                <input
                    ref={fileInput}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(event) => selectAvatar(event.target.files?.[0])}
                />

                {/* HEADER / HERO COVER */}
                <section className="relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-soft">
                    <div className="relative h-[130px] w-full bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-700 sm:h-[150px] p-6 sm:p-8 flex items-start justify-between">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3.5 py-1 text-xs font-black uppercase tracking-[0.18em] text-white backdrop-blur-md">
                            <Sprout className="h-3.5 w-3.5" />
                            HỒ SƠ TÀI KHOẢN NHÀ VƯỜN
                        </span>
                    </div>

                    <div className="relative bg-white px-6 pb-6 pt-3 sm:px-10">
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                            {/* Avatar & Basic Identity */}
                            <div className="flex items-end gap-4 sm:gap-6">
                                <button
                                    type="button"
                                    onClick={() => fileInput.current?.click()}
                                    className="group relative -mt-16 sm:-mt-20 flex h-28 w-28 sm:h-36 sm:w-36 shrink-0 items-center justify-center overflow-hidden rounded-full border-[5px] border-white bg-gradient-to-br from-emerald-50 to-white text-emerald-700 shadow-xl"
                                    title="Bấm để đổi ảnh đại diện"
                                >
                                    {avatar ? (
                                        <Image
                                            src={avatar}
                                            alt="Avatar"
                                            fill
                                            unoptimized
                                            className="object-cover transition group-hover:scale-105"
                                        />
                                    ) : (
                                        <UserRound className="h-14 w-14 sm:h-20 sm:w-20 text-emerald-600" strokeWidth={1.8} />
                                    )}
                                    <span className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-slate-950/60 py-1.5 text-white transition group-hover:bg-slate-950/75">
                                        <Camera className="h-4 w-4" />
                                    </span>
                                </button>

                                <div className="space-y-1.5 pb-1">
                                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                                        {profile.fullName || "Trần Văn Minh"}
                                    </h1>
                                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                        <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-100">
                                            <Sprout className="h-3.5 w-3.5 text-emerald-700" />
                                            Nông dân
                                        </span>
                                        <Badge className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs sm:text-sm font-bold text-emerald-800 shadow-xs">
                                            <BadgeCheck className="mr-1.5 h-4 w-4 text-emerald-600" />
                                            {profile.isApproved ? "Tài khoản đã phê duyệt" : "Chờ phê duyệt"}
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons: [ CHỈNH SỬA THÔNG TIN ] or [ HỦY ] + [ LƯU THAY ĐỔI ] */}
                            <div className="self-start sm:self-end pt-2 sm:pt-0">
                                {!isEditing ? (
                                    <Button
                                        type="button"
                                        onClick={() => setIsEditing(true)}
                                        className="h-11 rounded-2xl bg-brand-600 px-6 font-bold text-white shadow-soft hover:bg-brand-700 flex items-center gap-2"
                                    >
                                        <Edit3 className="h-4 w-4" />
                                        CHỈNH SỬA THÔNG TIN
                                    </Button>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={cancelFarmerEditing}
                                            className="h-11 rounded-2xl border-slate-200 px-5 font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5"
                                        >
                                            <X className="h-4 w-4" />
                                            HỦY
                                        </Button>
                                        <Button
                                            type="button"
                                            onClick={() => farmerFormRef.current?.requestSubmit()}
                                            disabled={saving}
                                            className="h-11 rounded-2xl bg-emerald-600 px-6 font-bold text-white shadow-soft hover:bg-emerald-700 flex items-center gap-2"
                                        >
                                            <Save className="h-4 w-4" />
                                            {saving ? "ĐANG LƯU..." : "LƯU THAY ĐỔI"}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* MAIN FORM WITH UNLOCKED / LOCKED TEXT INPUTS */}
                <form ref={farmerFormRef} onSubmit={saveFarmerProfile} className="space-y-6">
                    {/* Card 1: THÔNG TIN CÁ NHÂN */}
                    <Card className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-soft">
                        <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                            <CardTitle className="flex items-center gap-2.5 text-base sm:text-lg font-black tracking-wide text-slate-900 uppercase">
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                                    <UserRound className="h-4 w-4" />
                                </div>
                                THÔNG TIN CÁ NHÂN
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 sm:p-8 space-y-4">
                            {/* Row 1: Họ và tên & Số điện thoại */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Họ và tên {isEditing && <span className="text-rose-500">*</span>}
                                    </Label>
                                    <Input
                                        value={editFullName}
                                        onChange={(e) => setEditFullName(e.target.value)}
                                        disabled={!isEditing}
                                        required
                                        placeholder="Nhập họ và tên"
                                        className={editableInputClass}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Số điện thoại {isEditing && <span className="text-rose-500">*</span>}
                                    </Label>
                                    <Input
                                        value={editPhone}
                                        onChange={(e) => setEditPhone(e.target.value)}
                                        disabled={!isEditing}
                                        required
                                        inputMode="tel"
                                        placeholder="09xxxxxxxx"
                                        className={`${editableInputClass} font-mono`}
                                    />
                                </div>
                            </div>

                            {/* Row 2: Email, Ngày sinh, Giới tính */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Email {isEditing && <span className="text-rose-500">*</span>}
                                    </Label>
                                    <Input
                                        type="email"
                                        value={editEmail}
                                        onChange={(e) => setEditEmail(e.target.value)}
                                        disabled={!isEditing}
                                        required
                                        placeholder="email@example.com"
                                        className={editableInputClass}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Ngày sinh
                                    </Label>
                                    {isEditing ? (
                                        <VietnameseDatePicker
                                            name="birthDate"
                                            defaultValue={editBirthDate}
                                            onChange={(val) => setEditBirthDate(val)}
                                            placeholder="dd/mm/yyyy"
                                            max={new Date().toISOString().slice(0, 10)}
                                        />
                                    ) : (
                                        <Input
                                            value={editBirthDate ? formatVietnameseDate(editBirthDate) : "01/01/1980"}
                                            disabled
                                            className={lockedInputClass}
                                        />
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Giới tính
                                    </Label>
                                    {isEditing ? (
                                        <select
                                            value={editGender}
                                            onChange={(e) => setEditGender(e.target.value)}
                                            className="h-11 w-full rounded-xl border border-emerald-500 bg-white px-3 text-sm sm:text-base font-semibold text-slate-900 shadow-xs ring-2 ring-emerald-100 focus:outline-hidden"
                                        >
                                            <option value="">Chưa chọn</option>
                                            <option value="MALE">Nam</option>
                                            <option value="FEMALE">Nữ</option>
                                            <option value="OTHER">Khác</option>
                                        </select>
                                    ) : (
                                        <Input
                                            value={getGenderLabel(editGender)}
                                            disabled
                                            className={lockedInputClass}
                                        />
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Card 2: THÔNG TIN VƯỜN TRỒNG */}
                    <Card className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-soft">
                        <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                            <CardTitle className="flex items-center gap-2.5 text-base sm:text-lg font-black tracking-wide text-slate-900 uppercase">
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                                    <Sprout className="h-4 w-4" />
                                </div>
                                THÔNG TIN VƯỜN TRỒNG
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 sm:p-8 space-y-4">
                            {/* Row 1: TÊN VƯỜN & MÃ VÙNG TRỒNG */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        TÊN VƯỜN {isEditing && <span className="text-rose-500">*</span>}
                                    </Label>
                                    <Input
                                        value={farmerFarmName}
                                        onChange={(e) => setFarmerFarmName(e.target.value)}
                                        disabled={!isEditing}
                                        required
                                        placeholder="Nhập tên vườn"
                                        className={editableInputClass}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                                            MÃ VÙNG TRỒNG
                                        </Label>
                                        <span className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
                                            <LockKeyhole className="h-3 w-3" /> Cấp bởi cơ quan thẩm quyền
                                        </span>
                                    </div>
                                    <Input
                                        value={primaryFarm.regionCode || (primaryFarm.farmCode ? primaryFarm.farmCode.replace(/-F\d+$/, "") : "75-PUC-SR-00001-CHN")}
                                        disabled
                                        className="h-11 rounded-xl bg-emerald-50/80 border-emerald-200 text-emerald-800 font-mono font-black text-sm sm:text-base tracking-wide cursor-default select-text"
                                    />
                                </div>
                            </div>

                            {/* Row 2: Quy mô & Số lượng cây */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Quy mô
                                    </Label>
                                    {isEditing ? (
                                        <div className="relative">
                                            <Input
                                                value={farmerAreaSize}
                                                onChange={(e) => setFarmerAreaSize(e.target.value)}
                                                placeholder="8,5"
                                                className={`${editableInputClass} pr-12`}
                                            />
                                            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                                                ha
                                            </span>
                                        </div>
                                    ) : (
                                        <Input
                                            value={`${farmerAreaSize ? String(farmerAreaSize).replace('.', ',') : "8,5"} ha`}
                                            disabled
                                            className={lockedInputClass}
                                        />
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Số lượng cây
                                    </Label>
                                    {isEditing ? (
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                value={farmerTotalTrees}
                                                onChange={(e) => setFarmerTotalTrees(e.target.value)}
                                                placeholder="420"
                                                className={`${editableInputClass} pr-14`}
                                            />
                                            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                                                cây
                                            </span>
                                        </div>
                                    ) : (
                                        <Input
                                            value={`${farmerTotalTrees || 420} cây`}
                                            disabled
                                            className={lockedInputClass}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Row 3: Giống sầu riêng & Trạng thái */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Giống sầu riêng
                                    </Label>
                                    <Input
                                        value={farmerDurianVariety}
                                        onChange={(e) => setFarmerDurianVariety(e.target.value)}
                                        disabled={!isEditing}
                                        placeholder="Ri6, Monthong..."
                                        className={editableInputClass}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                            Trạng thái
                                        </Label>
                                        <span className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
                                            <LockKeyhole className="h-3 w-3" /> Mặc định
                                        </span>
                                    </div>
                                    <Input
                                        value={primaryFarm.isActive ? "Đang hoạt động" : "Tạm ngưng"}
                                        disabled
                                        className="h-11 rounded-xl bg-emerald-50/70 border-emerald-200 text-emerald-700 font-bold text-sm sm:text-base cursor-default select-text"
                                    />
                                </div>
                            </div>

                            {/* Row 4: Tỉnh / Thành phố & Huyện / Xã */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Tỉnh / Thành phố
                                    </Label>
                                    <Input
                                        value={farmerProvince}
                                        onChange={(e) => setFarmerProvince(e.target.value)}
                                        disabled={!isEditing}
                                        placeholder="Đồng Nai"
                                        className={editableInputClass}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Huyện / Xã
                                    </Label>
                                    {isEditing ? (
                                        <div className="grid grid-cols-2 gap-2">
                                            <Input
                                                value={farmerDistrict}
                                                onChange={(e) => setFarmerDistrict(e.target.value)}
                                                placeholder="Huyện Tân Phú"
                                                className={editableInputClass}
                                            />
                                            <Input
                                                value={farmerWard}
                                                onChange={(e) => setFarmerWard(e.target.value)}
                                                placeholder="Xã Phú Lộc"
                                                className={editableInputClass}
                                            />
                                        </div>
                                    ) : (
                                        <Input
                                            value={[farmerDistrict, farmerWard].filter(Boolean).join(" / ") || "Tân Phú / Phú Lộc"}
                                            disabled
                                            className={lockedInputClass}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Row 5: Địa chỉ vườn */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    Địa chỉ vườn
                                </Label>
                                <Input
                                    value={farmerAddress}
                                    onChange={(e) => setFarmerAddress(e.target.value)}
                                    disabled={!isEditing}
                                    placeholder="Ấp 3, xã Phú Lộc, huyện Tân Phú, Đồng Nai"
                                    className={editableInputClass}
                                />
                            </div>
                        </CardContent>
                    </Card>


                </form>

                {/* 3. THÔNG TIN HỆ THỐNG & BẢO MẬT & ĐỔI MẬT KHẨU (2 COLUMNS) */}
                <div className="grid gap-6 lg:grid-cols-2">
                    {/* THÔNG TIN HỆ THỐNG */}
                    <Card className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-soft">
                        <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                            <CardTitle className="flex items-center gap-2.5 text-base sm:text-lg font-black tracking-wide text-slate-900 uppercase">
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                                    <CalendarDays className="h-4 w-4" />
                                </div>
                                THÔNG TIN HỆ THỐNG
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 sm:p-8 space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    Vai trò hệ thống
                                </Label>
                                <Input
                                    value="Nông dân"
                                    disabled
                                    className={lockedInputClass}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    Trạng thái tài khoản
                                </Label>
                                <Input
                                    value={profile.isApproved ? "Đang hoạt động" : "Chờ phê duyệt"}
                                    disabled
                                    className="h-11 rounded-xl bg-emerald-50/70 border-emerald-200 text-emerald-700 font-bold text-sm sm:text-base cursor-default select-text"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    Ngày đăng ký
                                </Label>
                                <Input
                                    value={formatDateTime(profile.createdAt) || "29/07/2026 08:43"}
                                    disabled
                                    className={`${lockedInputClass} font-mono`}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    Lần đăng nhập gần nhất
                                </Label>
                                <Input
                                    value={formatDateTime(profile.lastLoginAt || profile.updatedAt || profile.createdAt) || "14/09/2026 11:29"}
                                    disabled
                                    className={`${lockedInputClass} font-mono`}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    Thời điểm phê duyệt
                                </Label>
                                <Input
                                    value={formatDateTime(profile.approvedAt || profile.createdAt) || "29/07/2026 08:43"}
                                    disabled
                                    className={`${lockedInputClass} font-mono`}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* BẢO MẬT & ĐỔI MẬT KHẨU */}
                    <Card className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-soft">
                        <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                            <CardTitle className="flex items-center gap-2.5 text-base sm:text-lg font-black tracking-wide text-slate-900 uppercase">
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                                    <LockKeyhole className="h-4 w-4" />
                                </div>
                                BẢO MẬT & ĐỔI MẬT KHẨU
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 sm:p-8 space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    Mật khẩu hiện tại
                                </Label>
                                <Input
                                    value="************"
                                    disabled
                                    className={`${lockedInputClass} font-mono`}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    Cập nhật mật khẩu lần cuối
                                </Label>
                                <Input
                                    value={formatDateTime(profile.passwordUpdatedAt || profile.createdAt) || "29/07/2026 08:43"}
                                    disabled
                                    className={`${lockedInputClass} font-mono`}
                                />
                            </div>

                            {!changingPassword ? (
                                <div className="pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="h-11 rounded-2xl border-slate-200 px-5 font-bold text-slate-800 shadow-xs hover:bg-slate-50 flex items-center gap-2"
                                        onClick={() => setChangingPassword(true)}
                                    >
                                        <KeyRound className="h-4 w-4 text-brand-600" />
                                        ĐỔI MẬT KHẨU
                                    </Button>
                                </div>
                            ) : (
                                <form onSubmit={changePassword} className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
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
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    if (isProcessing || isCollector) {
        const lockedInputClass = "h-11 rounded-xl bg-slate-50/90 border-slate-200 text-slate-900 font-semibold text-sm sm:text-base cursor-default select-text";
        const editableInputClass = isEditing
            ? "h-11 rounded-xl bg-white border-emerald-500 ring-2 ring-emerald-100 text-slate-900 font-semibold text-sm sm:text-base shadow-xs focus:outline-hidden"
            : lockedInputClass;

        const displayFacilityCode = partnerFacility?.code || (isProcessing ? "75-PHC-SR-00001-CHN" : "75-PHC-SR-00001-CHN");

        return (
            <div className="mx-auto max-w-5xl space-y-6 pb-12">
                <input
                    ref={fileInput}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(event) => selectAvatar(event.target.files?.[0])}
                />

                {/* HEADER / HERO COVER */}
                <section className="relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-soft">
                    <div className="relative h-[130px] w-full bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-700 sm:h-[150px] p-6 sm:p-8 flex items-start justify-between">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3.5 py-1 text-xs font-black uppercase tracking-[0.18em] text-white backdrop-blur-md">
                            {isProcessing ? <Factory className="h-3.5 w-3.5" /> : <Truck className="h-3.5 w-3.5" />}
                            {isProcessing ? "HỒ SƠ DOANH NGHIỆP" : "HỒ SƠ VỰA THU MUA"}
                        </span>
                    </div>

                    <div className="relative bg-white px-6 pb-6 pt-3 sm:px-10">
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                            {/* Avatar & Basic Identity */}
                            <div className="flex items-end gap-4 sm:gap-6">
                                <button
                                    type="button"
                                    onClick={() => fileInput.current?.click()}
                                    className="group relative -mt-16 sm:-mt-20 flex h-28 w-28 sm:h-36 sm:w-36 shrink-0 items-center justify-center overflow-hidden rounded-full border-[5px] border-white bg-gradient-to-br from-emerald-50 to-white text-emerald-700 shadow-xl"
                                    title="Bấm để đổi ảnh đại diện"
                                >
                                    {avatar ? (
                                        <Image
                                            src={avatar}
                                            alt="Avatar"
                                            fill
                                            unoptimized
                                            className="object-cover transition group-hover:scale-105"
                                        />
                                    ) : (
                                        <UserRound className="h-14 w-14 sm:h-20 sm:w-20 text-emerald-600" strokeWidth={1.8} />
                                    )}
                                    <span className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-slate-950/60 py-1.5 text-white transition group-hover:bg-slate-950/75">
                                        <Camera className="h-4 w-4" />
                                    </span>
                                </button>

                                <div className="space-y-1.5 pb-1">
                                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                                        {profile.fullName || partnerFacility?.representativeName || "Trần Minh Anh"}
                                    </h1>
                                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                        <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-100">
                                            {isProcessing ? <Factory className="h-3.5 w-3.5" /> : <Truck className="h-3.5 w-3.5" />}
                                            {roleName}
                                        </span>
                                        <Badge className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs sm:text-sm font-bold text-emerald-800 shadow-xs">
                                            <BadgeCheck className="mr-1.5 h-4 w-4 text-emerald-600" />
                                            {profile.isApproved ? "Tài khoản đã phê duyệt" : "Chờ phê duyệt"}
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            {/* Prominent Action Buttons: [ CHỈNH SỬA THÔNG TIN ] or [ HỦY ] + [ LƯU THAY ĐỔI ] */}
                            <div className="self-start sm:self-end pt-2 sm:pt-0">
                                {!isEditing ? (
                                    <Button
                                        type="button"
                                        onClick={() => setIsEditing(true)}
                                        className="h-11 rounded-2xl bg-brand-600 px-6 font-bold text-white shadow-soft hover:bg-brand-700 flex items-center gap-2"
                                    >
                                        <Edit3 className="h-4 w-4" />
                                        CHỈNH SỬA THÔNG TIN
                                    </Button>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={cancelFacilityEditing}
                                            className="h-11 rounded-2xl border-slate-200 px-5 font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5"
                                        >
                                            <X className="h-4 w-4" />
                                            HỦY
                                        </Button>
                                        <Button
                                            type="button"
                                            onClick={() => facilityFormRef.current?.requestSubmit()}
                                            disabled={saving}
                                            className="h-11 rounded-2xl bg-emerald-600 px-6 font-bold text-white shadow-soft hover:bg-emerald-700 flex items-center gap-2"
                                        >
                                            <Save className="h-4 w-4" />
                                            {saving ? "ĐANG LƯU..." : "LƯU THAY ĐỔI"}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* MAIN FORM WITH UNLOCKED / LOCKED TEXT INPUTS */}
                <form ref={facilityFormRef} onSubmit={saveAllChanges} className="space-y-6">
                    {/* Card 1: THÔNG TIN CÁ NHÂN NGƯỜI ĐẠI DIỆN */}
                    <Card className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-soft">
                        <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                            <CardTitle className="flex items-center gap-2.5 text-base sm:text-lg font-black tracking-wide text-slate-900 uppercase">
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                                    <UserRound className="h-4 w-4" />
                                </div>
                                THÔNG TIN CÁ NHÂN NGƯỜI ĐẠI DIỆN
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 sm:p-8 space-y-4">
                            {/* Row 1: Họ và tên & Số điện thoại */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Họ và tên {isEditing && <span className="text-rose-500">*</span>}
                                    </Label>
                                    <Input
                                        value={editFullName}
                                        onChange={(e) => setEditFullName(e.target.value)}
                                        disabled={!isEditing}
                                        required
                                        placeholder="Nhập họ và tên"
                                        className={editableInputClass}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Số điện thoại {isEditing && <span className="text-rose-500">*</span>}
                                    </Label>
                                    <Input
                                        value={editPhone}
                                        onChange={(e) => setEditPhone(e.target.value)}
                                        disabled={!isEditing}
                                        required
                                        inputMode="tel"
                                        placeholder="09xxxxxxxx"
                                        className={`${editableInputClass} font-mono`}
                                    />
                                </div>
                            </div>

                            {/* Row 2: Email, Ngày sinh, Giới tính */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Email {isEditing && <span className="text-rose-500">*</span>}
                                    </Label>
                                    <Input
                                        type="email"
                                        value={editEmail}
                                        onChange={(e) => setEditEmail(e.target.value)}
                                        disabled={!isEditing}
                                        required
                                        placeholder="email@example.com"
                                        className={editableInputClass}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Ngày sinh
                                    </Label>
                                    {isEditing ? (
                                        <VietnameseDatePicker
                                            name="birthDate"
                                            defaultValue={editBirthDate}
                                            onChange={(val) => setEditBirthDate(val)}
                                            placeholder="dd/mm/yyyy"
                                            max={new Date().toISOString().slice(0, 10)}
                                        />
                                    ) : (
                                        <Input
                                            value={editBirthDate ? formatVietnameseDate(editBirthDate) : (formatDate(profile.birthDate) || "01/01/1980")}
                                            disabled
                                            className={lockedInputClass}
                                        />
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Giới tính
                                    </Label>
                                    {isEditing ? (
                                        <select
                                            value={editGender}
                                            onChange={(e) => setEditGender(e.target.value)}
                                            className="h-11 w-full rounded-xl border border-emerald-500 ring-2 ring-emerald-100 bg-white px-3 text-sm font-semibold text-slate-900 shadow-xs focus:outline-hidden"
                                        >
                                            <option value="">Chưa chọn</option>
                                            <option value="MALE">Nam</option>
                                            <option value="FEMALE">Nữ</option>
                                            <option value="OTHER">Khác</option>
                                        </select>
                                    ) : (
                                        <Input
                                            value={getGenderLabel(editGender || profile.gender)}
                                            disabled
                                            className={lockedInputClass}
                                        />
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Card 2: THÔNG TIN CƠ SỞ CHẾ BIẾN & ĐÓNG GÓI */}
                    <Card className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-soft">
                        <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                            <CardTitle className="flex items-center gap-2.5 text-base sm:text-lg font-black tracking-wide text-slate-900 uppercase">
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                                    {isProcessing ? <Factory className="h-4 w-4" /> : <Truck className="h-4 w-4" />}
                                </div>
                                {isProcessing ? "THÔNG TIN CƠ SỞ CHẾ BIẾN & ĐÓNG GÓI" : "THÔNG TIN VỰA THU MUA & ĐÓNG GÓI"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 sm:p-8 space-y-4">
                            {/* Row 1: TÊN CƠ SỞ & MÃ CƠ SỞ ĐÓNG GÓI */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Tên cơ sở {isEditing && <span className="text-rose-500">*</span>}
                                    </Label>
                                    <Input
                                        value={facName}
                                        onChange={(e) => setFacName(e.target.value)}
                                        disabled={!isEditing}
                                        required
                                        placeholder="Nhập tên cơ sở / doanh nghiệp"
                                        className={editableInputClass}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                                            Mã cơ sở đóng gói (PHC)
                                        </Label>
                                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800">
                                            <LockKeyhole className="h-3 w-3" />
                                            Hệ thống cấp
                                        </span>
                                    </div>
                                    <div className="relative">
                                        <Input
                                            value={displayFacilityCode}
                                            disabled
                                            className="h-11 rounded-xl bg-emerald-50/70 border-emerald-200 text-emerald-900 font-mono font-black text-base cursor-default select-text pr-9"
                                        />
                                        <LockKeyhole className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600/70" />
                                    </div>
                                    <p className="text-[11px] text-slate-500 italic">Mã số định danh chuẩn Quyết định 19/2025/QĐ-TTg &amp; Bộ NN&amp;MT.</p>
                                </div>
                            </div>

                            {/* Row 2: Loại hình & Công suất */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Loại hình {isEditing && <span className="text-rose-500">*</span>}
                                    </Label>
                                    {isEditing ? (
                                        <select
                                            value={facOrgType}
                                            onChange={(e) => setFacOrgType(e.target.value)}
                                            className="h-11 w-full rounded-xl border border-emerald-500 ring-2 ring-emerald-100 bg-white px-3 text-sm font-semibold text-slate-900 shadow-xs focus:outline-hidden"
                                        >
                                            <option value="Doanh nghiệp">Doanh nghiệp</option>
                                            <option value="Công ty TNHH">Công ty TNHH</option>
                                            <option value="Công ty Cổ phần">Công ty Cổ phần</option>
                                            <option value="Hộ kinh doanh">Hộ kinh doanh</option>
                                            <option value="Hợp tác xã">Hợp tác xã</option>
                                            <option value="Doanh nghiệp tư nhân">Doanh nghiệp tư nhân</option>
                                        </select>
                                    ) : (
                                        <Input
                                            value={facOrgType}
                                            disabled
                                            className={lockedInputClass}
                                        />
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        {isProcessing ? "Công suất chế biến" : "Khối lượng tiếp nhận"} {isEditing && <span className="text-rose-500">*</span>}
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            type={isEditing ? "number" : "text"}
                                            min={1}
                                            value={isEditing ? facCapacity : `${facCapacity || "20"} ${facCapacityUnit || "tấn/ngày"}`}
                                            onChange={(e) => setFacCapacity(e.target.value)}
                                            disabled={!isEditing}
                                            required
                                            className={editableInputClass}
                                        />
                                        {isEditing && (
                                            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                                tấn/ngày
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Row 3: Mã ĐKKD & Mã số thuế */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Mã ĐKKD
                                    </Label>
                                    <Input
                                        value={facBusinessCode}
                                        onChange={(e) => setFacBusinessCode(e.target.value)}
                                        disabled={!isEditing}
                                        placeholder="DN-CB-2026"
                                        className={`${editableInputClass} font-mono`}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Mã số thuế
                                    </Label>
                                    <Input
                                        value={facTaxCode}
                                        onChange={(e) => setFacTaxCode(e.target.value)}
                                        disabled={!isEditing}
                                        placeholder="3603999003"
                                        className={`${editableInputClass} font-mono`}
                                    />
                                </div>
                            </div>

                            {/* Row 4: Tỉnh / Thành phố & Địa chỉ cơ sở */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Tỉnh / Thành phố {isEditing && <span className="text-rose-500">*</span>}
                                    </Label>
                                    <Input
                                        value={facProvince}
                                        onChange={(e) => setFacProvince(e.target.value)}
                                        disabled={!isEditing}
                                        required
                                        className={editableInputClass}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Địa chỉ cơ sở {isEditing && <span className="text-rose-500">*</span>}
                                    </Label>
                                    <Input
                                        value={facAddress}
                                        onChange={(e) => setFacAddress(e.target.value)}
                                        disabled={!isEditing}
                                        required
                                        placeholder="Số nhà, đường, xã/phường, quận/huyện..."
                                        className={editableInputClass}
                                    />
                                </div>
                            </div>

                            {/* Row 5: Quy trình chế biến / Vùng thu mua */}
                            {isProcessing && (
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Quy trình & Các dòng sản phẩm chế biến
                                    </Label>
                                    <Input
                                        value={facProcessingTypes}
                                        onChange={(e) => setFacProcessingTypes(e.target.value)}
                                        disabled={!isEditing}
                                        placeholder="Sầu riêng nguyên trái, Tách múi hút chân không, Cấp đông nhanh IQF..."
                                        className={editableInputClass}
                                    />
                                </div>
                            )}
                            {isCollector && (
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Vùng thu mua chính
                                    </Label>
                                    <Input
                                        value={facPurchasingAreas}
                                        onChange={(e) => setFacPurchasingAreas(e.target.value)}
                                        disabled={!isEditing}
                                        placeholder="Đồng Nai, Bình Phước, Lâm Đồng..."
                                        className={editableInputClass}
                                    />
                                </div>
                            )}

                            {/* Row 6: Mô tả */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    Mô tả & Giới thiệu cơ sở
                                </Label>
                                <textarea
                                    rows={3}
                                    value={facDescription}
                                    onChange={(e) => setFacDescription(e.target.value)}
                                    disabled={!isEditing}
                                    placeholder="Giới thiệu về năng lực sơ chế, đóng gói, tiêu chuẩn xuất khẩu..."
                                    className={
                                        isEditing
                                            ? "w-full rounded-xl border border-emerald-500 ring-2 ring-emerald-100 bg-white p-3 text-sm font-semibold text-slate-900 shadow-xs focus:outline-hidden"
                                            : "w-full rounded-xl border border-slate-200 bg-slate-50/90 p-3 text-sm font-semibold text-slate-900 cursor-default select-text"
                                    }
                                />
                            </div>
                        </CardContent>
                    </Card>
                </form>

                {/* 3. THÔNG TIN HỆ THỐNG & BẢO MẬT & ĐỔI MẬT KHẨU (2 COLUMNS) */}
                <div className="grid gap-6 lg:grid-cols-2">
                    {/* THÔNG TIN HỆ THỐNG */}
                    <Card className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-soft">
                        <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                            <CardTitle className="flex items-center gap-2.5 text-base sm:text-lg font-black tracking-wide text-slate-900 uppercase">
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                                    <CalendarDays className="h-4 w-4" />
                                </div>
                                THÔNG TIN HỆ THỐNG
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 sm:p-8 space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">VAI TRÒ HỆ THỐNG</Label>
                                <Input value={roleName} disabled className={lockedInputClass} />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">TRẠNG THÁI TÀI KHOẢN</Label>
                                <Input value={profile.isApproved ? "Tài khoản đã phê duyệt" : "Chờ phê duyệt"} disabled className={lockedInputClass} />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">NGÀY ĐĂNG KÝ</Label>
                                <Input value={formatDateTime(profile.createdAt)} disabled className={`${lockedInputClass} font-mono`} />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">LẦN ĐĂNG NHẬP GẦN NHẤT</Label>
                                <Input value={formatDateTime(profile.lastLoginAt)} disabled className={`${lockedInputClass} font-mono`} />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">THỜI ĐIỂM PHÊ DUYỆT</Label>
                                <Input value={formatDateTime(profile.approvedAt || profile.createdAt)} disabled className={`${lockedInputClass} font-mono`} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* BẢO MẬT & ĐỔI MẬT KHẨU */}
                    <Card className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-soft">
                        <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                            <CardTitle className="flex items-center gap-2.5 text-base sm:text-lg font-black tracking-wide text-slate-900 uppercase">
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                                    <LockKeyhole className="h-4 w-4" />
                                </div>
                                BẢO MẬT & ĐỔI MẬT KHẨU
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 sm:p-8 space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">MẬT KHẨU</Label>
                                <Input value="••••••••••••" disabled className={lockedInputClass} />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">CẬP NHẬT MẬT KHẨU LẦN CUỐI</Label>
                                <Input value={formatDateTime(profile.passwordUpdatedAt)} disabled className={lockedInputClass} />
                            </div>

                            {!changingPassword ? (
                                <div className="pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="h-11 rounded-xl border-slate-200 font-bold text-slate-800 hover:bg-slate-50"
                                        onClick={() => setChangingPassword(true)}
                                    >
                                        <KeyRound className="mr-2 h-4 w-4 text-brand-600" />
                                        Đổi mật khẩu
                                    </Button>
                                </div>
                            ) : (
                                <form onSubmit={changePassword} className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
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
                        </CardContent>
                    </Card>
                </div>

                {/* Sticky bottom bar when editing */}
                {isEditing && (
                    <div className="fixed inset-x-0 bottom-4 z-40 mx-auto max-w-lg px-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
                        <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-slate-900/95 p-3 text-white shadow-2xl backdrop-blur-md">
                            <span className="text-xs font-semibold text-slate-200 pl-2">
                                Bạn đang chỉnh sửa hồ sơ {isProcessing ? "doanh nghiệp" : "vựa thu mua"}
                            </span>
                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={cancelFacilityEditing}
                                    className="h-9 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white"
                                >
                                    Hủy
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => facilityFormRef.current?.requestSubmit()}
                                    disabled={saving}
                                    className="h-9 rounded-xl bg-emerald-600 px-4 font-bold text-white shadow-soft hover:bg-emerald-500 flex items-center gap-1.5"
                                >
                                    <Save className="h-3.5 w-3.5" />
                                    {saving ? "Đang lưu..." : "Lưu thay đổi"}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    const lockedInputClass = "h-11 rounded-xl bg-slate-50/90 border-slate-200 text-slate-900 font-semibold text-sm sm:text-base cursor-default select-text";
    const editableInputClass = isEditing
        ? "h-11 rounded-xl bg-white border-emerald-500 ring-2 ring-emerald-100 text-slate-900 font-semibold text-sm sm:text-base shadow-xs focus:outline-hidden"
        : lockedInputClass;

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

                    <div className="flex min-h-[60px] flex-wrap items-center justify-end gap-2.5">
                        <Badge
                            className={`rounded-full border px-3.5 py-1.5 text-xs sm:text-sm font-bold shadow-xs ${profile.isApproved
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                : "border-amber-200 bg-amber-50 text-amber-800"
                                }`}
                        >
                            <BadgeCheck className="mr-1.5 h-4 w-4 text-emerald-600" />
                            {profile.isApproved ? "Tài khoản đã phê duyệt" : "Chờ phê duyệt"}
                        </Badge>
                        {!isEditing ? (
                            <Button
                                type="button"
                                onClick={() => setIsEditing(true)}
                                className="h-11 rounded-2xl bg-brand-600 px-5 font-bold text-white shadow-soft hover:bg-brand-700 flex items-center gap-2"
                            >
                                <Edit3 className="h-4 w-4" />
                                CHỈNH SỬA THÔNG TIN
                            </Button>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={cancelGeneralEditing}
                                    className="h-11 rounded-2xl border-slate-200 px-4 font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5"
                                >
                                    <X className="h-4 w-4" />
                                    HỦY
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => generalFormRef.current?.requestSubmit()}
                                    disabled={saving}
                                    className="h-11 rounded-2xl bg-emerald-600 px-5 font-bold text-white shadow-soft hover:bg-emerald-700 flex items-center gap-2"
                                >
                                    <Save className="h-4 w-4" />
                                    {saving ? "ĐANG LƯU..." : "LƯU THAY ĐỔI"}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Profile Form (Personal Info) */}
            <form ref={generalFormRef} onSubmit={saveProfile} className="space-y-6">
                <input
                    ref={fileInput}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={event => selectAvatar(event.target.files?.[0])}
                />
                <ProfileCard title="Thông tin cá nhân người đại diện" icon={UserRound}>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Họ và tên {isEditing && <span className="text-rose-500">*</span>}
                            </Label>
                            <Input
                                value={editFullName}
                                onChange={(e) => setEditFullName(e.target.value)}
                                disabled={!isEditing}
                                required
                                placeholder="Nhập họ và tên"
                                className={editableInputClass}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Số điện thoại {isEditing && <span className="text-rose-500">*</span>}
                            </Label>
                            <Input
                                value={editPhone}
                                onChange={(e) => setEditPhone(e.target.value)}
                                disabled={!isEditing}
                                required
                                inputMode="tel"
                                placeholder="09xxxxxxxx"
                                className={`${editableInputClass} font-mono`}
                            />
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Email {isEditing && <span className="text-rose-500">*</span>}
                            </Label>
                            <Input
                                type="email"
                                value={editEmail}
                                onChange={(e) => setEditEmail(e.target.value)}
                                disabled={!isEditing}
                                required
                                placeholder="email@example.com"
                                className={editableInputClass}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Ngày sinh
                            </Label>
                            {isEditing ? (
                                <VietnameseDatePicker
                                    name="birthDate"
                                    defaultValue={editBirthDate}
                                    onChange={(val) => setEditBirthDate(val)}
                                    placeholder="dd/mm/yyyy"
                                    max={new Date().toISOString().slice(0, 10)}
                                />
                            ) : (
                                <Input
                                    value={editBirthDate ? formatVietnameseDate(editBirthDate) : (formatDate(profile.birthDate) || "01/01/1980")}
                                    disabled
                                    className={lockedInputClass}
                                />
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Giới tính
                            </Label>
                            {isEditing ? (
                                <select
                                    value={editGender}
                                    onChange={(e) => setEditGender(e.target.value)}
                                    className="h-11 w-full rounded-xl border border-emerald-500 ring-2 ring-emerald-100 bg-white px-3 text-sm font-semibold text-slate-900 shadow-xs focus:outline-hidden"
                                >
                                    <option value="">Chưa chọn</option>
                                    <option value="FEMALE">Nữ</option>
                                    <option value="MALE">Nam</option>
                                    <option value="OTHER">Khác</option>
                                </select>
                            ) : (
                                <Input
                                    value={getGenderLabel(editGender || profile.gender)}
                                    disabled
                                    className={lockedInputClass}
                                />
                            )}
                        </div>
                    </div>
                </ProfileCard>
            </form>

            {/* Role Specific Section: AREA_MANAGER */}
            {profile.role === "AREA_MANAGER" && managerProfile && (
                <div className="grid gap-6 lg:grid-cols-2">
                    <ProfileCard title="Thông tin tổ chức / Hợp tác xã" icon={Building2}>
                        <div className="space-y-4">
                            <Info label="Tổ chức / HTX" value={managerProfile.organizationName} />
                            <Info label="Chức vụ" value={managerProfile.position} />
                            <Info label="Mã số thuế" value={managerProfile.taxCode} mono />
                            <Info label="CCCD/CMND" value={managerProfile.identityNumber} mono />
                            <Info label="Ngày cấp" value={managerProfile.identityIssuedDate ? formatVietnameseDate(new Date(managerProfile.identityIssuedDate)) : null} />
                            <Info label="Nơi cấp" value={managerProfile.identityIssuedPlace} />
                        </div>
                    </ProfileCard>

                    <ProfileCard title="Vùng trồng phụ trách" icon={LandPlot}>
                        {managerProfile.managedRegions && managerProfile.managedRegions.length > 0 ? (
                            <div className="space-y-4">
                                {managerProfile.managedRegions.map((region, idx) => (
                                    <div key={idx} className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-3">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Tên vùng trồng</Label>
                                            <Input value={region.name} disabled className={lockedInputClass} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                                                    Mã số vùng trồng (PUC)
                                                </Label>
                                                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800">
                                                    <LockKeyhole className="h-3 w-3" />
                                                    Hệ thống cấp
                                                </span>
                                            </div>
                                            <div className="relative">
                                                <Input
                                                    value={region.code}
                                                    disabled
                                                    className="h-11 rounded-xl bg-emerald-50/70 border-emerald-200 text-emerald-900 font-mono font-black text-base cursor-default select-text pr-9"
                                                />
                                                <LockKeyhole className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600/70" />
                                            </div>
                                            <p className="text-[11px] text-slate-500 italic">Mã số định danh chuẩn Quyết định 19/2025/QĐ-TTg &amp; Bộ NN&amp;MT.</p>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Địa bàn</Label>
                                                <Input value={[region.ward, region.district, region.province].filter(Boolean).join(", ")} disabled className={lockedInputClass} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Quy mô phụ trách</Label>
                                                <Input value={region.areaSize != null ? `${region.areaSize} ha` : "—"} disabled className={lockedInputClass} />
                                            </div>
                                        </div>
                                        {region.durianVarieties && region.durianVarieties.length > 0 && (
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Giống chủ lực</Label>
                                                <Input value={region.durianVarieties.join(", ")} disabled className={lockedInputClass} />
                                            </div>
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
                        <div key={store.id} className="grid gap-4 sm:grid-cols-2">
                            <Info label="Tên cơ sở" value={store.name} />
                            <Info label="Người đại diện" value={store.representativeName} />
                            <Info label="Số điện thoại" value={store.phone} mono />
                            <Info label="Mã số thuế / ĐKKD" value={store.taxOrBusinessCode} mono />
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
                    <div className="space-y-4">
                        <Info label="Vai trò hệ thống" value={roleName} />
                        <Info label="Trạng thái tài khoản" value={profile.isApproved ? "Đã phê duyệt" : "Chờ phê duyệt"} />
                        <Info label="Ngày đăng ký" value={formatDateTime(profile.createdAt)} mono />
                        <Info label="Lần đăng nhập gần nhất" value={formatDateTime(profile.lastLoginAt)} mono />
                        {profile.approvedAt && <Info label="Thời điểm phê duyệt" value={formatDateTime(profile.approvedAt)} mono />}
                    </div>
                </ProfileCard>

                <ProfileCard title="Bảo mật & Đổi mật khẩu" icon={LockKeyhole}>
                    <div className="space-y-4">
                        <Info label="Mật khẩu hiện tại" value="••••••••••••" />
                        <Info label="Cập nhật mật khẩu lần cuối" value={formatDateTime(profile.passwordUpdatedAt)} />

                        {!changingPassword ? (
                            <div className="pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="h-11 rounded-xl border-slate-200 font-bold text-slate-800 hover:bg-slate-50"
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
                    </div>
                </ProfileCard>
            </div>

            {/* Sticky bottom bar when editing */}
            {isEditing && (
                <div className="fixed inset-x-0 bottom-4 z-40 mx-auto max-w-lg px-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-slate-900/95 p-3 text-white shadow-2xl backdrop-blur-md">
                        <span className="text-xs font-semibold text-slate-200 pl-2">
                            Bạn đang chỉnh sửa thông tin tài khoản
                        </span>
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={cancelGeneralEditing}
                                className="h-9 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white"
                            >
                                Hủy
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => generalFormRef.current?.requestSubmit()}
                                disabled={saving}
                                className="h-9 rounded-xl bg-emerald-600 px-4 font-bold text-white shadow-soft hover:bg-emerald-500 flex items-center gap-1.5"
                            >
                                <Save className="h-3.5 w-3.5" />
                                {saving ? "Đang lưu..." : "Lưu thay đổi"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
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

function Info({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
    return (
        <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</Label>
            <Input
                value={value || "—"}
                disabled
                className={`h-11 rounded-xl bg-slate-50/90 border-slate-200 text-slate-900 font-semibold text-sm sm:text-base cursor-default select-text ${mono ? "font-mono" : ""}`}
            />
        </div>
    );
}
