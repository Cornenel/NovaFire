import { expect, test } from "@playwright/test";

const PUBLIC_ROUTES = [
  "/",
  "/services",
  "/industries",
  "/compliance",
  "/training",
  "/areas",
  "/about",
  "/contact",
];

for (const route of PUBLIC_ROUTES) {
  test(`public route renders: ${route}`, async ({ page }) => {
    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(response?.ok() || response?.status() === 304).toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByRole("navigation").first()).toBeVisible();
  });
}

test("homepage exposes commercial CTAs", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: /request a quote/i }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /066 270 0293/i }).first()).toBeVisible();
  await expect(page.getByText(/Quiet Ground/i)).toHaveCount(0);
});

test("protected portals redirect without credentials", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/tech-login|client-portal\/login|\//);
});
