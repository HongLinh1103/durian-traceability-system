import { getServerSession } from 'next-auth';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getManagedRegionScope } from '@/lib/region-manager-scope';
import { CultivationLogsTab } from '@/components/farmer/cultivation-logs-tab';
export const dynamic = 'force-dynamic';
export default async function GardenLogsPage({params}:{params:{gardenId:string}}) {
  const session=await getServerSession(authOptions);
  if(!session?.user?.id)redirect('/login');
  const scope=await getManagedRegionScope(session.user.id,session.user.role);
  if(!scope)redirect('/');
  const garden=await prisma.farm.findFirst({where:{id:params.gardenId,isActive:true,region:{code:{in:scope.codes}},farmer:{accountStatus:'APPROVED',isApproved:true,deletedAt:null}},select:{id:true,farmCode:true,farmName:true,farmer:{select:{fullName:true,phone:true}},region:{select:{code:true,name:true}}}});
  if(!garden)notFound();
  return <main className="min-h-screen w-full max-w-none space-y-5 px-3 py-6 sm:px-5">
    <Link className="inline-flex rounded-xl border bg-white px-4 py-2 text-sm font-semibold" href="/region-manager/gardens">← Quay lại danh sách vườn</Link>
    <header className="rounded-2xl border border-emerald-100 bg-white p-5"><p className="text-sm font-semibold text-emerald-700">{garden.farmCode}</p><h1 className="mt-1 text-2xl font-bold">Nhật ký · {garden.farmName}</h1><p className="mt-2 text-sm text-slate-600">Chủ vườn: {garden.farmer.fullName||garden.farmer.phone} · {garden.farmer.phone}<br/>{garden.region?.code} · {garden.region?.name}</p></header>
    <CultivationLogsTab farmId={garden.id} farmName={garden.farmName} regionCode={garden.region?.code} managed />
  </main>;
}
