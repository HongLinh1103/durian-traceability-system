import { loadEnvConfig } from '@next/env';
import { PrismaClient, Prisma } from '@prisma/client';
import { mkdir, writeFile } from 'node:fs/promises';
import { GmpState, STAGES, saveRecord, isFailed, normalizeGmpState } from '../src/lib/processing-gmp';
loadEnvConfig(process.cwd());
const db=new PrismaClient();
const harvestWeights:Record<string,number>={'TH-2526-2007':4200,'TH-2526-2908':4800,'TH-2526-0209':4500};
const purchaseWeights:Record<string,number>={'TM-2026-2007':4200,'TM-2026-2908':4800,'TM-2026-0209':4650,'TM-2026-0309':5200,'TM-2026-0509':4350,'TM-2026-0609':5600,'TM-2026-0809':6100};
const canonical=(v:unknown):string=>JSON.stringify(v,(_k,x)=>x && typeof x==='object' && !Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))):x);
async function main(){
 const facilities=await db.partnerFacility.findMany({where:{name:'Cơ sở Chế biến Sầu riêng Trị An',deletedAt:null}});
 if(facilities.length!==1)throw new Error('Cơ sở không duy nhất.');
 const facility=facilities[0];
 const harvests=await db.harvestRecord.findMany({where:{farmer:{fullName:'Trần Văn Minh'}},include:{varietyItems:true,harvestLot:{include:{_count:{select:{rawReceipts:true,collectionItems:true,commercialLots:true,procurementOrders:true}},snapshot:true}}}});
 const workspace=await db.processingGmpWorkspace.findUniqueOrThrow({where:{ownerId:facility.ownerId}});
 const original=workspace.data as unknown as GmpState;
 if(process.argv.includes('--inspect')){
  console.log(JSON.stringify({harvests,purchases:original.records.purchases,counts:Object.fromEntries(STAGES.map(s=>[s,original.records[s].length])),payments:original.payments},null,2));return;
 }
 if(harvests.length!==3 || harvests.some(h=>!harvestWeights[h.code]))throw new Error('Danh sách thu hoạch khác dự kiến.');
 for(const h of harvests)if(h.harvestLot && (Object.values(h.harvestLot._count).some(n=>n>0) || h.harvestLot.snapshot))throw new Error('Lô thu hoạch có giao dịch/snapshot cần đối soát riêng.');
 const next=structuredClone(original);
 const report=[];
 for(const p of original.records.purchases){
  const target=purchaseWeights[p.lotCode];
  if(!target)throw new Error(`Chưa có khối lượng cho ${p.lotCode}`);
  const ratio=target/Number(p.values.weight);
  if(ratio<1)throw new Error('Không được giảm khối lượng.');
  if(p.values.seller==='Trần Văn Minh'){
   const h=harvests.find(h=>h.id===p.values.harvestRecordId);
   if(!h || h.buyerFacilityId!==facility.id || harvestWeights[h.code]!==target)throw new Error('Nguồn thu hoạch và thu mua không khớp.');
  }
  const chain=[p];
  for(const stage of STAGES.slice(1)){
   const found=original.records[stage].filter(r=>r.sourceId===chain.at(-1)!.id);
   if(found.length>1)throw new Error('Lô có nhiều nhánh.');
   if(!found.length)break;
   chain.push(found[0]);
  }
  let validation:GmpState={records:{purchases:[],receiving:[],preprocessing:[],packaging:[],inspection:[],sales:[],aftersales:[]},payments:[],demo:original.demo};
  for(let s=0;s<chain.length;s++){
   const stage=STAGES[s],old=chain[s],v={...old.values};
   const source=s?validation.records[STAGES[s-1]].at(-1)!:undefined;
   if(stage==='purchases'){v.weight=target;v.total=target*Number(v.price);}
   if(stage==='receiving'){
    for(const key of ['grade1','grade2','rejected'])v[key]=Math.round(Number(v[key])*ratio);
    v.grade3=target-Number(v.grade1)-Number(v.grade2)-Number(v.rejected);
   }
   if(stage==='preprocessing'){
    const accepted=Number(source!.values.grade1)+Number(source!.values.grade2)+Number(source!.values.grade3);
    // Preserve the existing small absolute cleaning loss (0–10 kg).
    const loss=Number(old.values.inputWeight)-Number(old.values.outputWeight);
    if(loss<0 || loss>10)throw new Error('Hao hụt sơ chế ngoài dự kiến.');
    v.inputWeight=accepted;v.outputWeight=accepted-loss;
   }
   if(stage==='packaging'){
    const perBox=Number(old.values.weight_kg)/Number(old.values.quantity_boxes);
    if(!Number.isFinite(perBox)||perBox<=0)throw new Error('Quy cách đóng gói không hợp lệ.');
    v.inputWeight=Number(source!.values.outputWeight);
    v.quantity_boxes=Math.floor(Number(v.inputWeight)/perBox);
    v.weight_kg=Math.round(Number(v.quantity_boxes)*perBox*100)/100;
   }
   if(stage==='inspection'){
    const boxes=Number(source!.values.quantity_boxes),weight=Number(source!.values.weight_kg);
    v.inputBoxes=boxes;v.inputWeight=weight;
    const oldSamples=Number(v.sample1)+Number(v.sample2)+Number(v.sample3);
    const samples=Math.max(1,Math.ceil(boxes*0.02));
    v.sample1=oldSamples?Math.floor(samples*Number(v.sample1)/oldSamples):samples;
    v.sample2=oldSamples?Math.floor(samples*Number(v.sample2)/oldSamples):0;
    v.sample3=samples-Number(v.sample1)-Number(v.sample2);
    v.quantity_boxes=isFailed(stage,v)?0:boxes;v.weight_kg=isFailed(stage,v)?0:weight;
   }
   if(stage==='sales'){v.quantity_boxes=source!.values.quantity_boxes;v.weight_kg=source!.values.weight_kg;}
   if(stage==='aftersales' && v.weight_kg!==undefined)v.weight_kg=source!.values.weight_kg;
   validation=saveRecord(validation,stage,{sourceId:s?chain[s-1].id:undefined,season:old.season,values:v},old.id);
   const checked=validation.records[stage].at(-1)!;
   checked.lotCode=old.lotCode;
   checked.values={...old.values,...checked.values};
   if(stage==='purchases')checked.values.purchaseCode=old.lotCode;
   else checked.values.lotCode=old.lotCode;
   if(stage==='aftersales' && v.weight_kg!==undefined)checked.values.weight_kg=v.weight_kg;
   next.records[stage]=next.records[stage].map(r=>r.id===old.id?checked:r);
  }
  report.push({seller:p.values.seller,code:p.lotCode,before:Number(p.values.weight),after:target,total:target*Number(p.values.price),packed:validation.records.packaging[0]?.values.weight_kg,exported:validation.records.sales[0]?.values.weight_kg});
 }
 console.log(JSON.stringify({harvestWeights,purchases:report},null,2));
 // Ensure no records or cash payments are removed or duplicated.
 for(const stage of STAGES)if(next.records[stage].length!==original.records[stage].length)throw new Error('Số dòng thay đổi.');
 if(canonical(next.payments)!==canonical(original.payments))throw new Error('Thanh toán bị thay đổi.');
 const normalized=normalizeGmpState(next).state;
 for(const stage of STAGES)for(const r of next.records[stage]){
  const after=normalized.records[stage].find(x=>x.id===r.id)!;
  for(const key of ['weight','total','grade1','grade2','grade3','rejected','inputWeight','outputWeight','weight_kg','quantity_boxes','inputBoxes','sample1','sample2','sample3']){
   if(canonical(after.values[key])!==canonical(r.values[key]))throw new Error(`Tải lại trang sẽ làm lệch ${r.lotCode}: ${key}`);
  }
 }
 if(!process.argv.includes('--apply'))return;
 await mkdir('.storage/backups',{recursive:true});
 const backup=`.storage/backups/trian-resize-${Date.now()}.json`;
 await writeFile(backup,JSON.stringify({workspace,harvests},null,2),{flag:'wx'});
 await db.$transaction(async tx=>{
  const result=await tx.processingGmpWorkspace.updateMany({where:{ownerId:workspace.ownerId,revision:workspace.revision},data:{data:next as unknown as Prisma.InputJsonValue,revision:{increment:1}}});
  if(result.count!==1)throw new Error('Có cập nhật đồng thời.');
  for(const h of harvests){
   const weight=harvestWeights[h.code];
   const ratio=weight/Number(h.actualWeight??h.expectedWeight);
   const result=await tx.harvestRecord.updateMany({where:{id:h.id,updatedAt:h.updatedAt},data:{weightUnit:'kg',expectedWeight:weight,expectedSaleWeight:weight,actualWeight:weight,deliveredWeight:weight,receivedWeight:weight,...(h.actualFruitCount!==null?{actualFruitCount:Math.round(h.actualFruitCount*ratio)}:{}),...(h.expectedFruitCount!==null?{expectedFruitCount:Math.round(h.expectedFruitCount*ratio)}:{})}});
   if(result.count!==1)throw new Error('Thu hoạch đã thay đổi đồng thời.');
   const totalVariety=h.varietyItems.reduce((s,r)=>s+Number(r.expectedWeight),0);
   let allocated=0;
   for(let i=0;i<h.varietyItems.length;i++){
    const item=h.varietyItems[i];
    const itemWeight=i===h.varietyItems.length-1?weight-allocated:Math.round(weight*Number(item.expectedWeight)/totalVariety*100)/100;
    allocated+=itemWeight;
    await tx.harvestVarietyItem.update({where:{id:item.id},data:{expectedWeight:itemWeight}});
   }
   if(h.harvestLot){
    const consumed=Number(h.harvestLot.weight)-Number(h.harvestLot.remainingWeight);
    if(consumed!==0)throw new Error('Lô thu hoạch đã sử dụng.');
    await tx.harvestLot.update({where:{id:h.harvestLot.id},data:{weight,remainingWeight:weight}});
   }
  }
 },{timeout:30000});
 const saved=await db.processingGmpWorkspace.findUniqueOrThrow({where:{ownerId:workspace.ownerId}});
 if(canonical(saved.data)!==canonical(next))throw new Error('Sổ sau ghi không khớp.');
 const savedHarvests=await db.harvestRecord.findMany({where:{id:{in:harvests.map(h=>h.id)}}});
 for(const h of savedHarvests)if(['actualWeight','expectedWeight','expectedSaleWeight','deliveredWeight','receivedWeight'].some(k=>Number(h[k as keyof typeof h])!==harvestWeights[h.code]) || h.weightUnit!=='kg')throw new Error('Khối lượng thu hoạch sau ghi không khớp.');
 console.log(`Verified harvests and all GMP registers. Backup: ${backup}`);
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.$disconnect());
