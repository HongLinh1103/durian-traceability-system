import { Prisma } from '@prisma/client';
import { contactName, contactPhone, HandoverSnapshot } from './exporter-rules';
import { GmpRecord, GMP_GRADES } from './processing-gmp';

export async function syncSaleHandover(tx:Prisma.TransactionClient,ownerId:string,record:GmpRecord,actor:string) {
 const v=record.values;
 const exporterId=String(v.exporterId || '');
 if(!exporterId) return; // Historical sales stay intact until explicitly linked.
 await tx.$queryRaw`SELECT "id" FROM "ExporterOrganization" WHERE "id"=${exporterId} FOR UPDATE`;
 const old=await tx.exporterHandover.findUnique({where:{ownerId_saleId:{ownerId,saleId:record.id}}});
 const org=await tx.exporterOrganization.findFirst({where:{id:exporterId,isActive:true,canReceive:true,members:{some:{role:'EXPORTER',isApproved:true,isLocked:false,deletedAt:null}}}});
 if(!org && !old) throw Error('Đơn vị xuất khẩu không còn đủ điều kiện nhận hàng.');
 const facility=await tx.partnerFacility.findUnique({where:{ownerId},select:{name:true,code:true}});
 const snapshot:HandoverSnapshot={receiptCode:String(v.saleReceiptCode),facilityName:facility?.name || '',facilityCode:facility?.code || '',lotCode:record.lotCode,variety:String(v.variety || ''),date:String(v.date),boxes:Number(v.quantity_boxes),weight:Number(v.weight_kg),grades:Object.fromEntries(GMP_GRADES.flatMap(g=>[['quantity_boxes'+g.key,v['quantity_boxes'+g.key] ?? 0],['weight_kg'+g.key,v['weight_kg'+g.key] ?? 0]])),certificate:String(v.testCertificate || ''),country:String(v.country || ''),contactName:String(v.customer),contactPhone:String(v.customerInfo)};
 if(old?.status==='ACCEPTED') {
  const prior=old.snapshot as unknown as HandoverSnapshot;
  // Supplementary certificates remain editable after receipt; business data does not.
  if(old.exporterId!==exporterId || prior.boxes!==snapshot.boxes || prior.weight!==snapshot.weight || prior.date!==snapshot.date || prior.contactName!==snapshot.contactName || prior.contactPhone!==snapshot.contactPhone || prior.country!==snapshot.country) throw Error('Exporter đã tiếp nhận. Không được thay đổi thông tin bàn giao đã xác nhận.');
  if(prior.certificate===snapshot.certificate) return;
 }
 if(old && old.exporterId!==exporterId) throw Error('Không được đổi đơn vị xuất khẩu của phiếu đã bàn giao.');
 const audit=[...((old?.audit as Prisma.JsonArray)||[]),{actor,at:new Date().toISOString(),action:old?'UPDATE_HANDOVER':'HANDOVER',exporterId,before:old?.snapshot||null,after:snapshot as unknown as Prisma.InputJsonValue}];
 await tx.exporterHandover.upsert({where:{ownerId_saleId:{ownerId,saleId:record.id}},create:{ownerId,saleId:record.id,exporterId,snapshot:snapshot as unknown as Prisma.InputJsonValue,audit},update:{snapshot:snapshot as unknown as Prisma.InputJsonValue,audit,revision:{increment:1}}});
}

export async function prepareSale(tx:Prisma.TransactionClient,record:GmpRecord,certificateOnly:boolean) {
 if(certificateOnly) return;
 const v=record.values;
 v.customer=contactName.parse(v.customer);
 v.customerInfo=contactPhone.parse(v.customerInfo);
 // Existing historical sales may correct a contact before exporter enrollment.
 if(!v.exporterId) return;
 const org=await tx.exporterOrganization.findFirst({where:{id:String(v.exporterId || ''),isActive:true,canReceive:true,members:{some:{role:'EXPORTER',isApproved:true,isLocked:false,deletedAt:null}}}});
 if(!org) throw Error('Chọn đơn vị xuất khẩu đang hoạt động trong danh sách.');
 v.exporter=org.name;
 v.saleReceiptCode=v.saleReceiptCode || `XB-${String(v.date).slice(0,4)}-${record.id.slice(0,8).toUpperCase()}`;
}
