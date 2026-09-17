import { loadEnvConfig } from '@next/env';
import { PrismaClient, Prisma } from '@prisma/client';
import { mkdir, writeFile } from 'node:fs/promises';
import { GmpState, Values, REGISTERS, STAGES, saveRecord } from '../src/lib/processing-gmp';
loadEnvConfig(process.cwd());
const db = new PrismaClient();
const canonical=(v:unknown):string=>JSON.stringify(v,(_k,x)=>x && typeof x==='object' && !Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))):x);
const addDays=(date:string,n:number)=>new Date(Date.parse(date)+n*86400000).toISOString().slice(0,10);
async function main() {
 const facilities=await db.partnerFacility.findMany({where:{name:'Cơ sở Chế biến Sầu riêng Trị An',deletedAt:null}});
 if(facilities.length!==1) throw new Error('Cơ sở không duy nhất.');
 const row=await db.processingGmpWorkspace.findUniqueOrThrow({where:{ownerId:facilities[0].ownerId}});
 const original=row.data as unknown as GmpState;
 const next=structuredClone(original);
 const targets=original.records.purchases.filter(r=>r.id.startsWith('demo-') || String(r.values.seller)==='Trần Văn Minh');
 const report=[];
 for(let i=0;i<targets.length;i++) {
  const purchase=targets[i];
  const minh=purchase.values.seller==='Trần Văn Minh';
  if(minh && !['TH-2526-2007','TH-2526-2908'].includes(String(purchase.values.harvestCode))) throw new Error('Có phiếu Minh không khớp nguồn.');
  const chain=[purchase];
  for(const stage of STAGES.slice(1)) {
   const matches=original.records[stage].filter(r=>r.sourceId===chain.at(-1)!.id);
   if(matches.length>1) throw new Error('Lô có nhiều nhánh, cần kiểm tra riêng.');
   if(!matches.length) break;
   chain.push(matches[0]);
  }
  if(minh && chain.length!==7) throw new Error('Thiếu liên kết sổ của Minh.');
  const weight=minh?Number(purchase.values.weight):[1860,2340,1575,2980,3240][i%5];
  const price=minh?Number(purchase.values.price):[68000,54000,61000,72000,59000][i%5];
  if(minh && (weight!==(purchase.values.harvestCode==='TH-2526-2007'?1140:4500) || price!==(purchase.values.harvestCode==='TH-2526-2007'?52000:55000))) throw new Error('Thu mua Minh bị thay đổi.');
  const date=String(purchase.values.date);
  const rejected=Math.round(weight*(0.012+i*0.003));
  const grade1=Math.round(weight*(0.68+i*0.015));
  const grade2=Math.round(weight*0.20);
  const grade3=weight-rejected-grade1-grade2;
  const accepted=weight-rejected;
  const diff=i%2===0?0:[2,3,5][i%3];
  const output=accepted-diff;
  const boxSize=[18,15,20][i%3];
  const boxes=Math.floor(output/boxSize);
  const packed=boxes*boxSize;
  const variety=minh?'Ri6':i%2?'Ri6':'Monthong';
  const receiving=chain[1];
  const origin=minh?String(receiving?.values.origin):`${purchase.values.seller==='Lê Thị Hoa'?'Vườn sầu riêng Lê Thị Hoa, Cẩm Mỹ':'Vườn sầu riêng Nguyễn Văn Nam, Long Khánh'}, Đồng Nai`;
  const note='Dữ liệu theo yêu cầu; thông tin sản xuất, kiểm tra và xuất bán.';
  const empty:GmpState={records:{purchases:[],receiving:[],preprocessing:[],packaging:[],inspection:[],sales:[],aftersales:[]},payments:[],demo:true};
  let rebuilt=empty;
  for(let s=0;s<chain.length;s++) {
   const stage=STAGES[s],old=chain[s];
   const v:Values={...old.values,date:addDays(date,s<=3?0:s===4?1:s===5?2:5),seller:String(purchase.values.seller),weight,price:s===0?price: [96000,88000,102000,115000,92000,89000,98000][i%7],phone:String(purchase.values.phone),address:minh?String(purchase.values.address):origin,puc:minh?String(receiving?.values.puc):`PUC-MH-${String(i+1).padStart(3,'0')}`,origin,variety,grade1,grade2,grade3,rejected,receiver:['Nguyễn Thị Lan', 'Trần Văn Hưng', 'Lê Văn Hùng'][i%3],dryStart:`${String(7+i%4).padStart(2,'0')}:15`,dryEnd:`${String(9+i%4).padStart(2,'0')}:00`,outputWeight:output,supervisor:['Lê Văn Hùng', 'Trần Minh Đức', 'Phạm Quốc Bảo'][i%3],quantity_boxes:boxes,weight_kg:packed,sample1:Math.ceil(boxes*0.02),sample2:0,sample3:0,inspector:['Phạm Thị Hương', 'Trần Đình Trọng', 'Vũ Hoàng Mai'][i%3],customer:['Đối tác phân phối Quảng Tây','Đại lý trái cây Thủ Đức','Nhà phân phối Vân Nam'][i%3],customerInfo:['Nam Ninh, Quảng Tây, Trung Quốc','Thủ Đức, TP. Hồ Chí Minh, Việt Nam','Côn Minh, Vân Nam, Trung Quốc'][i%3],truck:`XE-MH-${String(i+1).padStart(3,'0')}`,container:`CONTAINER-MH-${i+1}`,seal:`SEAL-MH-${i+1}`,exporter:i%3===1?'Không áp dụng — bán nội địa':'Đơn vị xuất khẩu Trị An',departurePort:i%3===1?'Không áp dụng — đường bộ nội địa':'Cửa khẩu Hữu Nghị',destinationPort:i%3===1?'Không áp dụng — đường bộ nội địa':'Cửa khẩu Hữu Nghị Quan',country:i%3===1?'Việt Nam':'Trung Quốc',notes:note,correction:'Không phát sinh',detectedObject:i%2?'Thùng bị móp nhẹ':'Không phát hiện bất thường',quantity:i%2?'1 thùng':'0',location:i%2?'Góc pallet phía cửa xe':'Không phát sinh',treatmentPlan:i%2?'Thay thùng, kiểm tra lại nhãn và tình trạng trái':'Tiếp tục theo dõi bảo quản',processingDepartment:`Tổ hậu mãi ${i%2+1}`,completionDate:addDays(date,6)};
   for(const f of REGISTERS[stage].fields) {if(f.type==='check')v[f.key]='Đ';if(f.type==='finding')v[f.key]='Không';}
   if(stage==='inspection' && old.values.mealybug==='Có') Object.assign(v,{mealybug:'Có',quantity_boxes:0,weight_kg:0,correction:'Minh họa: cách ly lô, vệ sinh cuống và kiểm tra lại trước khi xuất bán.'});
   rebuilt=saveRecord(rebuilt,stage,{sourceId:s?chain[s-1].id:undefined,season:purchase.season,values:v},old.id);
   const fresh=rebuilt.records[stage].at(-1)!;
   // Keep established identities and codes so existing links continue to work.
   fresh.lotCode=old.lotCode;
   if(stage==='purchases') fresh.values.purchaseCode=old.lotCode;
   else {fresh.values.lotCode=old.lotCode;fresh.values.variety=variety;fresh.values.productLot=`${variety} · ${old.lotCode}`;}
   for(const key of ['harvestCode','harvestRecordId']) if(old.values[key])fresh.values[key]=old.values[key];
   fresh.values.notes=stage==='purchases' && minh?String(old.values.notes):note;
   next.records[stage]=next.records[stage].map(r=>r.id===old.id?fresh:r);
  }
  report.push({seller:purchase.values.seller,code:purchase.lotCode,weight,price,total:weight*price,accepted,output,boxes,packed,registers:chain.length});
 }
 if(canonical(next.payments)!==canonical(original.payments))throw new Error('Thanh toán bị thay đổi.');
 for(const stage of STAGES) if(next.records[stage].length!==original.records[stage].length)throw new Error('Số dòng bị thay đổi.');
 console.log(JSON.stringify(report,null,2));
 if(!process.argv.includes('--apply'))return;
 await mkdir('.storage/backups',{recursive:true});
 const backup=`.storage/backups/trian-diversify-${Date.now()}.json`;
 await writeFile(backup,JSON.stringify(row,null,2),{flag:'wx'});
 const result=await db.processingGmpWorkspace.updateMany({where:{ownerId:row.ownerId,revision:row.revision},data:{data:next as unknown as Prisma.InputJsonValue,revision:{increment:1}}});
 if(result.count!==1)throw new Error('Dữ liệu đã thay đổi đồng thời, chưa ghi.');
 const saved=await db.processingGmpWorkspace.findUniqueOrThrow({where:{ownerId:row.ownerId}});
 if(canonical(saved.data)!==canonical(next))throw new Error('Đối chiếu sau ghi thất bại.');
 console.log(`Verified all records, mass balances, stage validation and unchanged payments. Backup: ${backup}`);
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.$disconnect());
