export const resultLabels = {
  title: { ko: "제목", en: "Title" },
  content: { ko: "문서 내용", en: "Document" },
  missingFields: { ko: "추가할 정보", en: "Missing information" },
  checklist: { ko: "확인할 사항", en: "Checklist" },
  projectName: { ko: "사업명", en: "Project" },
  summary: { ko: "핵심 요약", en: "Summary" },
  eligibility: { ko: "신청 자격", en: "Eligibility" },
  supportDetails: { ko: "지원 내용", en: "Support" },
  amount: { ko: "지원 금액", en: "Amount" },
  deadline: { ko: "마감일", en: "Deadline" },
  applicationMethod: { ko: "신청 방법", en: "How to apply" },
  requiredDocs: { ko: "필요 서류", en: "Required documents" },
  actionItems: { ko: "할 일", en: "Action items" },
  cautions: { ko: "유의 사항", en: "Notes" },
  totalAmount: { ko: "총금액", en: "Total" },
  warnings: { ko: "확인할 부분", en: "Check these" },
  meetingDate: { ko: "회의 일시", en: "Meeting date" },
  location: { ko: "장소", en: "Location" },
  attendees: { ko: "참석자", en: "Attendees" },
  decisions: { ko: "결정 사항", en: "Decisions" },
  minutes: { ko: "회의록", en: "Minutes" },
  transcript: { ko: "받아쓴 내용", en: "Transcript" },
  script: { ko: "안내 원고", en: "Script" },
  estimatedSeconds: { ko: "예상 재생 시간(초)", en: "Estimated seconds" },
  date: { ko: "날짜", en: "Date" },
  vendor: { ko: "판매처", en: "Vendor" },
  item: { ko: "품목", en: "Item" },
  quantity: { ko: "수량", en: "Quantity" },
  unitPrice: { ko: "단가", en: "Unit price" },
  total: { ko: "합계", en: "Total" },
  category: { ko: "분류", en: "Category" },
  task: { ko: "할 일", en: "Task" },
  owner: { ko: "담당자", en: "Owner" },
  dueDate: { ko: "기한", en: "Due date" },
  purpose: { ko: "사업의 목적 및 필요성", en: "Purpose" },
  target: { ko: "사업 대상", en: "Beneficiaries" },
  activities: { ko: "사업 내용", en: "Activities" },
  participation: { ko: "참여 계획", en: "Participation" },
  schedule: { ko: "추진 일정", en: "Schedule" },
  budget: { ko: "예산 계획", en: "Budget" },
  effects: { ko: "기대효과", en: "Expected impact" },
  groupIntro: { ko: "모임 소개", en: "About the group" },
  sections: { ko: "사업계획서", en: "Business plan" },
  items: { ko: "영수증 항목", en: "Receipt items" },
  sourceFile: { ko: "원본 파일", en: "Source file" },
};
export function resultLabel(key: string, locale: string) {
  return (
    resultLabels[key as keyof typeof resultLabels]?.[
      locale === "en" ? "en" : "ko"
    ] || key
  );
}
export function displayResult(value: unknown, locale: string): string {
  if (value === null || value === undefined || value === "")
    return locale === "en" ? "To confirm" : "확인 필요";
  if (Array.isArray(value))
    return value.map((item) => displayResult(item, locale)).join("\n\n");
  if (typeof value === "object")
    return Object.entries(value)
      .map(
        ([key, entry]) =>
          `${resultLabel(key, locale)}: ${displayResult(entry, locale)}`,
      )
      .join("\n");
  return String(value);
}
export function resultText(result: Record<string, unknown>, locale: string) {
  return Object.entries(result)
    .filter(([key]) => !["audioBase64", "audioMimeType"].includes(key))
    .map(
      ([key, value]) =>
        `${resultLabel(key, locale)}\n${displayResult(value, locale)}`,
    )
    .join("\n\n");
}
export const receiptKeys = [
  "date",
  "vendor",
  "item",
  "quantity",
  "unitPrice",
  "total",
  "category",
] as const;
export function receiptsCsv(items: Record<string, unknown>[], locale: string) {
  const cell = (value: unknown) => {
    let text = String(value ?? "");
    if (/^[\s]*[=+\-@]/u.test(text) || /^[\t\r\n]/u.test(text))
      text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  return (
    "\ufeff" +
    [
      receiptKeys.map((key) => cell(resultLabel(key, locale))).join(","),
      ...items.map((item) =>
        receiptKeys.map((key) => cell(item[key])).join(","),
      ),
    ].join("\r\n")
  );
}
