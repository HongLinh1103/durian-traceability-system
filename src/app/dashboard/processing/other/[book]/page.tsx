import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { ProductionSystemTabs } from '@/components/processing/production-system-tabs';
import { OtherRegisterView } from '@/components/processing/other-register-view';
import { isOtherRegisterKey, OtherRegisterState } from '@/lib/other-registers';
import { prisma } from '@/lib/prisma';
import { emptyProcessingState } from '@/lib/processing-receiving';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: {
    params: {
        book: string;
    };
}) {
 const session = await getServerSession(authOptions);
 if (!session?.user?.id || session.user.role !== 'PROCESSING_FACILITY' || session.user.isApproved === false) redirect('/login');
 if (!isOtherRegisterKey(params.book)) notFound();
 let initialState: OtherRegisterState | undefined;
 let initialRevision = 0;
 try {
  const row = await prisma.processingGmpWorkspace.findUnique({ where: { ownerId: session.user.id }, select: { data: true, revision: true } });
  initialState = row ? row.data as unknown as OtherRegisterState : emptyProcessingState();
  initialRevision = row?.revision ?? 0;
 } catch { /* The client can retry loading and display the existing error state. */ }
 return <main className="mx-auto w-full min-w-0 max-w-[1650px] space-y-4 px-3 py-6 sm:px-6"><ProductionSystemTabs other /><OtherRegisterView key={params.book} book={params.book} initialState={initialState} initialRevision={initialRevision} /></main>;
}
