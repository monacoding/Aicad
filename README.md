# AiCAD — 자연어로 그리는 웹 기반 CAD

오토캐드(AutoCAD)와 유사한 2D 제도 기능을 웹에서 제공하고, **자연어로 도면을 그리는**
기능을 Claude API로 구현한 오픈 CAD 프로토타입입니다. LibreCAD/QCAD(2D 제도, DXF
네이티브), JSCAD·Maker.js(JS 지오메트리·DXF/SVG 출력) 같은 오픈소스 CAD의 패러다임을
참고했습니다.

## 핵심 기능

- **캔버스 CAD 엔진** — 무한 줌/팬, 동적 그리드, 월드 좌표계(X→오른쪽, Y→위, 각도 CCW)
- **그리기 도구** — 선, 폴리라인, 사각형, 원, 호(3점), 점, 문자, 치수선
- **편집 도구** — 선택(클릭·윈도우·크로싱), 이동, 복사, 회전, 축척, 지우기
- **객체 스냅(OSNAP)** — 끝점·중간점·중심·사분점·교차점, 그리드 스냅
- **제도 보조(AutoCAD식)** — 직교 ORTHO(F8)·극좌표 추적 POLAR(F10)·동적 입력(거리/각도
  표시)·스페이스바 명령 반복·기능키(F3 스냅·F7 그리드)·상태바 토글
- **레이어** — 색상·표시/숨김, 레이어별 색상 상속
- **명령행** — 오토캐드식 명령어 (`LINE 0,0 10,5`, `CIRCLE 5,5 3`, `ZOOM`, `UNDO` …)
- **실행 취소/다시 실행** — 전체 트랜잭션 기반
- **DXF 입출력** — R12 ASCII (LibreCAD/QCAD/AutoCAD 상호 호환), PNG 내보내기
- **자연어 드로잉** — "반지름 4 정육각형 그려줘", "간단한 집 도면" 등을 Claude가
  정밀한 연산 목록으로 변환해 적용
- **편집** — 대칭(MIRROR)·간격띄우기(OFFSET)·배열(직사각형/원형)·모깎기·모따기·
  자르기·연장·해치·타원, **그립 편집**, 상대·극좌표 입력(`@10<45`)
- **P&ID** — 선박 공정 배관·계장 도면용 16종 심볼 라이브러리(밸브·펌프·탱크·열교환기·
  계기 버블 등), 점선 신호선·선두께·블록 그룹화. `SYMBOL`/`PIPE`/`SIGNAL` 명령과
  자연어(`add_symbol` 등)로 작성. 100종 생성 검증: `docs/PID_REPORT.md`
- **시스템 템플릿** — "발라스트 시스템 그려줘"처럼 표준 선박 계통을 한 번에 작도
  (`src/cad/templates.ts`). 발라스트: 시 체스트→스트레이너→펌프2대→BWTS(필터+UV)→
  메인 헤더→탱크 분기 + 선외토출·이덕터·계기. 렌더: `npx tsx scripts/ballast.mts`
- **174K LNGC 발라스트 + 시뮬레이션** — "174k lngc 발라스트 다이어그램"으로 포트/스타보드
  이중선체 WBT 배치를 작도하고, 밸러스트 작업을 100회 시뮬레이션(과도 힐·트림 추적)해
  균형 충수 시퀀스로 보완. 탱크 충수율 주석 지원. `npx tsx scripts/lngcsim.mts`,
  보고서 `docs/LNGC_BALLAST_SIM.md`
- **선체 배관 16종** — 빌지·소화·해수/청수냉각·연료유·윤활유·위생청수·오수·슬러지·
  압축공기·증기급수·유압·불활성가스 등을 자동 배치 빌더로 작도(자연어 "소화 시스템
  그려줘" 등). `src/cad/hullSystems.ts`, `npx tsx scripts/hull.mts --render`,
  보고서 `docs/HULL_PIPING.md`

## 아키텍처

```
src/cad/
  geometry.ts    벡터·기하 유틸 (교차, 거리, 회전 …)
  entities.ts    엔티티 모델(line/polyline/circle/arc/point/text/dimension)
                 + bounds / hit-test / snap-points / transform
  document.ts    문서·레이어·실행취소(undo) 스택·변경 알림
  viewport.ts    월드↔스크린 변환, 줌/팬/fit
  renderer.ts    Canvas 2D 렌더러(그리드·엔티티·선택·스냅·프리뷰)
  snap.ts        객체 스냅 탐색
  ops.ts         ★ 선언적 CAD 연산(Op) 스키마 + applier  ← 단일 통합 지점
  commands.ts    오토캐드식 텍스트 명령 파서
  engine.ts      인터랙티브 엔진(입력·툴 상태머신·선택)
  dxf.ts         DXF R12 입출력
  nl.ts          자연어 클라이언트(컨텍스트 수집 → /api/nl → Op 검증·적용)
src/App.tsx      React UI(툴바·자연어 패널·레이어·명령행·상태바)
server/
  index.js       Express 프록시: 자연어 → Claude(structured output) → Op[]
  opSchema.js    구조화 출력용 JSON 스키마 (ops.ts 와 동기 유지)
```

**설계 핵심**: 명령행·툴바·자연어가 모두 동일한 `Op` 어휘(`ops.ts`)를 생성하고,
하나의 applier가 문서에 적용합니다. 덕분에 입력 방식이 무엇이든 동작·실행취소·렌더링이
일관됩니다. 자연어 계층은 Claude에게 이 `Op` 스키마를 **structured JSON output**으로
강제(`output_config.format`)하여 안전하게 파싱·적용합니다.

## Claude API 연동

- 모델: `claude-opus-4-8` (환경변수 `AICAD_MODEL`로 변경 가능)
- `@anthropic-ai/sdk`의 `messages.stream(...)` + `output_config.format`(json_schema)
  + `thinking: { type: "adaptive" }`(geometry 추론) 사용
- API 키는 **서버에만** 두며 브라우저로 노출되지 않습니다.

## 실행 방법

```bash
npm install
cp .env.example .env          # ANTHROPIC_API_KEY 입력
npm run dev                   # 프론트(:5173) + API(:8787) 동시 기동
```

자연어 기능은 키가 있으면 Claude가 처리하고, **키가 없으면 내장 로컬 해석기**(오프라인
폴백, `src/cad/nlLocal.ts`)가 기본 작도/편집/P&ID 요청을 처리합니다. 그리기 도구·명령행·
DXF 등 나머지 CAD 기능은 키와 무관하게 동작합니다. 자연어 테스트: `npx tsx scripts/nltest.mts`
(110개 프롬프트, 결과는 `docs/NL_TEST_REPORT.md`).

빌드:

```bash
npm run build      # tsc 타입체크 + vite 프로덕션 번들
npm run typecheck
```

## 단축키 / 사용 팁

- `Ctrl+Z` 취소, `Ctrl+Shift+Z` 다시 실행, `Del` 선택 삭제, `Esc` 도구 취소
- 폴리라인: 점 클릭 후 `Enter`/더블클릭으로 종료
- 휠=줌, 가운데 버튼 드래그=팬
- 선택 도구에서 왼→오 드래그=윈도우(완전 포함), 오→왼 드래그=크로싱(걸침)
- 변환 도구(이동/복사/회전/축척)는 먼저 객체를 선택한 뒤 사용

## 로드맵 (AutoCAD 대항 방향)

다음 단계 후보: 진짜 치수 스타일/주석, 해치(hatch)·채우기, 트림/연장/오프셋/모깎기,
블록·외부참조, 그립 편집, 무한 정밀도 좌표 입력(상대/극좌표 `@10<45`), 다중 뷰포트,
DWG 읽기(외부 라이브러리), 협업/버전관리, 자연어 ↔ 파라메트릭 제약(constraint) 연동.
