import { loadEnvConfig } from '@next/env';
import { PrismaClient, Prisma } from '@prisma/client';
import { createDemoState } from '../src/lib/processing-gmp';
loadEnvConfig(process.cwd());
const prisma=new PrismaClient();
async function main() {
 const users=await prisma.user.findMany({where:{role:'PROCESSING_FACILITY'},select:{id:true}});
 let created=0;
 for(const user of users) {
  if(await prisma.processingGmpWorkspace.findUnique({where:{ownerId:user.id}}))continue;
  await prisma.processingGmpWorkspace.create({data:{ownerId:user.id,data:createDemoState() as unknown as Prisma.InputJsonValue}});
  created++;
 }
 console.log(`Created GMP demo workspaces: ${created}. Existing workspaces preserved: ${users.length-created}.`);
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>prisma.$disconnect());
