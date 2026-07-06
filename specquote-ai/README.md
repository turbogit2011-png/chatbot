# SpecQuote AI

**From technical request to approved quote.**

SpecQuote AI turns messy technical RFQs (PDF, image, Excel, CSV, Word, .eml or
plain text) into structured data, flags missing information, matches line
items against your catalog, and drives a quote through margin guardrails and
manager approval before it goes out the door.

This is a self-contained sub-project inside the monorepo (like `turbo-git-shop/`).
Unlike the sibling static sites, it's a real server-rendered multi-tenant SaaS
(auth, database, file storage) and cannot use Next's static export.

## Stack

- Next.js 16 (App Router, Node.js server — **not** static export)
- TypeScript, Tailwind CSS v4, hand-built Stripe/Linear-style UI kit
- Prisma ORM on SQLite for zero-config local/demo runs (swap to PostgreSQL for production — see below)
- Custom session auth (HttpOnly JWT cookie via `jose`), bcrypt password hashing
- `@react-pdf/renderer` for quote PDFs
- Playwright for e2e tests (uses the pre-installed Chromium in this environment)

## Getting started

```bash
cd specquote-ai
npm install
cp .env.example .env      # defaults work out of the box (SQLite + mock AI)
npm run db:push           # create the SQLite schema
npm run db:seed           # seed the "Atlas Industrial Components" demo org
npm run dev
```

Open http://localhost:3000 and log in with:

- **Owner:** `owner@atlas-industrial.com` / `demo1234`
- **Admin:** `admin@atlas-industrial.com` / `demo1234`
- **Sales Manager:** `sales.manager@atlas-industrial.com` / `demo1234`
- Any seeded sales rep / estimator e-mail also works with `demo1234`

Or click "Create your organization" to start a brand-new tenant from scratch.

## Environment variables

See `.env.example`. Nothing is required beyond `DATABASE_URL` and
`AUTH_SECRET` to run the full app end-to-end on mocked AI. To use a real
model, set `AI_PROVIDER=gemini` and `GEMINI_API_KEY`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm run start` | Production build / server |
| `npm run lint` / `npm run typecheck` | ESLint / `tsc --noEmit` |
| `npm run db:push` | Sync Prisma schema to the SQLite file |
| `npm run db:seed` | Wipe & reseed the Atlas Industrial demo org |
| `npm run db:reset` | Force-reset schema + reseed (destructive — dev only) |
| `npm run test:e2e` | Playwright critical-path tests (spins up its own dev server on :3500) |

## Moving to PostgreSQL

Change `provider = "sqlite"` to `provider = "postgresql"` in
`prisma/schema.prisma`, point `DATABASE_URL` at your Postgres instance, and
run `prisma db push` (or introduce real migrations with `prisma migrate`).
Every field type used in the schema is supported identically by both
providers — no model changes required.

## What's mocked vs. real

- **AI parsing** runs on `MockAIProvider` by default — fully deterministic,
  offline, returns realistic confidence scores/evidence per attachment. A
  `GeminiProvider` adapter is implemented (`src/lib/ai/gemini-provider.ts`)
  behind the same `AIProvider` interface; set `AI_PROVIDER=gemini` +
  `GEMINI_API_KEY` to use it (not exercised in this environment — no outbound
  key configured — so smoke-test it before a pilot).
- **File storage** is local disk (`storage/`) behind a `StorageAdapter`
  interface — swap in an S3/GCS adapter for production.
- **ERP/CRM/e-mail integrations** are a `MockIntegrationAdapter` behind an
  `IntegrationAdapter` interface — connect a pilot customer's real system by
  implementing that interface.
- **Billing** is a usage-counting abstraction (`src/lib/billing`) with plan
  definitions matching the pricing model — no live payment processor wired
  up (Stripe or similar would sit behind the same `PlanDefinition`/usage
  layer).
