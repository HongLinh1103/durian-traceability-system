import type { Metadata } from "next";
import { DocumentsLibrary } from "@/components/documents/documents-library";

export const metadata: Metadata = {
    title: "Tài liệu | Triviet",
    description: "Thư viện tài liệu hướng dẫn và tuân thủ trong hệ thống Triviet.",
};

export default function DocumentsPage() {
    return (
        <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
            <DocumentsLibrary />
        </main>
    );
}
