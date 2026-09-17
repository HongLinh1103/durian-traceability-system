import { loadEnvConfig } from '@next/env';
import { PrismaClient, Prisma } from '@prisma/client';
import { GmpState, GmpRecord, REGISTERS, STAGES, saveRecord, normalizeGmpState } from '../src/lib/processing-gmp';
loadEnvConfig(process.cwd());
const db = new PrismaClient();
async function main() {
 const facility = await db.partnerFacility.findFirstOrThrow({where:{name:'Cơ sở Chế biến Sầu riêng Trị An',deletedAt:null}});
 const harvests = await db.harvestRecord.findMany({where:{code:{in:['TH-2526-2007','TH-2526-2908']},buyerFacilityId:facility.id,farmer:{fullName:'Trần Văn Minh'}},include:{farmer:{select:{fullName:true,phone:true}},farm:{include:{region:true}},cropSeason:true},orderBy:{expectedHarvestDate:'asc'}});
 if(harvests.length!==2) throw new Error('Không tìm đủ hai lô đúng người bán và người mua.');
 const row = await db.processingGmpWorkspace.findUniqueOrThrow({where:{ownerId:facility.ownerId}});
 let state = normalizeGmpState(row.data as unknown as GmpState).state;
 const original = structuredClone(state);
 for(const h of harvests) {
  const id = `harvest-${h.id}-purchases`;
  if(state.records.purchases.some(r=>r.id===id)) continue;
  const date=(h.actualHarvestedAt || h.expectedHarvestDate).toISOString().slice(0,10);
  const weight=Number(h.actualWeight); const price=Number(h.expectedPricePerKg);
  if(weight!==(h.code==='TH-2526-2007'?1140:4500) || price!==(h.code==='TH-2526-2007'?52000:55000)) throw new Error('Dữ liệu nguồn đã thay đổi, cần đối chiếu lại.');
  const address=[h.farm.address,h.farm.ward,h.farm.district,h.farm.province].filter(Boolean).join(', ');
  state=saveRecord(state,'purchases',{season:h.cropSeason!.name,values:{date,seller:h.farmer.fullName!,weight,price,phone:h.farmer.phone,address,notes:`Nguồn: ${h.code}. Khối lượng và giá theo sổ thu hoạch; cân nhận cũ chưa đối soát.`,harvestCode:h.code}},id);
  const purchase=state.records.purchases.find(r=>r.id===id)!;
  purchase.values.harvestCode=h.code;
  purchase.values.harvestRecordId=h.id;
  const lotCode=purchase.lotCode.replace(/^TM-/,'LH-');
  let sourceId=id;
  for(const stage of STAGES.filter(s=>s!=='purchases')) {
   const values: GmpRecord['values']=Object.fromEntries(REGISTERS[stage].fields.map(f=>[f.key,'']));
   Object.assign(values,{lotCode,variety:h.durianVariety,productLot:`${h.durianVariety} · ${lotCode}`,harvestCode:h.code,harvestRecordId:h.id,notes:`Nguồn: ${h.code}. Chờ bổ sung dữ liệu thực tế.`,seller:h.farmer.fullName!});
   if(stage==='receiving') Object.assign(values,{puc:h.farm.region?.code || '',origin:`${h.farm.farmName}, ${address}`,purchaseCode:purchase.lotCode});
   if(stage==='aftersales') Object.assign(values,{purchaseDate:date,puc:h.farm.region?.code || '',gardenInfo:`${h.farm.farmName}, ${address}`});
   const record:GmpRecord={id:`harvest-${h.id}-${stage}`,sourceId,season:purchase.season,lotCode,values,draft:true};
   state.records[stage].push(record); sourceId=record.id;
  }
 }
 for(const stage of STAGES) for(const old of original.records[stage]) {
  if(JSON.stringify(state.records[stage].find(r=>r.id===old.id))!==JSON.stringify(old)) throw new Error('Dữ liệu cũ bị thay đổi.');
 }
 if(JSON.stringify(state)!==JSON.stringify(original)) {
  const result=await db.processingGmpWorkspace.updateMany({where:{ownerId:facility.ownerId,revision:row.revision},data:{data:state as unknown as Prisma.InputJsonValue,revision:{increment:1}}});
  if(result.count!==1) throw new Error('Có cập nhật đồng thời, hãy chạy lại.');
 }
 const verified=await db.processingGmpWorkspace.findUniqueOrThrow({where:{ownerId:facility.ownerId}});
 const saved=verified.data as unknown as GmpState;
 for(const stage of STAGES) {
  const added=saved.records[stage].filter(r=>harvests.some(h=>r.id===`harvest-${h.id}-${stage}`));
  if(added.length!==2 || (stage!=='purchases' && added.some(r=>!r.draft || r.values.date || r.values.weight_kg || r.values.price))) throw new Error(`Kiểm tra thất bại: ${stage}`);
  console.log(stage,added.map(r=>({code:r.lotCode,harvest:r.values.harvestCode,draft:!!r.draft,weight:r.values.weight,total:r.values.total})));
 }
 console.log('Verified: existing rows preserved, 2 linked lots per register; unknown fields blank.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.$disconnect());
