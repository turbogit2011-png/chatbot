"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { requireCurrentUser } from "@/lib/security/current-user";
import { assertPermission } from "@/lib/security/rbac";
import { MockIntegrationAdapter } from "@/lib/integrations/adapter";
import { recordAudit } from "@/lib/security/audit";
import type { IntegrationType } from "@prisma/client";

export async function toggleIntegrationAction(integrationId: string): Promise<void> {
  const session = await requireCurrentUser();
  assertPermission(session.role, "integrations.manage");

  const integration = await prisma.integration.findFirstOrThrow({
    where: { id: integrationId, orgId: session.orgId },
  });

  if (integration.status === "CONNECTED") {
    await prisma.integration.update({ where: { id: integrationId }, data: { status: "DISCONNECTED" } });
  } else {
    const adapter = new MockIntegrationAdapter(integration.type as IntegrationType, integration.name);
    const result = await adapter.testConnection();
    await prisma.integration.update({
      where: { id: integrationId },
      data: { status: result.ok ? "CONNECTED" : "DISCONNECTED", lastSyncAt: new Date() },
    });
  }

  await recordAudit({
    orgId: session.orgId,
    actorId: session.userId,
    action: "integration.toggled",
    entityType: "Integration",
    entityId: integrationId,
  });

  revalidatePath("/settings/integrations");
}
