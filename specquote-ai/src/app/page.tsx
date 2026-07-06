import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/security/current-user";

export default async function RootPage() {
  const session = await getCurrentUser();
  redirect(session ? "/dashboard" : "/login");
}
