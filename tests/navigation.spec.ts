import { test, expect } from "@playwright/test";

test("menu and brand use client navigation and show feedback while the page is slow", async ({
  page,
}) => {
  await page.route("**/ko/prompts?*", async (route) => {
    if (!route.request().headers()["next-router-prefetch"]) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    await route.continue();
  });
  const prefetched = page.waitForResponse(response => response.url().includes('/ko/prompts?') && !!response.request().headers()['next-router-prefetch']);
  await page.goto("/ko");
  await prefetched;
  await page.evaluate(() => {
    Object.assign(window, { navigationMarker: "same-document" });
  });
  const menu = page
    .locator(".desktop-nav")
    .getByRole("link", { name: "프롬프트 갤러리", exact: true });
  await expect(menu).toHaveAttribute("href", "/ko/prompts");
  await menu.click();
  await expect(page.getByRole("status")).toHaveText(
    "페이지를 불러오고 있어요.",
    { timeout: 1500 },
  );
  await expect(page.locator(".card-prompts").first()).toBeVisible();
  expect(
    await page.evaluate(() => Reflect.get(window, "navigationMarker")),
  ).toBe("same-document");
  await page.locator(".site-header .brand").click();
  await expect(page).toHaveURL(/\/ko$/);
  expect(
    await page.evaluate(() => Reflect.get(window, "navigationMarker")),
  ).toBe("same-document");
});

test("mobile menu keeps usable links and layout", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ko");
  const menu = page
    .locator(".mobile-nav")
    .getByRole("link", { name: "AI 도구", exact: true });
  await expect(menu).toBeVisible();
  await expect(menu).toHaveAttribute("href", "/ko/tools");
  await menu.click();
  await expect(page.locator(".simple-tool-card")).toHaveCount(4);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
