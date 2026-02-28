<p align="center">
  <strong>Damascus</strong><br>
  <em>반복적인 멀티 LLM 리뷰를 통해 문서를 단조하다</em>
</p>

<p align="center">
  <a href="#설치">설치</a> &middot;
  <a href="#사용법">사용법</a> &middot;
  <a href="#설정">설정</a> &middot;
  <a href="./README.md">English</a> &middot;
  <a href="./README.ja.md">日本語</a>
</p>

---

> 다마스커스 강철처럼, 문서는 반복된 단조를 통해 강해진다.

Damascus는 여러 LLM의 반복 리뷰 루프를 통해 문서를 정련하는 **Claude Code 플러그인**입니다. 구현 계획이나 기술 문서를 작성하고, Claude·Gemini·OpenAI가 병렬로 리뷰한 뒤, 승인될 때까지 개선합니다.

```
/forge [-n max] [-o path] <작업 설명>
```

## 왜 만들었는가

Claude의 플랜 모드가 마음에 들지 않으면, 처음부터 다시 돌립니다. 새 컨텍스트, 새 탐색, 새 시도 — 이전 시도에서 배운 것은 전부 사라집니다. 세 번 반복하면 플랜 모드를 세 번 풀로 돌린 셈인데, 결과물은 이전 실패에서 아무것도 배우지 못합니다.

주사위를 6이 나올 때까지 굴리는 것과 같습니다.

Damascus는 다른 방식을 취합니다: **피드백이 누적되고, 컨텍스트가 보존되며, 매 반복이 이전 위에 쌓입니다.** 1회차의 약점이 2회차의 입력이 됩니다. 리뷰어가 저자가 놓친 것을 잡고, 저자가 그것을 같은 맥락 안에서 보완합니다.

결과는 랜덤이 아닙니다. 수렴합니다.

### 틀렸을 때의 비용

개발은 설계보다 3~5배 비쌉니다. Damascus 없이는 매 시도마다 그 비용을 지불합니다.

```
Damascus 없이 — 될 때까지 다시 돌리기

  시도 1:  설계 [====]  →  개발 [================]  →  ✗ 결함 발견
  시도 2:  설계 [====]  →  개발 [================]  →  ✗ 여전히 부족
  시도 3:  설계 [====]  →  개발 [================]  →  ✓ 수용 가능

  총 토큰:  ~300K (설계) + ~900K (개발) = ~1.2M
  이전 컨텍스트:  0% — 매번 처음부터 시작
```

```
Damascus — 싼 쪽에서 반복하고, 개발은 한 번만

  반복 1:  초안 [====]  →  리뷰 [==]  →  개선
  반복 2:  개선 [==]    →  리뷰 [==]  →  개선
  반복 3:  개선 [==]    →  리뷰 [==]  →  ✓ 승인
  개발:    개발 [================]    →  ✓ 완료

  총 토큰:  ~340K (설계 + 리뷰) + ~300K (개발) = ~640K
  이전 컨텍스트:  100% — 매 반복이 이전 위에 쌓임
```

> **실패한 개발 3회에 ~1.2M 토큰, 또는 정련된 설계 3회 + 깔끔한 개발 1회에 ~640K 토큰.** 반복은 비용이 싼 쪽에서 일어납니다.

토큰이 적다는 건 단순히 저렴한 게 아닙니다 — 컨텍스트 윈도우 안의 정보 밀도가 높다는 뜻입니다. 재시도는 같은 코드베이스를 처음부터 다시 탐색하는 데 토큰을 씁니다. Damascus는 이미 알고 있는 것을 정련하는 피드백에 토큰을 씁니다.

## 동작 방식

```
          ┌─────────────┐
          │   Author    │  문서 초안 작성
          └──────┬──────┘
                 │
          ┌──────▼──────┐
          │    Save     │  파일 저장
          └──────┬──────┘
                 │
     ┌───────────┼───────────┐
     ▼           ▼           ▼
  Claude      Gemini      OpenAI     병렬 리뷰
     └───────────┼───────────┘
                 ▼
          ┌─────────────┐
          │    Judge     │──── 승인 ──▶ 완료
          └──────┬──────┘
                 │ 수정 필요
                 └──▶ Author로 복귀 (최대 N회)
```

매 반복마다 모든 리뷰어의 피드백을 반영하여, 다마스커스 강철의 층처럼 문서를 강화합니다. 작성 에이전트는 반복 간에 **resume**되어 — 읽은 파일, 발견한 패턴을 모두 기억하고, 처음부터 다시 탐색하는 대신 정밀하게 수정합니다.

## 설계 철학

- **기법보다 의도** — 프롬프트 엔지니어링으로 우회하지 않고, Claude의 네이티브 plan 모드를 신뢰합니다.
- **탐색 먼저, 작성은 나중에** — 에이전트가 코드베이스를 깊이 조사한 뒤에 결과물을 만듭니다.
- **속도보다 품질** — 잘 단조된 문서 하나가 구현 실수의 반복보다 낫습니다.

## 설치

```bash
# 마켓플레이스 추가 및 설치
/plugin marketplace add flashwade03/Damascus-For-Claude-Code
/plugin install damascus@planner
```

첫 세션 시작 시 Damascus가 프로젝트 디렉토리에 `.claude/damascus.local.md`를 자동 생성합니다. 외부 리뷰어를 활성화하려면 API 키를 입력하세요.

## 사용법

### 명령어

| 명령어 | 모드 | 설명 |
|--------|------|------|
| `/forge` | 자동 | 작업에 따라 plan / document 자동 결정 |
| `/forge-plan` | Plan | 구현 계획서 (Claude plan 모드 사용) |
| `/forge-doc` | Document | 기술 문서 — API 스펙, 아키텍처, 설계 문서 |

### 예시

```bash
/forge implement user authentication
/forge write API spec for the payment module

/forge-plan -n 5 implement notification system
/forge-doc -o docs/api/payment.md write API spec for payment
```

### 옵션

| 플래그 | 설명 | 기본값 |
|--------|------|--------|
| `-n <max>` | 최대 반복 횟수 | `3` |
| `-o <path>` | 출력 파일 경로 | 자동 감지 |

`-o`를 생략하면 프로젝트의 문서 관례를 감지하거나 사용자에게 물어봅니다.

## 설정

`.claude/damascus.local.md` 편집 (프로젝트별 자동 생성):

```yaml
---
gemini_api_key: YOUR_GEMINI_KEY
gemini_model: gemini-3-flash-preview
enable_gemini_review: true

openai_api_key: YOUR_OPENAI_KEY
openai_model: gpt-5.1-codex-mini
enable_openai_review: false

enable_claude_review: true
---
```

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `gemini_api_key` | Gemini API 키 | — |
| `gemini_model` | Gemini 모델 | `gemini-3-flash-preview` |
| `enable_gemini_review` | Gemini 리뷰어 활성화 | `false` |
| `openai_api_key` | OpenAI API 키 | — |
| `openai_model` | OpenAI 모델 | `gpt-5.1-codex-mini` |
| `enable_openai_review` | OpenAI 리뷰어 활성화 | `false` |
| `enable_claude_review` | Claude 리뷰어 활성화 | `true` |

## 에이전트

| 에이전트 | 모델 | 역할 |
|----------|------|------|
| **Planner** | Opus (plan 모드) | 코드베이스 탐색, 구현 계획 작성 |
| **Author** | Opus | 코드베이스 탐색, 기술 문서 작성 |
| **Claude Reviewer** | Sonnet | 실제 코드베이스와 교차 검증 |

### 리뷰 기준

모든 리뷰어는 다음 5가지 차원으로 평가합니다:

1. **코드베이스 기반** — 실제 파일, 함수, 패턴을 참조하는가
2. **명확성** — 논리가 일관되고, 접근 방식이 타당한가
3. **완전성** — 빠진 부분이나 미고려 엣지 케이스가 없는가
4. **실현 가능성** — 기술적으로 건전하고 구현 가능한가
5. **테스트 가능성** — 검증 방법이 명확한가

## 변경 이력

- **3.3.0** — 반복 간 에이전트 resume (코드베이스 컨텍스트 보존), writer agent 제거, foreground parallel 리뷰, 리뷰 히스토리 압축, 모든 리뷰어에 `--mode` plan/doc 전달, session ID fallback
- **3.2.0** — plan-metadata.sh 크로스 플랫폼 호환성 수정, 명령어 argument-hint 및 워크플로우 섹션 통일
- **3.0.0** — plan/doc 모드 문서 단조, 설정 경로 마이그레이션
- **2.0.0** — 멀티 LLM 단조 워크플로우
- **1.1.0** — Gemini 리뷰 통합
- **1.0.0** — 최초 릴리스

## 라이선스

MIT
