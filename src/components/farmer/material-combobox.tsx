"use client";
import { useId, useState } from "react";
export type MaterialOption = { id: string; name: string; quantity: number; unit: string; packaging?: string | null };
export function MaterialCombobox({ supplies, value, onChange }: { supplies: MaterialOption[]; value: string; onChange: (id: string) => void }) {
    const id = useId();
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    const selected = supplies.find(s => s.id === value);
    const options = supplies.filter(s => s.quantity > 0 && s.name.toLocaleLowerCase("vi").includes(query.toLocaleLowerCase("vi")));
    const choose = (s: MaterialOption) => { onChange(s.id); setOpen(false); setQuery(""); };
    return <div className="relative" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
        <input aria-label="Tên vật tư" role="combobox" aria-expanded={open} aria-controls={id} aria-autocomplete="list" aria-activedescendant={open && options[active] ? `${id}-${active}` : undefined}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" placeholder="Tìm kiếm hoặc chọn vật tư ▾"
            value={open ? query : selected?.name || ""} onFocus={() => { setOpen(true); setQuery(""); setActive(0); }}
            onChange={e => { setQuery(e.target.value); setActive(0); setOpen(true); }}
            onKeyDown={e => { if (e.key === "Escape") setOpen(false); if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); setOpen(true); setActive(i => Math.max(0, Math.min(options.length - 1, i + (e.key === "ArrowDown" ? 1 : -1)))); } if (e.key === "Enter" && open) { e.preventDefault(); if (options[active]) choose(options[active]); } }} />
        {open && <ul id={id} role="listbox" className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
            {options.map((s, i) => <li id={`${id}-${i}`} role="option" aria-selected={s.id === value} key={s.id} className={`cursor-pointer rounded-lg p-3 text-sm hover:bg-brand-50 ${i === active ? "bg-brand-50" : ""}`} onMouseDown={e => e.preventDefault()} onClick={() => choose(s)}>
                <span className="block font-semibold">{s.name}</span><span className="text-xs text-slate-500">Tồn: {s.quantity.toLocaleString("vi-VN")} {s.unit}{s.packaging ? ` · Quy cách: ${s.packaging}` : ""}</span>
            </li>)}
            {!options.length && <li className="p-3 text-sm text-slate-500">Không có vật tư còn tồn phù hợp.</li>}
        </ul>}
    </div>;
}
