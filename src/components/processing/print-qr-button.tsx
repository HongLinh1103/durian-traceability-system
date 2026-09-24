'use client';

import { Printer } from 'lucide-react';

export default function PrintQrButton() {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2 text-sm font-bold text-white shadow hover:bg-emerald-800 transition"
      onClick={() => window.print()}
    >
      <Printer className="h-4 w-4" />
      In mã QR
    </button>
  );
}
