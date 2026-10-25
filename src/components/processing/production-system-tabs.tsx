'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {processingGroups} from '@/lib/processing-navigation';
export function ProductionSystemTabs({other=false}:{other?:boolean}) {
 const path=usePathname(),group=processingGroups[other?1:0];
 const current=group.items.find(item=>item.href===path)||group.items[0];
 return <header className="min-w-0 space-y-3">
 <nav aria-label="Đường dẫn" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 sm:text-sm"><Link href="/dashboard/processing" className="hover:text-emerald-700">Cơ sở chế biến & đóng gói</Link><span aria-hidden="true">/</span><Link href={group.path} className="hover:text-emerald-700">{group.label}</Link><span aria-hidden="true">/</span><span aria-current="page">{current.label}</span></nav>
 <h1 className="text-[28px] font-black leading-tight text-slate-900 sm:text-[32px]">{current.label.toLocaleUpperCase('vi')}</h1>
 <nav aria-label={'Các sổ '+group.label} className="flex max-w-full gap-1 overflow-x-auto border-b border-slate-200">{group.items.map(item=><Link key={item.href} href={item.href} aria-current={path===item.href?'page':undefined} className={'shrink-0 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-colors '+(path===item.href?'border-emerald-600 text-emerald-700':'border-transparent text-slate-600 hover:text-emerald-700')}>{item.label.replace(/^Sổ /,'')}</Link>)}</nav>
 </header>;
}
