import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { ProcessingGmpView } from "@/components/processing/processing-gmp-view";

export const dynamic = "force-dynamic";
export default async function Page() {
 const session=await getServerSession(authOptions);
 if(!session?.user?.id || session.user.role!=="PROCESSING_FACILITY") redirect("/login");
 return <main className="mx-auto w-full max-w-[1650px] space-y-6 px-3 py-6 sm:px-6"><ProcessingGmpView screen="receiving"/></main>;
}
