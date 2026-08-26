import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserProfile, ManagedRegion, PartnerFacilityInfo } from "@/components/account/user-profile";
import { FALLBACK_COLLECTORS, FALLBACK_PROCESSING_FACILITIES } from "@/lib/facilities-data";

function normalizeManagedRegions(value: unknown): ManagedRegion[] {
    if (Array.isArray(value)) {
        return value.filter((item): item is ManagedRegion => Boolean(item && typeof item === "object"));
    }
    if (value && typeof value === "object") {
        return [value as ManagedRegion];
    }
    return [];
}

export default async function AccountPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/login");

    let user = null;
    try {
        user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: {
                farms: { orderBy: { createdAt: "asc" } },
                areaManagerApplication: true,
                stores: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
                partnerFacility: true,
            },
        });
    } catch {
        // DB fallback
    }

    const currentPhone = user?.phone || session.user.phone || "";
    const currentFullName = user?.fullName || session.user.fullName || "";
    const currentEmail = user?.email || session.user.email || "";
    const currentRole = user?.role || session.user.role || "FARMER";

    const managerApplication = user?.areaManagerApplication;
    const managerProfile = managerApplication
        ? {
              organizationName: managerApplication.organizationName,
              position: managerApplication.position,
              taxCode: managerApplication.taxCode,
              identityNumber: managerApplication.identityNumber,
              identityIssuedDate: managerApplication.identityIssuedDate?.toISOString() || null,
              identityIssuedPlace: managerApplication.identityIssuedPlace,
              managedRegions: normalizeManagedRegions(managerApplication.managedRegions),
          }
        : null;

    let partnerFacility: PartnerFacilityInfo | null = user?.partnerFacility
        ? {
              id: user.partnerFacility.id,
              name: user.partnerFacility.name,
              type: user.partnerFacility.type,
              organizationType: user.partnerFacility.organizationType,
              taxCode: user.partnerFacility.taxCode,
              businessCode: user.partnerFacility.businessCode,
              phone: user.partnerFacility.phone,
              email: user.partnerFacility.email,
              address: user.partnerFacility.address,
              province: user.partnerFacility.province,
              ward: user.partnerFacility.ward,
              purchasingAreas: user.partnerFacility.purchasingAreas || [],
              processingTypes: user.partnerFacility.processingTypes || [],
              expectedCapacity: user.partnerFacility.expectedCapacity ? Number(user.partnerFacility.expectedCapacity) : null,
              capacityUnit: user.partnerFacility.capacityUnit || "tấn/ngày",
              imageUrls: user.partnerFacility.imageUrls || [],
              avatar: user.partnerFacility.imageUrls?.[0] || null,
              description: user.partnerFacility.description || null,
              representativeName: user.partnerFacility.representativeName || currentFullName,
              representativePhone: user.partnerFacility.representativePhone || currentPhone,
              certifications: [],
          }
        : null;

    // Enhance / Fallback for COLLECTOR & PROCESSING_FACILITY
    if (currentRole === "COLLECTOR") {
        const fallback = FALLBACK_COLLECTORS.find((c) => c.phone === currentPhone) || FALLBACK_COLLECTORS[0];
        partnerFacility = {
            id: partnerFacility?.id || fallback.id,
            name: partnerFacility?.name || fallback.name,
            type: "COLLECTOR",
            organizationType: partnerFacility?.organizationType || fallback.organizationType,
            taxCode: partnerFacility?.taxCode || fallback.taxCode,
            businessCode: partnerFacility?.businessCode || fallback.businessCode,
            phone: partnerFacility?.phone || fallback.phone,
            email: partnerFacility?.email || fallback.email,
            address: partnerFacility?.address || fallback.address,
            province: partnerFacility?.province || fallback.province,
            ward: partnerFacility?.ward || fallback.ward,
            purchasingAreas: partnerFacility?.purchasingAreas?.length ? partnerFacility.purchasingAreas : fallback.purchasingAreas,
            processingTypes: [],
            expectedCapacity: partnerFacility?.expectedCapacity != null ? partnerFacility.expectedCapacity : fallback.expectedCapacity,
            capacityUnit: partnerFacility?.capacityUnit || fallback.capacityUnit || "tấn/ngày",
            imageUrls: partnerFacility?.imageUrls?.length ? partnerFacility.imageUrls : fallback.imageUrls,
            avatar: partnerFacility?.avatar || fallback.avatar,
            description: partnerFacility?.description || fallback.description,
            representativeName: partnerFacility?.representativeName || currentFullName || fallback.representativeName,
            representativePhone: partnerFacility?.representativePhone || currentPhone || fallback.representativePhone,
            certifications: fallback.certifications,
        };
    } else if (currentRole === "PROCESSING_FACILITY") {
        const fallback = FALLBACK_PROCESSING_FACILITIES.find((p) => p.phone === currentPhone) || FALLBACK_PROCESSING_FACILITIES[0];
        partnerFacility = {
            id: partnerFacility?.id || fallback.id,
            name: partnerFacility?.name || fallback.name,
            type: "PROCESSING_FACILITY",
            organizationType: partnerFacility?.organizationType || fallback.organizationType,
            taxCode: partnerFacility?.taxCode || fallback.taxCode,
            businessCode: partnerFacility?.businessCode || fallback.businessCode,
            phone: partnerFacility?.phone || fallback.phone,
            email: partnerFacility?.email || fallback.email,
            address: partnerFacility?.address || fallback.address,
            province: partnerFacility?.province || fallback.province,
            ward: partnerFacility?.ward || fallback.ward,
            purchasingAreas: [],
            processingTypes: partnerFacility?.processingTypes?.length ? partnerFacility.processingTypes : fallback.processingTypes,
            expectedCapacity: partnerFacility?.expectedCapacity != null ? partnerFacility.expectedCapacity : fallback.expectedCapacity,
            capacityUnit: partnerFacility?.capacityUnit || fallback.capacityUnit || "tấn/ngày",
            imageUrls: partnerFacility?.imageUrls?.length ? partnerFacility.imageUrls : fallback.imageUrls,
            avatar: partnerFacility?.avatar || fallback.avatar,
            description: partnerFacility?.description || fallback.description,
            representativeName: partnerFacility?.representativeName || currentFullName || fallback.representativeName,
            representativePhone: partnerFacility?.representativePhone || currentPhone || fallback.representativePhone,
            certifications: fallback.certifications,
        };
    }

    const farms = (user?.farms || []).map((f) => ({
        id: f.id,
        farmName: f.farmName,
        farmCode: f.farmCode,
        areaSize: f.areaSize,
        totalTrees: f.totalTrees,
        durianVariety: f.durianVariety,
        address: f.address,
        province: f.province,
        district: f.district,
        ward: f.ward,
        growingRegion: f.growingRegion,
        isActive: f.isActive,
    }));

    const stores = (user?.stores || []).map((s) => ({
        id: s.id,
        name: s.name,
        representativeName: s.representativeName,
        phone: s.phone,
        taxOrBusinessCode: s.taxOrBusinessCode,
        address: s.address,
        openingHours: s.openingHours,
        latitude: s.latitude,
        longitude: s.longitude,
        status: s.status,
        approvedAt: s.approvedAt?.toISOString() || null,
    }));

    return (
        <UserProfile
            profile={{
                id: user?.id || session.user.id,
                fullName: currentFullName,
                phone: currentPhone,
                email: currentEmail,
                avatar: user?.avatar || null,
                birthDate: user?.birthDate?.toISOString().slice(0, 10) || "",
                gender: user?.gender || "",
                role: currentRole,
                isApproved: user?.isApproved ?? true,
                accountStatus: user?.accountStatus || "APPROVED",
                createdAt: user?.createdAt?.toISOString() || new Date().toISOString(),
                approvedAt: user?.approvedAt?.toISOString() || null,
                updatedAt: user?.updatedAt?.toISOString() || new Date().toISOString(),
                lastLoginAt: user?.lastLoginAt?.toISOString() || null,
                passwordUpdatedAt: user?.passwordUpdatedAt?.toISOString() || null,
                address: user?.address || null,
                ward: user?.ward || null,
                district: user?.district || null,
                province: user?.province || null,
            }}
            farms={farms}
            stores={stores}
            partnerFacility={partnerFacility}
            managerProfile={managerProfile}
        />
    );
}
