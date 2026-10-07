# aiguidepage

AI 서비스를 선반형 전시관에서 둘러보고 실행하는 포털입니다. Next.js App Router, TypeScript, next-intl, Motion으로 구현했습니다.

## 현재 구현

- AI 9종 선반, 롤오버, 상세 보기, 검색·카테고리, 예시 복사
- 한국어·영어, 라이트·다크와 색상 4종, 글자 크기 3단계
- 모바일 선반과 하단 메뉴, 키보드 탐색, 움직임 줄이기
- Claude 데스크톱 앱 실행 링크와 웹·설치 안내

현재는 공개 AI 전시관 UI입니다. Firebase 로그인·조직 권한·데이터베이스와 나머지 전시관은 후속 작업이며, **현재 실행·빌드에는 환경변수가 필요하지 않습니다.**

## 로컬 실행

Node.js 22 환경에서 검증했습니다.

```bash
npm ci
npm run dev
```

[한국어 화면](http://127.0.0.1:3000/ko) 또는 [영어 화면](http://127.0.0.1:3000/en)을 엽니다.

## 검증

```bash
npm run lint
npm run typecheck
npm run i18n:check
npm run build
```

브라우저 테스트는 개발 서버를 실행한 상태에서 별도 터미널에서 진행합니다.

```bash
npx playwright install chromium
npm run test:e2e
```

Chromium 테스트 10개와 위 검사 명령을 통과했습니다. 데스크톱 앱 테스트는 실행 링크와 안내 UI를 검사하며 실제 OS 앱 실행은 별도 확인이 필요합니다. 화면 캡처는 `output/qa/`에 있습니다.

## Vercel 연결

[GitHub 저장소](https://github.com/jejuailabs/aiguidepage)의 `main` 브랜치를 가져옵니다.

| 설정 | 값 |
|---|---|
| Application Preset | Next.js |
| Root Directory | `./` |
| Build and Output Settings | Next.js 기본값 유지 |
| Environment Variables | 현재 UI에는 불필요 |

Firebase 연결 시 필요한 설정은 [배포·운영·품질 문서](docs/09_배포_운영_품질.md)를 참고합니다. 비밀값과 서비스 계정 키는 저장소에 올리지 않습니다.

## 프로젝트 문서

- [ORCHESTRATION.md](ORCHESTRATION.md): 구현 순서와 확정 사항
- [docs/](docs/): 제품·디자인·데이터·배포 정의서
- [승인된 메인 시안](output/imagegen/homepage-shelves-v1.png)
- [브랜드 이미지 출처](public/brands/SOURCES.txt)
