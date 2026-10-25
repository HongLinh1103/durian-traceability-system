import { z } from 'zod';
export { contactName, contactPhone } from './sales-contact';
const text = z.string().trim().max(2000).default('');
const day = z.string().default('').refine(s => !s || (/^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0,10) === s), 'Ngày không hợp lệ.');
export const shipmentSchema = z.object({
 id: z.string().optional(), revision: z.number().int().nonnegative().optional(),
 status: z.enum(['DRAFT','CONFIRMED','EXPORTED','CANCELLED']), isPublic: z.boolean().default(false),
 data: z.object({ carrier:text, truck:text, container:text, seal:text, departurePort:text, destinationPort:text, expectedDate:day, actualDate:day, arrivalDate:day, country:text, importer:text, documents:text, responsible:text, notes:text }),
 allocations: z.array(z.object({handoverId:z.string().min(1), boxes:z.number().int().positive(), weight:z.number().finite().min(0.001).max(99999999999).refine(n=>Math.abs(n*1000-Math.round(n*1000))<0.00001,'Khối lượng tối đa 3 chữ số thập phân.')})).max(100),
});
export type ExportShipmentInput = z.infer<typeof shipmentSchema>;
export type Capacity = { id:string; acceptedBoxes:number; acceptedWeight:number; usedBoxes:number; usedWeight:number };
export function validateShipment(input: ExportShipmentInput, available: Capacity[]) {
 const ids = new Set<string>();
 for (const allocation of input.allocations) {
  if (ids.has(allocation.handoverId)) throw Error('Một lô hàng chỉ được khai báo một lần trong chuyến.');
  ids.add(allocation.handoverId);
  const cap = available.find(c => c.id === allocation.handoverId);
  if (!cap) throw Error('Lô hàng chưa được tiếp nhận hoặc không thuộc đơn vị xuất khẩu.');
  if (allocation.boxes + cap.usedBoxes > cap.acceptedBoxes || Math.round(allocation.weight*1000) + Math.round(cap.usedWeight*1000) > Math.round(cap.acceptedWeight*1000)) throw Error('Phân bổ vượt số lượng hoặc khối lượng khả dụng của lô.');
 }
 if (input.status === 'CONFIRMED' || input.status === 'EXPORTED') {
  if (!input.allocations.length) throw Error('Chọn ít nhất một lô hàng cho chuyến xuất khẩu.');
  for (const key of ['carrier','container','seal','departurePort','destinationPort','country','responsible'] as const) if (!input.data[key]) throw Error('Cần bổ sung vận chuyển, container, seal, cảng đi/đến, nước nhập khẩu và người phụ trách trước khi xác nhận.');
 }
 if (input.status === 'EXPORTED' && !input.data.actualDate) throw Error('Nhập ngày xuất thực tế trước khi đánh dấu đã xuất khẩu.');
 if (input.data.actualDate && input.data.arrivalDate && input.data.arrivalDate < input.data.actualDate) throw Error('Ngày đến dự kiến không được trước ngày xuất thực tế.');
 if (input.data.expectedDate && input.data.arrivalDate && input.data.arrivalDate < input.data.expectedDate && !input.data.actualDate) throw Error('Ngày đến dự kiến không được trước ngày dự kiến xuất.');
}
export type HandoverSnapshot = { receiptCode:string; facilityName:string; facilityCode:string; lotCode:string; variety:string; date:string; boxes:number; weight:number; grades:Record<string,string|number>; certificate:string; country:string; contactName:string; contactPhone:string };
