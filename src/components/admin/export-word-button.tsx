"use client";
import { useState } from "react";

export default function ExportWordButton({ title, headers, rows, filename }: { title: string; headers: string[]; rows: (string | number)[][]; filename: string }) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    async function download() {
        setBusy(true); setError("");
        try {
            const { createTableWord } = await import("@/lib/admin-table-word");
            const blob = await createTableWord(title, headers, rows);
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url; anchor.download = filename + ".docx";
            document.body.appendChild(anchor); anchor.click(); anchor.remove();
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch { setError("Không thể xuất file. Vui lòng thử lại."); }
        finally { setBusy(false); }
    }
    return <div><button type="button" disabled={busy || !rows.length} onClick={download} className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Đang xuất..." : "Xuất file"}</button>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}</div>;
}
