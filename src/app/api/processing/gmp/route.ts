import { activeExporters } from '@/lib/exporter-service';
import { saveMonitor, MonitorState } from '@/lib/other-monitoring';
import { prepareSale, syncSaleHandover } from '@/lib/exporter-handover';
import { sameStoredJson } from '@/lib/processing-gmp-concurrency';
import { editReceivingRecord } from '@/lib/processing-receiving-edit';
import { canRebaseSalesEdit } from '@/lib/processing-gmp-concurrency';
import { dryingTimestamp } from '@/lib/drying-time';
import {allocateProduction} from '@/lib/production-lots';
import {saveOther,OtherState} from '@/lib/other-processing';
import { z } from 'zod';
import { syncProcessingHarvests } from '@/lib/processing-harvest-sync';
import { saveHarvestReceiving } from '@/lib/processing-receiving';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { addExpense, addPayment, deleteExpense, GmpState, saveRecord, STAGES } from '@/lib/processing-gmp';

export const dynamic = 'force-dynamic';
async function owner() {
 const session=await getServerSession(authOptions);
 return session?.user?.role==='PROCESSING_FACILITY' && session.user.isApproved!==false?session.user.id:null;
}
export async function GET() {
 const ownerId=await owner();
 if(!ownerId) return NextResponse.json({error:'Không có quyền truy cập.'},{status:403});
 try {
  const result=await syncProcessingHarvests(ownerId);
  const [facility, regions, exporters, handovers] = await Promise.all([
   prisma.partnerFacility.findUnique({where:{ownerId},select:{name:true,code:true}}),
   prisma.growingRegion.findMany({
    where:{isActive:true,status:'ACTIVE'},
    orderBy:{code:'asc'},
    select:{code:true,name:true,address:true},
   }),
   activeExporters(),
   prisma.exporterHandover.findMany({where:{ownerId},select:{saleId:true,status:true,receivedAt:true,exporter:{select:{name:true}}}}),
  ]);
  const accountRegions = facility?.code === 'VN-DNPH-131'
   ? regions.filter(region => /^VN\s*-\s*(?:DNOR|BPOR)\s*-/.test(region.code))
   : regions;
  const cleanState = result.data as unknown as GmpState;
  return NextResponse.json({state:cleanState,revision:result.revision,company:facility?.name||'Cơ sở chế biến & đóng gói',regions:accountRegions,exporters,handovers});
 } catch(error) { console.error('GMP read failed',error); return NextResponse.json({error:'Không thể tải sổ. Vui lòng kiểm tra kết nối cơ sở dữ liệu.'},{status:500}); }
}
export async function POST(request:Request) {
 const ownerId=await owner();
 if(!ownerId) return NextResponse.json({error:'Không có quyền truy cập.'},{status:403});
 let body;
 try { body=await request.json(); } catch { return NextResponse.json({error:'Dữ liệu không hợp lệ.'},{status:400}); }
 if(!body || typeof body!=='object' || !Number.isInteger(body.revision)) return NextResponse.json({error:'Thiếu phiên bản dữ liệu.'},{status:400});
 try {
  const row=await syncProcessingHarvests(ownerId);
  if(!row) return NextResponse.json({error:'Không tìm thấy dữ liệu sổ.'},{status:404});
  const expectedRevision=row.revision;
  if(row.revision!==body.revision && !(body.action==='record' && body.stage==='sales' && canRebaseSalesEdit(row.data as unknown as GmpState,body.record?.id,body.baseRecord))) return NextResponse.json({error:'Bản ghi đã thay đổi. Dữ liệu đang nhập được giữ lại; đóng biểu mẫu và mở lại bản ghi mới nhất trước khi lưu.'},{status:409});
  const rawState=row.data as unknown as GmpState;
  const state=rawState;
  let next:GmpState;
  try {
   if(body.action==='otherMonitor') {
    const parsed=z.object({book:z.enum(['ripening','quick-freezing','peeling','deseeding','packing','warehouse','sales-monitoring']),record:z.object({id:z.string().optional(),sourceId:z.string().min(1),confirmed:z.boolean(),values:z.record(z.union([z.string().max(10000),z.number().finite()]))})}).parse(body);
    next=saveMonitor(state as MonitorState,parsed.book,parsed.record,randomUUID(),ownerId);
   }
   else if(body.action==='other') {
    const parsed=z.object({book:z.enum(['preprocessing','processing','packaging','inspection','sales']),record:z.object({id:z.string().optional(),sourceId:z.string().min(1),confirmed:z.boolean(),inputs:z.array(z.object({sourceId:z.string(),weight:z.number().finite().positive()})).max(100).optional(),values:z.record(z.union([z.string().max(10000),z.number().finite()]))})}).parse(body);
    next=saveOther(state as OtherState,parsed.book,parsed.record,randomUUID(),ownerId);
   }
   else if(body.action==='allocation'){
 const parsed=z.object({receivingId:z.string(),route:z.enum(['DG','CB']),targetId:z.string().optional(),grades:z.record(z.union([z.string(),z.number().finite()])).optional(),weight:z.number().finite().optional(),cancelId:z.string().optional(),closeId:z.string().optional()}).parse(body.allocation);
 next=allocateProduction(state,parsed,ownerId,randomUUID());
 }
 else if(body.action==='receiving' && body.record?.id && body.record?.values){
 next=saveHarvestReceiving(state,body.record.id,body.record.values,body.confirm===true,new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}));
 if(body.confirm===true){
 const r=next.records.receiving.find(r=>r.id===body.record.id)!;
 const grades=Object.fromEntries(['1','2','3','Other'].map(k=>['grade'+k,r.values['grade'+k]]));
 if(Object.values(grades).some(v=>Number(v)>0))next=allocateProduction(next,{receivingId:r.id,route:'DG',grades,targetId:String(body.record.values.freshTarget||'')||undefined},ownerId,randomUUID());
 if(Number(r.values.otherProcessing)>0)next=allocateProduction(next,{receivingId:r.id,route:'CB',weight:Number(r.values.otherProcessing),targetId:String(body.record.values.otherTarget||'')||undefined},ownerId,randomUUID());
 }
 }
   else if(body.action==='receivingEdit') {
    const parsed=z.object({id:z.string().min(1),values:z.record(z.union([z.string().max(10000),z.number().finite()]))}).parse(body.record);
    next=editReceivingRecord(state,parsed.id,parsed.values,ownerId);
   }
   else if(body.action==='record' && (body.stage==='purchases' || body.stage==='receiving')) return NextResponse.json({error:'Sổ nhập hàng chỉ nhận hồ sơ đồng bộ từ thu hoạch.'},{status:400});
   else if(body.action==='payment' && body.payment) next=addPayment(state,{...body.payment,id:randomUUID()});
   else if(body.action==='expense' && body.expense) next=addExpense(state,{...body.expense,id:body.expense.id||randomUUID()});
   else if(body.action==='deleteExpense' && body.id) next=deleteExpense(state,body.id);
   else if(body.action==='record' && STAGES.includes(body.stage) && body.record?.values) next=saveRecord(state,body.stage,body.record,randomUUID());
   else return NextResponse.json({error:'Thao tác không hợp lệ.'},{status:400});
  } catch(error) { return NextResponse.json({error:error instanceof Error?error.message:'Dữ liệu không hợp lệ.'},{status:400}); }
  const updated=await prisma.$transaction(async tx => {
   if(body.action==='record' && body.stage==='sales') {
    const sale=next.records.sales.find(r=>r.id===body.record.id) || next.records.sales.find(r=>!state.records.sales.some(old=>old.id===r.id));
    if(!sale) throw Error('Không tìm thấy bản ghi xuất bán.');
    const old=state.records.sales.find(r=>r.id===sale.id);
    const certificateOnly=!!old && sameStoredJson({...old.values,testCertificate:''},{...sale.values,testCertificate:''});
    await prepareSale(tx,sale,certificateOnly);
    await syncSaleHandover(tx,ownerId,sale,ownerId);
   }
   const result=await tx.processingGmpWorkspace.updateMany({where:{ownerId,revision:expectedRevision},data:{data:next as unknown as Prisma.InputJsonValue,revision:{increment:1}}});
   if(!result.count) throw new Error('GMP_REVISION_CONFLICT');
   if(result.count && body.action==='record' && body.stage==='preprocessing') {
    const record=next.records.preprocessing.find(r=>r.id===body.record.id) || next.records.preprocessing.find(r=>!state.records.preprocessing.some(old=>old.id===r.id));
    if(record) {
     const start=dryingTimestamp(record.values.dryStart), end=dryingTimestamp(record.values.dryEnd);
     await tx.$executeRaw`INSERT INTO "processing_drying_times" ("ownerId", "recordId", "startedAt", "endedAt", "needsDateReview") VALUES (${ownerId}, ${record.id}, ${start}::timestamptz, ${end || null}::timestamptz, false) ON CONFLICT ("ownerId", "recordId") DO UPDATE SET "startedAt"=EXCLUDED."startedAt", "endedAt"=EXCLUDED."endedAt", "needsDateReview"=false`;
    }
   }
   return result;
  });
  if(!updated.count) return NextResponse.json({error:'Có người vừa cập nhật sổ. Tải lại trang trước khi lưu.'},{status:409});
  return NextResponse.json({state:next,revision:expectedRevision+1});
 } catch(error) { if(error instanceof Error && error.message==='GMP_REVISION_CONFLICT') return NextResponse.json({error:'Có người vừa cập nhật sổ. Tải lại trước khi lưu.'},{status:409}); if(error instanceof z.ZodError) return NextResponse.json({error:error.issues[0].message},{status:400}); if(error instanceof Error && !('code' in error)) return NextResponse.json({error:error.message},{status:400}); console.error('GMP write failed',error); return NextResponse.json({error:'Không thể lưu sổ vào cơ sở dữ liệu.'},{status:500}); }
}
