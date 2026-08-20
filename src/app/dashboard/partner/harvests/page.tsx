import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PartnerHarvests } from "@/components/partner-harvests";
export default async function Page(){const session=await getServerSession(authOptions);if(!session?.user?.id||!["COLLECTOR","PROCESSING_FACILITY"].includes(session.user.role))redirect("/login");const rows=await prisma.harvestRecord.findMany({where:{buyerUserId:session.user.id},include:{varietyItems:true,farm:true,farmer:{select:{fullName:true,phone:true}}},orderBy:{createdAt:"desc"}});return <main className="mx-auto max-w-7xl space-y-5 px-4 py-7 sm:px-6"><header><p className="text-sm font-bold uppercase tracking-wider text-brand-600">Nguồn hàng được gửi đến</p><h1 className="mt-1 text-3xl font-black">Phiếu thu hoạch</h1></header><PartnerHarvests initial={JSON.parse(JSON.stringify(rows))}/></main>}
