import { requireCurrentUser } from "@/lib/security/current-user";
import { prisma } from "@/lib/db/client";
import { can } from "@/lib/security/rbac";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toggleIntegrationAction } from "@/lib/actions/integrations";
import { formatDateTime } from "@/lib/utils";

export default async function IntegrationsPage() {
  const session = await requireCurrentUser();
  const integrations = await prisma.integration.findMany({ where: { orgId: session.orgId }, orderBy: { name: "asc" } });
  const editable = can(session.role, "integrations.manage");

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        SpecQuote AI talks to ERP/CRM systems through a single adapter interface — connect a pilot customer&apos;s
        real system later without touching product code. These are mock connections for the demo.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {integrations.map((i) => (
          <Card key={i.id}>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>{i.name}</CardTitle>
              <Badge tone={i.status === "CONNECTED" ? "green" : "neutral"}>{i.status.toLowerCase()}</Badge>
            </CardHeader>
            <CardBody>
              <p className="text-xs text-gray-500">Type: {i.type}</p>
              <p className="text-xs text-gray-400">
                {i.lastSyncAt ? `Last synced ${formatDateTime(i.lastSyncAt)}` : "Never synced"}
              </p>
              {editable && (
                <form action={toggleIntegrationAction.bind(null, i.id)} className="mt-3">
                  <Button type="submit" variant={i.status === "CONNECTED" ? "danger" : "brand"} size="sm">
                    {i.status === "CONNECTED" ? "Disconnect" : "Connect"}
                  </Button>
                </form>
              )}
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
