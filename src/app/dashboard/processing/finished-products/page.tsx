import { redirect } from "next/navigation";

export default function Page() {
    redirect("/dashboard/processing/processing?tab=finished");
}
