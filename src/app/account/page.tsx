import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import {
    BadgeCheck,
    Building2,
    CalendarDays,
    CircleUserRound,
    Leaf,
    MapPin,
    Sprout,
} from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminProfile } from "@/components/account/admin-profile";

const roleLabels: Record<string, string> = {
    ADMIN: "Quản trị viên",
    FARMER: "Nông dân",
    AREA_MANAGER: "Trưởng ban quản lý vùng trồng",
    STORE_OWNER: "Chủ cửa hàng vật tư",
    COLLECTOR: "Vựa / Đơn vị thu mua",
    PROCESSING_FACILITY: "Cơ sở chế biến",
};

type ManagedRegion = {
    code?: string;
    name?: string;
    province?: string;
    district?: string;
    ward?: string;
    areaSize?: number;
    farmerCount?: number;
    durianVarieties?: string[];
};

export default async function AccountPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/login");

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
            farms: { orderBy: { createdAt: "asc" } },
            areaManagerApplication: true,
            stores: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
        },
    });
    if (!user) redirect("/login");

    if (user.role === "ADMIN") {
        return <AdminProfile profile={{
            fullName: user.fullName || "",
            phone: user.phone,
            email: user.email || "",
            avatar: user.avatar,
            birthDate: user.birthDate?.toISOString().slice(0, 10) || "",
            gender: user.gender || "",
            role: user.role,
            accountStatus: user.accountStatus,
            isApproved: user.isApproved,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
            lastLoginAt: user.lastLoginAt?.toISOString() || null,
            passwordUpdatedAt: user.passwordUpdatedAt?.toISOString() || null,
        }} />;
    }

    const managerProfile = user.areaManagerApplication;
    const storeProfile = user.stores[0] ?? null;
    const region = (managerProfile?.managedRegions ?? {}) as ManagedRegion;
    const address = [user.address, user.ward, user.district, user.province]
        .filter(Boolean)
        .join(", ");

    return (
        <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
            <section className="relative w-full overflow-hidden rounded-[32px] bg-white shadow-[0_18px_55px_-28px_rgba(5,150,105,0.45)]">
                <div className="relative h-[198px] w-full bg-gradient-to-r from-emerald-700 via-emerald-500 to-lime-400 sm:h-[184px]">
                    <svg aria-hidden="true" viewBox="0 0 1200 320" preserveAspectRatio="none" className="absolute inset-0 h-full w-full opacity-20">
                        <path d="M0 205C160 145 275 218 420 180c163-43 250-7 385-31 150-27 260-99 395-65v236H0Z" fill="#064e3b" />
                        <path d="M0 242c145-43 282 13 425-18 172-38 315 20 462-17 119-30 216-27 313-3v116H0Z" fill="#ecfccb" />
                        <path d="M220 246c100-47 192-52 286-31M275 263c92-42 176-46 260-27M746 228c114-49 224-60 338-41M795 251c94-40 184-49 276-34" fill="none" stroke="#fff" strokeWidth="3" opacity=".65" />
                        <g fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M76 202c14-62 42-103 85-132-1 58-24 108-77 139m13-30c16-30 35-56 57-78" />
                            <path d="M1080 194c10-55 36-92 76-119 0 53-21 96-70 126m13-28c15-27 31-48 50-68" />
                            <path d="M1102 171c30-47 62-66 98-76-11 43-39 73-91 84" />
                            <path d="M82 178c-25-42-48-61-77-70 7 38 29 65 70 78" />
                        </g>
                        <g fill="#fff" opacity=".35">
                            <path d="M780 185h48v34h-48zM774 185l30-22 30 22zM841 190h35v29h-35zM837 190l22-17 22 17z" />
                            <circle cx="754" cy="211" r="13" /><circle cx="897" cy="208" r="16" /><rect x="751" y="211" width="5" height="18" /><rect x="894" y="208" width="6" height="21" />
                        </g>
                        <g fill="#fff" opacity=".35">
                            <circle cx="80" cy="55" r="4" /><circle cx="105" cy="55" r="4" /><circle cx="130" cy="55" r="4" />
                            <circle cx="80" cy="80" r="4" /><circle cx="105" cy="80" r="4" /><circle cx="130" cy="80" r="4" />
                        </g>
                    </svg>

                    <div className="absolute left-6 top-5 z-10 text-white sm:left-[205px] sm:top-[38px]">
                        <h1 className="max-w-[calc(100vw-4rem)] break-words text-3xl font-black tracking-tight drop-shadow-sm sm:text-5xl">
                            {user.fullName || user.phone}
                        </h1>
                        <p className="mt-3 flex items-center gap-2 text-lg font-medium text-emerald-50 sm:text-xl">
                            <Leaf className="h-5 w-5" />
                            {roleLabels[user.role] ?? user.role}
                        </p>
                    </div>

                    <svg aria-hidden="true" viewBox="0 0 1440 120" preserveAspectRatio="none" className="absolute -bottom-px left-0 h-[52px] w-full sm:h-[58px]">
                        <path d="M0 48C235 110 420 109 650 82c263-31 520-93 790-42v80H0Z" fill="white" />
                    </svg>
                </div>

                <div className="relative min-h-[90px] bg-white px-6 pb-4 pt-2 sm:min-h-[94px] sm:px-10">
                    <span className="absolute -top-[66px] left-6 z-20 flex h-[140px] w-[140px] items-center justify-center rounded-full border-[7px] border-white bg-gradient-to-br from-emerald-50 to-white text-emerald-700 shadow-[0_16px_35px_-14px_rgba(15,23,42,0.45)] sm:left-10">
                        <CircleUserRound className="h-[82px] w-[82px]" strokeWidth={1.8} />
                    </span>
                    <div className="flex min-h-[70px] items-end justify-end">
                        <Badge className={`rounded-full border px-4 py-2 text-sm shadow-sm ${user.isApproved ? "border-emerald-200 bg-emerald-100 text-emerald-800" : "border-amber-200 bg-amber-100 text-amber-800"}`}>
                            <BadgeCheck className="mr-1.5 h-4 w-4" />
                            {user.isApproved ? "Đã phê duyệt" : "Chờ phê duyệt"}
                        </Badge>
                    </div>
                </div>
            </section>

            <div className="grid gap-5 lg:grid-cols-2">
                <Section title="Thông tin tài khoản" icon={CircleUserRound}>
                    <Info label="Họ và tên" value={user.fullName} />
                    <Info label="Số điện thoại" value={user.phone} />
                    <Info label="Email" value={user.email} />
                    <Info label="Vai trò" value={roleLabels[user.role] ?? user.role} />
                    <Info label="Trạng thái" value={user.accountStatus === "APPROVED" ? "Đã phê duyệt" : user.accountStatus === "PENDING" ? "Chờ phê duyệt" : "Bị từ chối"} />
                </Section>
                <Section title="Địa chỉ và thời gian" icon={MapPin}>
                    <Info label="Địa chỉ" value={address || null} />
                    <Info label="Ngày đăng ký" value={user.createdAt.toLocaleDateString("vi-VN")} />
                    <Info label="Ngày phê duyệt" value={user.approvedAt?.toLocaleDateString("vi-VN")} />
                    <Info label="Cập nhật gần nhất" value={user.updatedAt.toLocaleDateString("vi-VN")} />
                </Section>
            </div>

            {user.farms.length > 0 && (
                <Section title="Vườn trồng" icon={Sprout}>
                    <div className="grid gap-4 md:grid-cols-2">
                        {user.farms.map((farm) => (
                            <article key={farm.id} className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div><p className="font-semibold text-slate-900">{farm.farmName}</p><p className="text-xs font-medium text-emerald-700">{farm.farmCode}</p></div>
                                    <Badge className={farm.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}>{farm.isActive ? "Đang hoạt động" : "Ngừng hoạt động"}</Badge>
                                </div>
                                <div className="mt-3 space-y-1 text-sm text-slate-700">
                                    <p>Diện tích: {farm.areaSize} ha · {farm.totalTrees} cây</p>
                                    <p>Giống: {farm.durianVariety}</p>
                                    <p>Địa chỉ: {[farm.address, farm.ward, farm.district, farm.province].filter(Boolean).join(", ")}</p>
                                    <p>Vùng trồng: {farm.growingRegion || "Chưa liên kết"}</p>
                                </div>
                            </article>
                        ))}
                    </div>
                </Section>
            )}

            {managerProfile && (
                <div className="grid gap-5 lg:grid-cols-2">
                    <Section title="Thông tin tổ chức" icon={Building2}>
                        <Info label="Tổ chức/HTX" value={managerProfile.organizationName} />
                        <Info label="Chức vụ" value={managerProfile.position} />
                        <Info label="Mã số thuế" value={managerProfile.taxCode} />
                        <Info label="CCCD/CMND" value={managerProfile.identityNumber} />
                        <Info label="Ngày cấp" value={managerProfile.identityIssuedDate.toLocaleDateString("vi-VN")} />
                        <Info label="Nơi cấp" value={managerProfile.identityIssuedPlace} />
                    </Section>
                    <Section title="Vùng trồng phụ trách" icon={Sprout}>
                        <Info label="Mã vùng" value={region.code} />
                        <Info label="Tên vùng" value={region.name} />
                        <Info label="Địa bàn" value={[region.ward, region.district, region.province].filter(Boolean).join(", ")} />
                        <Info label="Quy mô" value={region.areaSize != null ? `${region.areaSize} ha` : null} />
                        <Info label="Số hộ thành viên" value={region.farmerCount != null ? `${region.farmerCount} hộ` : null} />
                        <Info label="Giống chủ lực" value={region.durianVarieties?.join(", ")} />
                    </Section>
                </div>
            )}

            {storeProfile && (
                <div className="grid gap-5 lg:grid-cols-2">
                    <Section title="Thông tin cửa hàng" icon={Building2}>
                        <Info label="Tên cửa hàng" value={storeProfile.name} />
                        <Info label="Người đại diện" value={storeProfile.representativeName} />
                        <Info label="Điện thoại" value={storeProfile.phone} />
                        <Info label="Mã số thuế/ĐKKD" value={storeProfile.taxOrBusinessCode} />
                        <Info label="Trạng thái" value={storeProfile.status === "APPROVED" ? "Đã phê duyệt" : storeProfile.status} />
                    </Section>
                    <Section title="Địa chỉ và thời gian cửa hàng" icon={MapPin}>
                        <Info label="Địa chỉ" value={storeProfile.address} />
                        <Info label="Tọa độ" value={storeProfile.latitude != null && storeProfile.longitude != null ? `${storeProfile.latitude}, ${storeProfile.longitude}` : null} />
                        <Info label="Giờ mở cửa" value={storeProfile.openingHours} />
                        <Info label="Ngày phê duyệt" value={storeProfile.approvedAt?.toLocaleDateString("vi-VN")} />
                    </Section>
                </div>
            )}

        </main>
    );
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof CalendarDays; children: React.ReactNode }) {
    return <Card className="rounded-[28px] border border-slate-100 bg-white shadow-[0_16px_45px_-30px_rgba(15,23,42,0.35)]"><CardHeader className="px-6 pb-4 pt-6 sm:px-8 sm:pt-8"><CardTitle className="flex items-center gap-3 text-lg sm:text-xl"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50"><Icon className="h-5 w-5 text-emerald-600" /></span>{title}</CardTitle></CardHeader><CardContent className="space-y-3 px-6 pb-7 sm:px-8 sm:pb-8">{children}</CardContent></Card>;
}

function Info({ label, value }: { label: string; value?: string | null }) {
    return <div className="grid gap-1 border-b border-slate-100 pb-2 text-sm last:border-0 sm:grid-cols-[150px_1fr]"><span className="text-slate-500">{label}</span><strong className="font-medium text-slate-900">{value || "—"}</strong></div>;
}
