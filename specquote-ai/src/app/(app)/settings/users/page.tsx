import { requireCurrentUser } from "@/lib/security/current-user";
import { prisma } from "@/lib/db/client";
import { can } from "@/lib/security/rbac";
import { UsersTable } from "@/components/settings/users-table";
import { InviteUserForm } from "@/components/settings/invite-user-form";

export default async function UsersSettingsPage() {
  const session = await requireCurrentUser();
  const [users, invitations] = await Promise.all([
    prisma.user.findMany({ where: { orgId: session.orgId }, orderBy: { createdAt: "asc" } }),
    prisma.invitation.findMany({ where: { orgId: session.orgId, acceptedAt: null }, orderBy: { createdAt: "desc" } }),
  ]);

  const editable = can(session.role, "users.manage");

  return (
    <div className="space-y-6">
      {editable && <InviteUserForm />}
      <UsersTable users={users} invitations={invitations} editable={editable} currentUserId={session.userId} />
    </div>
  );
}
