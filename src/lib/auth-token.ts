import type { UserRole } from "@prisma/client";

export const AUTH_COOKIE_NAME = "triviet-auth-token";
export const AUTH_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;
export const AUTH_REMEMBER_ME_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type AuthTokenPayload = {
    sub: string;
    role: UserRole;
    phone: string | null;
    email: string | null;
    fullName: string | null;
    isApproved: boolean;
    iat?: number;
    exp: number;
};

function getAuthSecret(): string {
    const secret = process.env.AUTH_JWT_SECRET ?? process.env.NEXTAUTH_SECRET;
    if (!secret) {
        throw new Error("Missing auth secret");
    }

    return secret;
}

function toBase64Url(input: Uint8Array): string {
    let binary = "";
    for (let index = 0; index < input.length; index += 0x8000) {
        binary += String.fromCharCode(...input.subarray(index, index + 0x8000));
    }

    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

function fromBase64Url(input: string): ArrayBuffer {
    const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (input.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }

    return bytes.buffer.slice(0);
}

async function importSigningKey(secret: string): Promise<CryptoKey> {
    return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function signAuthToken(payload: Omit<AuthTokenPayload, "iat" | "exp">, expiresInSeconds: number): Promise<string> {
    const issuedAt = Math.floor(Date.now() / 1000);
    const header = { alg: "HS256", typ: "JWT" };
    const body: AuthTokenPayload = {
        ...payload,
        iat: issuedAt,
        exp: issuedAt + expiresInSeconds,
    };

    const encoder = new TextEncoder();
    const encodedHeader = toBase64Url(encoder.encode(JSON.stringify(header)));
    const encodedBody = toBase64Url(encoder.encode(JSON.stringify(body)));
    const signingInput = `${encodedHeader}.${encodedBody}`;
    const key = await importSigningKey(getAuthSecret());
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(signingInput));

    return `${signingInput}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifyAuthToken(token: string): Promise<AuthTokenPayload | null> {
    const parts = token.split(".");
    if (parts.length !== 3) {
        return null;
    }

    const [encodedHeader, encodedBody, encodedSignature] = parts;
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    let header: { alg?: string; typ?: string };
    let body: AuthTokenPayload;
    try {
        header = JSON.parse(decoder.decode(new Uint8Array(fromBase64Url(encodedHeader)))) as { alg?: string; typ?: string };
        body = JSON.parse(decoder.decode(new Uint8Array(fromBase64Url(encodedBody)))) as AuthTokenPayload;
    } catch {
        return null;
    }

    if (header.alg !== "HS256" || header.typ !== "JWT") {
        return null;
    }

    const key = await importSigningKey(getAuthSecret());
    const isValid = await crypto.subtle.verify("HMAC", key, new Uint8Array(fromBase64Url(encodedSignature)), encoder.encode(`${encodedHeader}.${encodedBody}`));
    if (!isValid) {
        return null;
    }

    if (typeof body.exp !== "number" || body.exp * 1000 <= Date.now()) {
        return null;
    }

    return body;
}

export function getAuthSecretValue(): string {
    return getAuthSecret();
}
