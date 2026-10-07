# aiguidepage

AI 서비스를 선반형 전시관에서 둘러보고 실행하는 포털입니다. Next.js App Router, TypeScript, next-intl, Motion으로 구현했습니다.

## 현재 구현

- AI 9종 선반, 롤오버, 상세 보기, 검색·카테고리, 예시 복사
- 한국어·영어, 라이트·다크와 색상 4종, 글자 크기 3단계
- 모바일 선반과 하단 메뉴, 키보드 탐색, 움직임 줄이기
- Claude 데스크톱 앱 실행 링크와 웹·설치 안내

- Google·이메일 링크 로그인, 14일 HttpOnly 세션, 초대코드 가입, 조직 선택
- 공용·조직별 콘텐츠, 12개씩 불러오는 프롬프트, 변수 입력·복사, 즐겨찾기
- 프롬프트 빌더·글자 수·QR PNG·안내문 템플릿, 카드 짝 맞추기·AI 퀴즈
- 조직 관리자 4개 탭: 멤버·초대, 전시관, 콘텐츠, 꾸미기
- 플랫폼 관리자: 조직 생성·첫 관리자 초대·공용 콘텐츠 관리

초기 데이터는 AI 9개, 프롬프트 18개, 도구 4개, 게임 2개입니다. `npm run seed`는 없는 문서만 생성하고 기존 편집 내용은 유지합니다. 환경변수가 없는 환경에서도 공개 샘플 화면은 표시됩니다.

## 로컬 실행

Node.js 22 환경에서 검증했습니다.

```bash
npm ci
npm run dev
```

[한국어 화면](http://127.0.0.1:3000/ko) 또는 [영어 화면](http://127.0.0.1:3000/en)을 엽니다.

Firebase를 연결하려면 `.env.example`을 `.env.local`로 복사하고 Firebase 콘솔의 웹 앱 설정을 채웁니다. `.env.local`은 Git에서 제외합니다. Analytics는 Measurement ID가 설정된 프로덕션 브라우저에서만 초기화하며, 개발 서버에서는 통계를 전송하지 않습니다.

서버 작업에는 `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY`를 추가합니다. 비밀키는 로컬 `.env.local`에서 큰따옴표로 감싼 PEM 문자열로 저장하며, 실제 줄바꿈이나 `\n` 표기를 사용할 수 있습니다. 이 세 변수에는 `NEXT_PUBLIC_`을 붙이지 않습니다. Admin SDK는 Node.js 서버 전용이며 각 서버 기능에서 사용자·조직 권한을 확인해야 합니다.

`npm run firebase:check`는 `.env.local`의 서버 설정으로 Google 토큰 발급을 확인합니다. 토큰·비밀키를 출력하거나 사용자·DB 데이터를 읽고 쓰지 않습니다. Node.js 22.21 이상에서 실행합니다.

## 검증

```bash
npm run lint
npm run typecheck
npm run i18n:check
npm run build
npm run test:admin
node --experimental-strip-types --test tests/csrf.node.mjs tests/content-query.node.mjs
```

브라우저 테스트는 개발 서버를 실행한 상태에서 별도 터미널에서 진행합니다.

```bash
npx playwright install chromium
npm run test:e2e
```

브라우저 테스트는 선반 상호작용·반응형·접근성·데스크톱 실행 안내를 검사합니다. 데스크톱 앱의 실제 OS 실행은 별도 확인이 필요합니다. 화면 캡처는 `output/qa/`에 있습니다.

조직·권한·이메일 인증 검사는 **Java 21 이상**과 Firebase 에뮬레이터로 실행합니다. 아래 명령은 `demo-aiguide`에만 테스트 데이터를 만들며 실제 이메일은 발송하지 않습니다. 3002·8080·9099 포트가 비어 있어야 합니다.

```bash
npx firebase emulators:exec --only auth,firestore --project demo-aiguide "node scripts/test-emulated.mjs"
```

GitHub Actions에서도 정적 검사, 서버 테스트, 빌드, 에뮬레이터·Chromium 검사를 실행합니다.

## Vercel 연결

[GitHub 저장소](https://github.com/jejuailabs/aiguidepage)의 `main` 브랜치를 가져옵니다.

| 설정 | 값 |
|---|---|
| Application Preset | Next.js |
| Root Directory | `./` |
| Build and Output Settings | Next.js 기본값 유지 |
| Environment Variables | `.env.example`의 웹 설정 7개와 서버용 `FIREBASE_ADMIN_*` 3개 입력 |
| `PLATFORM_ADMIN_EMAIL` | 기존 정의서 기준 `jejuailabs@gmail.com` |

Vercel 환경변수를 저장하거나 변경한 뒤에는 재배포해야 브라우저에 적용됩니다. Firebase 설정과 후속 서버 인증 작업은 [배포·운영·품질 문서](docs/09_배포_운영_품질.md)를 참고합니다. 비밀값과 서비스 계정 키는 저장소에 올리지 않습니다.

Vercel의 `FIREBASE_ADMIN_PRIVATE_KEY` 값에는 PEM 원문을 넣습니다. `.env.local`에서 사용한 바깥 큰따옴표는 제외합니다. 새 키로 교체할 때도 로컬과 Vercel 값을 함께 갱신하고 재배포합니다.

`PLATFORM_ADMIN_EMAIL` 계정이 검증된 이메일로 로그인하면 운영자 권한을 부여합니다. 로그인 후 `/ko/platform`에서 조직과 첫 관리자 초대코드를 생성합니다. 이미 로그인한 사용자에게 수동 지정하려면 `npm run grant-admin -- --email=you@example.com`을 실행한 뒤 다시 로그인합니다. `--revoke`로 회수할 때는 자동 부여 환경변수도 함께 제거해야 합니다.

운영 프로젝트는 `aiguidepage`, 배포 도메인은 `aiguidepage.vercel.app`입니다. Google·이메일 링크 로그인, 도메인, 접근 규칙과 초기 데이터를 설정했습니다. 복합 인덱스 생성은 현재 서비스 계정 권한으로 거절되었습니다. 앱은 자동 제공되는 단일 필드 인덱스로 커서 조회한 뒤 서버에서 공개 여부·종류를 검사해 동작합니다. 데이터가 늘면 읽기 비용을 줄이도록 프로젝트 관리자가 `firestore.indexes.json`을 배포하세요. 인덱스 생성에는 `datastore.indexes.create` 권한이 필요합니다.

`npm run firebase:deploy`는 허용 도메인·이메일 링크·접근 규칙·복합 인덱스를 적용합니다. 일부 단계가 실패하면 이미 성공한 단계는 유지되고 오류를 반환합니다. 모든 변경은 인증된 서버 API를 거치며 Firestore 클라이언트 직접 쓰기는 허용하지 않습니다.

## 프로젝트 문서

- [ORCHESTRATION.md](ORCHESTRATION.md): 구현 순서와 확정 사항
- [docs/](docs/): 제품·디자인·데이터·배포 정의서
- [승인된 메인 시안](output/imagegen/homepage-shelves-v1.png)
- [브랜드 이미지 출처](public/brands/SOURCES.txt)
