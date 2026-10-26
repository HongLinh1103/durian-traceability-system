import { z } from 'zod';
const coordinate = (min:number,max:number) => z.preprocess(v => v === '' || v === undefined || v === null ? null : v, z.coerce.number().finite().min(min).max(max).nullable());
export const trapLocationFields = {
  latitude: coordinate(-90,90), longitude: coordinate(-180,180),
  accuracyMeters: z.number().finite().nonnegative().max(1000000).nullable().optional(),
  locationCapturedAt: z.string().datetime({offset:true}).nullable().optional(),
};
export function checkTrapLocation(value: {latitude?:number|null;longitude?:number|null;accuracyMeters?:number|null;locationCapturedAt?:string|null}, context: z.RefinementCtx) {
  if ((value.latitude == null) !== (value.longitude == null)) context.addIssue({code:'custom',message:'Nhập đủ cả vĩ độ và kinh độ, hoặc để trống cả hai.',path:['latitude']});
  if (value.latitude == null && (value.accuracyMeters != null || value.locationCapturedAt != null)) context.addIssue({code:'custom',message:'Thông tin GPS cần có tọa độ.',path:['latitude']});
}
export const trapLocationSchema = z.object(trapLocationFields).superRefine(checkTrapLocation);
export type TrapLocation = z.infer<typeof trapLocationSchema>;
export const trapMapUrl = (latitude:number,longitude:number) => `https://www.google.com/maps?q=${latitude},${longitude}`;
export const locationErrorMessage = (code:number) => code===1 ? 'Quyền vị trí đã bị từ chối. Hãy cho phép vị trí trong cài đặt trình duyệt hoặc nhập tọa độ thủ công.' : code===3 ? 'Quá thời gian lấy vị trí. Thử lại ngoài trời hoặc nhập tọa độ thủ công.' : 'Thiết bị chưa xác định được vị trí. Thử lại hoặc nhập tọa độ thủ công.';
