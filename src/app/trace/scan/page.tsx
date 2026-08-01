import { QrScanner } from "@/components/trace/qr-scanner";

export const metadata = {
    title: "Quét mã QR | TriViet",
    description: "Quét mã QR để truy xuất nguồn gốc nông sản.",
};

export default function QrScannerPage() {
    return (
        <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-3xl px-4 py-6 sm:px-6">
            <QrScanner />
        </main>
    );
}
