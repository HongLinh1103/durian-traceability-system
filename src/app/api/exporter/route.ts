import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { exporterContext, acceptHandover, saveExporterShipment } from '@/lib/exporter-service';
export const dynamic='force-dynamic';
export async function GET() {
 let context;
 try { context=await exporterContext(); } catch(error) { return NextResponse.json({error:(error as Error).message},{status:403}); }
 try {
  const {organization}=context;
  const [handovers,shipments]=await Promise.all([
   prisma.exporterHandover.findMany({where:{exporterId:organization.id},include:{allocations:{include:{shipment:{select:{status:true,code:true}}}}},orderBy:{createdAt:'desc'}}),
   prisma.exporterShipment.findMany({where:{exporterId:organization.id},include:{allocations:true},orderBy:{createdAt:'desc'}})
  ]);
  return NextResponse.json({organization,handovers,shipments});
 } catch {return NextResponse.json({error:'Không thể tải hồ sơ xuất khẩu.'},{status:500});}
}
export async function POST(request:Request) {
 let context;
 try { context=await exporterContext(); } catch(error) { return NextResponse.json({error:(error as Error).message},{status:403}); }
 try {
  const body=await request.json();
  if(body.action==='accept') {
   const input=z.object({id:z.string(),revision:z.number().int().nonnegative(),boxes:z.number().int().nonnegative(),weight:z.number().finite().nonnegative().refine(n=>Math.abs(n*1000-Math.round(n*1000))<0.00001,'Khối lượng tối đa 3 chữ số thập phân.'),note:z.string().trim().max(2000)}).parse(body.record);
   await acceptHandover(context.organization.id,context.userId,input);
  } else if(body.action==='shipment') await saveExporterShipment(context.organization.id,context.userId,body.record);
  else throw Error('Thao tác không hợp lệ.');
  return NextResponse.json({ok:true});
 } catch(error) {return NextResponse.json({error:error instanceof z.ZodError ? error.issues[0].message : (error as Error).message},{status:400});}
}
