import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { Plus_Jakarta_Sans } from "next/font/google";
import "@/app/globals.css";
import { authOptions } from "@/lib/auth";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/navbar";
import { MobileBottomNavigation } from "@/components/mobile-bottom-navigation";

const sans = Plus_Jakarta_Sans({ subsets: ["latin", "vietnamese"], variable: "--font-sans" });

export const metadata: Metadata = {
    title: "Triviet Traceability",
    description: "Phần mềm quản lý hồ sơ vùng trồng và nhật ký canh tác sầu riêng.",
    manifest: "/manifest.json",
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "Triviet",
    },
    icons: {
        icon: "/icon-192.svg",
        apple: "/icon-192.svg",
    },
};

export const viewport = {
    themeColor: "#16a34a",
    width: "device-width",
    initialScale: 1,
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    const session = await getServerSession(authOptions);

    return (
        <html lang="vi" className={sans.variable}>
            <body>
                <Providers session={session}>
                    <Navbar initialSession={session} />
                    <div className="min-h-screen pb-[calc(5.5rem+env(safe-area-inset-bottom))] xl:pb-0">
                        {children}
                    </div>
                    <MobileBottomNavigation />
                </Providers>
            </body>
        </html>
    );
}
