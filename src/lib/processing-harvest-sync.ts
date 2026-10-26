import { normalizeLegacySalesContacts } from './sales-contact';
import { normalizeFreshLotCodes } from './fresh-lot-code';
import { clearLegacyReceivingNotes } from './processing-receiving-edit';
import { sameStoredJson } from './processing-gmp-concurrency';
import { upgradeReceivingGrades } from './receiving-reclassification';
import { Prisma } from '@prisma/client';
import { upgradeLegacyDryingDates } from './processing-drying-upgrade';
import { prisma } from './prisma';
import { GmpState } from './processing-gmp';
import { emptyProcessingState, RECEIVING_HARVEST_STATUSES, syncHarvestReceiving } from './processing-receiving';

export async function syncProcessingHarvests(ownerId: string) {
    for (let attempt = 0; attempt < 4; attempt++) {
        const result = await prisma.$transaction(async tx => {
            const facility = await tx.partnerFacility.findFirst({ where: { ownerId, type: 'PROCESSING_FACILITY', status: 'APPROVED', deletedAt: null } });
            if (!facility) throw new Error('Không tìm thấy cơ sở đóng gói hợp lệ.');
            const row = await tx.processingGmpWorkspace.upsert({ where: { ownerId }, update: {}, create: { ownerId, data: emptyProcessingState() as unknown as Prisma.InputJsonValue } });
            const harvests = await tx.harvestRecord.findMany({
                where: { buyerFacilityId: facility.id, buyerType: 'PROCESSING_FACILITY', weightUnit: 'kg', status: { in: RECEIVING_HARVEST_STATUSES as Prisma.EnumHarvestStatusFilter['in'] } },
                include: { farmer: { select: { fullName: true, phone: true } }, farm: { include: { region: true } }, cropSeason: true },
            });
            let state = upgradeLegacyDryingDates(syncHarvestReceiving(row.data as unknown as GmpState, harvests.map(h => {
                const year = h.cropSeason?.year || h.expectedHarvestDate.getFullYear();
                return { id: h.id, code: h.code, status: h.status, facilityId: facility.id, ownerId,
                    date: h.expectedHarvestDate.toISOString().slice(0, 10), season: `${year}-${year + 1}`,
                    weight: Number(h.actualWeight ?? h.deliveredWeight ?? h.expectedWeight), seller: h.farmer.fullName || '', phone: h.farmer.phone || '',
                    puc: h.farm.region?.code || h.farm.growingRegion || '', origin: [h.farm.region?.name || h.farm.farmName, h.farm.region?.address || h.farm.address].filter(Boolean).join(' - '), variety: h.durianVariety };
            }), ownerId, facility.id));
            state = clearLegacyReceivingNotes(upgradeReceivingGrades(state, ownerId, facility.code === 'VN-DNPH-131'));
            state = normalizeFreshLotCodes(normalizeLegacySalesContacts(state));
            if (sameStoredJson(state, row.data)) return { ...row, data: state };
            const saved = await tx.processingGmpWorkspace.updateMany({ where: { ownerId, revision: row.revision }, data: { data: state as unknown as Prisma.InputJsonValue, revision: { increment: 1 } } });
            return saved.count ? { ...row, revision: row.revision + 1, data: state } : null;
        }, { maxWait: 10000, timeout: 30000 });
        if (result) return result;
    }
    throw new Error('Dữ liệu đang được cập nhật đồng thời. Vui lòng tải lại.');
}

export async function syncHarvestToProcessing(harvestId: string) {
    try {
        const harvest = await prisma.harvestRecord.findUnique({ where: { id: harvestId }, include: { buyerFacility: true } });
        if (harvest?.buyerType === 'PROCESSING_FACILITY' && harvest.buyerFacility?.ownerId) await syncProcessingHarvests(harvest.buyerFacility.ownerId);
    } catch (error) {
        // The harvest write has already committed. Do not report a failed save
        // (which can cause a duplicate retry). The receiving GET retries syncing.
        console.error('Harvest receiving sync deferred until next receiving read', { harvestId, error });
    }
}
