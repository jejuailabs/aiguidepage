import { test, expect, type Page } from "@playwright/test";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";

test.skip(!process.env.TEST_PORTAL, "Requires the isolated portal emulators");
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3002";
const headers = { Origin: base, "X-Requested-With": "aiguide" };
const png = readFileSync("output/imagegen/homepage-shelves-v1.png");
const createdMedia = new Set<string>();
test.afterEach(async () => {
  if (!process.env.TEST_PORTAL) return;
  const db = getFirestore(admin());
  await db.doc("items/qa-media-gallery").delete();
  await Promise.all(
    [...createdMedia].map((id) =>
      db.collection("mediaUploads").doc(id).delete(),
    ),
  );
  createdMedia.clear();
});
function admin() {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
  process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
  return (
    getApps().find((app) => app.name === "media-e2e") ||
    initializeApp({ projectId: "demo-aiguide" }, "media-e2e")
  );
}
async function login(page: Page) {
  const auth = getAuth(admin()),
    uid = "qa-media-owner",
    email = `${uid}@example.test`,
    password = "Emulator-only-password-123";
  try {
    await auth.createUser({ uid, email, password, emailVerified: true });
  } catch (error) {
    if (
      (error as { code: string }).code !== "auth/uid-already-exists" &&
      (error as { code: string }).code !== "auth/email-already-exists"
    )
      throw error;
  }
  await auth.setCustomUserClaims(uid, { platformAdmin: true });
  const response = await fetch(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-api-key",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const { idToken } = await response.json();
  expect(
    (
      await page.request.post(`${base}/api/session`, {
        headers,
        data: { idToken },
      })
    ).status(),
  ).toBe(200);
}
test("prompt gallery uploads up to three references, saves them and previews image/video results", async ({
  page,
}) => {
  await login(page);
  const db = getFirestore(admin());
  if (!(await db.doc("orgs/qa-media").get()).exists)
    expect(
      (
        await page.request.post(`${base}/api/portal/platform/orgs`, {
          headers,
          data: {
            slug: "qa-media",
            name: { ko: "갤러리 검사", en: "Gallery QA" },
            logoUrl: "",
            theme: { palette: "gallery", mode: "light" },
            defaultLocale: "en",
            locales: ["ko", "en"],
          },
        })
      ).status(),
    ).toBe(200);
  const image = {
    id: randomUUID(),
    type: "image",
    name: "result.png",
    url: "https://fixtures.test/result.png",
    mime: "image/png",
    size: png.length,
  };
  const videoBytes = Buffer.from(
    await page.evaluate(async () => {
      const canvas = document.createElement("canvas");
      canvas.width = 160;
      canvas.height = 90;
      const context = canvas.getContext("2d")!;
      context.fillStyle = "#456789";
      context.fillRect(0, 0, 160, 90);
      const stream = canvas.captureStream(10),
        recorder = new MediaRecorder(stream, { mimeType: "video/webm" }),
        chunks: Blob[] = [];
      const done = new Promise<Blob>((resolve) => {
        recorder.ondataavailable = (event) => chunks.push(event.data);
        recorder.onstop = () =>
          resolve(new Blob(chunks, { type: "video/webm" }));
      });
      recorder.start();
      context.fillRect(0, 0, 160, 90);
      await new Promise((resolve) => setTimeout(resolve, 400));
      recorder.stop();
      const bytes = Array.from(
        new Uint8Array(await (await done).arrayBuffer()),
      );
      stream.getTracks().forEach((track) => track.stop());
      return bytes;
    }),
  );
  const video = {
    id: randomUUID(),
    type: "video",
    name: "result.webm",
    url: "https://fixtures.test/result.webm",
    mime: "video/webm",
    size: videoBytes.length,
  };
  createdMedia.add(image.id);
  createdMedia.add(video.id);
  for (const asset of [image, video])
    await db
      .collection("mediaUploads")
      .doc(asset.id)
      .set({ orgId: null, state: "ready", asset, attachments: [] });
  const prompt = {
    type: "prompt",
    title: { ko: "샘플 갤러리", en: "Sample gallery" },
    summary: {
      ko: "참고 이미지로 생성하기",
      en: "Create from reference images",
    },
    category: "image",
    order: 0,
    status: "published",
    data: {
      aiSlug: "gemini",
      text: {
        ko: "이미지를 첨부해 변환해 줘",
        en: "Transform the attached images",
      },
      variables: [],
      resultMedia: [image, video],
      referenceImages: [],
    },
  };
  expect(
    (
      await page.request.post(
        `${base}/api/portal/platform/items/qa-media-gallery`,
        { headers, data: prompt },
      )
    ).status(),
  ).toBe(200);
  await page.route("https://fixtures.test/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: route.request().url().endsWith(".webm")
        ? "video/webm"
        : "image/png",
      body: route.request().url().endsWith(".webm") ? videoBytes : png,
      headers: { "Access-Control-Allow-Origin": "*" },
    }),
  );
  const tickets = new Map<
    string,
    {
      id: string;
      type: "image";
      name: string;
      url: string;
      mime: "image/png";
      size: number;
    }
  >();
  let prepares = 0;
  await page.route("**/__qa_upload", (route) =>
    route.fulfill({ status: 201, body: "" }),
  );
  await page.route("**/api/media", async (route) => {
    const body = route.request().postDataJSON();
    if (body.action === "prepare") {
      prepares++;
      const asset = {
        id: randomUUID(),
        type: "image" as const,
        name: body.name,
        url: `https://fixtures.test/${body.name}`,
        mime: "image/png" as const,
        size: body.size,
      };
      tickets.set(asset.id, asset);
      createdMedia.add(asset.id);
      await route.fulfill({
        json: { id: asset.id, url: `${base}/__qa_upload`, fields: {} },
      });
    } else if (body.action === "finish") {
      const asset = tickets.get(body.id)!;
      await db
        .collection("mediaUploads")
        .doc(asset.id)
        .set({ orgId: null, state: "ready", asset, attachments: [] });
      await route.fulfill({ json: { asset } });
    } else await route.fulfill({ json: { ok: true } });
  });
  await page.goto("/en/platform");
  await page
    .getByRole("button", { name: "Shared content", exact: true })
    .click();
  await page
    .locator(".admin-row")
    .filter({ hasText: "Sample gallery" })
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  const references = page.getByRole("group", {
      name: "Reference images",
      exact: true,
    }),
    input = references.getByLabel("Add reference images");
  const files = [1, 2, 3, 4].map((number) => ({
    name: `reference-${number}.png`,
    mimeType: "image/png",
    buffer: png,
  }));
  await input.setInputFiles(files);
  await expect(references.getByRole("alert")).toHaveText(
    "You can add up to 3 files.",
  );
  expect(prepares).toBe(0);
  await input.setInputFiles(files.slice(0, 3));
  await expect(references.locator(".upload-previews>div")).toHaveCount(3);
  await expect(input).toBeDisabled();
  await page
    .locator(".editor-form")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await expect(page.locator(".editor-form")).not.toBeVisible();
  expect(
    (await db.doc("items/qa-media-gallery").get()).data()!.data.referenceImages,
  ).toHaveLength(3);
  await page.goto("/en/o/qa-media/prompts");
  await page
    .getByRole("button", {
      name: "View results for Sample gallery",
      exact: true,
    })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator(".result-viewer img")).toBeVisible();
  await expect(dialog.locator(".reference-grid article")).toHaveCount(3);
  const download = page.waitForEvent("download");
  await dialog
    .getByRole("button", { name: "Save image 1", exact: true })
    .click();
  expect((await download).suggestedFilename()).toBe("reference-1.png");
  await dialog
    .getByRole("button", { name: "View result 2", exact: true })
    .click();
  await expect(dialog.locator(".result-viewer video")).toHaveAttribute(
    "controls",
    "",
  );
  await expect
    .poll(() =>
      dialog
        .locator(".result-viewer video")
        .evaluate((element) => (element as HTMLVideoElement).readyState),
    )
    .toBeGreaterThanOrEqual(2);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await page
    .getByRole("button", {
      name: "View results for Sample gallery",
      exact: true,
    })
    .click();
  await expect
    .poll(() =>
      dialog
        .locator(".result-viewer img")
        .evaluate((element) => (element as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "output/qa/prompt-gallery-mobile.png" });
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .getByRole("heading", { name: "Prompt gallery", exact: true })
    .click();
  await page.screenshot({
    path: "output/qa/prompt-gallery-desktop.png",
    fullPage: true,
  });
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
});
test("public AI tools open directly with plain function names", async ({
  page,
}) => {
  await page.goto("/ko");
  await page
    .locator(".desktop-nav")
    .getByRole("button", { name: "AI 도구", exact: true })
    .click();
  await expect(page).toHaveURL(/\/ko\/tools/);
  await expect(page.locator(".simple-tool-card")).toHaveCount(4);
  await page.getByRole("button", { name: /글자 수 세기/ }).click();
  await page.getByRole("dialog").getByLabel("글을 입력해 주세요").fill("제주");
  await expect(page.locator(".stat-grid dd").first()).toHaveText("2");
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "output/qa/tools-simple-mobile.png",
    fullPage: true,
  });
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
});
