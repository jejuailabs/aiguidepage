import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { getFirebaseAdminFirestore } from "../src/lib/firebase/admin.ts";
import { catalog } from "../src/data/catalog.ts";
export async function updateGalleryData(db = getFirebaseAdminFirestore()) {
  const ko = JSON.parse(
    await readFile(new URL("../messages/ko.json", import.meta.url), "utf8"),
  );
  const en = JSON.parse(
    await readFile(new URL("../messages/en.json", import.meta.url), "utf8"),
  );
  const legacy = {
    "prompt-builder": {
      ko: ["프롬프트 빌더", "프롬프트 도우미"],
      en: ["Prompt builder"],
    },
    "char-count": { ko: [], en: ["Character counter"] },
    "qr-maker": { ko: ["QR 코드 만들기"], en: ["QR maker"] },
    "template-fill": { ko: ["안내문 템플릿"], en: ["Announcement template"] },
  };
  let updated = 0;
  for (const { id, item } of catalog({ ko: ko.ai, en: en.ai }).filter(
    (value) => value.item.type === "tool",
  )) {
    const ref = db.collection("items").doc(id);
    await db.runTransaction(async (tx) => {
      const doc = await tx.get(ref),
        data = doc.data();
      if (
        !data ||
        data.type !== "tool" ||
        data.data.toolKey !== item.data.toolKey
      )
        return;
      const patch = {};
      for (const locale of ["ko", "en"])
        if (legacy[item.data.toolKey][locale].includes(data.title[locale]))
          patch[`title.${locale}`] = item.title[locale];
      if (Object.keys(patch).length) {
        tx.update(ref, patch);
        updated++;
      }
    });
  }
  const orgs = await db.collection("orgs").get();
  const refs = [
    db.collection("hallTemplates").doc("prompts"),
    ...orgs.docs.map((org) => org.ref.collection("halls").doc("prompts")),
  ];
  for (const ref of refs)
    await db.runTransaction(async (tx) => {
      const doc = await tx.get(ref),
        title = doc.data()?.title;
      if (!title) return;
      const patch = {};
      if (title.ko === "프롬프트") patch["title.ko"] = "프롬프트 갤러리";
      if (title.en === "Prompts") patch["title.en"] = "Prompt gallery";
      if (Object.keys(patch).length) {
        tx.update(ref, patch);
        updated++;
      }
    });
  return { updated };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify(await updateGalleryData()));
  } catch (error) {
    console.error("Gallery data update failed:", error.code || error.name);
    process.exitCode = 1;
  }
}
