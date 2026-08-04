import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { authenticateLoginAttempt } from "@/lib/auth-service";

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
                token.isApproved = user.isApproved ?? false;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.sub ?? "";
                session.user.role = token.role ?? "FARMER";
                session.user.phone = token.phone ?? null;
                session.user.fullName = token.fullName ?? null;
                session.user.email = token.email ?? null;
                session.user.isApproved = token.isApproved ?? false;
            }
            return session;
        },
    },
};
