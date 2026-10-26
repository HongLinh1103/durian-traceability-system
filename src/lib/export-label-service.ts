import { prisma } from './prisma';
import { publicProcessingTrace } from './processing-qr';
import type { GmpState } from './processing-gmp';
import { ExportLabelData, ExportLabelConfig, normalizeLabelCode, productionTranslation } from './export-label';
import { productionOrigins } from './production-lots';

export async function exportLabelData(token: string, viewerId?: string): Promise<ExportLabelData | null> {
  const publication = await prisma.processingQrPublication.findUnique({ where: { token } });
  if (!publication) return null;
  const trace = await publicProcessingTrace(token);
  if (!trace) return null;
  const [facility, workspace, regions] = await Promise.all([
    prisma.partnerFacility.findUnique({ where: { ownerId: publication.ownerId }, select: { code: true } }),
    prisma.processingGmpWorkspace.findUnique({ where: { ownerId: publication.ownerId }, select: { data: true } }),
    prisma.growingRegion.findMany({ select: { code: true, name: true, address: true, province: true } }),
  ]);
  const snapshot = trace.snapshot;
  const current = (workspace?.data as unknown as GmpState | undefined)?.records.sales.find(r => r.id === publication.saleId || r.lotCode === snapshot.sale.lot);
  const sources = snapshot.productionSources?.length ? snapshot.productionSources : current ? productionOrigins(current.values).filter(origin=>origin.active !== false) : [];
  const codes = [...new Set((sources.length ? sources.map(s => s.puc) : [snapshot.region?.code || '']).filter(Boolean).map(normalizeLabelCode))];
  const orchards = codes.map(code => {
    const region = regions.find(r => normalizeLabelCode(r.code) === code);
    return { code, name: region?.name || (normalizeLabelCode(snapshot.region?.code || '') === code ? snapshot.region?.name || '' : ''), address: region?.address || '', province: region?.province || '' };
  });
  const country = String(current?.values.country || snapshot.sale.country || snapshot.exportShipments?.find(s => s.country)?.country || '').trim();
  const countryIsChina = /^(trung quốc|china|chn|中国|中华人民共和国)$/i.test(country);
  const isVietnam = codes.length > 0 && codes.every(code => code.startsWith('VN-'));
  const saved = (publication.labelConfig || {}) as Partial<ExportLabelConfig>;
  const selected = orchards.find(r => r.code === saved.orchardCode) || (orchards.length === 1 ? orchards[0] : undefined);
  const config: Partial<ExportLabelConfig> = {
    widthMm: 148, heightMm: 160,
    ...(snapshot.sale.variety ? { productEn: 'Fresh Durian', productZh: '鲜榴莲' } : {}),
    ...(isVietnam ? { exportCountryEn: 'Vietnam', exportCountryZh: '越南' } : {}),
    ...(countryIsChina ? { importCountryEn: "the People's Republic of China", importCountryZh: '中华人民共和国' } : {}),
    ...(selected ? { orchardCode: selected.code, ...productionTranslation(selected.province) } : {}), ...saved,
  };
  const packingHouseCode = normalizeLabelCode(facility?.code || '');
  const warnings = [!packingHouseCode && 'Thiếu mã cơ sở đóng gói.', !codes.length && 'Chưa xác định được mã vùng trồng thực tế.', codes.length > 1 && !saved.orchardCode && 'Lô có nhiều vùng trồng: chọn đúng vùng của thùng được in, không tự chọn một vùng.', !country && 'Chưa có nước nhập khẩu trong hồ sơ lô hàng.'].filter(Boolean) as string[];
  return { token, lotCode: snapshot.sale.lot, packingHouseCode, orchards, config, warnings, canEdit: viewerId === publication.ownerId };
}
