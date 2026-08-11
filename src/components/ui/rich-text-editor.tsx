"use client";

import { useRef } from "react";
import { Bold, Italic, List, ListOrdered, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RichTextEditor({ name, initialValue = "", placeholder }: { name: string; initialValue?: string; placeholder?: string }) {
    const editorRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    function syncValue() {
        if (inputRef.current) inputRef.current.value = editorRef.current?.innerHTML || "";
    }

    function command(commandName: string, commandValue?: string) {
        editorRef.current?.focus();
        document.execCommand(commandName, false, commandValue);
        syncValue();
    }

    function insertTable() {
        command("insertHTML", '<table border="1"><tbody><tr><th>Tiêu đề 1</th><th>Tiêu đề 2</th></tr><tr><td>Nội dung</td><td>Nội dung</td></tr></tbody></table><p><br></p>');
    }

    return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-1 border-b bg-slate-50 p-2">
            <ToolbarButton title="In đậm" onClick={() => command("bold")}><Bold className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton title="In nghiêng" onClick={() => command("italic")}><Italic className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton title="Danh sách bullet" onClick={() => command("insertUnorderedList")}><List className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton title="Danh sách đánh số" onClick={() => command("insertOrderedList")}><ListOrdered className="h-4 w-4" /></ToolbarButton>
            <ToolbarButton title="Chèn bảng" onClick={insertTable}><Table2 className="h-4 w-4" /></ToolbarButton>
            <label className="ml-1 flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">Màu chữ<input type="color" className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0" onChange={(event) => command("foreColor", event.target.value)} /></label>
        </div>
        <div ref={editorRef} contentEditable suppressContentEditableWarning onInput={syncValue} data-placeholder={placeholder} className="min-h-32 cursor-text p-3 font-normal text-slate-900 outline-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)] [&_ol]:ml-6 [&_ol]:list-decimal [&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-300 [&_td]:p-2 [&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-100 [&_th]:p-2 [&_ul]:ml-6 [&_ul]:list-disc" dangerouslySetInnerHTML={{ __html: initialValue }} />
        <input ref={inputRef} type="hidden" name={name} defaultValue={initialValue} />
    </div>;
}

function ToolbarButton({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
    return <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" title={title} onMouseDown={(event) => event.preventDefault()} onClick={onClick}>{children}</Button>;
}
