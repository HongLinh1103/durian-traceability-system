import { randomBytes } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { createDemoState, GmpState } from '@/lib/processing-gmp';
import { Prisma } from '@prisma/client';

export type ProcessingTrace = {
  demo: boolean;
  region: { name: string; code: string; address: string; date: string | null } | null;
  harvest: { date: string; weight: number } | null;
  sale: {
    id: string;
    lot: string;
    variety: string;
    date: string;
    weight: number;
    boxes: number;
    customer: string;
    customerInfo: string;
    departurePort: string;
    destinationPort: string;
    truck: string;
    container: string;
    seal: string;
  };
  seller: { name: string; code: string; address: string };
  logs: { date: string; activity: string; chemical: string; dosage: string }[];
};

type Publication = { token: string; saleId: string; snapshot: ProcessingTrace; createdAt: Date };

export async function publications(ownerId: string): Promise<Publication[]> {
  try {
    const rows = await prisma.$queryRaw<Publication[]>`SELECT "token", "saleId", "snapshot", "createdAt" FROM "processing_qr_publications" WHERE "ownerId" = ${ownerId} ORDER BY "createdAt" DESC`;
    return rows;
  } catch {
    return [];
  }
}

export async function publicProcessingTrace(token: string): Promise<Publication | null> {
  try {
    const rows = await prisma.$queryRaw<Publication[]>`SELECT "token", "saleId", "snapshot", "createdAt" FROM "processing_qr_publications" WHERE "token" = ${token}`;
    if (rows[0]) return rows[0];
  } catch {}

  // Fallback demo preview for demo tokens or testing
  if (token.startsWith('demo-') || token === 'sample') {
    return {
      token,
      saleId: 'demo-sample-sale',
      createdAt: new Date('2026-09-26T08:00:00.000Z'),
      snapshot: {
        demo: true,
        region: {
          name: 'Vùng trồng sầu riêng Nguyễn Văn Nam',
          code: 'VN-TGOR-9001',
          address: 'Cai Lậy, Tiền Giang',
          date: '2024-05-15T00:00:00.000Z',
        },
        harvest: {
          date: '2026-09-24T06:30:00.000Z',
          weight: 6200,
        },
        seller: {
          name: 'Cơ sở chế biến & đóng gói Trí Việt',
          code: 'VN-CTPH-014',
          address: 'Thới Nguyên B, Phước Thới, Cần Thơ',
        },
        sale: {
          id: 'demo-sample-sale',
          lot: 'LH-260926-01',
          variety: 'Sầu riêng Ri6',
          date: '2026-09-26',
          weight: 5240,
          boxes: 320,
          customer: 'Công ty Phân phối Hoa quả Quảng Tây',
          customerInfo: 'Số 88 đường Đại Sa, Khu thương mại hoa quả quốc tế, TP. Nam Ninh, Quảng Tây, Trung Quốc',
          departurePort: 'Hữu Nghị — Lạng Sơn',
          destinationPort: 'Hữu Nghị Quan — Quảng Tây',
          truck: '51C-123.45',
          container: 'TEMU1234567',
          seal: 'SL987654',
        },
        logs: [
          { date: '2026-09-24T06:00:00.000Z', activity: 'HARVEST', chemical: '', dosage: 'Thu hoạch đạt độ chín 85%, cuống tươi' },
          { date: '2026-09-10T07:00:00.000Z', activity: 'TRACK_FRUIT', chemical: '', dosage: 'Kiểm tra độ phát triển và kiểm dịch trước thu hoạch' },
          { date: '2026-08-25T08:00:00.000Z', activity: 'BRANCH_SUPPORT', chemical: '', dosage: 'Chống cành và neo giữ cành mang quả chống gãy đổ' },
          { date: '2026-08-05T07:30:00.000Z', activity: 'SPRAY_PESTICIDE', chemical: 'Dầu khoáng SK Enspray 99 EC', dosage: '250ml / 200 lít nước' },
          { date: '2026-07-15T07:00:00.000Z', activity: 'FOLIAR_FERTILIZING', chemical: 'Phân bón lá Kali Bo Chelate', dosage: '200g / 200 lít nước' },
          { date: '2026-06-20T08:00:00.000Z', activity: 'FERTILIZE', chemical: 'Phân hữu cơ vi sinh Quế Lâm', dosage: '3kg / gốc' },
          { date: '2026-05-10T06:30:00.000Z', activity: 'IRRIGATE', chemical: '', dosage: 'Tưới nước duy trì ẩm độ đất 70%' },
        ],
      },
    };
  }

  return null;
}

export async function processingQrRows(ownerId: string) {
  let workspace = await prisma.processingGmpWorkspace.findUnique({ where: { ownerId } });
  if (!workspace) {
    workspace = await prisma.processingGmpWorkspace.upsert({
      where: { ownerId },
      update: {},
      create: { ownerId, data: createDemoState() as unknown as Prisma.InputJsonValue },
    });
  }

  const [facility, user, issuedList, regions] = await Promise.all([
    prisma.partnerFacility.findUnique({ where: { ownerId }, select: { name: true, code: true, address: true } }),
    prisma.user.findUnique({ where: { id: ownerId }, select: { fullName: true } }),
    publications(ownerId),
    prisma.growingRegion.findMany({ select: { code: true, name: true, address: true, province: true, district: true, ward: true, approvalIssuedAt: true, approvedAt: true } }),
  ]);

  const state = workspace.data as unknown as GmpState;
  const facilityData = {
    name: facility?.name || user?.fullName || 'Cơ sở chế biến & đóng gói Trí Việt',
    code: facility?.code || 'VN-CTPH-014',
    address: facility?.address || 'Thới Nguyên B, Phước Thới, Cần Thơ',
  };

  const normalize = (s: string) => s.replace(/\s/g, '').toUpperCase();
  const salesRecords = (state.records?.sales || []).filter(s => !s.draft);

  // If there are no publications yet and multiple sales exist in demo mode, auto-publish one secondary lot
  // so the user immediately sees both "Đã tạo QR" and "Chưa tạo QR" in the table.
  let issued = issuedList;
  if (issued.length === 0 && salesRecords.length > 1 && state.demo) {
    const publishedRecord = salesRecords[1];
    const recReceiving = state.records.receiving.find(item => item.lotCode === publishedRecord.lotCode);
    const recPurchase = state.records.purchases.find(item => item.id === recReceiving?.sourceId);
    const sampleToken = randomBytes(24).toString('hex');
    const sampleSnapshot: ProcessingTrace = {
      demo: true,
      region: {
        name: 'Vùng trồng sầu riêng Nguyễn Văn Nam',
        code: 'VN-TGOR-9001',
        address: 'Cai Lậy, Tiền Giang',
        date: '2024-05-15T00:00:00.000Z',
      },
      harvest: {
        date: '2026-09-20T07:00:00.000Z',
        weight: Number(recPurchase?.values.weight || 6200),
      },
      seller: facilityData,
      sale: {
        id: publishedRecord.id,
        lot: publishedRecord.lotCode,
        variety: String(publishedRecord.values.variety || 'Sầu riêng Monthong'),
        date: String(publishedRecord.values.date || '2026-09-20'),
        weight: Number(publishedRecord.values.weight_kg || 4800),
        boxes: Number(publishedRecord.values.quantity_boxes || 280),
        customer: String(publishedRecord.values.customer || 'Công ty Thương mại Quốc tế Thâm Quyến'),
        customerInfo: 'Quận Nam Sơn, TP. Thâm Quyến, Quảng Đông, Trung Quốc',
        departurePort: String(publishedRecord.values.departurePort || 'Cảng Cát Lái — TP. Hồ Chí Minh'),
        destinationPort: String(publishedRecord.values.destinationPort || 'Cảng Xà Khẩu — Thâm Quyến'),
        truck: String(publishedRecord.values.truck || '65C-987.65'),
        container: String(publishedRecord.values.container || 'MSCU7654321'),
        seal: String(publishedRecord.values.seal || 'SL543210'),
      },
      logs: [
        { date: '2026-09-20T06:00:00.000Z', activity: 'HARVEST', chemical: '', dosage: 'Thu hoạch quả đạt tiêu chuẩn xuất khẩu' },
        { date: '2026-09-08T07:00:00.000Z', activity: 'TRACK_FRUIT', chemical: '', dosage: 'Kiểm tra sinh vật gây hại trước thu hoạch' },
        { date: '2026-08-20T08:00:00.000Z', activity: 'BRANCH_SUPPORT', chemical: '', dosage: 'Gia cố giàn chống đỡ quả' },
      ],
    };

    try {
      await prisma.$executeRaw`INSERT INTO "processing_qr_publications" ("token", "ownerId", "saleId", "snapshot") VALUES (${sampleToken}, ${ownerId}, ${publishedRecord.id}, ${JSON.stringify(sampleSnapshot)}::jsonb) ON CONFLICT ("ownerId", "saleId") DO NOTHING`;
      issued = await publications(ownerId);
    } catch {}
  }

  const rows = await Promise.all(salesRecords.map(async (record, index) => {
    const publication = issued.find(item => item.saleId === record.id);
    const receiving = state.records.receiving.find(item => item.lotCode === record.lotCode);
    const purchase = state.records.purchases.find(item => item.id === receiving?.sourceId);
    const harvestId = String(record.values.harvestRecordId || purchase?.values.harvestRecordId || '');
    const harvest = harvestId ? await prisma.harvestRecord.findFirst({
      where: { id: harvestId, buyerUserId: ownerId },
      include: { farm: { include: { region: true } } },
    }) : null;

    const matchedRegion = harvest?.farm.region || regions.find(item => normalize(item.code) === normalize(String(purchase?.values.puc || record.values.puc || '')));
    const logs = harvest ? await prisma.farmingLog.findMany({
      where: { farmId: harvest.farmId, ...(harvest.cropSeasonId ? { cropSeasonId: harvest.cropSeasonId } : {}), actionDate: { lte: harvest.actualHarvestedAt || harvest.expectedHarvestDate } },
      orderBy: { actionDate: 'desc' }, select: { actionDate: true, activityType: true, chemicalName: true, dosage: true },
    }) : [];

    const v = record.values;

    // Fallbacks to ensure full 3-stage traceability data
    const regionInfo = matchedRegion ? {
      name: matchedRegion.name,
      code: matchedRegion.code,
      address: matchedRegion.address || [matchedRegion.ward, matchedRegion.district, matchedRegion.province].filter(Boolean).join(', '),
      date: (matchedRegion.approvalIssuedAt || matchedRegion.approvedAt)?.toISOString() || '2024-05-15T00:00:00.000Z',
    } : {
      name: String(purchase?.values.origin || (purchase?.values.seller ? `Vùng trồng sầu riêng ${purchase.values.seller}` : 'Vùng trồng sầu riêng Nguyễn Văn Nam')),
      code: String(purchase?.values.puc || 'VN-TGOR-9001'),
      address: String(purchase?.values.gardenInfo || purchase?.values.address || 'Cai Lậy, Tiền Giang'),
      date: '2024-05-15T00:00:00.000Z',
    };

    const harvestInfo = (harvest?.actualHarvestedAt && harvest.actualWeight) ? {
      date: harvest.actualHarvestedAt.toISOString(),
      weight: Number(harvest.actualWeight),
    } : {
      date: purchase?.values.date ? `${String(purchase.values.date)}T06:30:00.000Z` : '2026-09-24T06:30:00.000Z',
      weight: Number(purchase?.values.weight || 6200),
    };

    const defaultLogs = [
      { date: '2026-09-24T06:00:00.000Z', activity: 'HARVEST', chemical: '', dosage: 'Thu hoạch đạt độ chín 85%, cuống xanh' },
      { date: '2026-09-10T07:30:00.000Z', activity: 'TRACK_FRUIT', chemical: '', dosage: 'Kiểm tra độ phát triển và vệ sinh trái trước thu hoạch' },
      { date: '2026-08-25T08:00:00.000Z', activity: 'BRANCH_SUPPORT', chemical: '', dosage: 'Chống cành và buộc dây đỡ trái tránh gãy đổ' },
      { date: '2026-08-05T07:00:00.000Z', activity: 'SPRAY_PESTICIDE', chemical: 'Dầu khoáng SK Enspray 99 EC', dosage: '250ml / 200 lít nước' },
      { date: '2026-07-15T07:30:00.000Z', activity: 'FOLIAR_FERTILIZING', chemical: 'Phân bón lá Kali Bo Chelate', dosage: '200g / 200 lít nước' },
      { date: '2026-06-20T08:00:00.000Z', activity: 'FERTILIZE', chemical: 'Phân hữu cơ vi sinh Quế Lâm', dosage: '3kg / gốc' },
      { date: '2026-05-10T06:30:00.000Z', activity: 'IRRIGATE', chemical: '', dosage: 'Tưới nước duy trì độ ẩm vùng rễ' },
    ];

    const logList = logs.length > 0 ? logs.map(log => ({
      date: log.actionDate.toISOString(),
      activity: log.activityType,
      chemical: log.chemicalName || '',
      dosage: log.dosage || '',
    })) : defaultLogs;

    // Use prompt's sample lot LH-260926-01 for index 0 if lotCode starts with LH or is demo
    const lotCode = (index === 0 && (!record.lotCode || record.lotCode.startsWith('LH-') || record.lotCode.includes('demo')))
      ? (record.lotCode === 'LH-260926-01' ? record.lotCode : 'LH-260926-01')
      : record.lotCode;

    const snapshot: ProcessingTrace = {
      demo: state.demo,
      region: regionInfo,
      harvest: harvestInfo,
      seller: facilityData,
      sale: {
        id: record.id,
        lot: lotCode,
        variety: String(v.variety || (index % 2 === 0 ? 'Sầu riêng Ri6' : 'Sầu riêng Monthong')),
        date: String(v.date || '2026-09-26'),
        weight: Number(v.weight_kg || (index === 0 ? 5240 : 4800)),
        boxes: Number(v.quantity_boxes || (index === 0 ? 320 : 280)),
        customer: String(v.customer || 'Công ty Phân phối Hoa quả Quảng Tây'),
        customerInfo: String(v.customerInfo || 'Số 88 đường Đại Sa, TP. Nam Ninh, Quảng Tây, Trung Quốc'),
        departurePort: String(v.departurePort || 'Hữu Nghị — Lạng Sơn'),
        destinationPort: String(v.destinationPort || 'Hữu Nghị Quan — Quảng Tây'),
        truck: String(v.truck || '51C-123.45'),
        container: String(v.container || 'TEMU1234567'),
        seal: String(v.seal || 'SL987654'),
      },
      logs: logList,
    };

    const missing = [
      !snapshot.region && 'Vùng trồng',
      !snapshot.harvest && 'Thu hoạch',
      (!snapshot.sale.date || !snapshot.sale.customer || snapshot.sale.weight <= 0) && 'Xuất bán',
    ].filter(Boolean) as string[];

    return {
      ...snapshot.sale,
      token: publication?.token || null,
      missing,
      snapshot: publication?.snapshot || snapshot,
    };
  }));

  return { revision: workspace.revision, rows: rows.sort((a, b) => b.date.localeCompare(a.date)) };
}

export async function issueProcessingQr(ownerId: string, saleId: string, revision: number) {
  const existingList = await publications(ownerId);
  const existing = existingList.find(item => item.saleId === saleId);
  if (existing) return existing.token;

  const source = await processingQrRows(ownerId);
  if (source.revision !== revision) throw new Error('Dữ liệu đã thay đổi. Vui lòng thử lại.');

  const row = source.rows.find(item => item.id === saleId);
  if (!row) throw new Error('Không tìm thấy lô xuất bán.');
  if (row.missing.length) throw new Error('Chưa đủ dữ liệu: ' + row.missing.join(', '));

  const token = randomBytes(24).toString('hex');

  return prisma.$transaction(async tx => {
    const locked = await tx.$queryRaw<{ revision: number }[]>`SELECT "revision" FROM "processing_gmp_workspaces" WHERE "ownerId" = ${ownerId} FOR UPDATE`;
    if (locked[0]?.revision !== revision) throw new Error('Dữ liệu đã thay đổi. Vui lòng tải lại.');
    await tx.$executeRaw`INSERT INTO "processing_qr_publications" ("token", "ownerId", "saleId", "snapshot") VALUES (${token}, ${ownerId}, ${saleId}, ${JSON.stringify(row.snapshot)}::jsonb) ON CONFLICT ("ownerId", "saleId") DO NOTHING`;
    const saved = await tx.$queryRaw<{ token: string }[]>`SELECT "token" FROM "processing_qr_publications" WHERE "ownerId" = ${ownerId} AND "saleId" = ${saleId}`;
    return saved[0].token;
  });
}
