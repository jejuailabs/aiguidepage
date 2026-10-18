import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const toolUrl = (slug: string) => `/ko/tools?tool=tool-maisa-${slug}`;
test("MAISA tools run in the current site and format results can be copied and downloaded", async ({
  page,
}) => {
  let sent: Record<string, unknown> | undefined;
  await page.route("**/api/ai-tools/format", async (route) => {
    sent = route.request().postDataJSON();
    await route.fulfill({
      json: {
        result: {
          title: "정리한 공지",
          content: "금요일 오후 3시 모임",
          missingFields: [],
          checklist: ["시간 확인"],
        },
      },
    });
  });
  await page.goto("/ko/tools");
  await expect(page.locator(".simple-tool-card")).toHaveCount(10);
  await page.getByRole("button", { name: /문서 양식 변환/ }).click();
  await page
    .getByLabel("메모 또는 문서 초안", { exact: true })
    .fill("금요일 오후 3시 모임");
  const run = page.getByRole("button", { name: "AI로 만들기", exact: true });
  await expect(run).toBeDisabled();
  await page.getByRole("checkbox").check();
  await run.click();
  await expect(page.locator(".maisa-result")).toContainText(
    "금요일 오후 3시 모임",
  );
  expect(sent).toMatchObject({
    consent: true,
    scope: "common",
    itemId: "tool-maisa-format",
    text: "금요일 오후 3시 모임",
  });
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "결과 파일 받기", exact: true })
    .click();
  expect((await download).suggestedFilename()).toBe("문서 양식 변환.txt");
  expect(page.url()).toContain("/ko/tools");
});
test("receipt upload, file removal, result table and spreadsheet download work", async ({
  page,
}) => {
  await page.route("**/api/ai-tools/receipt", async (route) => {
    expect(route.request().headers()["content-type"]).toContain(
      "multipart/form-data",
    );
    await route.fulfill({
      json: {
        result: {
          items: [
            {
              date: "2026-10-18",
              vendor: "상점",
              item: "종이",
              quantity: 2,
              unitPrice: 1000,
              total: 2000,
              category: "사무용품",
            },
          ],
          totalAmount: 2000,
          warnings: [],
        },
      },
    });
  });
  await page.goto(toolUrl("receipt"));
  const file = {
    name: "receipt.png",
    mimeType: "image/png",
    buffer: Buffer.from("test-image"),
  };
  await page.getByLabel("파일 선택", { exact: true }).setInputFiles([file]);
  await expect(page.locator(".maisa-files")).toContainText("receipt.png");
  await page
    .getByRole("button", { name: "receipt.png 선택 해제", exact: true })
    .click();
  await expect(page.locator(".maisa-files li")).toHaveCount(0);
  await page.getByLabel("파일 선택", { exact: true }).setInputFiles([file]);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "AI로 만들기", exact: true }).click();
  await expect(page.locator(".maisa-result table")).toContainText("종이");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "엑셀용 CSV 받기" }).click();
  expect((await download).suggestedFilename()).toBe("영수증-장부.csv");
});
test("business plan answers survive question changes and mobile layout stays accessible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(toolUrl("business-plan"));
  await page
    .getByLabel("무엇을 바꾸거나 해결하고 싶나요?", { exact: true })
    .fill("아이들이 함께 쉬는 공간을 만들고 싶어요.");
  await page.getByRole("button", { name: "다음 질문", exact: true }).click();
  await page
    .getByLabel("누구를 위한 일인가요?", { exact: true })
    .fill("동네 아이들 10명");
  await page.getByRole("button", { name: "이전 질문", exact: true }).click();
  await expect(
    page.getByLabel("무엇을 바꾸거나 해결하고 싶나요?", { exact: true }),
  ).toHaveValue("아이들이 함께 쉬는 공간을 만들고 싶어요.");
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
test("real execution endpoint rejects unsigned and cross-site requests; login return restores text", async ({
  page,
  request,
}) => {
  const response = await request.post("/api/ai-tools/format", {
    headers: {
      Origin: new URL(test.info().project.use.baseURL as string).origin,
      "X-Requested-With": "aiguide",
    },
    data: {},
  });
  expect(response.status()).toBe(401);
  const cross = await request.post("/api/ai-tools/format", {
    headers: { Origin: "https://other.test", "X-Requested-With": "aiguide" },
    data: {},
  });
  expect(cross.status()).toBe(403);
  await page.goto(toolUrl("format"));
  await page
    .getByLabel("메모 또는 문서 초안", { exact: true })
    .fill("로그인해도 남아야 할 메모");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "AI로 만들기", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("로그인");
  await page
    .getByRole("link", { name: "로그인하고 계속하기", exact: true })
    .click();
  await expect(page).toHaveURL(/\/ko\/login\?next=/);
  await page.goto(toolUrl("format"));
  await expect(
    page.getByLabel("메모 또는 문서 초안", { exact: true }),
  ).toHaveValue("로그인해도 남아야 할 메모");
});
