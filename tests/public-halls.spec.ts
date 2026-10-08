import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync } from "node:fs";
mkdirSync("output/qa", { recursive: true });
test("public menus open prompts, tools and games without organization signup", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/ko");
  await page
    .getByRole("link", { name: "프롬프트 갤러리", exact: true })
    .click();
  await expect(page).toHaveURL(/\/ko\/prompts$/);
  await expect(page.locator(".card-prompts")).toHaveCount(12);
  const total = Number((await page.locator('.collection-count').innerText()).match(/\d+/)?.[0]);
  await page.getByRole("button", { name: "더 둘러보기", exact: true }).click();
  await expect(page.locator(".card-prompts")).toHaveCount(Math.min(total, 24));
  await page
    .locator(".card-prompts")
    .filter({ hasText: "회의록을 다음 행동으로" })
    .getByRole("button", { name: "프롬프트 사용하기", exact: true })
    .click();
  await page
    .getByLabel("회의 메모", { exact: true })
    .fill("금요일 오후 3시 회의");
  await page.getByRole("button", { name: "복사하기", exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "금요일 오후 3시 회의",
  );
  await page.keyboard.press("Escape");
  await page.locator("h1").click();
  await page.screenshot({
    path: "output/qa/public-prompts.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "AI 도구", exact: true }).click();
  await expect(page).toHaveURL(/\/ko\/tools$/);
  await expect(page.locator(".simple-tool-card")).toHaveCount(4);
  await page
    .locator(".simple-tool-card")
    .filter({ hasText: "글자 수 세기" })
    .click();
  await page.locator(".workbench textarea").fill("안녕하세요");
  await expect(page.locator(".workbench")).toContainText("5");
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "게임", exact: true }).click();
  await expect(page).toHaveURL(/\/ko\/games$/);
  await expect(page.locator(".card-games")).toHaveCount(2);
  await page
    .locator(".card-games")
    .filter({ hasText: "AI 카드 짝 맞추기" })
    .getByRole("button", { name: "게임 시작하기", exact: true })
    .click();
  await page
    .locator(".game-workbench")
    .getByRole("button", { name: "시작하기", exact: true })
    .click();
  await expect(page.locator(".memory-card")).toHaveCount(8);
  await page.locator(".memory-card").nth(0).click();
  await page.locator(".memory-card").nth(1).click();
  await expect(page.locator(".game-score")).toContainText("1");
  await page.keyboard.press("Escape");
  await page
    .locator(".card-games")
    .filter({ hasText: "AI 상식 퀴즈" })
    .getByRole("button", { name: "게임 시작하기", exact: true })
    .click();
  await page.locator(".quiz-options button").first().click();
  await expect(page.getByRole("status")).toBeVisible();
  await expect(page.locator(".quiz-options button.correct")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.locator("h1").click();
  await page.screenshot({ path: "output/qa/public-games.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});
