import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { ProductionSystemTabs } from '@/components/processing/production-system-tabs';
import { ProcessingGmpView } from '@/components/processing/processing-gmp-view';
import { OtherProcessingView } from '@/components/processing/other-processing-view';
import { freshBooks, otherBooks } from '@/lib/processing-navigation';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: {
    params: {
        book: string;
    };
}) { const session = await getServerSession(authOptions); if (!session?.user?.id || session.user.role !== 'PROCESSING_FACILITY')
    redirect('/login'); const other = false; if (!(other ? otherBooks : freshBooks).some(b => b.key === params.book))
    notFound(); return <main className="mx-auto w-full max-w-[1650px] space-y-4 px-3 py-6 sm:px-6"><ProductionSystemTabs other={other}/>{other ? <OtherProcessingView book={params.book}/> : <ProcessingGmpView embedded screen={params.book as 'preprocessing' | 'packaging' | 'inspection' | 'sales' | 'aftersales'}/>}</main>; }
