import { QrScanner } from "@/components/trace/qr-scanner";

export const metadata = { title: "Tra cứu nguồn gốc sầu riêng | TriViet", description: "Quét mã QR để xem thông tin vùng trồng, vườn trồng và quá trình sản xuất sầu riêng." };

export default function QrScannerPage() {
    return <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="mx-auto mb-7 max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand-600">Truy xuất nguồn gốc</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Tra cứu nguồn gốc sầu riêng</h1>
            <p className="mt-4 text-base leading-7 text-slate-600">Quét mã QR trên sản phẩm hoặc bao bì để xem thông tin vùng trồng, vườn trồng, quá trình canh tác, thu hoạch và đóng gói.</p>
        </header>
        <QrScanner />
    </main>;
}
