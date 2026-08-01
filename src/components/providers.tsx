"use client";

import { useEffect } from "react";
import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "@/components/ui/toast";
import { PWAInstallBanner } from "@/components/pwa-install-banner";

type ProvidersProps = {
    children: React.ReactNode;
    session: Session | null;
};

export function Providers({ children, session }: ProvidersProps) {
    useEffect(() => {
        if (!("serviceWorker" in navigator)) {
            return;
        }

        if (process.env.NODE_ENV !== "production") {
            void navigator.serviceWorker.getRegistrations().then((registrations) =>
                Promise.all(registrations.map((registration) => registration.unregister())),
            );
            if ("caches" in window) {
                void caches.keys().then((keys) =>
                    Promise.all(
                        keys
                            .filter((key) => key.startsWith("triviet-pwa-"))
                            .map((key) => caches.delete(key)),
                    ),
                );
            }
            return;
        }

        void navigator.serviceWorker.register("/sw.js");
    }, []);

    return (
        <SessionProvider session={session} refetchInterval={60}>
            <ToastProvider>
                {children}
                <PWAInstallBanner />
            </ToastProvider>
        </SessionProvider>
    );
}
