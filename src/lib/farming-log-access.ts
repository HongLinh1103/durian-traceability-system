import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { getManagedRegionScope } from './region-manager-scope';

export async function farmingFarmScope(userId: string, role: string): Promise<Prisma.FarmWhereInput> {
  if (role === 'ADMIN') return {};
  if (role === 'AREA_MANAGER') {
    const scope = await getManagedRegionScope(userId, role);
    return { isActive: true, region: { code: { in: scope?.codes || [] } }, farmer: { accountStatus: 'APPROVED', isApproved: true, deletedAt: null } };
  }
  return { farmerId: userId };
}

export async function canAccessFarmingFarm(userId: string, role: string, farmId: string) {
  return !!await prisma.farm.findFirst({ where: { AND: [{ id: farmId }, await farmingFarmScope(userId, role)] }, select: { id: true } });
}

export const canDeleteFarmingLog = (userId: string, role: string, farmerId: string) => userId === farmerId || role === 'ADMIN';
