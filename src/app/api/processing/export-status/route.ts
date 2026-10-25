import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const session=await getServerSession(authOptions);
 if(session?.user.role!=='PROCESSING_FACILITY'||session.user.isApproved===false)return NextResponse.json({error:'Không có quyền truy cập.'},{status:403});
 const saleId=new URL(request.url).searchParams.get('saleId')||'';
 const handover=await prisma.exporterHandover.findUnique({where:{ownerId_saleId:{ownerId:session.user.id,saleId}},include:{exporter:{select:{name:true,code:true}},allocations:{where:{shipment:{status:{in:['CONFIRMED','EXPORTED']}}},include:{shipment:{select:{code:true,status:true,data:true}}}}}});
 return NextResponse.json({handover});
}
