import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { processingQrRows, issueProcessingQr } from '@/lib/processing-qr';
export const dynamic = 'force-dynamic';
async function owner() {
  const s = await getServerSession(authOptions);
  if (!s?.user?.id) return null;
  if (s.user.role === 'PROCESSING_FACILITY' && s.user.isApproved !== false) return s.user.id;
  if (s.user.role === 'ADMIN') {
    const facility = await prisma.user.findFirst({ where: { role: 'PROCESSING_FACILITY' }, select: { id: true } });
    return facility?.id || s.user.id;
  }
  return null;
}
export async function GET() {
  const id = await owner(); if (!id) return NextResponse.json({ error: 'Không có quyền truy cập.' }, { status: 403 });
  try { return NextResponse.json(await processingQrRows(id)); } catch (error) { console.error(error); return NextResponse.json({ error: 'Không thể tải danh sách QR.' }, { status: 500 }); }
}
export async function POST(request: Request) {
  const id = await owner(); if (!id) return NextResponse.json({ error: 'Không có quyền truy cập.' }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.saleId !== 'string' || !Number.isInteger(body.revision)) return NextResponse.json({ error: 'Dữ liệu không hợp lệ.' }, { status: 400 });
  try { return NextResponse.json({ token: await issueProcessingQr(id, body.saleId, body.revision) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Không thể tạo QR.' }, { status: 400 }); }
}
