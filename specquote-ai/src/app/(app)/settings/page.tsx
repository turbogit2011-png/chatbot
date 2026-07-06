import { requireCurrentUser } from "@/lib/security/current-user";
import { prisma } from "@/lib/db/client";
import { OrgSettingsForm } from "@/components/settings/org-settings-form";
import { can } from "@/lib/security/rbac";

export default async function OrgSettingsPage() {
  const session = await requireCurrentUser();
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: session.orgId } });
  const editable = can(session.role, "org.manage");

  return <OrgSettingsForm org={org} editable={editable} />;
}
