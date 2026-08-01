"use client";

import * as React from "react";
import { ArrowUpToLine, CheckCircle2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIOS() {
    if (typeof navigator === "undefined") {
        return false;
    }

    return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandaloneMode() {
    if (typeof window === "undefined") {
        return false;
    }

    return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function PWAInstallBanner() {
    const [isVisible, setIsVisible] = React.useState(false);
    const [isIOSDevice, setIsIOSDevice] = React.useState(false);
    const [installPromptEvent, setInstallPromptEvent] = React.useState<BeforeInstallPromptEvent | null>(null);

    React.useEffect(() => {
        if (isStandaloneMode()) {
            return;
        }

        setIsIOSDevice(isIOS());

        const dismissedKey = "triviet-pwa-install-dismissed";
        const isDismissed = window.localStorage.getItem(dismissedKey) === "1";

        const onBeforeInstallPrompt = (event: Event) => {
            event.preventDefault();
            setInstallPromptEvent(event as BeforeInstallPromptEvent);
            if (!isDismissed) {
                setIsVisible(true);
            }
        };

        window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

        if (isIOS() && !isDismissed) {
            setIsVisible(true);
        }

        return () => {
            window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
        };
    }, []);

    if (!isVisible) {
        return null;
    }

    const handleDismiss = () => {
        window.localStorage.setItem("triviet-pwa-install-dismissed", "1");
        setIsVisible(false);
    };

    const handleInstall = async () => {
        if (!installPromptEvent) {
            return;
        }

        await installPromptEvent.prompt();
        await installPromptEvent.userChoice;
        handleDismiss();
    };

    return (
        <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-[28px] border border-brand-200 bg-white/95 p-4 shadow-2xl backdrop-blur">
            <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-brand-50 p-3 text-brand-700">
                    <Smartphone className="h-5 w-5" />
                </div>
                <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900">Cài đặt Triviet lên màn hình chính</p>
                    <p className="mt-1 text-sm text-slate-600">
                        {isIOSDevice ? "Trên iPhone/iPad: bấm Share, sau đó chọn Add to Home Screen." : "Chạm Cài đặt để dùng như ứng dụng, kể cả khi mạng yếu."}
                    </p>
                </div>
                <button className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={handleDismiss} aria-label="Đóng banner cài đặt">
                    <CheckCircle2 className="h-4 w-4" />
                </button>
            </div>

            <div className="mt-4 flex gap-3">
                {installPromptEvent ? (
                    <Button className="flex-1" onClick={() => void handleInstall()}>
                        <ArrowUpToLine className="mr-2 h-4 w-4" />
                        Cài đặt
                    </Button>
                ) : null}
                <Button variant="outline" className="flex-1" onClick={handleDismiss}>
                    Để sau
                </Button>
            </div>
        </div>
    );
}
