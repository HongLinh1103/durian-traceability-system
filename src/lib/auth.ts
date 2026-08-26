import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { authenticateLoginAttempt } from "@/lib/auth-service";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
    session: { strategy: "jwt" },
    providers: [
        CredentialsProvider({
            name: "Phone, Email & Password",
            credentials: {
                identifier: { label: "Số điện thoại hoặc Email", type: "text" },
                password: { label: "Mật khẩu", type: "password" },
                rememberMe: { label: "Ghi nhớ đăng nhập", type: "checkbox" },
            },
            async authorize(credentials) {
                const identifier = credentials?.identifier?.trim();
                const password = credentials?.password;
                if (!identifier || !password) {
                    return null;
                }

                const result = await authenticateLoginAttempt({
                    identifier,
                    password,
                    rememberMe: credentials?.rememberMe === "true",
                });

                if (!result.ok) {
                    return null;
                }

                return result.user;
            },
        }),
    ],
    pages: {
        signIn: "/login",
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role;
                token.phone = user.phone ?? null;
                token.fullName = user.fullName ?? null;
                token.email = user.email ?? null;
                token.isApproved = user.isApproved ?? true;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                let currentUser = null;
                try {
                    currentUser = token.sub
                        ? await prisma.user.findUnique({
                            where: { id: token.sub },
                            select: { role: true, phone: true, fullName: true, email: true, isApproved: true },
                        })
                        : null;
                } catch {
                    // Non-blocking fallback if DB query fails
                }
                session.user.id = token.sub ?? "";
                session.user.role = currentUser?.role ?? token.role ?? "FARMER";
                session.user.phone = currentUser?.phone ?? token.phone ?? null;
                session.user.fullName = currentUser?.fullName ?? token.fullName ?? null;
                session.user.email = currentUser?.email ?? token.email ?? null;
                session.user.isApproved = currentUser?.isApproved ?? token.isApproved ?? true;
            }
            return session;
        },
    },
};
