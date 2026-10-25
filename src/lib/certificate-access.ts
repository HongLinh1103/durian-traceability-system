import { prisma } from './prisma';
export async function certificateIdentities(userId:string, role:string, filename?:string):Promise<string[]> {
 const user=await prisma.user.findUnique({where:{id:userId},include:{exporterOrganization:true}});
 if(!user?.isApproved || user.isLocked || user.deletedAt) return [];
 if(role==='PROCESSING_FACILITY' && user.role===role) return [userId];
 if(role!=='EXPORTER' || user.role!==role || !user.exporterOrganization?.isActive) return [];
 const own=`exporter:${user.exporterOrganization.id}`;
 if(!filename)return [own];
 const url=`/api/processing/gmp/certificates/${filename}`;
 const assigned=await prisma.exporterHandover.findMany({where:{exporterId:user.exporterOrganization.id,snapshot:{path:['certificate'],equals:url}},select:{ownerId:true}});
 return [own,...assigned.map(r=>r.ownerId)];
}
