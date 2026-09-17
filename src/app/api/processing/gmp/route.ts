import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { addPayment, createDemoState, GmpState, normalizeGmpState, saveRecord, STAGES } from '@/lib/processing-gmp';

export const dynamic = 'force-dynamic';
async function owner() {
 const session=await getServerSession(authOptions);
 return session?.user?.role==='PROCESSING_FACILITY' && session.user.isApproved!==false?session.user.id:null;
}
export async function GET() {
 const ownerId=await owner();
 if(!ownerId) return NextResponse.json({error:'Không có quyền truy cập.'},{status:403});
 try {
  const row=await prisma.processingGmpWorkspace.findUnique({where:{ownerId}});
  // Demo rows are only inserted into a previously unused account workspace.
  const result=row || await prisma.processingGmpWorkspace.upsert({where:{ownerId},update:{},create:{ownerId,data:createDemoState() as unknown as Prisma.InputJsonValue}});
  const facility=await prisma.partnerFacility.findUnique({where:{ownerId},select:{name:true}});
  const rawState = result.data as unknown as GmpState;
  const { state: cleanState, changed } = normalizeGmpState(rawState);
  if (changed) {
   try {
    await prisma.processingGmpWorkspace.update({
     where: { ownerId },
     data: { data: cleanState as unknown as Prisma.InputJsonValue },
    });
   } catch (e) {
    console.error('Failed to persist normalized GMP state', e);
   }
  }
  return NextResponse.json({state:cleanState,revision:result.revision,company:facility?.name||'Cơ sở chế biến & đóng gói'});
 } catch(error) { console.error('GMP read failed',error); return NextResponse.json({error:'Không thể tải sổ. Vui lòng kiểm tra kết nối cơ sở dữ liệu.'},{status:500}); }
}
export async function POST(request:Request) {
 const ownerId=await owner();
 if(!ownerId) return NextResponse.json({error:'Không có quyền truy cập.'},{status:403});
 let body;
 try { body=await request.json(); } catch { return NextResponse.json({error:'Dữ liệu không hợp lệ.'},{status:400}); }
 if(!body || typeof body!=='object' || !Number.isInteger(body.revision)) return NextResponse.json({error:'Thiếu phiên bản dữ liệu.'},{status:400});
 try {
  const row=await prisma.processingGmpWorkspace.findUnique({where:{ownerId}});
  if(!row || row.revision!==body.revision) return NextResponse.json({error:'Dữ liệu đã thay đổi. Tải lại trang trước khi lưu.'},{status:409});
  const rawState=row.data as unknown as GmpState;
  const { state }=normalizeGmpState(rawState);
  let next:GmpState;
  try {
   if(body.action==='payment' && body.payment) next=addPayment(state,{...body.payment,id:randomUUID()});
   else if(body.action==='record' && STAGES.includes(body.stage) && body.record?.values) next=saveRecord(state,body.stage,body.record,randomUUID());
   else return NextResponse.json({error:'Thao tác không hợp lệ.'},{status:400});
  } catch(error) { return NextResponse.json({error:error instanceof Error?error.message:'Dữ liệu không hợp lệ.'},{status:400}); }
  const updated=await prisma.processingGmpWorkspace.updateMany({where:{ownerId,revision:body.revision},data:{data:next as unknown as Prisma.InputJsonValue,revision:{increment:1}}});
  if(!updated.count) return NextResponse.json({error:'Có người vừa cập nhật sổ. Tải lại trang trước khi lưu.'},{status:409});
  return NextResponse.json({state:next,revision:body.revision+1});
 } catch(error) { console.error('GMP write failed',error); return NextResponse.json({error:'Không thể lưu sổ vào cơ sở dữ liệu.'},{status:500}); }
}
