import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { PrismaClient, Prisma } from '@prisma/client';
import { FRESH_STAGES, normalizeFreshLotCodes } from '../src/lib/fresh-lot-code';
import { vietnamPhone } from '../src/lib/sales-contact';
import type { GmpState, Values } from '../src/lib/processing-gmp';

// Explicit operator-requested data correction. Plan by default; no generated contact data on GET.
async function main(){
 const target=process.argv[process.argv.indexOf('--target')+1];
 if(!['local','production'].includes(target))throw Error('Use --target local|production.');
 const db=new PrismaClient({datasources:{db:{url:parseEnv(readFileSync(target==='local'?'.env':'.env.production.local','utf8')).DATABASE_URL}}});
 try{
  const user=await db.user.findUniqueOrThrow({where:{phone:'0909000003'},select:{id:true}});
  const row=await db.processingGmpWorkspace.findUniqueOrThrow({where:{ownerId:user.id}});
  const original=row.data as unknown as GmpState;
  const exporter=await db.exporterOrganization.findFirstOrThrow({where:{name:'Công ty TNHH TM&DV XNK Vina T&T',isActive:true},select:{id:true,name:true}});
  let state=normalizeFreshLotCodes(original),normalizedPhones=0,initializedPhones=0,exporterNames=0;
  const occupied=new Set(state.records.sales.map(r=>vietnamPhone(r.values.customerInfo)).filter(Boolean));
  const sales=state.records.sales.map((r,index)=>{
   const values:Values={...r.values};let changed=false;
   let phone=vietnamPhone(values.customerInfo);
   if(!phone){
    let sequence=8000000+index;do{phone='090'+String(sequence++);}while(occupied.has(phone));occupied.add(phone);
    values.previousCustomerInfo=values.previousCustomerInfo || String(values.customerInfo || '');
    values.customerInfoOrigin='USER_REQUEST_INITIALIZATION';
    values.customerInfoNote='Số điện thoại được khởi tạo theo yêu cầu người dùng; cần thay bằng số liên hệ thực tế.';
    initializedPhones++;
   }else if(phone!==values.customerInfo)normalizedPhones++;
   if(phone!==values.customerInfo){values.customerInfo=phone;changed=true;}
   if(values.exporter!==exporter.name){
    // Do not silently move a handover already linked to a different exporter.
    if(values.exporterId && values.exporterId!==exporter.id)throw Error('Sale linked to another exporter; manual reconciliation needed.');
    values.previousExporter=values.previousExporter || values.exporter || '';
    values.exporter=exporter.name;exporterNames++;changed=true;
   }
   return changed?{...r,values}:r;
  });
  state={...state,records:{...state.records,sales}};
  const codeChanges=Object.fromEntries(FRESH_STAGES.map(stage=>[stage,state.records[stage].filter((r,i)=>r.lotCode!==original.records[stage][i].lotCode).length]));
  const pending=await db.exporterHandover.findMany({where:{ownerId:user.id,status:'PENDING'}});
  const handovers=pending.flatMap(h=>{
   const sale=state.records.sales.find(r=>r.id===h.saleId);if(!sale)return[];
   const before=h.snapshot as Prisma.JsonObject;
   const after={...before,lotCode:sale.lotCode,contactPhone:String(sale.values.customerInfo)};
   return before.lotCode===after.lotCode && before.contactPhone===after.contactPhone?[]:[{row:h,before,after}];
  });
  const apply=process.argv.includes('--apply'),changed=JSON.stringify(original)!==JSON.stringify(state);
  if(apply && (changed||handovers.length)){
   mkdirSync('.storage/fresh-register-codes',{recursive:true});
   writeFileSync(`.storage/fresh-register-codes/${target}-${Date.now()}.json`,JSON.stringify({workspace:row,handovers:handovers.map(h=>h.row)},null,2),{flag:'wx'});
   await db.$transaction(async tx=>{
    const saved=await tx.processingGmpWorkspace.updateMany({where:{ownerId:user.id,revision:row.revision},data:{data:state as unknown as Prisma.InputJsonValue,revision:{increment:1}}});
    if(saved.count!==1)throw Error('Workspace changed; no data overwritten. Re-run plan.');
    for(const h of handovers){
     const saved=await tx.exporterHandover.updateMany({where:{id:h.row.id,revision:h.row.revision,status:'PENDING'},data:{snapshot:h.after,audit:[...(h.row.audit as Prisma.JsonArray),{actor:user.id,at:new Date().toISOString(),action:'STANDARDIZE_FRESH_LOT_AND_CONTACT',before:h.before,after:h.after}],revision:{increment:1}}});
     if(saved.count!==1)throw Error('Handover changed; no data overwritten. Re-run plan.');
    }
   },{timeout:30000});
  }
  console.log(JSON.stringify({target,mode:apply?'apply':'plan',codeChanges,normalizedPhones,initializedPhones,exporterNames,pendingHandoversUpdated:handovers.length,receivingAndPaymentsUnchanged:JSON.stringify(original.records.receiving)===JSON.stringify(state.records.receiving)&&JSON.stringify(original.payments)===JSON.stringify(state.payments)}));
 }finally{await db.$disconnect();}
}
main().catch(error=>{console.error(error.code||error.message);process.exitCode=1;});
