import { test } from "node:test";
import assert from "node:assert/strict";
import { contentSchema } from "../src/lib/schema.ts";
import {
  uploadRequestSchema,
  matchesMediaSignature,
  imageLimit,
  videoLimit,
} from "../src/lib/media.ts";
const image = {
  id: "00000000-0000-4000-8000-000000000001",
  type: "image",
  name: "sample.png",
  url: "https://example.test/sample.png",
  mime: "image/png",
  size: 100,
};
const prompt = {
  type: "prompt",
  title: { ko: "테스트", en: "Test" },
  summary: { ko: "예시", en: "Example" },
  category: "image",
  order: 0,
  status: "published",
  data: {
    aiSlug: "gemini",
    text: { ko: "이미지를 만들어 줘", en: "Create an image" },
  },
};
test("existing prompts remain readable with empty media defaults", () => {
  const parsed = contentSchema.parse(prompt);
  assert.deepEqual(parsed.data.resultMedia, []);
  assert.deepEqual(parsed.data.referenceImages, []);
});
test("reference images are capped at three and cannot include videos", () => {
  const data = { ...prompt.data, referenceImages: [image, image, image] };
  assert.equal(contentSchema.safeParse({ ...prompt, data }).success, true);
  assert.equal(
    contentSchema.safeParse({
      ...prompt,
      data: { ...data, referenceImages: [image, image, image, image] },
    }).success,
    false,
  );
  assert.equal(
    contentSchema.safeParse({
      ...prompt,
      data: {
        ...data,
        referenceImages: [{ ...image, type: "video", mime: "video/mp4" }],
      },
    }).success,
    false,
  );
});
test("results support videos and reject more than six files", () => {
  const video = {
    ...image,
    type: "video",
    mime: "video/mp4",
    name: "result.mp4",
  };
  assert.equal(
    contentSchema.safeParse({
      ...prompt,
      data: { ...prompt.data, resultMedia: [image, video] },
    }).success,
    true,
  );
  assert.equal(
    contentSchema.safeParse({
      ...prompt,
      data: { ...prompt.data, resultMedia: Array(7).fill(image) },
    }).success,
    false,
  );
});
test("upload requests enforce image and video limits, including reference purpose", () => {
  const input = {
    orgId: null,
    purpose: "reference",
    name: "sample.png",
    mime: "image/png",
    size: imageLimit,
  };
  assert.equal(uploadRequestSchema.safeParse(input).success, true);
  assert.equal(
    uploadRequestSchema.safeParse({ ...input, size: imageLimit + 1 }).success,
    false,
  );
  assert.equal(
    uploadRequestSchema.safeParse({ ...input, mime: "image/svg+xml" }).success,
    false,
  );
  assert.equal(
    uploadRequestSchema.safeParse({ ...input, mime: "video/mp4" }).success,
    false,
  );
  assert.equal(
    uploadRequestSchema.safeParse({
      ...input,
      purpose: "result",
      mime: "video/mp4",
      size: videoLimit,
    }).success,
    true,
  );
  assert.equal(
    uploadRequestSchema.safeParse({
      ...input,
      purpose: "result",
      mime: "video/mp4",
      size: videoLimit + 1,
    }).success,
    false,
  );
});
test("file signatures must match the declared supported format", () => {
  const png = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(matchesMediaSignature(png, "image/png"), true);
  assert.equal(matchesMediaSignature(png, "image/jpeg"), false);
  assert.equal(
    matchesMediaSignature(new TextEncoder().encode("<svg/>"), "image/png"),
    false,
  );
  assert.equal(
    matchesMediaSignature(
      Uint8Array.from([0, 0, 0, 20, 102, 116, 121, 112]),
      "video/mp4",
    ),
    true,
  );
});
