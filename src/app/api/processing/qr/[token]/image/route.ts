import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { publicProcessingTrace } from '@/lib/processing-qr';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, { params }: { params: { token: string } }) {
  const publication = await publicProcessingTrace(params.token);
  if (!publication) return NextResponse.json({ error: 'Không tìm thấy mã QR.' }, { status: 404 });
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const url = new URL('/trace/packing/' + params.token, origin).toString();
  const image = await QRCode.toBuffer(url, { width: 600, margin: 2, errorCorrectionLevel: 'M' });
  const filename = `QR-${publication.snapshot?.sale?.lot || params.token}.png`;
  return new Response(new Uint8Array(image), { headers: { 'Content-Type': 'image/png', 'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'no-store' } });
}
