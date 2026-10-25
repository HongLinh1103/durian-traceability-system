import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emptyProcessingState } from '@/lib/processing-receiving';
import { persistOtherRegister } from '@/lib/other-register-service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

async function owner() {
 const session = await getServerSession(authOptions);
 if (!session?.user.id || session.user.role !== 'PROCESSING_FACILITY' || session.user.isApproved === false) return null;
 const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true, isApproved: true, isLocked: true, deletedAt: true } });
 return user?.role === 'PROCESSING_FACILITY' && user.isApproved && !user.isLocked && !user.deletedAt ? session.user.id : null;
}

// GET never synchronizes or creates records; writes use an explicit POST with a workspace revision.
export async function GET() {
 try {
  const ownerId = await owner();
  if (!ownerId) return NextResponse.json({ error: 'Không có quyền truy cập.' }, { status: 403 });
  const row = await prisma.processingGmpWorkspace.findUnique({ where: { ownerId }, select: { data: true, revision: true } });
  return NextResponse.json({ state: row?.data || emptyProcessingState(), revision: row?.revision ?? 0 });
 } catch {
  return NextResponse.json({ error: 'Không thể tải dữ liệu sổ Chế biến khác.' }, { status: 500 });
 }
}

export async function POST(request: Request) {
 try {
  const ownerId = await owner();
  if (!ownerId) return NextResponse.json({ error: 'Không có quyền truy cập.' }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Dữ liệu JSON không hợp lệ.' }, { status: 400 }); }
  const input = z.object({ revision: z.number().int().nonnegative(), record: z.unknown() }).parse(body);
  return NextResponse.json(await persistOtherRegister(ownerId, input.revision, input.record));
 } catch (error) {
  if (error instanceof Error && error.message === 'OTHER_REGISTER_REVISION_CONFLICT') return NextResponse.json({ error: 'Sổ vừa được cập nhật. Dữ liệu trong form được giữ lại; tải lại sổ trước khi lưu tiếp.' }, { status: 409 });
  if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message || 'Dữ liệu không hợp lệ.' }, { status: 400 });
  if (error instanceof Error && !('code' in error)) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ error: 'Không thể lưu bản ghi vào cơ sở dữ liệu. Vui lòng thử lại.' }, { status: 500 });
 }
}
