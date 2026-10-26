import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { farmingFarmScope } from '@/lib/farming-log-access';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.isApproved === false) return new Response(null,{status:401});
  const file = await prisma.farmingLogMedia.findFirst({ where:{id:params.id,log:{farm:await farmingFarmScope(session.user.id,session.user.role)}} });
  if (!file) return new Response(null,{status:404});
  const headers = { 'Content-Type':file.mimeType,'Content-Disposition':`inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes' };
  const range = request.headers.get('range');
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    const start = match?.[1] ? Number(match[1]) : match?.[2] ? Math.max(0,file.fileSize-Number(match[2])) : 0;
    const end = match?.[1] && match?.[2] ? Math.min(Number(match[2]),file.fileSize-1) : file.fileSize-1;
    if (!match || start > end || start >= file.fileSize) return new Response(null,{status:416,headers:{...headers,'Content-Range':`bytes */${file.fileSize}`}});
    return new Response(new Uint8Array(file.bytes.subarray(start,end+1)),{status:206,headers:{...headers,'Content-Range':`bytes ${start}-${end}/${file.fileSize}`,'Content-Length':String(end-start+1)}});
  }
  return new Response(new Uint8Array(file.bytes),{headers:{...headers,'Content-Length':String(file.fileSize)}});
}
