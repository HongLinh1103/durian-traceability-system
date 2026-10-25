import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { contactPhone } from '@/lib/exporter-rules';
export const dynamic='force-dynamic';
async function admin(){return (await getServerSession(authOptions))?.user.role==='ADMIN';}
export async function GET(){
 if(!await admin()) return NextResponse.json({error:'Không có quyền quản trị.'},{status:403});
 const [organizations,users]=await Promise.all([prisma.exporterOrganization.findMany({include:{members:{where:{role:'EXPORTER',deletedAt:null},select:{id:true,fullName:true,phone:true}}},orderBy:{name:'asc'}}),prisma.user.findMany({where:{role:'EXPORTER',deletedAt:null},select:{id:true,fullName:true,phone:true,exporterOrganizationId:true}})]);
 return NextResponse.json({organizations,users});
}
export async function POST(request:Request){
 if(!await admin()) return NextResponse.json({error:'Không có quyền quản trị.'},{status:403});
 try{
  const input=z.object({id:z.string().optional(),code:z.string().trim().min(2).max(40),name:z.string().trim().min(2).max(200),taxCode:z.string().trim().max(50).default(''),contactName:z.string().trim().min(2).max(120),phone:contactPhone,address:z.string().trim().min(2).max(500),isActive:z.boolean(),canReceive:z.boolean(),memberIds:z.array(z.string()).max(100)}).parse(await request.json());
  await prisma.$transaction(async tx=>{
   const count=await tx.user.count({where:{id:{in:input.memberIds},role:'EXPORTER',deletedAt:null}});
   if(count!==new Set(input.memberIds).size) throw Error('Chỉ được liên kết tài khoản Exporter hợp lệ.');
   const conflict=await tx.user.count({where:{id:{in:input.memberIds},exporterOrganizationId:{not:input.id || ''},NOT:{exporterOrganizationId:null}}});
   if(conflict) throw Error('Tài khoản đã thuộc một đơn vị khác. Hãy gỡ liên kết trước khi chuyển đơn vị.');
   const {id,memberIds,...data}=input;
   const organization=id ? await tx.exporterOrganization.update({where:{id},data:{...data,taxCode:data.taxCode || null}}) : await tx.exporterOrganization.create({data:{...data,taxCode:data.taxCode || null}});
   await tx.user.updateMany({where:{exporterOrganizationId:organization.id,id:{notIn:memberIds}},data:{exporterOrganizationId:null}});
   await tx.user.updateMany({where:{id:{in:memberIds}},data:{exporterOrganizationId:organization.id}});
  });
  return NextResponse.json({ok:true});
 }catch(error){return NextResponse.json({error:error instanceof z.ZodError ? error.issues[0].message : (error as {code?:string}).code==='P2002' ? 'Mã đơn vị hoặc mã số thuế đã tồn tại.' : (error as Error).message},{status:400});}
}
