import { test, expect } from "@playwright/test";

test.describe("Authentication & onboarding", () => {
  test("a new company can register, complete onboarding, and land on the dashboard", async ({ page }) => {
    const unique = Date.now();
    await page.goto("/register");

    await page.fill('input[name="companyName"]', `Test Co ${unique}`);
    await page.fill('input[name="name"]', "Jane Founder");
    await page.fill('input[name="email"]', `founder+${unique}@example.com`);
    await page.fill('input[name="password"]', "supersecret123");
    await page.click('button:has-text("Create organization")');

    await page.waitForURL(/\/onboarding$/);
    await expect(page.getByText("A few defaults before you start")).toBeVisible();

    await page.click('button:has-text("Finish setup")');
    await page.waitForURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("an existing user can log out and log back in", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "owner@atlas-industrial.com");
    await page.fill('input[name="password"]', "demo1234");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard$/);

    await page.click('button:has-text("Sign out")');
    await page.waitForURL(/\/login$/);

    await page.fill('input[name="email"]', "owner@atlas-industrial.com");
    await page.fill('input[name="password"]', "demo1234");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("wrong password is rejected with an error and no session", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "owner@atlas-industrial.com");
    await page.fill('input[name="password"]', "wrong-password");
    await page.click('button[type="submit"]');
    await expect(page.getByText("Invalid e-mail or password.")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});
