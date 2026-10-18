// Ported from ma2sa's AI tools and experience catalog.
export const maisaToolKeys = [
  "maisa-business-plan",
  "maisa-announcement",
  "maisa-receipt",
  "maisa-format",
  "maisa-transcribe",
  "maisa-narration",
] as const;
export type MaisaToolKey = (typeof maisaToolKeys)[number];
export const maisaTools = [
  {
    key: maisaToolKeys[0],
    slug: "business-plan",
    title: { ko: "말로 만드는 사업계획서", en: "Business plan" },
    summary: {
      ko: "질문에 글이나 음성으로 답하고 사업계획서를 만들어요.",
      en: "Answer questions by text or voice to draft a business plan.",
    },
    kind: "plan",
    accept: "",
  },
  {
    key: maisaToolKeys[1],
    slug: "announcement",
    title: { ko: "공고문 분석", en: "Analyze an announcement" },
    summary: {
      ko: "공고문에서 신청 조건, 지원 내용과 마감일을 확인해요.",
      en: "Find eligibility, support details and deadlines in a notice.",
    },
    kind: "file",
    accept: "image/jpeg,image/png,image/webp,application/pdf,text/plain",
  },
  {
    key: maisaToolKeys[2],
    slug: "receipt",
    title: { ko: "영수증 정리", en: "Organize receipts" },
    summary: {
      ko: "영수증 사진을 품목별 장부로 정리하고 엑셀용 파일로 받아요.",
      en: "Turn receipt photos into a ledger and download an Excel-compatible file.",
    },
    kind: "file",
    accept: "image/jpeg,image/png,image/webp",
  },
  {
    key: maisaToolKeys[3],
    slug: "format",
    title: { ko: "문서 양식 변환", en: "Format a document" },
    summary: {
      ko: "메모나 초안을 신청서, 보고서, 회의록으로 바꿔요.",
      en: "Turn notes into an application, report or meeting minutes.",
    },
    kind: "text",
    accept: "",
  },
  {
    key: maisaToolKeys[4],
    slug: "transcribe",
    title: { ko: "회의록 정리", en: "Create meeting minutes" },
    summary: {
      ko: "녹음에서 결정 사항과 담당자별 할 일을 정리해요.",
      en: "Transcribe a recording and extract decisions and assigned tasks.",
    },
    kind: "file",
    accept:
      "audio/mpeg,audio/mp4,audio/wav,audio/x-wav,audio/x-m4a,audio/webm,.mp3,.m4a,.wav,.webm",
  },
  {
    key: maisaToolKeys[5],
    slug: "narration",
    title: { ko: "대신 읽어주기", en: "Read aloud" },
    summary: {
      ko: "안내 문장을 다듬고 재생하거나 저장할 수 있는 음성으로 만들어요.",
      en: "Polish an announcement and turn it into playable, downloadable audio.",
    },
    kind: "text",
    accept: "",
  },
] as const;
export type MaisaSlug = (typeof maisaTools)[number]["slug"];
export const planQuestions = [
  {
    key: "purpose",
    ko: "무엇을 바꾸거나 해결하고 싶나요?",
    en: "What would you like to improve or solve?",
  },
  { key: "target", ko: "누구를 위한 일인가요?", en: "Who will benefit?" },
  { key: "activities", ko: "어떤 일을 할 건가요?", en: "What will you do?" },
  {
    key: "participation",
    ko: "누가 어떻게 참여하나요?",
    en: "Who will take part, and how?",
  },
  {
    key: "schedule",
    ko: "언제, 몇 번 진행하나요?",
    en: "When and how often will it happen?",
  },
  {
    key: "budget",
    ko: "무엇이 필요하고 예산은 얼마인가요?",
    en: "What resources and budget do you need?",
  },
  {
    key: "effects",
    ko: "끝나면 무엇이 달라질까요?",
    en: "What will change when it is done?",
  },
  {
    key: "groupIntro",
    ko: "함께하는 모임이나 조직을 소개해 주세요.",
    en: "Tell us about your group or organization.",
  },
] as const;
export const planSectionLabels = {
  purpose: "사업의 목적 및 필요성",
  target: "사업 대상",
  activities: "사업 내용",
  participation: "참여 계획",
  schedule: "추진 일정",
  budget: "예산 계획",
  effects: "기대효과",
  groupIntro: "모임 소개",
};
