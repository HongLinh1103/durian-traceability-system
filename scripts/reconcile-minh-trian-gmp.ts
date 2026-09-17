import { loadEnvConfig } from '@next/env';
import { PrismaClient, Prisma } from '@prisma/client';
import { mkdir, writeFile } from 'node:fs/promises';
import { GmpState, STAGES } from '../src/lib/processing-gmp';

loadEnvConfig(process.cwd());
const db = new PrismaClient();
const isMinh = (name: unknown) => String(name || '').normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi') === 'trần văn minh';
async function main() {
 const facilities = await db.partnerFacility.findMany({where:{name:'Cơ sở Chế biến Sầu riêng Trị An',deletedAt:null}});
 if(facilities.length !== 1) throw new Error('Cơ sở không xác định duy nhất.');
 const facility = facilities[0];
 const harvests = await db.harvestRecord.findMany({where:{code:{in:['TH-2526-2007','TH-2526-2908']},buyerFacilityId:facility.id,farmer:{fullName:'Trần Văn Minh'}}});
 if(harvests.length !== 2) throw new Error('Thiếu hai lô nguồn.');
 const row = await db.processingGmpWorkspace.findUniqueOrThrow({where:{ownerId:facility.ownerId}});
 const original = row.data as unknown as GmpState;
 const next = structuredClone(original);
 const keep = new Set(harvests.map(h => `harvest-${h.id}-purchases`));
 for(const h of harvests) {
  const r = next.records.purchases.find(r=>r.id === `harvest-${h.id}-purchases`);
  const weight=h.code==='TH-2526-2007'?1140:4500;
  const price=h.code==='TH-2526-2007'?52000:55000;
  const date=h.code==='TH-2526-2007'?'2026-07-20':'2026-08-29';
  if(!r || !isMinh(r.values.seller) || Number(h.actualWeight)!==weight || Number(h.expectedPricePerKg)!==price || (h.actualHarvestedAt || h.expectedHarvestDate).toISOString().slice(0,10)!==date) throw new Error('Dữ liệu nguồn không khớp ảnh.');
  Object.assign(r.values,{date,weight,price,total:weight*price,harvestCode:h.code,harvestRecordId:h.id});
  r.season='2025-2026';
 }
 const removed = new Set(original.records.purchases.filter(r=>isMinh(r.values.seller) && !keep.has(r.id)).map(r=>r.id));
 // Follow source IDs, never names or shared origin text in downstream records.
 for(const stage of STAGES.slice(1)) for(const r of original.records[stage]) {
  if(removed.has(r.sourceId)) removed.add(r.id);
 }
 for(const stage of STAGES) next.records[stage]=next.records[stage].filter(r=>!removed.has(r.id));
 next.payments=next.payments.filter(p=>!removed.has(p.recordId));
 for(const stage of STAGES) for(const r of original.records[stage]) {
  if(!removed.has(r.id) && !keep.has(r.id) && JSON.stringify(next.records[stage].find(x=>x.id===r.id))!==JSON.stringify(r)) throw new Error('Đã thay đổi bản ghi ngoài phạm vi.');
 }
 const remaining = next.records.purchases.filter(r=>isMinh(r.values.seller));
 if(remaining.length!==2 || remaining.reduce((s,r)=>s+Number(r.values.weight),0)!==5640 || remaining.reduce((s,r)=>s+Number(r.values.total),0)!==306780000) throw new Error('Tổng thu mua không khớp.');
 const allIds=new Set(STAGES.flatMap(s=>next.records[s].map(r=>r.id)));
 if(next.payments.some(p=>!allIds.has(p.recordId))) throw new Error('Thanh toán mất liên kết.');
 for(const stage of STAGES.slice(1)) for(const r of next.records[stage]) {
  const previous=STAGES[STAGES.indexOf(stage)-1];
  if(!next.records[previous].some(p=>p.id===r.sourceId)) throw new Error('Bản ghi mất liên kết nguồn.');
 }
 console.log(JSON.stringify({facility:facility.name,removePurchases:original.records.purchases.filter(r=>removed.has(r.id)).map(r=>({id:r.id,code:r.lotCode,...r.values})),removedByStage:Object.fromEntries(STAGES.map(s=>[s,original.records[s].filter(r=>removed.has(r.id)).length])),removedPayments:original.payments.length-next.payments.length,keepPurchases:remaining},null,2));
 if(!process.argv.includes('--apply')) return;
 if(JSON.stringify(original)===JSON.stringify(next)) {console.log('Already reconciled; no changes.');return;}
 await mkdir('.storage/backups',{recursive:true});
 const backup=`.storage/backups/trian-minh-${Date.now()}.json`;
 await writeFile(backup,JSON.stringify(row,null,2),{flag:'wx'});
 const updated=await db.processingGmpWorkspace.updateMany({where:{ownerId:facility.ownerId,revision:row.revision},data:{data:next as unknown as Prisma.InputJsonValue,revision:{increment:1}}});
 if(updated.count!==1) throw new Error('Có cập nhật đồng thời. Chưa ghi thay đổi, chạy lại.');
 const saved=await db.processingGmpWorkspace.findUniqueOrThrow({where:{ownerId:facility.ownerId}});
 // JSONB may reorder object keys; compare canonical objects.
 const canonical=(v:any):string=>JSON.stringify(v,(_k,value)=>value && typeof value==='object' && !Array.isArray(value)?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b))):value);
 if(canonical(saved.data)!==canonical(next)) throw new Error('Đối chiếu sau ghi thất bại.');
 console.log(`Verified saved data; other sellers preserved. Backup: ${backup}`);
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.$disconnect());
