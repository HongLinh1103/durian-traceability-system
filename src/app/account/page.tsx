import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserProfile, ManagedRegion } from "@/components/account/user-profile";

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

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
            farms: { orderBy: { createdAt: "asc" } },
            areaManagerApplication: true,
            stores: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
            partnerFacility: true,
        },
    });
    if (!user) redirect("/login");

    const managerApplication = user.areaManagerApplication;
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

    const partnerFacility = user.partnerFacility
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
              purchasingAreas: user.partnerFacility.purchasingAreas,
              processingTypes: user.partnerFacility.processingTypes,
              expectedCapacity: user.partnerFacility.expectedCapacity ? Number(user.partnerFacility.expectedCapacity) : null,
              capacityUnit: user.partnerFacility.capacityUnit,
          }
        : null;

    const farms = user.farms.map((f) => ({
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

    const stores = user.stores.map((s) => ({
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
                id: user.id,
                fullName: user.fullName || "",
                phone: user.phone,
                email: user.email || "",
                avatar: user.avatar,
                birthDate: user.birthDate?.toISOString().slice(0, 10) || "",
                gender: user.gender || "",
                role: user.role,
                isApproved: user.isApproved,
                accountStatus: user.accountStatus,
                createdAt: user.createdAt.toISOString(),
                approvedAt: user.approvedAt?.toISOString() || null,
                updatedAt: user.updatedAt.toISOString(),
                lastLoginAt: user.lastLoginAt?.toISOString() || null,
                passwordUpdatedAt: user.passwordUpdatedAt?.toISOString() || null,
                address: user.address,
                ward: user.ward,
                district: user.district,
                province: user.province,
            }}
            farms={farms}
            stores={stores}
            partnerFacility={partnerFacility}
            managerProfile={managerProfile}
        />
    );
}
