import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { exporterContext } from '@/lib/exporter-service';
import { GmpState, Stage } from '@/lib/processing-gmp';
export const dynamic='force-dynamic';
export async function GET(_:Request,{params}:{params:{id:string}}){
 let context;try{context=await exporterContext();}catch(error){return NextResponse.json({error:(error as Error).message},{status:403});}
 const handover=await prisma.exporterHandover.findFirst({where:{id:params.id,exporterId:context.organization.id}});
 if(!handover)return NextResponse.json({error:'Không tìm thấy lô được bàn giao.'},{status:404});
 const row=await prisma.processingGmpWorkspace.findUnique({where:{ownerId:handover.ownerId}});
 const state=row?.data as unknown as GmpState|undefined;
 if(!state)return NextResponse.json({error:'Chưa có dữ liệu nguồn.'},{status:404});
 const sale=state.records.sales.find(r=>r.id===handover.saleId);
 if(!sale)return NextResponse.json({error:'Không tìm thấy bản ghi nguồn.'},{status:404});
 const stages:Stage[]=['sales','inspection','packaging','preprocessing'];
 let sourceId=sale.id;
 const processing=stages.flatMap(stage=>{const r=state.records[stage].find(x=>x.id===sourceId);if(!r)return [];sourceId=r.sourceId;return [{stage,title:({sales:'Bàn giao',inspection:'Kiểm tra',packaging:'Đóng gói',preprocessing:'Sơ chế'} as Record<string,string>)[stage],date:r.values.date,lotCode:r.lotCode,variety:r.values.variety,quality:r.values.qualityOk,boxes:r.values.quantity_boxes,weight:r.values.weight_kg,dryStart:r.values.dryStart,dryEnd:r.values.dryEnd}];});
 const lot=state.productionLots?.find(l=>l.id===sourceId);
 const ids=lot?.allocations.filter(a=>a.active).map(a=>a.receivingId)||[sourceId];
 const sources=state.records.receiving.filter(r=>ids.includes(r.id)).map(r=>({date:r.values.date,puc:r.values.puc,origin:r.values.origin,variety:r.values.variety,harvestCode:r.values.harvestCode,weight:r.values.acceptedWeight}));
 return NextResponse.json({processing,sources});
}
