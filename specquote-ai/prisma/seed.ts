import { prisma } from "../src/lib/db/client";
import { hashPassword } from "../src/lib/security/passwords";
import { createRfq } from "../src/lib/intake/create-rfq";
import { uploadRfqAttachment } from "../src/lib/intake/upload";
import { runAiParseForRfq } from "../src/lib/intake/parse";
import {
  createDraftQuoteFromRfq,
  submitQuoteForApproval,
  decideQuoteApproval,
  markQuoteSent,
  markQuoteOutcome,
  recalculateQuoteTotals,
} from "../src/lib/quotes/builder";
import {
  PRODUCT_FAMILIES,
  MATERIALS,
  FINISHES,
  TOLERANCES,
  CERTIFICATIONS,
  DEMO_ACCOUNTS,
  FIRST_NAMES,
  LAST_NAMES,
} from "../src/lib/domain-data";
import { renderDemoRequestPdf, PLACEHOLDER_PNG } from "./seed-content";
import type { RfqChannel, UserRole } from "@prisma/client";

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}
function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}
function pick<T>(arr: readonly T[]): T {
  return arr[randInt(0, arr.length - 1)];
}
function pickWeighted<T>(items: Array<[T, number]>): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let roll = Math.random() * total;
  for (const [item, weight] of items) {
    if (roll < weight) return item;
    roll -= weight;
  }
  return items[items.length - 1][0];
}
function slugify(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const ORG_SLUG = "atlas-industrial";

async function main() {
  console.log("Wiping previous demo data (if any)…");
  await prisma.organization.deleteMany({ where: { slug: ORG_SLUG } });

  console.log("Creating organization…");
  const org = await prisma.organization.create({
    data: {
      name: "Atlas Industrial Components Sp. z o.o.",
      slug: ORG_SLUG,
      currency: "EUR",
      language: "en",
      defaultMarginPercent: 25,
      minMarginPercent: 15,
      maxDiscountPercent: 12,
      highValueThreshold: 20000,
      brandingPrimaryColor: "#1D2939",
      brandingFooterText: "Atlas Industrial Components Sp. z o.o. — Poznań, Poland — VAT ID PL7791234567",
      plan: "PRO",
      planStatus: "active",
    },
  });

  console.log("Creating users…");
  const passwordHash = await hashPassword("demo1234");
  const roster: Array<{ name: string; role: UserRole; email: string }> = [
    { name: "Marta Wisniewska", role: "OWNER", email: "owner@atlas-industrial.com" },
    { name: "Pawel Kaczmarek", role: "ADMIN", email: "admin@atlas-industrial.com" },
    { name: "Greta Larsen", role: "SALES_MANAGER", email: "sales.manager@atlas-industrial.com" },
  ];
  const repFirstNames = FIRST_NAMES.slice(0, 8);
  for (let i = 0; i < 8; i++) {
    const first = repFirstNames[i];
    const last = LAST_NAMES[i % LAST_NAMES.length];
    roster.push({ name: `${first} ${last}`, role: "SALES_REP", email: `${slugify(first)}.${slugify(last)}@atlas-industrial.com` });
  }
  const estimatorFirstNames = FIRST_NAMES.slice(8, 13);
  for (let i = 0; i < 5; i++) {
    const first = estimatorFirstNames[i];
    const last = LAST_NAMES[(i + 8) % LAST_NAMES.length];
    roster.push({ name: `${first} ${last}`, role: "ESTIMATOR", email: `${slugify(first)}.${slugify(last)}@atlas-industrial.com` });
  }
  roster.push({ name: "Ingrid Berg", role: "VIEWER", email: "viewer@atlas-industrial.com" });

  const users = [];
  const colors = ["#2563EB", "#7C3AED", "#DB2777", "#059669", "#D97706", "#0891B2", "#DC2626", "#4338CA"];
  for (let i = 0; i < roster.length; i++) {
    const r = roster[i];
    const user = await prisma.user.create({
      data: { orgId: org.id, email: r.email, name: r.name, role: r.role, passwordHash, avatarColor: colors[i % colors.length] },
    });
    users.push(user);
  }
  const owner = users.find((u) => u.role === "OWNER")!;
  const salesManager = users.find((u) => u.role === "SALES_MANAGER")!;
  const reps = users.filter((u) => u.role === "SALES_REP");

  console.log("Creating integrations…");
  await prisma.integration.createMany({
    data: [
      { orgId: org.id, type: "EMAIL", name: "Microsoft 365 (shared inbox)", status: "CONNECTED", lastSyncAt: new Date() },
      { orgId: org.id, type: "CRM", name: "HubSpot CRM", status: "CONNECTED", lastSyncAt: new Date() },
      { orgId: org.id, type: "ERP", name: "SAP Business One", status: "DISCONNECTED" },
    ],
  });

  console.log("Creating accounts & contacts…");
  const accounts = [];
  for (let i = 0; i < DEMO_ACCOUNTS.length; i++) {
    const a = DEMO_ACCOUNTS[i];
    const account = await prisma.account.create({
      data: {
        orgId: org.id,
        name: a.name,
        industry: a.industry,
        country: a.country,
        website: `https://www.${slugify(a.name)}.com`,
        isNewClient: i < 7,
      },
    });
    const contactCount = randInt(1, 2);
    for (let c = 0; c < contactCount; c++) {
      const first = pick(FIRST_NAMES);
      const last = pick(LAST_NAMES);
      await prisma.contact.create({
        data: {
          orgId: org.id,
          accountId: account.id,
          name: `${first} ${last}`,
          email: `${slugify(first)}.${slugify(last)}@${slugify(a.name)}.com`,
          phone: `+${randInt(30, 48)} ${randInt(100, 999)} ${randInt(100, 999)} ${randInt(100, 999)}`,
          title: pick(["Procurement Manager", "Technical Buyer", "Plant Engineer", "Purchasing Director", "Maintenance Lead"]),
        },
      });
    }
    accounts.push(await prisma.account.findUniqueOrThrow({ where: { id: account.id }, include: { contacts: true } }));
  }

  console.log("Creating catalog products (250)…");
  let skuCounter = 1000;
  for (let f = 0; f < PRODUCT_FAMILIES.length; f++) {
    const family = PRODUCT_FAMILIES[f];
    const count = f % 2 === 0 ? 13 : 12;
    const prefix = family
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase();
    for (let i = 0; i < count; i++) {
      const material = pick(MATERIALS);
      const finish = pick(FINISHES);
      const basePrice = Math.round(rand(18, 3200) * 100) / 100;
      const marginRatio = rand(0.18, 0.48);
      const baseCost = Math.round(basePrice * (1 - marginRatio) * 100) / 100;
      skuCounter += 1;
      await prisma.catalogProduct.create({
        data: {
          orgId: org.id,
          sku: `${prefix}-${skuCounter}`,
          name: `${family} — ${material.split(" ")[0]} ${randInt(10, 500)}mm`,
          family,
          description: `${family} in ${material}, ${finish.toLowerCase()} finish.`,
          unit: "pcs",
          basePrice,
          baseCost,
          currency: "EUR",
          material,
          leadTimeDays: randInt(5, 45),
          isService: false,
        },
      });
    }
  }
  // A handful of service lines, useful for quote line-item variety.
  for (const svc of ["Technical drawing review", "On-site installation support", "Calibration & certification", "Expedited handling"]) {
    skuCounter += 1;
    await prisma.catalogProduct.create({
      data: {
        orgId: org.id,
        sku: `SVC-${skuCounter}`,
        name: svc,
        family: "Services",
        unit: "hrs",
        basePrice: Math.round(rand(60, 180) * 100) / 100,
        baseCost: Math.round(rand(30, 100) * 100) / 100,
        currency: "EUR",
        leadTimeDays: randInt(1, 10),
        isService: true,
      },
    });
  }

  console.log("Creating 150 RFQs (this calls the real AI parsing pipeline, please wait)…");
  const purposes = [
    "line 3 upgrade",
    "maintenance stock replenishment",
    "new production cell",
    "spare parts order",
    "annual framework contract",
    "urgent breakdown replacement",
    "capacity expansion project",
    "retrofit of existing equipment",
  ];
  const requestTemplates = (family: string, qty: number) => [
    `Hello,\n\nWe are requesting a quotation for ${qty} units related to ${family.toLowerCase()}. Please see attached documentation for full technical specification. Kindly confirm lead time and pricing.\n\nBest regards`,
    `Dear Sales Team,\n\nPlease find attached our technical request for ${family.toLowerCase()} (qty: ${qty}). We need pricing and delivery terms as soon as possible.\n\nThank you`,
    `Hi,\n\nCan you provide a quote for the ${family.toLowerCase()} described in the attached file? Quantity required: ${qty}. Let us know if you need further details.\n\nRegards`,
    `Good morning,\n\nWe have an open requirement for ${family.toLowerCase()}, quantity ${qty}. Please review the attachment and come back with your best offer.\n\nKind regards`,
  ];

  const rfqIds: string[] = [];
  const totalRfqs = 150;
  let attachmentsCreated = 0;
  const attachmentBudget = 40;

  for (let i = 0; i < totalRfqs; i++) {
    const account = pick(accounts);
    const family = pick(PRODUCT_FAMILIES);
    const qty = randInt(2, 250);
    const daysAgo = randInt(0, 55);
    const receivedAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    const dueDate = new Date(receivedAt.getTime() + randInt(3, 21) * 24 * 60 * 60 * 1000);
    const channel: RfqChannel = pickWeighted([
      ["EMAIL", 60],
      ["UPLOAD", 30],
      ["MANUAL", 10],
    ]);
    const contact = account.contacts.length && Math.random() > 0.15 ? pick(account.contacts) : null;
    const assignedTo = Math.random() > 0.15 ? pick(reps) : null;
    const body = pick(requestTemplates(family, qty));

    const rfq = await createRfq({
      orgId: org.id,
      accountId: account.id,
      contactId: contact?.id ?? null,
      subject: `RFQ — ${family} for ${pick(purposes)}`,
      channel,
      sourceEmailRaw: channel === "MANUAL" ? null : body,
      dueDate,
      destinationCountry: Math.random() > 0.2 ? account.country : null,
      requestedDeliveryDate: Math.random() > 0.4 ? new Date(dueDate.getTime() + randInt(7, 45) * 24 * 60 * 60 * 1000) : null,
      estimatedValue: Math.round(rand(800, 65000)),
      assignedToId: assignedTo?.id ?? null,
      createdById: assignedTo?.id ?? salesManager.id,
    });
    // Backdate receivedAt to the randomized date (createRfq defaults to now()).
    await prisma.rfq.update({ where: { id: rfq.id }, data: { receivedAt } });

    // Distribute ~40 attachments across the 150 RFQs.
    const remainingRfqs = totalRfqs - i;
    const remainingBudget = attachmentBudget - attachmentsCreated;
    const wantsAttachment = remainingBudget > 0 && (remainingBudget >= remainingRfqs || Math.random() < 0.35);

    if (wantsAttachment) {
      const kind = pickWeighted<"PDF" | "IMAGE" | "XLSX" | "CSV" | "DOCX" | "EMAIL">([
        ["PDF", 35],
        ["IMAGE", 20],
        ["XLSX", 15],
        ["CSV", 15],
        ["DOCX", 10],
        ["EMAIL", 5],
      ]);

      if (kind === "PDF") {
        const buffer = await renderDemoRequestPdf(rfq.subject, body);
        await uploadRfqAttachment({ rfqId: rfq.id, fileName: "technical-request.pdf", mimeType: "application/pdf", buffer });
      } else if (kind === "IMAGE") {
        await uploadRfqAttachment({ rfqId: rfq.id, fileName: "nameplate-photo.png", mimeType: "image/png", buffer: PLACEHOLDER_PNG });
      } else if (kind === "XLSX") {
        const buffer = Buffer.from(`Part Number,Description,Qty,Material\nSKU-${randInt(100, 999)},${family},${qty},${pick(MATERIALS)}\n`, "utf8");
        await uploadRfqAttachment({
          rfqId: rfq.id,
          fileName: "bom.xlsx",
          mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          buffer,
        });
      } else if (kind === "CSV") {
        const rows = [`part_number,description,qty,material,tolerance`];
        for (let r = 0; r < randInt(1, 3); r++) {
          rows.push(`SKU-${randInt(100, 999)},${family},${randInt(2, 200)},${pick(MATERIALS)},${pick(TOLERANCES)}`);
        }
        await uploadRfqAttachment({ rfqId: rfq.id, fileName: "line-items.csv", mimeType: "text/csv", buffer: Buffer.from(rows.join("\n"), "utf8") });
      } else if (kind === "DOCX") {
        const buffer = Buffer.from(`Technical specification\n\n${family}\nQuantity: ${qty}\nMaterial: ${pick(MATERIALS)}\nCertification: ${pick(CERTIFICATIONS)}`, "utf8");
        await uploadRfqAttachment({
          rfqId: rfq.id,
          fileName: "specification.docx",
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          buffer,
        });
      } else {
        const emailBody = `From: ${contact?.name ?? "Purchasing"} <${contact?.email ?? "purchasing@" + slugify(account.name) + ".com"}>\nSubject: ${rfq.subject}\n\n${body}\n\nQty: ${qty}`;
        await uploadRfqAttachment({ rfqId: rfq.id, fileName: "original-request.eml", mimeType: "message/rfc822", buffer: Buffer.from(emailBody, "utf8") });
      }
      attachmentsCreated++;
    }

    rfqIds.push(rfq.id);

    // Leave the 8 most-recently-received RFQs unparsed (fresh in the queue).
    if (i < totalRfqs - 8) {
      await runAiParseForRfq(rfq.id, assignedTo?.id ?? salesManager.id);
    }

    if (i % 25 === 0) console.log(`  …${i}/${totalRfqs} RFQs created`);
  }

  console.log("Archiving a few stale RFQs…");
  const staleCandidates = await prisma.rfq.findMany({
    where: { orgId: org.id, status: { in: ["NEEDS_REVIEW", "MISSING_INFORMATION"] } },
    orderBy: { receivedAt: "asc" },
    take: 5,
  });
  for (const rfq of staleCandidates) {
    await prisma.rfq.update({ where: { id: rfq.id }, data: { status: "ARCHIVED" } });
  }

  console.log("Building quotes across the pipeline…");
  const quoteEligible = await prisma.rfq.findMany({
    where: { orgId: org.id, lineItems: { some: {} }, status: { notIn: ["ARCHIVED"] } },
    include: { lineItems: true },
    orderBy: { receivedAt: "desc" },
    take: 22,
  });

  const createdQuotes = [];
  for (const rfq of quoteEligible) {
    const quote = await createDraftQuoteFromRfq(rfq.id, salesManager.id);
    createdQuotes.push(quote);
  }
  console.log(`  created ${createdQuotes.length} draft quotes`);

  // Force a couple of guaranteed guardrail breaches for a realistic approvals demo.
  for (const quote of createdQuotes.slice(0, 3)) {
    const firstLine = await prisma.quoteLineItem.findFirst({ where: { quoteId: quote.id } });
    if (firstLine) {
      await prisma.quoteLineItem.update({ where: { id: firstLine.id }, data: { discountPercent: 25 } });
      await recalculateQuoteTotals(quote.id);
    }
  }

  // Leave the first 4 quotes as untouched drafts.
  const toSubmit = createdQuotes.slice(4);
  const submitted = [];
  for (const quote of toSubmit) {
    const result = await submitQuoteForApproval(quote.id, salesManager.id);
    submitted.push({ quoteId: quote.id, ...result });
  }

  const stillPending = submitted.filter((s) => s.needsApproval);
  for (const p of stillPending.slice(0, Math.ceil(stillPending.length / 2))) {
    await decideQuoteApproval(p.quoteId, "APPROVED", owner.id, "Reviewed — acceptable given customer history.");
  }

  const approvedQuoteIds = (
    await prisma.quote.findMany({ where: { orgId: org.id, status: "APPROVED" }, select: { id: true } })
  ).map((q) => q.id);

  const toSend = approvedQuoteIds.slice(0, Math.min(10, approvedQuoteIds.length));
  for (const quoteId of toSend) {
    await markQuoteSent(quoteId, salesManager.id);
  }

  const sentQuoteIds = (
    await prisma.quote.findMany({ where: { orgId: org.id, status: "SENT" }, select: { id: true } })
  ).map((q) => q.id);

  const wonCount = Math.ceil(sentQuoteIds.length * 0.6);
  const lostCount = Math.ceil(sentQuoteIds.length * 0.2);
  for (let i = 0; i < sentQuoteIds.length; i++) {
    if (i < wonCount) {
      await markQuoteOutcome(sentQuoteIds[i], "WON", salesManager.id);
    } else if (i < wonCount + lostCount) {
      await markQuoteOutcome(
        sentQuoteIds[i],
        "LOST",
        salesManager.id,
        pick(["Price too high vs. competitor", "Lead time too long", "Project postponed by customer", "Budget cut"]),
      );
    }
  }

  const finalCounts = await prisma.$transaction([
    prisma.organization.count(),
    prisma.user.count({ where: { orgId: org.id } }),
    prisma.account.count({ where: { orgId: org.id } }),
    prisma.rfq.count({ where: { orgId: org.id } }),
    prisma.rfqAttachment.count({ where: { rfq: { orgId: org.id } } }),
    prisma.rfqLineItem.count({ where: { rfq: { orgId: org.id } } }),
    prisma.catalogProduct.count({ where: { orgId: org.id } }),
    prisma.quote.count({ where: { orgId: org.id } }),
    prisma.quote.count({ where: { orgId: org.id, status: { notIn: ["WON", "LOST"] } } }),
  ]);

  console.log("\nDemo data summary:");
  console.log(`  Users: ${finalCounts[1]}`);
  console.log(`  Accounts: ${finalCounts[2]}`);
  console.log(`  RFQs: ${finalCounts[3]}`);
  console.log(`  Attachments: ${finalCounts[4]}`);
  console.log(`  RFQ line items: ${finalCounts[5]}`);
  console.log(`  Catalog products: ${finalCounts[6]}`);
  console.log(`  Quotes: ${finalCounts[7]} (${finalCounts[8]} active)`);
  console.log("\nLogin with: owner@atlas-industrial.com / demo1234");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
