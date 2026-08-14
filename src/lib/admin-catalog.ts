import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function requireAdmin() {
    const session = await getServerSession(authOptions);
    return session?.user?.id && session.user.role === "ADMIN";
}

export function catalogCode(value: string) {
    return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 60);
}
