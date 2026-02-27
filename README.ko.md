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

## 동작 방식

```
          ┌─────────────┐
          │   Author    │  문서 초안 작성
          └──────┬──────┘
                 │
          ┌──────▼──────┐
          │   Writer    │  파일 저장
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

매 반복마다 모든 리뷰어의 피드백을 반영하여, 다마스커스 강철의 층처럼 문서를 강화합니다.

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
| **Writer** | Haiku | 내용 수정 없이 파일에 저장 |
| **Claude Reviewer** | Sonnet | 실제 코드베이스와 교차 검증 |

### 리뷰 기준

모든 리뷰어는 다음 5가지 차원으로 평가합니다:

1. **코드베이스 기반** — 실제 파일, 함수, 패턴을 참조하는가
2. **명확성** — 논리가 일관되고, 접근 방식이 타당한가
3. **완전성** — 빠진 부분이나 미고려 엣지 케이스가 없는가
4. **실현 가능성** — 기술적으로 건전하고 구현 가능한가
5. **테스트 가능성** — 검증 방법이 명확한가

## 라이선스

MIT
