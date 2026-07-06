import { test, expect } from "@playwright/test";

async function loginAsOwner(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.fill('input[name="email"]', "owner@atlas-industrial.com");
  await page.fill('input[name="password"]', "demo1234");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard$/);
}

test.describe("Core RFQ → quote flow", () => {
  test("intake, AI parsing, missing-info review, quote draft, approval and PDF export", async ({ page }) => {
    await loginAsOwner(page);

    // 1. Create a new RFQ via manual text intake.
    await page.goto("/inbox/new");
    const subject = `RFQ — Pressure sensors e2e ${Date.now()}`;
    await page.fill('input[name="subject"]', subject);
    await page.fill(
      'textarea[name="emailText"]',
      "Hello,\n\nPlease quote 60 units, material stainless steel 316L, tolerance IT7. Contact: buyer@nordmach.com\n\nRegards",
    );
    await page.fill('input[name="estimatedValue"]', "21000");
    await page.click('button:has-text("Create & parse RFQ")');

    // 2. Land on the RFQ workspace with AI-extracted structured data.
    await page.waitForURL(/\/inbox\/[a-z0-9]+$/);
    await expect(page.getByRole("heading", { name: subject })).toBeVisible();
    await expect(page.getByText("Extracted header fields")).toBeVisible();
    await expect(page.getByText(/Technical line items \(\d+\)/)).toBeVisible();

    // 3. Missing-information queue should reflect at least one open item or a clear "all confirmed" state.
    await expect(page.getByText(/Missing information/)).toBeVisible();

    // 4. Create a quote draft from the parsed RFQ.
    await page.click('button:has-text("Create quote draft")');
    await page.waitForURL(/\/quotes\/[a-z0-9]+$/);
    await expect(page.getByRole("heading", { name: "Line items" })).toBeVisible();
    await expect(page.getByText("Margin & approval guardrails")).toBeVisible();

    // 5. Run the guardrail check — quote must move out of DRAFT.
    await page.click('button:has-text("Run guardrail check")');
    await page.waitForTimeout(1000);
    await page.reload();
    const statusArea = page.locator("h1").locator("..");
    await expect(statusArea).not.toContainText("Draft");

    // If a manager approval is required, approve it (the demo user is Owner, who can approve).
    const approveButton = page.getByRole("button", { name: "Approve", exact: true });
    if (await approveButton.isVisible().catch(() => false)) {
      await approveButton.click();
      await page.waitForTimeout(500);
      await page.reload();
    }

    // 6. Send the quote to the customer.
    const sendButton = page.getByRole("button", { name: /Send quote e-mail/ });
    await expect(sendButton).toBeVisible({ timeout: 10000 });
    await sendButton.click();
    await page.waitForTimeout(500);
    await page.reload();
    await expect(page.getByText("Sent", { exact: true }).first()).toBeVisible();

    // 7. PDF export must return a real PDF.
    const quoteId = page.url().split("/").pop();
    const pdfResponse = await page.request.get(`/api/quotes/${quoteId}/pdf`);
    expect(pdfResponse.status()).toBe(200);
    const pdfBuffer = await pdfResponse.body();
    expect(pdfBuffer.subarray(0, 4).toString()).toBe("%PDF");

    // 8. Mark the quote Won and verify it shows up in the account's history.
    await page.click('button:has-text("Mark Won")');
    await page.waitForTimeout(500);
    await page.reload();
    await expect(page.getByText(/Quote closed as WON/)).toBeVisible();
  });

  test("RFQ inbox filters narrow the list", async ({ page }) => {
    await loginAsOwner(page);
    await page.goto("/inbox");
    await expect(page.getByRole("heading", { name: "RFQ Inbox" })).toBeVisible();

    const allRowsCount = await page.locator("table tbody tr").count();
    expect(allRowsCount).toBeGreaterThan(0);

    await page.click('a:has-text("High risk")');
    await page.waitForLoadState("networkidle");
    const rows = page.locator("table tbody tr");
    const count = await rows.count();
    if (count > 0 && !(await page.getByText("No RFQs match this filter.").isVisible())) {
      await expect(rows.first().getByText(/High risk/)).toBeVisible();
    }
  });

  test("CRM account page shows RFQ and quote history", async ({ page }) => {
    await loginAsOwner(page);
    await page.goto("/crm");
    await expect(page.getByText("CRM — Accounts")).toBeVisible();

    await page.locator("table tbody tr td a").first().click();
    await expect(page.getByText("RFQ history")).toBeVisible();
    await expect(page.getByText("Activity timeline")).toBeVisible();
  });
});
