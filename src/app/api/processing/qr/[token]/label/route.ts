import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { exportLabelSchema, validateLabelSource } from '@/lib/export-label';
import { exportLabelData } from '@/lib/export-label-service';

export async function PUT(request: Request, { params }: { params: { token: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'PROCESSING_FACILITY') return NextResponse.json({ error: 'Không có quyền chỉnh sửa tem.' }, { status: 403 });
  const data = await exportLabelData(params.token, session.user.id);
  if (!data?.canEdit) return NextResponse.json({ error: 'Không tìm thấy tem thuộc cơ sở này.' }, { status: 404 });
  const parsed = exportLabelSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  try { validateLabelSource(parsed.data, data); }
  catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }); }
  await prisma.processingQrPublication.update({ where: { token: params.token }, data: { labelConfig: parsed.data } });
  return NextResponse.json({ ok: true });
}
