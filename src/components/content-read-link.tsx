"use client";

import { useState, type AnchorHTMLAttributes, type MouseEvent } from "react";

type ContentReadLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
    kind: "document" | "news";
    contentId: string;
    isNew?: boolean;
    showNewLabel?: boolean;
};

export function ContentReadLink({ kind, contentId, isNew = false, showNewLabel = false, children, onClick, ...props }: ContentReadLinkProps) {
    const [unread, setUnread] = useState(isNew);

    const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(event);
        if (event.defaultPrevented || !unread) return;

        setUnread(false);
        void fetch("/api/content-notifications", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kind, contentId }),
            keepalive: true,
        }).finally(() => window.dispatchEvent(new Event("content-notifications-updated")));
    };

    return (
        <a {...props} onClick={handleClick}>
            {showNewLabel && unread && <span className="absolute right-3 top-3 z-10 rounded-full bg-red-500 px-2 py-1 text-[10px] font-bold uppercase text-white shadow-sm">New</span>}
            {children}
        </a>
    );
}
