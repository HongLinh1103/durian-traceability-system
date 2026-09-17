import { loadEnvConfig } from '@next/env';
import { PrismaClient, Prisma } from '@prisma/client';
import { mkdir, writeFile } from 'node:fs/promises';
import { GmpState, GmpRecord, STAGES, REGISTERS, saveRecord, isFailed } from '../src/lib/processing-gmp';
loadEnvConfig(process.cwd());
const db=new PrismaClient();
const canonical=(v:unknown):string=>JSON.stringify(v,(_k,x)=>x && typeof x==='object' && !Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))):x);
const dayAfter=(s:unknown)=>new Date(Date.parse(String(s))+86400000).toISOString().slice(0,10);
async function main(){
 const facilities=await db.partnerFacility.findMany({where:{name:'Cơ sở Chế biến Sầu riêng Trị An',deletedAt:null}});
 if(facilities.length!==1)throw new Error('Cơ sở không duy nhất.');
 const row=await db.processingGmpWorkspace.findUniqueOrThrow({where:{ownerId:facilities[0].ownerId}});
 const original=row.data as unknown as GmpState;
 let next=structuredClone(original);
 const added:{stage:string;code:string;id:string}[]=[];
 const matrix=[];
 for(const [i,purchase] of original.records.purchases.entries()){
  let source=purchase;
  let receiving:GmpRecord|undefined;
  let packaging:GmpRecord|undefined;
  const missing:string[]=[];
  for(const stage of STAGES.slice(1)){
   const matches=next.records[stage].filter(r=>r.sourceId===source.id);
   if(matches.length>1 && stage!=='inspection')throw new Error('Nhiều nhánh ngoài dự kiến.');
   let record=matches.find(r=>!r.draft && !isFailed(stage,r.values))||matches[0];
   const retest=stage==='inspection' && record && isFailed(stage,record.values);
   if(!record || retest){
    missing.push(retest?'inspection (kiểm tra lại)':stage);
    const date=dayAfter(retest?record!.values.date:source.values.date);
    const values: GmpRecord['values']={date,notes:'Dữ liệu minh họa bổ sung để hoàn thiện chuỗi sổ theo yêu cầu; chưa xác nhận nghiệp vụ thực tế.',correction:'Không phát sinh',supervisor:['Lê Văn Hùng','Trần Minh Đức','Phạm Quốc Bảo'][i%3]};
    for(const f of REGISTERS[stage].fields){if(f.type==='check')values[f.key]='Đ';if(f.type==='finding')values[f.key]='Không';}
    if(stage==='receiving')throw new Error('Thiếu dữ liệu vùng nguyên liệu, cần đối chiếu riêng.');
    if(stage==='preprocessing'){
     const input=Number(source.values.grade1)+Number(source.values.grade2)+Number(source.values.grade3);
     Object.assign(values,{dryStart:'08:15',dryEnd:'09:45',outputWeight:input-(i%3+1)});
    }
    if(stage==='packaging'){
     const size=[18,20,15][i%3],boxes=Math.floor(Number(source.values.outputWeight)/size);
     Object.assign(values,{quantity_boxes:boxes,weight_kg:boxes*size});
    }
    if(stage==='inspection'){
     Object.assign(values,{sample1:Math.ceil(Number(source.values.quantity_boxes)*0.02),sample2:0,sample3:0,quantity_boxes:source.values.quantity_boxes,weight_kg:source.values.weight_kg,inspector:['Phạm Thị Hương','Trần Đình Trọng','Vũ Hoàng Mai'][i%3],correction:retest?'Minh họa: đã vệ sinh cuống, cách ly và kiểm tra lại; giữ nguyên lần kiểm tra không đạt trước đó.':'Không phát sinh'});
    }
    if(stage==='sales')Object.assign(values,{customer:['Đại lý trái cây Thủ Đức','Nhà phân phối Quảng Tây','Đầu mối trái cây Biên Hòa'][i%3]+' (minh họa)',customerInfo:['Thủ Đức, TP. Hồ Chí Minh','Nam Ninh, Quảng Tây, Trung Quốc','Biên Hòa, Đồng Nai'][i%3],truck:`XE-BS-${i+1}`,container:`CONTAINER-BS-${i+1}`,seal:`SEAL-BS-${i+1}`,exporter:i%3===1?'Đơn vị xuất khẩu minh họa Trị An':'Không áp dụng — bán nội địa',departurePort:i%3===1?'Hữu Nghị (minh họa)':'Không áp dụng — đường bộ nội địa',destinationPort:i%3===1?'Hữu Nghị Quan (minh họa)':'Không áp dụng — đường bộ nội địa',country:i%3===1?'Trung Quốc':'Việt Nam',price:[95000,108000,99000][i%3]});
    if(stage==='aftersales')Object.assign(values,{detectedObject:'Không phát hiện bất thường (minh họa)',quantity:'0',location:'Kiểm tra tại kho bên nhận (minh họa)',treatmentPlan:'Tiếp tục theo dõi điều kiện bảo quản',processingDepartment:`Tổ hậu mãi ${i%2+1}`,completionDate:date});
    const id=`complete-${purchase.id}-${stage}${retest?'-retest':''}`;
    next=saveRecord(next,stage,{sourceId:source.id,season:purchase.season,values},id);
    record=next.records[stage].find(r=>r.id===id)!;
    for(const key of ['harvestCode','harvestRecordId'])if(purchase.values[key])record.values[key]=purchase.values[key];
    record.values.notes=values.notes;
    added.push({stage,code:record.lotCode,id});
   }
   if(record.draft)throw new Error('Có bản nháp cần hoàn thiện riêng.');
   if(stage==='receiving')receiving=record;
   if(stage==='packaging')packaging=record;
   if(stage==='sales' && (Number(record.values.weight_kg)>Number(packaging?.values.weight_kg)||Number(record.values.quantity_boxes)>Number(packaging?.values.quantity_boxes)))throw new Error('Xuất bán vượt nhập kho.');
   source=record;
  }
  if(!receiving)throw new Error('Thiếu sổ nhập hàng.');
  matrix.push({purchase:purchase.lotCode,seller:purchase.values.seller,added:missing});
 }
 for(const stage of STAGES)for(const old of original.records[stage])if(canonical(next.records[stage].find(r=>r.id===old.id))!==canonical(old))throw new Error('Bản ghi cũ bị thay đổi.');
 if(canonical(next.payments)!==canonical(original.payments))throw new Error('Thanh toán bị thay đổi.');
 console.log(JSON.stringify({matrix,added:added.length,counts:Object.fromEntries(STAGES.map(s=>[s,{rows:next.records[s].length,lots:new Set(next.records[s].map(r=>r.lotCode)).size}]))},null,2));
 if(!process.argv.includes('--apply')||!added.length)return;
 await mkdir('.storage/backups',{recursive:true});
 const backup=`.storage/backups/trian-complete-${Date.now()}.json`;
 await writeFile(backup,JSON.stringify(row,null,2),{flag:'wx'});
 const result=await db.processingGmpWorkspace.updateMany({where:{ownerId:row.ownerId,revision:row.revision},data:{data:next as unknown as Prisma.InputJsonValue,revision:{increment:1}}});
 if(result.count!==1)throw new Error('Có cập nhật đồng thời, chưa lưu.');
 const saved=await db.processingGmpWorkspace.findUniqueOrThrow({where:{ownerId:row.ownerId}});
 if(canonical(saved.data)!==canonical(next))throw new Error('Dữ liệu sau ghi không khớp.');
 console.log(`Verified all 7 lots across 7 registers; old records and failed inspection preserved. Backup: ${backup}`);
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.$disconnect());
