import { prisma } from './prisma';
export type PublicExportTrip={code:string;exporter:string;boxes:number;weight:number;status:string;carrier:string;truck:string;container:string;seal:string;departurePort:string;destinationPort:string;expectedDate:string;actualDate:string;arrivalDate:string;country:string;importer:string};
export async function publishedExportTrips(ownerId:string,saleId:string,lotCode:string) {
 const handovers=await prisma.exporterHandover.findMany({where:{ownerId,OR:[{saleId},{snapshot:{path:['lotCode'],equals:lotCode}}]},select:{id:true}});
 if(!handovers.length)return {exporterManaged:false,exportShipments:[] as PublicExportTrip[]};
 const rows=await prisma.exporterShipmentAllocation.findMany({where:{handoverId:{in:handovers.map(h=>h.id)},shipment:{isPublic:true,status:{in:['CONFIRMED','EXPORTED']}}},include:{shipment:{include:{exporter:{select:{name:true}}}}},orderBy:{shipment:{createdAt:'asc'}}});
 return {exporterManaged:true,exportShipments:rows.map(a=>{
  const data=a.shipment.data as Record<string,string>;
  return {code:a.shipment.code,exporter:a.shipment.exporter.name,boxes:a.boxes,weight:Number(a.weight),status:a.shipment.status,carrier:data.carrier||'',truck:data.truck||'',container:data.container||'',seal:data.seal||'',departurePort:data.departurePort||'',destinationPort:data.destinationPort||'',expectedDate:data.expectedDate||'',actualDate:data.actualDate||'',arrivalDate:data.arrivalDate||'',country:data.country||'',importer:data.importer||''};
 })};
}
