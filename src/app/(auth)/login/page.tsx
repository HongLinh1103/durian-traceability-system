"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getSession, signIn, useSession } from "next-auth/react";
import { ArrowRight, CheckCircle2, Leaf, Loader2, ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { PasswordInput } from "@/components/auth/PasswordInput";

function getDashboardPath(role?: string): string {
    switch (role) {
        case "ADMIN":
            return "/dashboard/admin";
        case "AREA_MANAGER":
            return "/dashboard/area-manager";
        case "STORE_OWNER":
            return "/dashboard/store";
        case "COLLECTOR":
        case "PROCESSING_FACILITY":
            return "/dashboard/partner";
        case "FARMER":
        default:
            return "/dashboard/farmer";
    }
}

function LoginForm() {
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl");
    const { toast } = useToast();
    const { data: session, status } = useSession();
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(true);
    const [isLoading, setIsLoading] = useState(false);

    const resolveDestination = useCallback((role?: string) => {
        if (
            callbackUrl &&
            callbackUrl.startsWith("/") &&
            !callbackUrl.startsWith("/login") &&
            !callbackUrl.startsWith("/register")
        ) {
            return callbackUrl;
        }
        return getDashboardPath(role);
    }, [callbackUrl]);

    // Redirect authenticated users away from login page immediately
    useEffect(() => {
        if (status === "authenticated" && session?.user?.role) {
            const destination = resolveDestination(session.user.role);
            window.location.href = destination;
        }
    }, [status, session, resolveDestination]);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);

        try {
            const signInResult = await signIn("credentials", {
                identifier: identifier.trim(),
                password,
                rememberMe: String(rememberMe),
                redirect: false,
            });

            if (!signInResult?.ok || signInResult.error) {
                throw new Error("Sai số điện thoại/email, mật khẩu hoặc tài khoản chưa được phê duyệt.");
            }

            // Show success notification
            toast({
                title: "Đăng nhập thành công",
                description: "Chào mừng bạn quay lại hệ thống TriViet.",
                variant: "success",
            });

            // Retrieve session role or fallback to /api/auth/me to determine destination
            let userRole: string | undefined;
            try {
                const authenticatedSession = await getSession();
                userRole = authenticatedSession?.user?.role;
            } catch {
                // Ignore and try fallback
            }

            if (!userRole) {
                try {
                    const res = await fetch("/api/auth/me");
                    if (res.ok) {
                        const meData = await res.json();
                        userRole = meData?.user?.role;
                    }
                } catch {
                    // Ignore and fallback to default
                }
            }

            const targetDestination = resolveDestination(userRole);
            window.location.href = targetDestination;
        } catch (error) {
            toast({
                title: "Đăng nhập thất bại",
                description: error instanceof Error ? error.message : "Có lỗi xảy ra trong quá trình đăng nhập.",
                variant: "destructive",
            });
            setIsLoading(false);
        }
    };

    return (
        <Card className="w-full">
            <CardHeader className="space-y-4 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-emerald-600 text-white shadow-soft">
                    <Leaf className="h-8 w-8" />
                </div>
                <Badge className="mx-auto w-fit">Đăng nhập</Badge>
                <CardTitle className="text-3xl" style={{ fontFamily: "var(--font-display)" }}>
                    TriViet Traceability
                </CardTitle>
                <CardDescription className="text-base">
                    Đăng nhập bằng số điện thoại hoặc email để tiếp tục.
                </CardDescription>
            </CardHeader>

            <CardContent>
                <form className="space-y-5" onSubmit={handleSubmit}>
                    <div className="space-y-2">
                        <Label htmlFor="identifier">Số điện thoại / Email</Label>
                        <div className="relative">
                            <Smartphone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                id="identifier"
                                type="text"
                                inputMode="email"
                                placeholder="09xxxxxxxx hoặc email@domain.com"
                                value={identifier}
                                onChange={(event) => setIdentifier(event.target.value)}
                                autoComplete="username"
                                className="pl-10"
                                required
                            />
                        </div>
                    </div>

                    <PasswordInput
                        id="password"
                        label="Mật khẩu"
                        value={password}
                        onValueChange={setPassword}
                        placeholder="Nhập mật khẩu"
                        autoComplete="current-password"
                        helperText="Nhấn vào biểu tượng mắt để ẩn/hiện mật khẩu."
                    />

                    <label
                        htmlFor="rememberMe"
                        className="flex cursor-pointer items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700"
                    >
                        <input
                            id="rememberMe"
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(event) => setRememberMe(event.target.checked)}
                            className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>Ghi nhớ đăng nhập</span>
                    </label>

                    <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
                        {isLoading ? (
                            <span className="inline-flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Đang đăng nhập...
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4" />
                                ĐĂNG NHẬP
                            </span>
                        )}
                    </Button>

                    <div className="flex flex-col gap-3 rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
                        <Link
                            href="/register"
                            className="inline-flex items-center justify-center gap-2 font-semibold text-emerald-700 hover:text-emerald-800"
                        >
                            Chưa có tài khoản? Đăng ký
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                        <Link href="/forgot-password" className="text-center font-semibold text-slate-500 hover:text-slate-700">
                            Quên mật khẩu?
                        </Link>
                    </div>

                    <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
                        <div className="flex items-start gap-3">
                            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                            <p>Tài khoản chưa được Admin duyệt sẽ không thể truy cập hệ thống.</p>
                        </div>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

export default function LoginPage() {
    return (
        <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md items-center">
                <Suspense
                    fallback={
                        <Card className="w-full p-8 text-center">
                            <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
                            <p className="mt-3 text-sm text-slate-500">Đang tải...</p>
                        </Card>
                    }
                >
                    <LoginForm />
                </Suspense>
            </div>
        </main>
    );
}
