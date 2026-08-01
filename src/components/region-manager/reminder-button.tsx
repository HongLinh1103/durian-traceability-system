"use client";

import { useState } from "react";
import { BellRing, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function ReminderButton({ gardenId }: { gardenId: string }) {
    const { toast } = useToast();
    const [sending, setSending] = useState(false);

    async function send() {
        setSending(true);
        try {
            const response = await fetch(`/api/region-manager/gardens/${gardenId}/remind`, { method: "POST" });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.message);
            toast({ title: "Đã gửi nhắc nhở", description: payload.message, variant: "success" });
        } catch (error) {
            toast({ title: "Không thể gửi nhắc nhở", description: error instanceof Error ? error.message : "Vui lòng thử lại.", variant: "destructive" });
        } finally {
            setSending(false);
        }
    }

    return <Button type="button" onClick={() => void send()} disabled={sending}>
        {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BellRing className="mr-2 h-4 w-4" />}
        Gửi nhắc nhở
    </Button>;
}
