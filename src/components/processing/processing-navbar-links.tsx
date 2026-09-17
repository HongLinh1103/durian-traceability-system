'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const groups = [
    {
        label: 'Thu mua', items: [
            { label: 'Sổ thu mua', href: '/dashboard/processing/purchases' },
            { label: 'Sổ nhập hàng', href: '/dashboard/processing/grading' },
        ]
    },
    {
        label: 'Sản xuất', items: [
            { label: 'Sổ Tiếp nhận & Sơ chế', href: '/dashboard/processing/preprocessing' },
            { label: 'Sổ Đóng gói & Nhập kho', href: '/dashboard/processing/processing' },
            { label: 'Sổ Kiểm tra trước Xuất bán', href: '/dashboard/processing/inspection' },
        ]
    },
    {
        label: 'Xuất bán', items: [
            { label: 'Sổ theo dõi Xuất bán', href: '/dashboard/processing/shipments' },
            { label: 'Sổ theo dõi sau Xuất bán', href: '/dashboard/processing/aftersales' },
        ]
    },
];
const linkClass = 'flex items-center gap-1 whitespace-nowrap rounded-2xl px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

export function ProcessingNavbarLinks() {
    const pathname = usePathname();
    const [open, setOpen] = useState<string | null>(null);
    const root = useRef<HTMLDivElement>(null);
    const triggers = useRef<Record<string, HTMLButtonElement | null>>({});
    const active = (href: string) => pathname === href || (href !== '/dashboard/processing' && pathname.startsWith(`${href}/`));
    const colors = (selected: boolean) => selected ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900';

    useEffect(() => { setOpen(null); }, [pathname]);
    useEffect(() => {
        if (!open) return;
        const dismiss = (event: PointerEvent) => {
            if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(null);
        };
        document.addEventListener('pointerdown', dismiss);
        return () => document.removeEventListener('pointerdown', dismiss);
    }, [open]);

    return <div ref={root} className="flex items-center gap-1" onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(null);
    }} onKeyDown={event => {
        if (event.key === 'Escape' && open) {
            event.preventDefault();
            triggers.current[open]?.focus();
            setOpen(null);
        }
    }}>
        <Link href="/dashboard/processing" aria-current={active('/dashboard/processing') ? 'page' : undefined} className={cn(linkClass, colors(active('/dashboard/processing')))}>Tổng quan</Link>
        <Link href="/china-port" aria-current={active('/china-port') ? 'page' : undefined} className={cn(linkClass, colors(active('/china-port')))}>China Port</Link>
        {groups.map((group, index) => <div key={group.label} className="relative">
            <button ref={element => { triggers.current[group.label] = element; }} type="button" aria-expanded={open === group.label} aria-controls={`processing-nav-group-${index}`} onClick={() => setOpen(open === group.label ? null : group.label)} className={cn(linkClass, colors(open === group.label || group.items.some(item => active(item.href))))}>
                {group.label}<ChevronDown className={cn('h-4 w-4 transition-transform', open === group.label && 'rotate-180')} />
            </button>
            {open === group.label && <div id={`processing-nav-group-${index}`} className="absolute left-0 top-full z-[70] mt-2 min-w-64 space-y-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                {group.items.map(item => <Link key={item.href} href={item.href} onClick={() => setOpen(null)} aria-current={active(item.href) ? 'page' : undefined} className={cn('block whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500', colors(active(item.href)))}>{item.label}</Link>)}
            </div>}
        </div>)}
        <Link href="/dashboard/processing/finance" aria-current={active('/dashboard/processing/finance') ? 'page' : undefined} className={cn(linkClass, colors(active('/dashboard/processing/finance')))}>Tài chính</Link>
    </div>;
}
