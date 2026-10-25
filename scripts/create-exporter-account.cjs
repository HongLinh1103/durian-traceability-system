const fs=require('node:fs');
const {randomBytes}=require('node:crypto');
const bcrypt=require('bcryptjs');
require('@next/env').loadEnvConfig(process.cwd(),true);
const local=fs.readFileSync('.env','utf8').match(/^DATABASE_URL\s*=\s*["']?([^"'\r\n]+)/m)?.[1];
if(!local||!['localhost','127.0.0.1'].includes(new URL(local).hostname))throw Error('Chỉ tạo tài khoản trong DB local đã cấu hình.');
process.env.DATABASE_URL=local;
const {PrismaClient}=require('@prisma/client');const prisma=new PrismaClient();
async function main(){
 try{
  let phone='0909000888';
  while(await prisma.user.findUnique({where:{phone}}))phone=String(Number(phone)+1).padStart(10,'0');
  let email='exporter@triviet.local';
  if(await prisma.user.findUnique({where:{email}}))email=`exporter.${Date.now()}@triviet.local`;
  const password='Tv!'+randomBytes(10).toString('base64url')+'9a';
  const hash=await bcrypt.hash(password,10);
  const org=await prisma.exporterOrganization.upsert({where:{code:'EXP-TRIVIET-001'},update:{isActive:true,canReceive:true},create:{code:'EXP-TRIVIET-001',name:'Công ty Xuất khẩu Trí Việt',contactName:'Nguyễn Minh Anh',phone,address:'Đồng Nai, Việt Nam',isActive:true,canReceive:true}});
  const user=await prisma.user.create({data:{phone,email,password:hash,fullName:'Nguyễn Minh Anh',registrationName:org.name,role:'EXPORTER',isApproved:true,accountStatus:'APPROVED',approvedAt:new Date(),exporterOrganizationId:org.id}});
  if(!await bcrypt.compare(password,user.password))throw Error('Kiểm tra mật khẩu thất bại.');
  console.log(JSON.stringify({organization:org.name,code:org.code,phone,email,password,role:'EXPORTER',login:'/login',dashboard:'/dashboard/exporter'},null,2));
 }finally{await prisma.$disconnect();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
