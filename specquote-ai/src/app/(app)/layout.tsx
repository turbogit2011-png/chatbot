import { requireCurrentUser } from "@/lib/security/current-user";
import { prisma } from "@/lib/db/client";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireCurrentUser();
  const [org, user] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: session.orgId } }),
    prisma.user.findUniqueOrThrow({ where: { id: session.userId } }),
  ]);

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar orgName={org.name} role={session.role} plan={org.plan} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar name={user.name} email={user.email} role={user.role} avatarColor={user.avatarColor} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
