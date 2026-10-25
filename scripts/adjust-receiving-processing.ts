import {isDeepStrictEqual} from 'node:util';
import {loadEnvConfig} from '@next/env';import {mkdir,writeFile} from 'node:fs/promises';import type {Prisma} from '@prisma/client';import {reclassifyReceivingRejected} from '../src/lib/receiving-reclassification';import {GmpState,gradeTotal} from '../src/lib/processing-gmp';
loadEnvConfig(process.cwd(),true);
const codes=['LH-2026-0809','LH-2026-0609','LH-2026-0509','LH-2026-0309','LH-2026-0209','LH-2026-2908','LH-2026-2007'];
async function main(){const {prisma}=await import('../src/lib/prisma');try{
 const facility=await prisma.partnerFacility.findUnique({where:{code:'VN-DNPH-131'},select:{ownerId:true}});if(!facility?.ownerId)throw Error('Không tìm thấy cơ sở cần chỉnh sửa.');
 const row=await prisma.processingGmpWorkspace.findUniqueOrThrow({where:{ownerId:facility.ownerId}});const state=row.data as unknown as GmpState;
 const selected=state.records.receiving.filter(r=>codes.includes(r.lotCode));if(selected.length!==7)throw Error('Danh sách hồ sơ không khớp 7 dòng cần điều chỉnh.');
 const next=reclassifyReceivingRejected(state,selected.map(r=>r.id),'user-request',new Date().toISOString());
 const changes=next.records.receiving.filter(r=>selected.some(s=>s.id===r.id)).map(r=>({code:r.lotCode,fresh:gradeTotal(r.values,'grade'),other:r.values.otherProcessing,rejected:r.values.rejected,accepted:r.values.acceptedWeight}));console.log(JSON.stringify({facility:'VN-DNPH-131',changes,totalOther:changes.reduce((n,r)=>n+Number(r.other),0)},null,2));
 if(!process.argv.includes('--apply')||JSON.stringify(state)===JSON.stringify(next))return;
 await mkdir('.storage/backups',{recursive:true});const backup='.storage/backups/receiving-processing-'+Date.now()+'.json';await writeFile(backup,JSON.stringify(row,null,2),{flag:'wx'});
 const saved=await prisma.processingGmpWorkspace.updateMany({where:{ownerId:row.ownerId,revision:row.revision},data:{data:next as unknown as Prisma.InputJsonValue,revision:{increment:1}}});if(saved.count!==1)throw Error('Dữ liệu vừa thay đổi. Chưa áp dụng; chạy lại để đối soát.');
 const actual=await prisma.processingGmpWorkspace.findUniqueOrThrow({where:{ownerId:row.ownerId}});if(!isDeepStrictEqual(actual.data,JSON.parse(JSON.stringify(next))))throw Error('Kiểm tra dữ liệu lưu chưa khớp.');
 console.log('Applied with revision guard. Backup: '+backup);
 }finally{await prisma.$disconnect();}}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
