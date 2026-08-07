"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    Map,
    Sprout,
    Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

type AccountType = "FARMER" | "AREA_MANAGER" | "STORE_OWNER";

const accountTypes = [
    {
        value: "FARMER" as const,
        title: "Nông dân",
        description:
            "Đăng ký tài khoản và khai báo thông tin một hoặc nhiều vườn trồng.",
        icon: Sprout,
        iconClass: "bg-emerald-100 text-emerald-700",
    },
    {
        value: "AREA_MANAGER" as const,
        title: "Trưởng ban quản lý vùng trồng",
        description:
            "Quản lý vùng trồng, theo dõi hồ sơ vườn và công tác tuân thủ.",
        icon: Map,
        iconClass: "bg-blue-100 text-blue-700",
    },
    {
        value: "STORE_OWNER" as const,
        title: "Chủ cửa hàng vật tư",
        description: "Đăng ký cửa hàng, tải giấy tờ và chờ Admin phê duyệt trước khi kinh doanh.",
        icon: Store,
        iconClass: "bg-amber-100 text-amber-700",
    },
];

export default function RegisterAccountTypePage() {
    const router = useRouter();
    const { toast } = useToast();
    const [selected, setSelected] = useState<AccountType | null>(null);

    function continueRegistration() {
        if (!selected) {
            toast({
                title: "Chưa chọn loại tài khoản",
                description: "Vui lòng chọn loại tài khoản bạn muốn đăng ký.",
                variant: "destructive",
            });
            return;
        }

        if (selected === "FARMER") {
            router.push("/register/farmer");
            return;
        }

        if (selected === "STORE_OWNER") {
            router.push("/register/store-owner");
            return;
        }

        router.push("/register/area-manager");
    }

    return (
        <main className="flex min-h-[80vh] items-center bg-gradient-to-b from-emerald-50 via-white to-white px-4 py-10">
            <div className="mx-auto w-full max-w-4xl">
                <Card>
                    <CardHeader className="text-center">
                        <CardTitle className="text-3xl">
                            Chọn loại tài khoản
                        </CardTitle>
                        <CardDescription className="mx-auto max-w-2xl text-base">
                            Chọn đúng vai trò để hệ thống hiển thị biểu mẫu đăng ký
                            và quy trình xét duyệt phù hợp.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-7">
                        <div
                            className="grid gap-5 md:grid-cols-3"
                            role="radiogroup"
                            aria-label="Loại tài khoản"
                        >
                            {accountTypes.map((account) => {
                                const Icon = account.icon;
                                const isSelected = selected === account.value;
                                return (
                                    <button
                                        key={account.value}
                                        type="button"
                                        role="radio"
                                        aria-checked={isSelected}
                                        onClick={() => setSelected(account.value)}
                                        className={`relative rounded-3xl border-2 p-6 text-left transition focus:outline-none focus:ring-4 focus:ring-emerald-100 ${
                                            isSelected
                                                ? "border-emerald-600 bg-emerald-50 shadow-md"
                                                : "border-slate-200 bg-white hover:border-emerald-300 hover:shadow-sm"
                                        }`}
                                    >
                                        {isSelected && (
                                            <CheckCircle2 className="absolute right-5 top-5 h-6 w-6 text-emerald-600" />
                                        )}
                                        <span
                                            className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${account.iconClass}`}
                                        >
                                            <Icon className="h-7 w-7" />
                                        </span>
                                        <h2 className="text-xl font-bold text-slate-900">
                                            {account.title}
                                        </h2>
                                        <p className="mt-2 leading-6 text-slate-600">
                                            {account.description}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex flex-col-reverse justify-between gap-3 border-t pt-6 sm:flex-row">
                            <Button variant="outline" asChild>
                                <Link href="/login">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Quay lại đăng nhập
                                </Link>
                            </Button>
                            <Button
                                type="button"
                                size="lg"
                                onClick={continueRegistration}
                                disabled={!selected}
                            >
                                Tiếp tục đăng ký
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
