import { test, expect, type Page } from "@playwright/test";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import AxeBuilder from "@axe-core/playwright";

test.skip(
  !process.env.TEST_PORTAL,
  "Requires Firebase emulators and the app on port 3002",
);
test.setTimeout(300000);
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3002";
const headers = { Origin: base, "X-Requested-With": "aiguide" };
function admin() {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
  process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
  return (
    getApps().find((app) => app.name === "portal-e2e") ||
    initializeApp({ projectId: "demo-aiguide" }, "portal-e2e")
  );
}
async function token(uid: string, operator = false, verified = true) {
  const auth = getAuth(admin()),
    email = `${uid}@example.test`,
    password = "Emulator-only-password-123";
  try {
    await auth.createUser({
      uid,
      email,
      password,
      emailVerified: verified,
      displayName: uid,
    });
  } catch (error) {
    if (
      (error as { code?: string }).code !== "auth/uid-already-exists" &&
      (error as { code?: string }).code !== "auth/email-already-exists"
    )
      throw error;
  }
  await auth.updateUser(uid, { emailVerified: verified });
  await auth.setCustomUserClaims(uid, { platformAdmin: operator });
  const response = await fetch(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-api-key",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const result = await response.json();
  if (!result.idToken) throw new Error("Emulator sign-in failed");
  return result.idToken as string;
}
async function login(page: Page, uid = "qa-owner", operator = true) {
  const idToken = await token(uid, operator);
  const response = await page.request.post(`${base}/api/session`, {
    headers,
    data: { idToken },
  });
  expect(response.status(), await response.text()).toBe(200);
}
async function mutate(page: Page, path: string, data: unknown) {
  const response = await page.request.post(`${base}/api/portal/${path}`, {
    headers,
    data,
  });
  expect(response.status(), await response.text()).toBe(200);
  return response.json();
}
test.beforeAll(async ({ browser }) => {
  test.setTimeout(300000);
  const page = await browser.newPage();
  await login(page);
  for (const slug of ["qa-alpha", "qa-beta"]) {
    if (!(await getFirestore(admin()).doc(`orgs/${slug}`).get()).exists)
      await mutate(page, "platform/orgs", {
        slug,
        name: {
          ko: slug === "qa-alpha" ? "제주 AI 랩" : "배움의 숲",
          en: slug === "qa-alpha" ? "Jeju AI Lab" : "Learning Forest",
        },
        logoUrl: "",
        theme: {
          palette: slug === "qa-alpha" ? "gallery" : "forest",
          mode: "light",
        },
        defaultLocale: "ko",
        locales: ["ko", "en"],
      });
  }
  await page.close();
});
test("session rejects unverified tokens, missing CSRF headers and cross-org access", async ({
  page,
}) => {
  const unverified = await token("qa-unverified", false, false);
  expect(
    (
      await page.request.post(`${base}/api/session`, {
        headers,
        data: { idToken: unverified },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await page.request.post(`${base}/api/session`, {
        data: { idToken: await token("qa-user") },
      })
    ).status(),
  ).toBe(403);
  await login(page, "qa-user", false);
  expect(
    (await page.request.get(`${base}/api/portal/orgs/qa-alpha/admin`)).status(),
  ).toBe(403);
  expect(
    (
      await page.request.post(`${base}/api/portal/platform/orgs`, {
        headers,
        data: { slug: "forged" },
      })
    ).status(),
  ).toBe(403);
  await page.goto("/ko/o/qa-alpha/games");
  await expect(
    page.getByText("이 공간을 사용할 권한이 없어요.", { exact: true }),
  ).toBeVisible();
});
test("email link login completes in the emulator without sending real email", async ({
  page,
}) => {
  await page.goto("/en/login");
  const email = `qa-email-${Date.now()}@example.test`;
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByRole("status")).toBeVisible();
  const response = await fetch(
    "http://127.0.0.1:9099/emulator/v1/projects/demo-aiguide/oobCodes",
  );
  const data = await response.json();
  const entry = data.oobCodes.find(
    (code: { email: string }) => code.email === email,
  );
  expect(entry).toBeTruthy();
  const url = new URL("/en/login", base);
  url.searchParams.set("mode", "signIn");
  url.searchParams.set("oobCode", entry.oobCode);
  url.searchParams.set("apiKey", "demo-api-key");
  await page.goto(url.href);
  await expect(page).toHaveURL(/\/en\/orgs/, { timeout: 120000 });
  const cookies = await page.context().cookies();
  expect(
    cookies.find((cookie) => cookie.name === "aiguide-session")?.httpOnly,
  ).toBe(true);
});
test("invite join, public-to-member navigation and favorites survive refresh", async ({
  page,
  browser,
}) => {
  await login(page);
  const { code } = await mutate(page, "orgs/qa-alpha/invites", {
    role: "member",
    days: 1,
    maxUses: 5,
    email: "qa-member@example.test",
  });
  const member = await browser.newPage();
  await login(member, "qa-member", false);
  await member.goto(`/ko/join?code=${code}`);
  await member
    .getByRole("button", { name: "조직에 참여하기", exact: true })
    .click();
  await expect(member).toHaveURL(/qa-alpha\/ai/, { timeout: 120000 });
  await expect(
    member.getByRole("heading", { name: "AI 전시관", exact: true }),
  ).toBeVisible();
  await member.goto("/ko/o/qa-alpha/prompts?item=common:prompt-meeting");
  const dialog = member.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const favorite = dialog.getByRole("button", {
    name: "즐겨찾기",
    exact: true,
  });
  if ((await favorite.getAttribute("aria-pressed")) !== "true")
    await favorite.click();
  await expect(favorite).toHaveAttribute("aria-pressed", "true");
  await member.goto("/ko/me");
  await expect(member.getByText("회의록을 다음 행동으로")).toBeVisible();
  await member.reload();
  await expect(member.getByText("회의록을 다음 행동으로")).toBeVisible();
  await member.close();
});
test("prompt feed loads every page, fills variables, copies and keeps deep links", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await login(page);
  await page.goto("/ko/o/qa-alpha/prompts");
  await page.locator(".feed-sentinel").scrollIntoViewIfNeeded();
  await expect(page.locator(".content-card")).toHaveCount(18);
  await page
    .locator(".content-open")
    .filter({
      has: page.getByRole("heading", {
        name: "회의록을 다음 행동으로",
        exact: true,
      }),
    })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("회의 메모", { exact: true })
    .fill("금요일까지 안내문 작성");
  await dialog.getByRole("button", { name: "복사하기", exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "금요일까지 안내문 작성",
  );
  await expect(page).toHaveURL(/item=common%3Aprompt-meeting/);
  await page.reload();
  await expect(page.getByRole("dialog")).toBeVisible();
});
test("all four tools work locally and game controls respond", async ({
  page,
}) => {
  await login(page);
  await page.goto("/en/o/qa-alpha/tools?item=common:tool-char-count");
  await page.getByRole("dialog").getByLabel("Enter your text").fill("가 👨‍👩‍👧‍👦");
  await expect(page.locator(".stat-grid dd").first()).toHaveText("3");
  await page.goto("/en/o/qa-alpha/tools?item=common:tool-prompt-builder");
  await page
    .getByRole("dialog")
    .getByLabel("What do you want to do?")
    .fill("Plan a workshop");
  await expect(page.locator(".tool-output")).toContainText("Plan a workshop");
  await page.goto("/en/o/qa-alpha/tools?item=common:tool-qr-maker");
  await page
    .getByRole("dialog")
    .getByLabel("Website URL")
    .fill("https://aiguidepage.vercel.app");
  await page
    .getByRole("button", { name: "Create QR code", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Download PNG" }),
  ).toHaveAttribute("href", /^data:image\/png/);
  await page.goto("/en/o/qa-alpha/tools?item=common:tool-template-fill");
  await page
    .getByRole("dialog")
    .getByLabel("Title", { exact: true })
    .fill("Our workshop");
  await expect(page.locator(".tool-output")).toContainText("[Our workshop]");
  await page.goto("/en/o/qa-alpha/games?item=common:game-memory");
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.locator(".memory-card")).toHaveCount(8);
  await page.locator(".memory-card").first().click();
  await expect(page.locator(".memory-card").first()).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.goto("/en/o/qa-alpha/games?item=common:game-quiz");
  await page.locator(".quiz-options button").nth(1).click();
  await expect(page.locator(".quiz-options button.correct")).toBeVisible();
});
test("admin content, organization templates and hall visibility are isolated", async ({
  page,
}) => {
  await login(page);
  const template = {
    type: "tool",
    title: { ko: "조직 전용 안내", en: "Organization announcement" },
    summary: { ko: "조직 템플릿", en: "Organization template" },
    category: "utility",
    order: 10,
    status: "published",
    data: {
      toolKey: "template-fill",
      template: { ko: "제주: {{제목}}", en: "Jeju: {{Title}}" },
    },
  };
  await mutate(page, "orgs/qa-alpha/items/qa-template", template);
  await mutate(page, "orgs/qa-beta/items/qa-template", {
    ...template,
    data: {
      ...template.data,
      template: { ko: "숲: {{제목}}", en: "Forest: {{Title}}" },
    },
  });
  await page.goto("/en/o/qa-alpha/tools?item=org:qa-template");
  await expect(page.locator(".tool-output")).toContainText("Jeju:");
  await page.goto("/en/o/qa-beta/tools?item=org:qa-template");
  await expect(page.locator(".tool-output")).toContainText("Forest:");
  await page.goto("/ko/o/qa-alpha/admin");
  await page.getByRole("tab", { name: "전시관", exact: true }).click();
  const toggle = page.getByRole("switch", { name: "게임", exact: true });
  if ((await toggle.getAttribute("aria-checked")) === "true")
    await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await page.goto("/ko/o/qa-alpha/games");
  await expect(
    page.getByText(
      "이 조직에서는 사용하지 않는 전시관이에요. 다른 전시관을 선택해 주세요.",
      { exact: true },
    ),
  ).toBeVisible();
  const check = await page.request.get(
    `${base}/api/portal/orgs/qa-alpha/items?hall=games`,
  );
  expect(check.status()).toBe(403);
  await mutate(page, "orgs/qa-alpha/halls", {
    key: "games",
    enabled: true,
    order: 3,
    title: { ko: "게임", en: "Games" },
  });
});
test("desktop and mobile layouts fit, with accessible controls", async ({
  page,
}) => {
  await login(page);
  await page.goto("/ko/o/qa-alpha/prompts");
  await expect(page.locator(".content-card").first()).toBeVisible();
  await page.screenshot({
    path: "output/qa/portal-prompts-desktop.png",
    fullPage: true,
  });
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ko/o/qa-alpha/tools");
  await expect(page.locator(".content-card").first()).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "output/qa/portal-tools-mobile.png",
    fullPage: true,
  });
  await page.locator(".content-open").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.goto("/ko/o/qa-alpha/admin");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "output/qa/portal-admin-mobile.png",
    fullPage: true,
  });
});

test("platform administrator creates an organization and edits a prompt in the UI", async ({
  page,
}) => {
  await login(page);
  await page.goto("/en/platform");
  await page
    .getByRole("button", { name: "Create organization", exact: true })
    .click();
  const form = page.locator(".editor-form");
  const slug = `qa-ui-${Date.now()}`;
  await form.getByLabel("Organization address").fill(slug);
  await form.getByLabel("Organization name · Korean").fill("관리 화면 테스트");
  await form.getByLabel("Organization name · English").fill("Admin UI test");
  await form
    .getByRole("button", { name: "Create organization", exact: true })
    .click();
  await expect(
    page.getByText("Share this invitation with the first administrator."),
  ).toBeVisible();
  await expect(
    page.locator(".org-card").filter({ hasText: slug }),
  ).toBeVisible();
  expect(
    (await getFirestore(admin()).doc(`orgs/${slug}/halls/ai`).get()).exists,
  ).toBe(true);

  await page
    .getByRole("button", { name: "Shared content", exact: true })
    .click();
  const original = (
    await getFirestore(admin()).doc("items/prompt-meeting").get()
  ).data()!;
  const resultText = {
    ko: "수정해도 보존되는 결과",
    en: "A preserved example",
  };
  await getFirestore(admin())
    .doc("items/prompt-meeting")
    .update({ "data.resultText": resultText });
  await page.reload();
  await page
    .getByRole("button", { name: "Shared content", exact: true })
    .click();
  await page
    .locator(".admin-row")
    .filter({ hasText: original.title.en })
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  await page
    .getByRole("group", { name: "Title", exact: true })
    .getByLabel("English", { exact: true })
    .fill(`${original.title.en} updated`);
  await page
    .locator(".editor-form")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await expect(page.locator(".editor-form")).not.toBeVisible();
  const updated = (
    await getFirestore(admin()).doc("items/prompt-meeting").get()
  ).data()!;
  expect(updated.title.en).toBe(`${original.title.en} updated`);
  expect(updated.data.variables).toEqual(original.data.variables);
  expect(updated.data.resultText).toEqual(resultText);
  await getFirestore(admin()).doc("items/prompt-meeting").set(original);
});
