import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { CERTIFICATE_MAX_BYTES, certificateExtension } from '@/lib/processing-certificate';
import { certificateIdentities } from '@/lib/certificate-access';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.isApproved === false) return NextResponse.json({ error: 'Không có quyền truy cập.' }, { status: 403 });
  const identities=await certificateIdentities(session.user.id,session.user.role);
  if(!identities.length) return NextResponse.json({ error: 'Không có quyền truy cập.' }, { status: 403 });
  const length = Number(request.headers.get('content-length') || 0);
  if (length > CERTIFICATE_MAX_BYTES + 65536) return NextResponse.json({ error: 'Ảnh tối đa 5 MB.' }, { status: 413 });
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File) || !file.size || file.size > CERTIFICATE_MAX_BYTES) return NextResponse.json({ error: 'Chọn ảnh PNG, JPG hoặc WebP, tối đa 5 MB.' }, { status: 400 });
    const bytes = Buffer.from(await file.arrayBuffer());
    const extension = certificateExtension(bytes);
    if (!extension) return NextResponse.json({ error: 'Định dạng ảnh không hợp lệ. Chỉ nhận PNG, JPG, WebP.' }, { status: 400 });
    const owner = createHash('sha256').update(identities[0]).digest('hex');
    const directory = path.join(process.cwd(), '.storage', 'processing-certificates', owner);
    await mkdir(directory, { recursive: true });
    const name = `${randomUUID()}.${extension}`;
    await writeFile(path.join(directory, name), bytes, { flag: 'wx' });
    return NextResponse.json({ url: `/api/processing/gmp/certificates/${name}` });
  } catch { return NextResponse.json({ error: 'Không thể tải ảnh giấy kiểm nghiệm.' }, { status: 500 }); }
}
