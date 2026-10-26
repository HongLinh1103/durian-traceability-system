import { z } from 'zod';

const english = z.string().trim().min(1, 'Bổ sung nội dung tiếng Anh.').max(180).regex(/^[\x20-\x7e]+$/, 'Nội dung tiếng Anh dùng ký tự Latin, không có tiếng Việt trên tem.');
const chinese = z.string().trim().min(1, 'Bổ sung nội dung tiếng Trung.').max(120).refine(s => /\p{Script=Han}/u.test(s) && !/[À-ỹ]/u.test(s), 'Nhập nội dung tiếng Trung giản thể.');
export const exportLabelSchema = z.object({
  orchardCode: z.string().trim().min(1, 'Chọn đúng vùng trồng của thùng hàng.'),
  productEn: english, productZh: chinese,
  productionEn: english, productionZh: chinese,
  exportCountryEn: english, exportCountryZh: chinese,
  importCountryEn: english, importCountryZh: chinese,
  widthMm: z.number().int().min(120).max(210).default(148),
  heightMm: z.number().int().min(140).max(297).default(160),
});
export type ExportLabelConfig = z.infer<typeof exportLabelSchema>;
export type LabelOrchard = { code: string; name: string; address: string; province: string };
export type ExportLabelData = {
  token: string; lotCode: string; packingHouseCode: string; canEdit: boolean;
  orchards: LabelOrchard[]; config: Partial<ExportLabelConfig>; warnings: string[];
};
export const normalizeLabelCode = (code: string) => code.replace(/\s/g, '').toUpperCase();
export function validateLabelSource(config: ExportLabelConfig, data: Pick<ExportLabelData, 'packingHouseCode' | 'orchards' | 'lotCode'>) {
  if (!data.packingHouseCode || !data.lotCode) throw Error('Thiếu mã cơ sở đóng gói hoặc mã lô thực tế.');
  if (!data.orchards.some(r => normalizeLabelCode(r.code) === normalizeLabelCode(config.orchardCode))) throw Error('Mã vùng trồng không thuộc nguồn nguyên liệu của lô này.');
}

// Translation catalog only: these values are selected from the actual source province.
const provinceTranslations: Record<string, [string, string]> = {
  'đồng nai': ['Dong Nai Province, Vietnam', '越南同奈省'],
  'lâm đồng': ['Lam Dong Province, Vietnam', '越南林同省'],
  'tiền giang': ['Tien Giang Province, Vietnam', '越南前江省'],
  'đắk lắk': ['Dak Lak Province, Vietnam', '越南多乐省'],
  'bình phước': ['Binh Phuoc Province, Vietnam', '越南平福省'],
};
export function productionTranslation(province: string): Partial<ExportLabelConfig> {
  const translation = provinceTranslations[province.trim().toLocaleLowerCase('vi').replace(/^tỉnh\s+/, '')];
  return translation ? { productionEn: translation[0], productionZh: translation[1] } : {};
}
