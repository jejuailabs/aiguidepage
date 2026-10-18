import { test } from "node:test";
import assert from "node:assert/strict";
import {
  aiInputSchema,
  getMaisaDefinition,
  parseAiInput,
} from "../src/lib/server/maisa-input.ts";
import { fileToBlock } from "../src/lib/server/maisa-providers.ts";
import { validateMaisaResult } from "../src/lib/server/maisa-run.ts";
import { runMaisa } from "../src/lib/server/maisa-run.ts";
import { receiptsCsv } from "../src/lib/maisa-results.ts";
import { maisaTools } from "../src/lib/maisa-tools.ts";
import { catalog } from "../src/data/catalog.ts";
import { contentSchema } from "../src/lib/schema.ts";
import ko from "../messages/ko.json" with { type: "json" };
import en from "../messages/en.json" with { type: "json" };
const input = {
  consent: true,
  locale: "ko",
  itemId: "tool-maisa-format",
  scope: "common",
  text: "초안",
};
const json = (value) =>
  new Request("http://localhost/api/ai-tools/format", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(value),
  });
test("all six ma2sa tools are published and editable content with known tool keys", () => {
  const tools = catalog({ ko: ko.ai, en: en.ai }).filter(
    (entry) => entry.item.type === "tool" && entry.id.startsWith("tool-maisa-"),
  );
  assert.equal(tools.length, 6);
  for (const { item } of tools) {
    assert.equal(contentSchema.parse(item).public, true);
    assert.ok(maisaTools.some((tool) => tool.key === item.data.toolKey));
  }
});
test("execution requires explicit consent and valid input", async () => {
  assert.equal((await parseAiInput(json(input), "format")).input.text, "초안");
  await assert.rejects(
    parseAiInput(json({ ...input, consent: false }), "format"),
  );
  await assert.rejects(
    parseAiInput(json({ ...input, text: "" }), "format"),
    (error) => error.code === "textRequired",
  );
  await assert.rejects(
    parseAiInput(json({ ...input, text: "a".repeat(3501) }), "narration"),
    (error) => error.code === "textTooLong",
  );
  assert.throws(
    () => getMaisaDefinition("constructor"),
    (error) => error.status === 404,
  );
  assert.throws(() => aiInputSchema.parse({ ...input, scope: "other" }));
});
test("streamed body limits and attachment limits are enforced without trusting headers", async () => {
  await assert.rejects(
    parseAiInput(
      new Request("http://localhost", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "a".repeat(4.3 * 1024 * 1024),
      }),
      "format",
    ),
    (error) => error.code === "fileTooLarge",
  );
  const form = new FormData();
  form.set("input", JSON.stringify(input));
  for (let i = 0; i < 4; i++)
    form.append(
      "files",
      new File(["x"], `photo${i}.png`, { type: "image/png" }),
    );
  await assert.rejects(
    parseAiInput(
      new Request("http://localhost", { method: "POST", body: form }),
      "receipt",
    ),
    (error) => error.code === "fileCount",
  );
  const valid = new FormData();
  valid.set("input", JSON.stringify(input));
  valid.append(
    "files",
    new File(["공고문"], "notice.txt", { type: "text/plain" }),
  );
  assert.equal(
    (
      await parseAiInput(
        new Request("http://localhost", { method: "POST", body: valid }),
        "announcement",
      )
    ).files.length,
    1,
  );
  await assert.rejects(
    fileToBlock(new File(["fake PNG"], "image.png", { type: "image/png" })),
    (error) => error.code === "invalidFile",
  );
});
test("results are checked before display and CSV cells cannot execute spreadsheet formulas", () => {
  assert.throws(
    () => validateMaisaResult("format", { title: "title" }),
    (error) => error.code === "invalidResult",
  );
  const result = validateMaisaResult("format", {
    title: "제목",
    content: "본문",
    missingFields: [],
    checklist: [],
  });
  assert.equal(result.content, "본문");
  const csv = receiptsCsv(
    [
      {
        date: "2026-10-18",
        vendor: '=HYPERLINK("bad")',
        item: " \t+SUM(1,2)",
        quantity: 1,
        unitPrice: 200,
        total: 200,
        category: "기타",
      },
    ],
    "ko",
  );
  assert.ok(csv.startsWith("\ufeff"));
  assert.ok(csv.includes("\"'=HYPERLINK"));
  assert.ok(csv.includes("\"' \t+SUM"));
  assert.ok(csv.includes('"200"'));
});

test("six tool processing pipelines use the intended providers and validate their output", async () => {
  const previousFetch = globalThis.fetch;
  const previousClaude = process.env.CLAUDE_API_KEY,
    previousOpenai = process.env.OPENAI_API_KEY;
  process.env.CLAUDE_API_KEY = "test-only";
  process.env.OPENAI_API_KEY = "test-only";
  let current = "";
  const calls = [];
  const results = {
    "business-plan": {
      title: "사업",
      sections: Object.fromEntries(
        [
          "purpose",
          "target",
          "activities",
          "participation",
          "schedule",
          "budget",
          "effects",
          "groupIntro",
        ].map((key) => [key, "내용"]),
      ),
    },
    announcement: {
      projectName: "공고",
      summary: "요약",
      eligibility: "대상",
      supportDetails: "지원",
      amount: "100",
      deadline: "2026-10-31",
      applicationMethod: "신청",
      requiredDocs: [],
      actionItems: [],
      cautions: [],
    },
    receipt: {
      items: [
        {
          date: null,
          vendor: "가게",
          item: "종이",
          quantity: 1,
          unitPrice: 100,
          total: 100,
          category: "기타",
        },
      ],
      totalAmount: 100,
      warnings: [],
    },
    format: {
      title: "제목",
      content: "본문",
      missingFields: [],
      checklist: [],
    },
    transcribe: { title: "회의", minutes: "결정한 내용" },
    narration: { title: "안내", script: "안녕하세요." },
  };
  globalThis.fetch = async (url, options) => {
    calls.push(String(url));
    assert.equal(options.method, "POST");
    if (String(url).endsWith("/transcriptions"))
      return Response.json({ text: "회의 녹취" });
    if (String(url).endsWith("/speech"))
      return new Response(Buffer.from("ID3-test-audio"), {
        headers: { "content-type": "audio/mpeg" },
      });
    assert.equal(String(url), "https://api.anthropic.com/v1/messages");
    return Response.json({
      content: [{ type: "text", text: JSON.stringify(results[current]) }],
    });
  };
  try {
    for (const definition of maisaTools) {
      current = definition.slug;
      const files =
        current === "announcement"
          ? [new File(["공고문"], "notice.txt", { type: "text/plain" })]
          : current === "receipt"
            ? [
                new File(
                  [Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])],
                  "receipt.png",
                  { type: "image/png" },
                ),
              ]
            : current === "transcribe"
              ? [new File(["audio"], "meeting.wav", { type: "audio/wav" })]
              : [];
      const value = aiInputSchema.parse({
        ...input,
        answers: Array(8).fill("답변"),
      });
      const output = await runMaisa(current, value, files);
      assert.ok(output.title || output.projectName || output.items);
      if (current === "narration") assert.ok(output.audioBase64);
      if (current === "transcribe")
        assert.equal(output.transcript, "회의 녹취");
    }
    assert.equal(calls.filter((url) => url.includes("anthropic")).length, 6);
    assert.equal(calls.filter((url) => url.includes("openai")).length, 2);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousClaude === undefined) delete process.env.CLAUDE_API_KEY;
    else process.env.CLAUDE_API_KEY = previousClaude;
    if (previousOpenai === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousOpenai;
  }
});
