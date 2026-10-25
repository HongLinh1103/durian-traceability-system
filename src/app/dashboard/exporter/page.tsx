import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ExporterDashboard } from '@/components/exporter/exporter-dashboard';
import { Suspense } from 'react';
export default async function ExporterPage(){
 const session=await getServerSession(authOptions);
 if(!session?.user || session.user.role!=='EXPORTER' || session.user.isApproved===false) redirect('/login');
 return <Suspense fallback={<p className="p-6">Đang tải hồ sơ xuất khẩu…</p>}><ExporterDashboard /></Suspense>;
}
