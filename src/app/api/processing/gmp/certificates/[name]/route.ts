import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isCertificateLink } from '@/lib/processing-certificate';
import { certificateIdentities } from '@/lib/certificate-access';
export const runtime = 'nodejs';
export async function GET(_: Request, { params }: { params: { name: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.isApproved === false) return new Response(null, { status: 403 });
  if (!isCertificateLink(`/api/processing/gmp/certificates/${params.name}`)) return new Response(null, { status: 404 });
  try {
    const identities=await certificateIdentities(session.user.id,session.user.role,params.name);
    if(!identities.length)return new Response(null,{status:403});
    let bytes:Buffer|undefined;
    for(const identity of identities) {
     try {const owner=createHash('sha256').update(identity).digest('hex');bytes=await readFile(path.join(process.cwd(), '.storage', 'processing-certificates', owner, params.name));break;}catch{}
    }
    if(!bytes)return new Response(null,{status:404});
    const mime = params.name.endsWith('.png') ? 'image/png' : params.name.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
    return new Response(new Uint8Array(bytes), { headers: { 'Content-Type': mime, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, no-store', 'Content-Disposition': 'inline' } });
  } catch { return new Response(null, { status: 404 }); }
}
