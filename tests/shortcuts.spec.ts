import { test, expect, devices } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import QRCode from "qrcode";
import { mkdirSync } from "node:fs";
import { aiItems } from "../src/data/ai";
import { mobilePlatform, mobileAppHref } from "../src/lib/mobile-launch";

mkdirSync("output/qa", { recursive: true });
const item = (id: string) => aiItems.find((ai) => ai.id === id)!;

test("mobile routes use verified paths and retain a web fallback", () => {
  expect(
    mobilePlatform("Mozilla/5.0 (Linux; Android 15)", "Linux armv8l", 5),
  ).toBe("android");
  expect(
    mobilePlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)", "iPhone", 5),
  ).toBe("ios");
  expect(mobilePlatform("Mozilla/5.0 (Macintosh)", "MacIntel", 5)).toBe("ios");
  expect(
    mobilePlatform("Mozilla/5.0 (Windows NT 10.0)", "Win32", 0),
  ).toBeNull();
  expect(mobileAppHref(item("chatgpt"), "ios")).toBe(
    "https://chatgpt.com/#native",
  );
  expect(mobileAppHref(item("claude"), "ios")).toBe("https://claude.ai/new");
  expect(mobileAppHref(item("perplexity"), "ios")).toBe(
    "https://www.perplexity.ai/search",
  );
  expect(mobileAppHref(item("suno"), "ios")).toBe("https://suno.com/create");
  expect(mobileAppHref(item("gemini"), "ios")).toBeNull();
  expect(mobileAppHref(item("flow-music"), "android")).toBeNull();
  expect(mobileAppHref(item("genspark"), "android")).toBeNull();
  expect(mobileAppHref(item("chatgpt"), null)).toBeNull();
  for (const ai of aiItems.filter((ai) => ai.mobileApp?.androidPackage)) {
    const href = mobileAppHref(ai, "android")!;
    expect(href).toContain(`package=${ai.mobileApp!.androidPackage};`);
    expect(href).toContain(
      `S.browser_fallback_url=${encodeURIComponent(ai.url)};end`,
    );
  }
});

test("manifest and install icons are available without locale redirection", async ({
  page,
  request,
}) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.status()).toBe(200);
  const manifest = await response.json();
  expect(manifest).toMatchObject({
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
  });
  for (const icon of manifest.icons) {
    const response = await request.get(icon.src);
    expect(response.status()).toBe(200);
    const png = await response.body(),
      size = Number(icon.sizes.split("x")[0]);
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect(png.readUInt32BE(16)).toBe(size);
    expect(png.readUInt32BE(20)).toBe(size);
  }
  await page.goto("/ko");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/manifest.webmanifest",
  );
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    "href",
    "/icons/apple-touch-icon.png",
  );
});

test("desktop QR encodes the deployed locale URL and supports saving and copying", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/ko");
  await expect(
    page.getByRole("link", { name: "바탕화면 바로가기", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "output/qa/shortcut-desktop.png",
    fullPage: true,
  });
  const open = page.getByRole("button", {
    name: "휴대폰으로 열기 · QR",
    exact: true,
  });
  await open.click();
  const qr = page.getByRole("img", { name: "AI 전시관으로 연결되는 QR코드" });
  const url = "https://aiguidepage.vercel.app/ko";
  const expected = QRCode.create(url, { errorCorrectionLevel: "M" }).modules;
  await expect(qr).toHaveAttribute("src", /^data:image\/png;base64,/);
  // Compare encoded QR cells; browser and Node PNG compression differs.
  const cells = await qr.evaluate(async (element, size) => {
    const image = element as HTMLImageElement;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = image.naturalWidth;
    const context = canvas.getContext("2d")!;
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const scale = canvas.width / (size + 6),
      values = [];
    for (let row = 0; row < size; row++)
      for (let col = 0; col < size; col++) {
        const x = Math.floor((col + 3.5) * scale),
          y = Math.floor((row + 3.5) * scale);
        values.push(pixels[(y * canvas.width + x) * 4]);
      }
    return values;
  }, expected.size);
  expect(cells).toEqual(
    Array.from(expected.data, (value) => (value ? 0 : 255)),
  );
  await expect(page.locator(".shortcut-url")).toHaveText(url);
  await page.getByRole("button", { name: "주소 복사", exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(url);
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "QR 이미지 저장", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("AI-gallery-QR.png");
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({ path: "output/qa/shortcut-qr.png" });
  await page.keyboard.press("Escape");
  await expect(open).toBeFocused();
  await page.goto("/en");
  await page
    .getByRole("button", { name: "Open on phone · QR", exact: true })
    .click();
  await expect(page.locator(".shortcut-url")).toHaveText(
    "https://aiguidepage.vercel.app/en",
  );
});

test("desktop shortcut uses the default browser and never installs a browser app", async ({
  page,
}) => {
  await page.goto("/ko");
  const button = page.getByRole("link", {
    name: "바탕화면 바로가기",
    exact: true,
  });
  // Browser install UI and the physical OS are deliberately simulated here.
  await page.evaluate(() => {
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(event, {
      prompt: async () => {
        document.body.dataset.promptCalls = String(
          Number(document.body.dataset.promptCalls || 0) + 1,
        );
      },
      userChoice: Promise.resolve({ outcome: "accepted" }),
    });
    window.dispatchEvent(event);
  });
  await expect(button).toHaveAttribute(
    "href",
    "https://aiguidepage.vercel.app/ko",
  );
  await expect(button).toHaveAttribute("draggable", "true");
  await button.click();
  await expect(
    page.getByRole("link", { name: "바탕화면에 끌어 놓기", exact: true }),
  ).toHaveAttribute("href", "https://aiguidepage.vercel.app/ko");
  await expect(page.locator("body")).not.toHaveAttribute(
    "data-prompt-calls",
    "1",
  );
  await expect(page.getByRole("dialog")).toContainText("기본 브라우저");
  const response = await page.request.get("/api/shortcut?locale=ko");
  expect(await response.text()).toBe(
    "[InternetShortcut]\r\nURL=https://aiguidepage.vercel.app/ko\r\n",
  );
  expect(await response.text()).not.toMatch(/chrome|profile|app-id|\.exe/i);
  await page.keyboard.press("Escape");
  await page.evaluate(() => window.dispatchEvent(new Event("appinstalled")));
  await expect(
    page.getByRole("link", { name: "바탕화면 바로가기", exact: true }),
  ).toBeVisible();
});

test("iPhone gets home instructions and app links, Android gets intents with web fallback", async ({
  browser,
}) => {
  for (const device of ["iPhone 13", "Pixel 7"] as const) {
    const context = await browser.newContext({
      ...devices[device],
      baseURL: process.env.TEST_BASE_URL || "http://127.0.0.1:3000",
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await page.goto("/ko");
    await page.evaluate(() => (document.documentElement.dataset.scale = "130"));
    const button = page.getByRole("button", {
      name: "홈 화면에 추가",
      exact: true,
    });
    await expect(button).toBeVisible();
    await button.click();
    const dialog = page.getByRole("dialog", {
      name: "AI 전시관 바로가기",
      exact: true,
    });
    await expect(dialog).toContainText(
      device === "iPhone 13" ? "Safari" : "Chrome",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    if (device === "iPhone 13")
      await page.screenshot({ path: "output/qa/shortcut-mobile.png" });
    await page.keyboard.press("Escape");
    await page.goto("/ko?item=chatgpt");
    const link = page.getByRole("link", {
      name: "ChatGPT — 모바일 앱으로 열기",
      exact: true,
    });
    await expect(link).toHaveAttribute(
      "href",
      mobileAppHref(
        item("chatgpt"),
        device === "iPhone 13" ? "ios" : "android",
      )!,
    );
    await expect(link).not.toHaveAttribute("target", "_blank");
    await expect(
      page.getByRole("link", { name: /ChatGPT — 사이트 열기/ }),
    ).toBeVisible();
    await context.close();
  }
});
