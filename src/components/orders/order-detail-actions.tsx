"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2, Phone, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OrderDetailActionsProps {
    orderId: string;
    orderCode: string;
    status: string;
    storePhone?: string | null;
}

export function OrderDetailHeaderActions({ orderCode }: { orderCode: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(orderCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            title="Sao chép mã đơn"
        >
            {copied ? (
                <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Đã sao chép</span>
                </>
            ) : (
                <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Sao chép</span>
                </>
            )}
        </button>
    );
}

export function OrderDetailBottomActions({
    orderId,
    status,
    storePhone,
}: OrderDetailActionsProps) {
    const router = useRouter();
    const [isCancelling, setIsCancelling] = useState(false);
    const [busy, setBusy] = useState(false);

    async function handleCancel() {
        setBusy(true);
        try {
            const res = await fetch(`/api/orders/${orderId}`, { method: "PATCH" });
            if (res.ok) {
                router.refresh();
            }
        } finally {
            setBusy(false);
            setIsCancelling(false);
        }
    }

    return (
        <>
            <div className="flex flex-wrap items-center justify-end gap-2.5">
                {storePhone && (
                    <a
                        href={`tel:${storePhone}`}
                        className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                        <Phone className="h-4 w-4 text-brand-600" />
                        <span>Gọi hỗ trợ ({storePhone})</span>
                    </a>
                )}

                {status === "PENDING" && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCancelling(true)}
                        className="rounded-2xl border-red-200 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                        <XCircle className="mr-1.5 h-4 w-4" />
                        Hủy đơn hàng
                    </Button>
                )}
            </div>

            {isCancelling && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                            <XCircle className="h-6 w-6" />
                        </div>
                        <h3 className="mt-4 text-lg font-bold text-slate-900">
                            Xác nhận hủy đơn hàng?
                        </h3>
                        <p className="mt-2 text-sm text-slate-500">
                            Đơn hàng đang ở trạng thái <b>Chờ xác nhận</b> và chưa xuất kho. Khi bạn hủy,
                            hệ thống sẽ cập nhật trạng thái đã hủy và gửi thông báo tới cửa hàng.
                        </p>
                        <div className="mt-6 flex items-center justify-end gap-2.5">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={busy}
                                onClick={() => setIsCancelling(false)}
                                className="rounded-xl font-medium"
                            >
                                Đóng
                            </Button>
                            <Button
                                type="button"
                                disabled={busy}
                                onClick={() => void handleCancel()}
                                className="rounded-xl bg-red-600 font-bold text-white hover:bg-red-700"
                            >
                                {busy ? (
                                    <>
                                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                        <span>Đang hủy...</span>
                                    </>
                                ) : (
                                    "Xác nhận hủy đơn"
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
