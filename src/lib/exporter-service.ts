import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { authOptions } from './auth';
import { prisma } from './prisma';
import { HandoverSnapshot, shipmentSchema, validateShipment } from './exporter-rules';
import { sameStoredJson } from './processing-gmp-concurrency';

export async function exporterContext() {
 const session = await getServerSession(authOptions);
 if (session?.user.role !== 'EXPORTER') throw Error('Không có quyền truy cập Exporter.');
 const user = await prisma.user.findUnique({where:{id:session.user.id},include:{exporterOrganization:true}});
 if (!user || user.role !== 'EXPORTER' || !user.isApproved || user.isLocked || user.deletedAt || !user.exporterOrganization?.isActive) throw Error('Tài khoản hoặc đơn vị xuất khẩu chưa được kích hoạt.');
 return {userId:user.id, organization:user.exporterOrganization};
}
export async function activeExporters() {
 return prisma.exporterOrganization.findMany({where:{isActive:true,canReceive:true,members:{some:{role:'EXPORTER',isApproved:true,isLocked:false,deletedAt:null}}},select:{id:true,code:true,name:true},orderBy:{name:'asc'}});
}
export async function lockExporter(tx: Prisma.TransactionClient, id:string) {
 await tx.$queryRaw`SELECT "id" FROM "ExporterOrganization" WHERE "id"=${id} FOR UPDATE`;
 const org = await tx.exporterOrganization.findUnique({where:{id}});
 if (!org?.isActive) throw Error('Đơn vị xuất khẩu đã ngừng hoạt động.');
 return org;
}
export async function acceptHandover(exporterId:string, actor:string, input:{id:string;revision:number;boxes:number;weight:number;note:string}) {
 return prisma.$transaction(async tx => {
  const org=await lockExporter(tx,exporterId);
  if(!org.canReceive) throw Error('Đơn vị xuất khẩu hiện không được phép tiếp nhận hàng mới.');
  const row = await tx.exporterHandover.findFirst({where:{id:input.id,exporterId}});
  if (!row || row.status !== 'PENDING' || row.revision !== input.revision) throw Error('Phiếu bàn giao không tồn tại hoặc đã được tiếp nhận. Tải lại danh sách.');
  const snapshot=row.snapshot as unknown as HandoverSnapshot;
  if (input.boxes > snapshot.boxes || Math.round(input.weight*1000) > Math.round(snapshot.weight*1000)) throw Error('Tiếp nhận không được vượt số lượng/khối lượng bàn giao.');
  const discrepancy=input.boxes !== snapshot.boxes || Math.round(input.weight*1000) !== Math.round(snapshot.weight*1000);
  if (discrepancy && !input.note.trim()) throw Error('Vui lòng ghi rõ chênh lệch khi tiếp nhận.');
  return tx.exporterHandover.update({where:{id:row.id},data:{status:'ACCEPTED',acceptedBoxes:input.boxes,acceptedWeight:input.weight,receivedAt:new Date(),receivedBy:actor,receiptNote:input.note,revision:{increment:1},audit:[...(row.audit as Prisma.JsonArray),{actor,at:new Date().toISOString(),action:'ACCEPT',boxes:input.boxes,weight:input.weight,note:input.note}]}});
 });
}
export async function saveExporterShipment(exporterId:string, actor:string, raw:unknown) {
 const input=shipmentSchema.parse(raw);
 return prisma.$transaction(async tx => {
  await lockExporter(tx,exporterId);
  const old=input.id ? await tx.exporterShipment.findFirst({where:{id:input.id,exporterId}}) : null;
  if (input.id && (!old || old.revision !== input.revision)) throw Error('Chuyến xuất khẩu đã thay đổi. Tải lại danh sách.');
  if (old && old.status !== 'DRAFT') {
   const previousAllocations=await tx.exporterShipmentAllocation.findMany({where:{shipmentId:old.id},orderBy:{handoverId:'asc'}});
   const allocationsSame=sameStoredJson(previousAllocations.map(a=>({handoverId:a.handoverId,boxes:a.boxes,weight:Number(a.weight)})),[...input.allocations].sort((a,b)=>a.handoverId.localeCompare(b.handoverId)));
   if(old.status==='CANCELLED' || !['CONFIRMED','EXPORTED'].includes(input.status) || (old.status==='EXPORTED' && input.status!=='EXPORTED') || !allocationsSame) throw Error('Không được thay đổi phân bổ lô hoặc lùi trạng thái chuyến đã xác nhận. Chỉ Exporter được cập nhật thông tin vận chuyển và công khai, mọi thay đổi được lưu lịch sử.');
  }
  if (!old && input.status === 'CANCELLED') throw Error('Chưa có chuyến để hủy.');
  const rows=await tx.exporterHandover.findMany({where:{exporterId,status:'ACCEPTED'},include:{allocations:{include:{shipment:{select:{status:true}}}}}});
  const caps=rows.map(r=>({id:r.id,acceptedBoxes:r.acceptedBoxes || 0,acceptedWeight:Number(r.acceptedWeight || 0),usedBoxes:r.allocations.filter(a=>a.shipmentId!==old?.id && a.shipment.status!=='CANCELLED').reduce((n,a)=>n+a.boxes,0),usedWeight:r.allocations.filter(a=>a.shipmentId!==old?.id && a.shipment.status!=='CANCELLED').reduce((n,a)=>n+Number(a.weight),0)}));
  if(input.status!=='CANCELLED') validateShipment(input,caps);
  const id=old?.id || randomUUID();
  const code=old?.code || `EXP-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${id.slice(0,8).toUpperCase()}`;
  const audit=[...((old?.audit as Prisma.JsonArray) || []),{actor,at:new Date().toISOString(),action:input.status,data:input.data,allocations:input.allocations,isPublic:input.isPublic}];
  const saved=await tx.exporterShipment.upsert({where:{id},create:{id,exporterId,code,status:input.status,isPublic:input.isPublic,data:input.data,audit},update:{status:input.status,isPublic:input.isPublic,data:input.data,audit,revision:{increment:1}}});
  await tx.exporterShipmentAllocation.deleteMany({where:{shipmentId:id}});
  if(input.status!=='CANCELLED' && input.allocations.length) await tx.exporterShipmentAllocation.createMany({data:input.allocations.map(a=>({shipmentId:id,handoverId:a.handoverId,boxes:a.boxes,weight:a.weight}))});
  return saved;
 });
}
