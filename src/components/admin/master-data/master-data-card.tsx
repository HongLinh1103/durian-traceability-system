import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type MasterDataCardProps = {
    title: string;
    description: string;
    href: string;
    icon: React.ReactNode;
};

export function MasterDataCard({ title, description, href, icon }: MasterDataCardProps) {
    return (
        <Card className="flex flex-col">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-brand-50 p-3 text-brand-700">{icon}</div>
                    <div>
                        <CardTitle className="text-lg">{title}</CardTitle>
                        <CardDescription>{description}</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="mt-auto">
                <Button asChild className="w-full">
                    <Link href={href}>
                        Quản lý {title.toLowerCase()}
                        <ChevronRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );
}
