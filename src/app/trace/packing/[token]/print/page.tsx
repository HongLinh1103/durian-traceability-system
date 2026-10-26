import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { getServerSession } from 'next-auth';
import QRCode from 'qrcode';
import { authOptions } from '@/lib/auth';
import { exportLabelData } from '@/lib/export-label-service';
import { ExportLabelPreview } from '@/components/processing/export-label-preview';
export const dynamic = 'force-dynamic';
export default async function PrintPage({ params }: { params: { token: string } }) {
  const session = await getServerSession(authOptions);
  const data = await exportLabelData(params.token, session?.user?.id);
  if (!data) notFound();
  const h = headers();
  const origin = process.env.NEXT_PUBLIC_APP_URL || `${h.get('x-forwarded-proto') || 'http'}://${h.get('host')}`;
  const url = new URL('/trace/packing/' + params.token, origin).toString();
  const image = await QRCode.toDataURL(url, { width:900,margin:4,errorCorrectionLevel:'M' });
  return <ExportLabelPreview data={data} qrImage={image} />;
}
