# aiguidepage

AI 서비스를 선반형 전시관에서 둘러보고 실행하는 포털입니다. Next.js App Router, TypeScript, next-intl, Motion으로 구현했습니다.

## 현재 구현

- AI 9종 선반, 롤오버, 상세 보기, 검색·카테고리, 예시 복사
- 한국어·영어, 라이트·다크와 색상 4종, 글자 크기 3단계
- 모바일 선반과 하단 메뉴, 키보드 탐색, 움직임 줄이기
- Claude 데스크톱 앱 실행 링크와 웹·설치 안내

현재는 공개 AI 전시관 UI입니다. Firebase 웹 SDK·Analytics와 서버 전용 Admin SDK 초기화를 준비했으며, 로그인·조직 권한·데이터베이스 연동과 나머지 전시관은 후속 작업입니다. 환경변수가 없으면 공개 전시관은 계속 표시됩니다. Admin 기능을 호출할 때는 서버 환경변수가 필요합니다.

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
```

브라우저 테스트는 개발 서버를 실행한 상태에서 별도 터미널에서 진행합니다.

```bash
npx playwright install chromium
npm run test:e2e
```

브라우저 테스트는 선반 상호작용·반응형·접근성·데스크톱 실행 안내를 검사합니다. 데스크톱 앱의 실제 OS 실행은 별도 확인이 필요합니다. 화면 캡처는 `output/qa/`에 있습니다.

## Vercel 연결

[GitHub 저장소](https://github.com/jejuailabs/aiguidepage)의 `main` 브랜치를 가져옵니다.

| 설정 | 값 |
|---|---|
| Application Preset | Next.js |
| Root Directory | `./` |
| Build and Output Settings | Next.js 기본값 유지 |
| Environment Variables | `.env.example`의 웹 설정 7개와 서버용 `FIREBASE_ADMIN_*` 3개 입력 |

Vercel 환경변수를 저장하거나 변경한 뒤에는 재배포해야 브라우저에 적용됩니다. Firebase 설정과 후속 서버 인증 작업은 [배포·운영·품질 문서](docs/09_배포_운영_품질.md)를 참고합니다. 비밀값과 서비스 계정 키는 저장소에 올리지 않습니다.

Vercel의 `FIREBASE_ADMIN_PRIVATE_KEY` 값에는 PEM 원문을 넣습니다. `.env.local`에서 사용한 바깥 큰따옴표는 제외합니다. 새 키로 교체할 때도 로컬과 Vercel 값을 함께 갱신하고 재배포합니다.

## 프로젝트 문서

- [ORCHESTRATION.md](ORCHESTRATION.md): 구현 순서와 확정 사항
- [docs/](docs/): 제품·디자인·데이터·배포 정의서
- [승인된 메인 시안](output/imagegen/homepage-shelves-v1.png)
- [브랜드 이미지 출처](public/brands/SOURCES.txt)
