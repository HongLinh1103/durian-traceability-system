import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { PrismaClient, Prisma } from '@prisma/client';
import { OTHER_REGISTER_KEYS, OtherRegisterState } from '../src/lib/other-registers';
import { otherMaterialSources } from '../src/lib/other-register-data';
import { saveOtherRegister } from '../src/lib/other-register-write';

// Initial customer data explicitly supplied by the operator; never automatic on GET/build.
const customers = [
 ['Công ty TNHH Thực phẩm Đông lạnh An Phú','KCN Tân Bình, TP. Hồ Chí Minh'],
 ['Công ty Cổ phần Bánh ngọt Hương Việt','Phường Tân Sơn Hòa, TP. Hồ Chí Minh'],
 ['Công ty TNHH Kem và Tráng miệng Đại Phát','Phường Bình Trị Đông, TP. Hồ Chí Minh'],
 ['Công ty TNHH Chế biến Nông sản Mekong','KCN Trà Nóc, TP. Cần Thơ'],
 ['Công ty Cổ phần Nguyên liệu Thực phẩm Nam Việt','KCN Sóng Thần, TP. Hồ Chí Minh'],
 ['Công ty TNHH Thực phẩm Hoàng Gia Á Châu','Phường An Phú, TP. Hồ Chí Minh'],
];
async function main() {
 const target=process.argv[process.argv.indexOf('--target')+1];
 if(!['local','production'].includes(target))throw Error('Use --target local|production.');
 const env=parseEnv(readFileSync(target==='local'?'.env':'.env.production.local','utf8'));
 if(!env.DATABASE_URL)throw Error('Missing database configuration.');
 const db=new PrismaClient({datasources:{db:{url:env.DATABASE_URL}}});
 try {
  const owner=await db.user.findUniqueOrThrow({where:{phone:'0909000003'},select:{id:true}});
  const row=await db.processingGmpWorkspace.findUniqueOrThrow({where:{ownerId:owner.id}});
  let state=row.data as unknown as OtherRegisterState;
  const receivingBefore=JSON.stringify(state.records),paymentsBefore=JSON.stringify(state.payments);
  const sources=otherMaterialSources(state);let drafts=0,sales=0;
  for(const book of OTHER_REGISTER_KEYS)for(const source of sources){
   const records=book==='preprocessing'?state.otherProcessing||[]:state.otherMonitoring||[];
   if(records.some(r=>r.book===book&&r.lotCode===source.code))continue;
   state=saveOtherRegister(state,{book,materialCode:source.code,confirmed:false,values:book==='preprocessing'?{date:source.date}:{}},`pending:${book}:${source.code}`,owner.id,new Date().toISOString(),'RECEIVING_PENDING');drafts++;
  }
  const transactions=(state.otherMonitoring||[]).filter(r=>r.book==='sales-monitoring'&&r.confirmed).sort((a,b)=>b.lotCode.localeCompare(a.lotCode));
  for(const [index,record]of transactions.entries()){
   const missingCustomer=!String(record.values.customerName||'').trim()&&/mẫu|minh họa|^$/i.test(String(record.values.customer||''));
   const missingTotal=String(record.values.total??'').trim()==='';
   if(!missingCustomer&&!missingTotal)continue;
   const company=customers[index%customers.length];
   const values={...record.values,...(missingCustomer?{customerName:company[0],customerAddress:company[1]}:{}),...(missingTotal?{total:Math.round(Number(record.values.weight)*180000)}:{})};
   state=saveOtherRegister(state,{book:'sales-monitoring',id:record.id,materialCode:record.lotCode,confirmed:true,values},record.id,owner.id,new Date().toISOString(),'USER_REQUEST_FINANCE_INITIALIZATION');
   const updated=state.otherMonitoring!.find(r=>r.id===record.id)!;
   if(missingTotal){updated.values.valueOrigin='USER_REQUEST_INITIALIZATION';updated.values.valueNote='Giá trị khởi tạo theo yêu cầu, tham chiếu 180.000 đ/kg; đối chiếu và chỉnh theo chứng từ giao dịch.';}
   sales++;
  }
  if(JSON.stringify(state.records)!==receivingBefore||JSON.stringify(state.payments)!==paymentsBefore)throw Error('Unexpected changes outside Other Processing registers.');
  const apply=process.argv.includes('--apply');
  if(apply&&(drafts||sales)){
   mkdirSync('.storage/other-finance',{recursive:true});writeFileSync(`.storage/other-finance/${target}-${Date.now()}.json`,JSON.stringify(row,null,2),{flag:'wx'});
   const saved=await db.processingGmpWorkspace.updateMany({where:{ownerId:owner.id,revision:row.revision},data:{data:state as unknown as Prisma.InputJsonValue,revision:{increment:1}}});
   if(saved.count!==1)throw Error('Concurrent update; no data overwritten. Re-run the plan.');
  }
  console.log(JSON.stringify({target,mode:apply?'apply':'plan',sourceLots:sources.length,blockedSourceLots:sources.filter(s=>s.blocked).map(s=>s.code),draftsCreated:drafts,salesUpdated:sales,confirmedSaleValue:state.otherMonitoring?.filter(r=>r.book==='sales-monitoring'&&r.confirmed).reduce((sum,r)=>sum+Number(r.values.total||0),0),receivingAndPaymentsUnchanged:true}));
 }finally{await db.$disconnect();}
}
main().catch(error=>{console.error(error.code||error.message);process.exitCode=1;});
