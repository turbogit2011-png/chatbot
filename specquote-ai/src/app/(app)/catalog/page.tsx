import { requireCurrentUser } from "@/lib/security/current-user";
import { prisma } from "@/lib/db/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; family?: string }>;
}) {
  const session = await requireCurrentUser();
  const { q, family } = await searchParams;

  const where: Prisma.CatalogProductWhereInput = { orgId: session.orgId, isActive: true };
  if (q) {
    where.OR = [{ name: { contains: q } }, { sku: { contains: q } }];
  }
  if (family) where.family = family;

  const [products, families, org] = await Promise.all([
    prisma.catalogProduct.findMany({ where, orderBy: { name: "asc" }, take: 300 }),
    prisma.catalogProduct.findMany({
      where: { orgId: session.orgId },
      select: { family: true },
      distinct: ["family"],
    }),
    prisma.organization.findUniqueOrThrow({ where: { id: session.orgId } }),
  ]);

  return (
    <div className="mx-auto max-w-[1300px] px-8 py-8">
      <h1 className="text-xl font-semibold text-gray-900">Catalog</h1>
      <p className="mb-5 text-sm text-gray-500">
        {products.length} products/services · demo catalog, ready to connect to your ERP/PIM.
      </p>

      <form className="mb-4 flex gap-2" action="/catalog">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search SKU or name…"
          className="h-9 w-72 rounded-lg border border-border bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
        <select
          name="family"
          defaultValue={family ?? ""}
          className="h-9 rounded-lg border border-border bg-white px-2.5 text-sm"
        >
          <option value="">All families</option>
          {families.map((f) => (
            <option key={f.family} value={f.family}>
              {f.family}
            </option>
          ))}
        </select>
        <button type="submit" className="h-9 rounded-lg border border-border px-3 text-sm font-medium hover:bg-gray-50">
          Filter
        </button>
      </form>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-4 py-2.5">SKU</th>
                <th className="px-4 py-2.5">Name</th>
                <th className="px-4 py-2.5">Family</th>
                <th className="px-4 py-2.5">Material</th>
                <th className="px-4 py-2.5 text-right">Cost</th>
                <th className="px-4 py-2.5 text-right">Price</th>
                <th className="px-4 py-2.5 text-right">Lead time</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-700">{p.sku}</td>
                  <td className="px-4 py-2.5 text-gray-900">
                    {p.name} {p.isService ? <Badge tone="purple">service</Badge> : null}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{p.family}</td>
                  <td className="px-4 py-2.5 text-gray-600">{p.material ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">{formatMoney(p.baseCost, org.currency)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium text-gray-900">
                    {formatMoney(p.basePrice, org.currency)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">{p.leadTimeDays}d</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
