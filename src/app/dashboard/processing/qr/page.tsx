import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import ProcessingQrManager from '@/components/processing/processing-qr-manager';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (session.user.role !== 'PROCESSING_FACILITY' && session.user.role !== 'ADMIN') || session.user.isApproved === false) {
    redirect('/login');
  }
  return <ProcessingQrManager />;
}
