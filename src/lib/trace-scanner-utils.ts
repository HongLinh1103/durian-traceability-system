/**
 * Trace Scanner Utilities: Code parser, audio/vibration feedback, and image QR helpers.
 */

export function parseTraceCode(input: string): string {
    if (!input) return "";
    let trimmed = input.trim();

    // Check if it's a full URL or relative path containing /trace/
    if (trimmed.includes("/trace/")) {
        try {
            const urlObj = trimmed.startsWith("http") ? new URL(trimmed) : new URL(trimmed, "http://localhost");
            const pathname = urlObj.pathname;
            const match = pathname.match(/\/trace\/([^/?#]+)/i);
            if (match && match[1]) {
                return decodeURIComponent(match[1]).trim();
            }
        } catch {
            const match = trimmed.match(/\/trace\/([^/?#\s]+)/i);
            if (match && match[1]) {
                return match[1].trim();
            }
        }
    }

    // Check query params like ?code=... or ?token=...
    if (trimmed.includes("?") || trimmed.includes("&")) {
        const queryMatch = trimmed.match(/[?&](?:code|token|publicToken|qr)=([^&#\s]+)/i);
        if (queryMatch && queryMatch[1]) {
            return decodeURIComponent(queryMatch[1]).trim();
        }
    }

    // Strip wrapping quotes and clean up
    trimmed = trimmed.replace(/^["']|["']$/g, "").trim();
    return trimmed;
}

/**
 * Play a pleasant scanner beep tone using the Web Audio API.
 */
export function playScanSound(): void {
    if (typeof window === "undefined") return;
    try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        if (ctx.state === "suspended") {
            void ctx.resume();
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
        osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.1); // E6

        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
    } catch {
        // AudioContext not supported or not allowed yet
    }
}

/**
 * Trigger subtle haptic vibration on mobile devices if supported.
 */
export function triggerScanHaptic(): void {
    if (typeof window !== "undefined" && typeof navigator !== "undefined" && navigator.vibrate) {
        try {
            navigator.vibrate([40, 30, 80]);
        } catch {
            // Ignored
        }
    }
}
