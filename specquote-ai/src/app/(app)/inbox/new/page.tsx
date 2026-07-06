import { requireCurrentUser } from "@/lib/security/current-user";
import { prisma } from "@/lib/db/client";
import { NewRfqForm } from "@/components/inbox/new-rfq-form";

export default async function NewRfqPage() {
  const session = await requireCurrentUser();
  const accounts = await prisma.account.findMany({
    where: { orgId: session.orgId },
    include: { contacts: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <h1 className="text-xl font-semibold text-gray-900">New RFQ</h1>
      <p className="mt-1 text-sm text-gray-500">
        Simulate receiving a request — paste the customer&apos;s e-mail text and/or upload their attachments (PDF,
        image, Excel, CSV, Word, .eml). SpecQuote AI will parse it immediately.
      </p>
      <div className="mt-6">
        <NewRfqForm accounts={accounts} />
      </div>
    </div>
  );
}
