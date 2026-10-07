import { aiItems } from "./ai.ts";
import type { Content, Hall } from "../lib/schema.ts";
const text = (ko: string, en: string) => ({ ko, en });
export const hallTemplates: Hall[] = [
  {
    key: "ai",
    title: text("AI 전시관", "AI gallery"),
    order: 0,
    enabled: true,
  },
  {
    key: "prompts",
    title: text("프롬프트 갤러리", "Prompt gallery"),
    order: 1,
    enabled: true,
  },
  { key: "tools", title: text("AI 도구", "Tools"), order: 2, enabled: true },
  { key: "games", title: text("게임", "Games"), order: 3, enabled: true },
];
// Editorial starter prompts. No customer data or external API calls are included.
const prompts = [
  [
    "meeting",
    "회의록을 다음 행동으로",
    "Turn notes into actions",
    "work",
    "claude",
    "회의 메모에서 결정 사항과 할 일을 분리해요.",
    "Separate decisions and next steps.",
    '아래 회의 메모를 읽고 결정 사항, 할 일, 담당자, 기한을 표로 정리해 줘. 명시되지 않은 담당자와 기한은 "확인 필요"로 남겨 줘.\n회의 메모: {{notes}}',
    'Read these meeting notes and make a table of decisions, actions, owners and deadlines. Mark missing owners or dates as "To confirm".\nNotes: {{notes}}',
  ],
  [
    "email",
    "정중한 업무 이메일",
    "A thoughtful work email",
    "writing",
    "chatgpt",
    "핵심을 먼저 전하는 짧고 명료한 이메일.",
    "Write a clear email with the main point first.",
    "{{recipient}}에게 보낼 이메일을 작성해 줘. 목적: {{purpose}}. 핵심부터 쓰고 다음 행동을 끝에 제안해 줘. 없는 사실이나 약속은 만들지 말아 줘.",
    "Draft an email to {{recipient}} about {{purpose}}. Lead with the main point and close with a clear next action. Do not invent facts or commitments.",
  ],
  [
    "research",
    "검색 결과, 근거부터",
    "Research with sources",
    "search",
    "perplexity",
    "주장과 근거를 나란히 비교해요.",
    "Compare claims alongside their evidence.",
    "{{topic}}에 관해 조사해 줘. 주요 주장별로 원출처 링크와 발행일을 붙이고, 사실·추정·의견을 구분해 줘. 서로 다른 결론이 있으면 차이와 한계를 설명해 줘.",
    "Research {{topic}}. For each main claim, include a primary source link and publication date. Distinguish facts, estimates and opinions, and explain disagreements and limitations.",
  ],
  [
    "notice",
    "행사 안내 한 장",
    "An event announcement",
    "writing",
    "claude",
    "날짜와 장소, 준비물을 놓치지 않도록.",
    "Keep the date, venue and checklist clear.",
    "{{event}} 행사 안내문을 써 줘. 일정: {{date}}, 장소: {{place}}, 대상: {{audience}}. 제목, 소개, 일정, 준비물 순서로 구성하고, 없는 정보는 확인 항목으로 남겨 줘.",
    "Write an announcement for {{event}}. Date: {{date}}. Venue: {{place}}. Audience: {{audience}}. Include a heading, introduction, schedule and checklist; flag missing details.",
  ],
  [
    "explain",
    "어려운 개념을 쉽게",
    "Explain it simply",
    "life",
    "gemini",
    "비유와 예시로 한 걸음씩 이해해요.",
    "Understand a concept through examples.",
    "{{topic}}을 처음 배우는 사람에게 설명해 줘. 쉬운 정의, 일상 비유, 간단한 예시, 비유의 한계 순서로 알려 주고 이해 확인 질문 3개를 만들어 줘.",
    "Explain {{topic}} to a beginner. Give a plain definition, an everyday analogy, a simple example, and the limitations of the analogy. Finish with three comprehension questions.",
  ],
  [
    "summary",
    "자료에서 핵심 찾기",
    "Find the core ideas",
    "documents",
    "notebooklm",
    "자료에 근거해 요약하고 질문을 남겨요.",
    "Summarize sources and note open questions.",
    "업로드한 자료에서 {{topic}}과 관련된 핵심 내용을 5개로 요약해 줘. 각 항목에 자료 속 근거를 붙이고 자료에 없는 내용은 추측하지 말아 줘. 추가 확인 질문도 정리해 줘.",
    "Summarize five key points about {{topic}} from the uploaded sources. Cite supporting passages, avoid guessing beyond the material, and list unanswered questions.",
  ],
  [
    "presentation",
    "발표의 흐름 설계",
    "Plan a presentation",
    "work",
    "genspark",
    "듣는 사람에게 맞춘 슬라이드 구성.",
    "Build a slide outline for your audience.",
    "{{audience}}를 위한 {{topic}} 발표의 8장짜리 구성을 제안해 줘. 각 장에 핵심 메시지 하나, 필요한 근거, 시각 자료 아이디어를 적어 줘. 확인되지 않은 통계는 넣지 말아 줘.",
    "Outline eight slides on {{topic}} for {{audience}}. Give each slide one key message, evidence needed and a visual idea. Do not include unverified statistics.",
  ],
  [
    "social",
    "짧은 게시글 세 가지",
    "Three short social posts",
    "writing",
    "grok",
    "하나의 소식을 다양한 톤으로.",
    "Explore three ways to tell one story.",
    "{{news}} 소식을 소개하는 짧은 게시글을 3개 써 줘. 각각 정보 중심, 따뜻한 대화체, 호기심을 여는 질문형으로 쓰고 과장이나 확인되지 않은 주장은 빼 줘.",
    "Write three short posts about {{news}}: informative, warm and conversational, and opening with a curious question. Avoid exaggeration and unsupported claims.",
  ],
  [
    "storyboard",
    "짧은 영상의 첫 장면",
    "A short film storyboard",
    "video",
    "flow",
    "카메라와 빛, 움직임을 구체적으로.",
    "Describe camera, light and movement.",
    "주제 {{topic}}로 8초 영상 장면을 기획해 줘. 피사체, 배경, 조명, 카메라 움직임, 시간별 동작을 구체적으로 적어 줘. 화면 속 글자는 사용하지 말고 제작 프롬프트로 정리해 줘.",
    "Plan an eight-second scene about {{topic}}. Specify the subject, setting, lighting, camera motion and timed actions. Avoid on-screen text and format it as a production prompt.",
  ],
  [
    "music",
    "분위기를 음악으로",
    "Turn a mood into music",
    "music",
    "suno",
    "장르와 악기, 분위기를 조합해요.",
    "Combine genre, instruments and mood.",
    "{{mood}} 분위기의 짧은 배경음악을 위한 프롬프트를 써 줘. 장르, 템포, 악기, 곡의 전개를 포함하고 특정 음악가의 이름이나 기존 곡의 가사는 쓰지 말아 줘.",
    "Write a prompt for short background music with a {{mood}} mood. Include genre, tempo, instruments and progression, without naming a musician or using existing lyrics.",
  ],
  [
    "translate",
    "자연스러운 번역 검토",
    "Review a translation",
    "writing",
    "claude",
    "직역 대신 의도와 맥락을 살려요.",
    "Preserve intent and context.",
    "다음 글을 {{language}}로 자연스럽게 번역해 줘. 고유명사는 유지하고 문맥이 모호한 부분은 질문으로 남겨 줘. 원문: {{source}}",
    "Translate this text naturally into {{language}}. Preserve proper nouns and flag ambiguities as questions. Text: {{source}}",
  ],
  [
    "checklist",
    "실행 가능한 체크리스트",
    "A practical checklist",
    "work",
    "chatgpt",
    "큰 일을 작은 단계로 나누기.",
    "Break a large task into small steps.",
    "{{task}}를 준비하는 체크리스트를 만들어 줘. 준비, 실행, 마무리 단계로 나누고 각 항목에 완료 기준과 빠뜨리기 쉬운 점을 적어 줘.",
    "Create a checklist for {{task}}. Group it into preparation, execution and wrap-up. Include completion criteria and common omissions.",
  ],
  [
    "compare",
    "선택지를 같은 기준으로",
    "Compare fairly",
    "work",
    "gemini",
    "기준을 먼저 정해 선택지를 비교해요.",
    "Choose criteria before comparing options.",
    "{{options}}를 비교하려고 해. 목적은 {{goal}}이야. 평가 기준 5개를 제안하고 필요한 정보를 알려 줘. 정보가 없으면 점수를 임의로 만들지 말아 줘.",
    "Compare {{options}} for {{goal}}. Suggest five evaluation criteria and ask for needed information. Do not invent scores when information is missing.",
  ],
  [
    "interview",
    "인터뷰 질문 만들기",
    "Prepare an interview",
    "work",
    "claude",
    "유도하지 않는 열린 질문을 준비해요.",
    "Prepare open, non-leading questions.",
    "{{topic}}에 대한 인터뷰 질문 8개를 만들어 줘. 경험을 묻는 열린 질문부터 시작하고 각 질문에 후속 질문 하나를 붙여 줘. 특정 답변을 유도하지 말아 줘.",
    "Write eight interview questions about {{topic}}. Start with open questions about experience and add one follow-up per question. Avoid leading the respondent.",
  ],
  [
    "learn",
    "일주일 학습 계획",
    "A week of learning",
    "life",
    "chatgpt",
    "짧게 배우고 직접 확인하는 습관.",
    "Learn in small steps and check understanding.",
    "{{topic}}을 일주일 동안 하루 {{minutes}}분씩 배우는 계획을 짜 줘. 매일 목표, 작은 연습, 이해 확인 질문을 포함하고 마지막 날에는 복습 시간을 넣어 줘.",
    "Plan a week of learning {{topic}} for {{minutes}} minutes a day. Include a daily goal, exercise and comprehension check, with review on the last day.",
  ],
  [
    "image",
    "이미지 아이디어 구체화",
    "Shape an image idea",
    "image",
    "gemini",
    "구도와 질감을 말로 정리해요.",
    "Describe composition, texture and mood.",
    "{{subject}}을 표현할 이미지 프롬프트를 써 줘. 용도: {{purpose}}. 주제, 구도, 조명, 색감, 질감과 피해야 할 요소를 구분해 줘.",
    "Write an image prompt for {{subject}} to use in {{purpose}}. Separate subject, composition, lighting, palette, texture and elements to avoid.",
  ],
  [
    "faq",
    "질문이 먼저인 안내서",
    "Build a helpful FAQ",
    "documents",
    "notebooklm",
    "자료를 처음 보는 사람의 시선으로.",
    "Read your source through a newcomer’s eyes.",
    "업로드한 {{topic}} 자료로 처음 접하는 사람이 궁금해할 질문 7개와 답변을 만들어 줘. 자료 속 근거를 인용하고 답할 수 없는 항목은 담당자 확인으로 표시해 줘.",
    "Using uploaded material about {{topic}}, create seven newcomer questions and answers. Cite sources and mark unsupported answers for staff confirmation.",
  ],
  [
    "revise",
    "글을 더 명료하게",
    "Make writing clearer",
    "writing",
    "claude",
    "의미를 유지하면서 문장을 다듬어요.",
    "Improve wording without changing meaning.",
    "다음 글의 의미를 유지하면서 문장을 간결하게 다듬어 줘. 수정본과 주요 수정 이유 3개를 보여 줘. 없는 사실은 추가하지 말아 줘. 글: {{source}}",
    "Make this text concise while preserving its meaning. Show the revision and three reasons for your changes. Add no new facts. Text: {{source}}",
  ],
] as const;
export function catalog(messages: {
  ko: Record<string, Record<string, string>>;
  en: Record<string, Record<string, string>>;
}): { id: string; item: Content }[] {
  const result: { id: string; item: Content }[] = aiItems.map((ai, index) => {
    const ko = messages.ko[ai.id],
      en = messages.en[ai.id];
    return {
      id: ai.id,
      item: {
        type: "ai",
        title: text(ai.name, ai.name),
        summary: text(ko.summary, en.summary),
        category: ai.category,
        order: index,
        status: "published",
        public: true,
        data: {
          aiId: ai.id,
          url: ai.url,
          description: text(ko.description, en.description),
          features: {
            ko: [ko.feature1, ko.feature2, ko.feature3],
            en: [en.feature1, en.feature2, en.feature3],
          },
          prompt: text(ko.prompt, en.prompt),
        },
      },
    };
  });
  prompts.forEach(
    (
      [id, ko, en, category, aiSlug, summaryKo, summaryEn, bodyKo, bodyEn],
      index,
    ) =>
      result.push({
        id: `prompt-${id}`,
        item: {
          type: "prompt",
          title: text(ko, en),
          summary: text(summaryKo, summaryEn),
          category,
          order: index,
          status: "published",
          public: false,
          data: {
            aiSlug,
            resultMedia: [],
            referenceImages: [],
            text: text(bodyKo, bodyEn),
            variables: [...bodyEn.matchAll(/\{\{(\w+)\}\}/g)].map((match) => ({
              key: match[1],
              label: text(
                (
                  {
                    notes: "회의 메모",
                    recipient: "받는 사람",
                    purpose: "목적",
                    topic: "주제",
                    event: "행사",
                    date: "일정",
                    place: "장소",
                    audience: "대상",
                    news: "소식",
                    mood: "분위기",
                    language: "언어",
                    source: "원문",
                    task: "할 일",
                    options: "선택지",
                    goal: "목표",
                    minutes: "하루 학습 시간(분)",
                    subject: "피사체",
                  } as Record<string, string>
                )[match[1]] || match[1],
                match[1],
              ),
            })),
          },
        },
      }),
  );
  for (const [index, key] of (
    ["prompt-builder", "char-count", "qr-maker", "template-fill"] as const
  ).entries()) {
    const copy = [
      [
        "프롬프트 만들기",
        "Write a prompt",
        "목표와 말투를 골라 나만의 요청문을 만들어요.",
        "Choose a goal and tone to compose your request.",
      ],
      [
        "글자 수 세기",
        "Count characters",
        "공백과 이모지까지 고려한 글자 수를 확인해요.",
        "Count characters, including spaces and emoji.",
      ],
      [
        "QR코드 만들기",
        "Create a QR code",
        "웹 주소를 입력하고 선명한 PNG로 저장해요.",
        "Turn a web address into a downloadable PNG.",
      ],
      [
        "안내문 만들기",
        "Write an announcement",
        "빈칸을 채워 바로 쓸 수 있는 안내문을 만들어요.",
        "Fill the fields to prepare an announcement.",
      ],
    ][index];
    result.push({
      id: `tool-${key}`,
      item: {
        type: "tool",
        title: text(copy[0], copy[1]),
        summary: text(copy[2], copy[3]),
        category: "utility",
        order: index,
        status: "published",
        public: false,
        data: {
          toolKey: key,
          ...(key === "template-fill"
            ? {
                template: text(
                  "[{{제목}}]\n\n{{대상}} 여러분께 안내드립니다.\n일시: {{일시}}\n장소: {{장소}}\n내용: {{내용}}\n문의: {{문의처}}",
                  "[{{Title}}]\n\nFor {{Audience}}\nWhen: {{Date}}\nWhere: {{Venue}}\nDetails: {{Details}}\nContact: {{Contact}}",
                ),
              }
            : {}),
        },
      },
    });
  }
  result.push({
    id: "game-memory",
    item: {
      type: "game",
      title: text("AI 카드 짝 맞추기", "AI memory match"),
      summary: text(
        "뒤집힌 카드 속 AI 로고를 기억해 보세요.",
        "Remember the AI logos behind the cards.",
      ),
      category: "brain",
      order: 0,
      status: "published",
      public: false,
      data: { gameKey: "memory-match" },
    },
  });
  const questions = [
    [
      "AI 답변에 중요한 사실이 있다면?",
      "What should you do with an important factual AI claim?",
      ["그대로 믿는다", "원출처를 확인한다", "더 길게 써 달라고 한다"],
      [
        "Trust it immediately",
        "Check the original source",
        "Ask for a longer answer",
      ],
      1,
    ],
    [
      "프롬프트에 넣으면 도움이 되는 것은?",
      "What helps make a prompt useful?",
      ["목표와 맥락", "다른 사람의 비밀번호", "상관없는 글자"],
      ["Your goal and context", "Someone else’s password", "Random characters"],
      0,
    ],
    [
      "문서 요약에서 중요한 것은?",
      "What matters when summarizing a document?",
      ["원문에 없는 결론", "가장 긴 문장", "주요 내용과 한계"],
      [
        "Conclusions absent from the source",
        "The longest sentence",
        "Key points and limitations",
      ],
      2,
    ],
    [
      "업무 자료를 AI에 입력하기 전에?",
      "Before entering work material into an AI tool?",
      [
        "민감정보와 이용 규칙을 확인한다",
        "전체 자료를 공개한다",
        "비밀번호도 함께 보낸다",
      ],
      [
        "Check sensitive data and usage rules",
        "Publish all the material",
        "Include your password",
      ],
      0,
    ],
    [
      "원하는 결과와 다르게 나왔다면?",
      "If the result misses your goal?",
      [
        "같은 말만 반복한다",
        "원하는 형식과 예시를 보완한다",
        "검토하지 않고 제출한다",
      ],
      [
        "Repeat the same words",
        "Clarify the format and add an example",
        "Submit without reviewing",
      ],
      1,
    ],
  ] as const;
  result.push({
    id: "game-quiz",
    item: {
      type: "game",
      title: text("AI 상식 퀴즈", "Everyday AI quiz"),
      summary: text(
        "다섯 문제로 익히는 슬기로운 AI 사용법.",
        "Five questions about using AI thoughtfully.",
      ),
      category: "brain",
      order: 1,
      status: "published",
      public: false,
      data: {
        gameKey: "ai-quiz",
        questions: questions.map(([ko, en, koOptions, enOptions, answer]) => ({
          question: text(ko, en),
          options: koOptions.map((ko, i) => text(ko, enOptions[i])),
          answer,
        })),
      },
    },
  });
  return result;
}
