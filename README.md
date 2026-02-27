<p align="center">
  <strong>Damascus</strong><br>
  <em>Forge documents through iterative multi-LLM review</em>
</p>

<p align="center">
  <a href="#installation">Installation</a> &middot;
  <a href="#usage">Usage</a> &middot;
  <a href="#configuration">Configuration</a> &middot;
  <a href="./README.ko.md">한국어</a> &middot;
  <a href="./README.ja.md">日本語</a>
</p>

---

> Like Damascus steel, documents become stronger through repeated forging.

Damascus is a **Claude Code plugin** that refines documents through an iterative review loop powered by multiple LLMs. Write an implementation plan or technical document, have it reviewed by Claude, Gemini, and OpenAI in parallel, then refine until approved.

```
/forge [-n max] [-o path] <task description>
```

## How It Works

```
          ┌─────────────┐
          │   Author    │  Draft the document
          └──────┬──────┘
                 │
          ┌──────▼──────┐
          │   Writer    │  Save to file
          └──────┬──────┘
                 │
     ┌───────────┼───────────┐
     ▼           ▼           ▼
  Claude      Gemini      OpenAI     Review in parallel
     └───────────┼───────────┘
                 ▼
          ┌─────────────┐
          │    Judge     │──── Approved ──▶ Done
          └──────┬──────┘
                 │ Needs work
                 └──▶ Back to Author (up to N iterations)
```

Each iteration folds in feedback from all reviewers, strengthening the document like layers of Damascus steel.

## Design Philosophy

- **Intent over technique** — Trusts Claude's native plan mode rather than overriding it with prompt engineering.
- **Explore first, write second** — Agents deeply investigate the codebase before producing output.
- **Quality over speed** — One well-forged document beats a cycle of implementation mistakes.

## Installation

```bash
# Add marketplace and install
/plugin marketplace add flashwade03/Damascus-For-Claude-Code
/plugin install damascus@fablers
```

On the first session, Damascus automatically creates `.claude/damascus.local.md` in your project directory. Fill in your API keys there to enable external reviewers.

## Usage

### Commands

| Command | Mode | Description |
|---------|------|-------------|
| `/forge` | Auto | Decides plan vs. document based on your task |
| `/forge-plan` | Plan | Implementation plans (uses Claude's plan mode) |
| `/forge-doc` | Document | Technical docs — API specs, architecture, design docs |

### Examples

```bash
/forge implement user authentication
/forge write API spec for the payment module

/forge-plan -n 5 implement notification system
/forge-doc -o docs/api/payment.md write API spec for payment
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `-n <max>` | Max forging iterations | `3` |
| `-o <path>` | Output file path | Auto-detected |

If `-o` is omitted, Damascus detects your project's doc conventions or asks you.

## Configuration

Edit `.claude/damascus.local.md` (auto-created per project):

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

| Option | Description | Default |
|--------|-------------|---------|
| `gemini_api_key` | Gemini API key | — |
| `gemini_model` | Gemini model | `gemini-3-flash-preview` |
| `enable_gemini_review` | Enable Gemini reviewer | `false` |
| `openai_api_key` | OpenAI API key | — |
| `openai_model` | OpenAI model | `gpt-5.1-codex-mini` |
| `enable_openai_review` | Enable OpenAI reviewer | `false` |
| `enable_claude_review` | Enable Claude reviewer | `true` |

## Agents

| Agent | Model | Role |
|-------|-------|------|
| **Planner** | Opus (plan mode) | Explores codebase, creates implementation plans |
| **Author** | Opus | Explores codebase, writes technical documents |
| **Writer** | Haiku | Saves content to file without modification |
| **Claude Reviewer** | Sonnet | Cross-references document against actual codebase |

### Review Criteria

All reviewers evaluate against five dimensions:

1. **Codebase Grounding** — References real files, functions, and patterns
2. **Clarity** — Coherent reasoning, well-justified approach
3. **Completeness** — No obvious gaps or missing edge cases
4. **Feasibility** — Technically sound and implementable
5. **Testability** — Clear path to verification

## Project Structure

```
damascus/
├── .claude-plugin/
│   └── plugin.json           # Plugin manifest
├── commands/
│   ├── forge.md              # /forge (auto-detect mode)
│   ├── forge-plan.md         # /forge-plan (plan mode)
│   └── forge-doc.md          # /forge-doc (document mode)
├── agents/
│   ├── planner.md            # Plan authoring agent
│   ├── author.md             # Document authoring agent
│   ├── writer.md             # File writer agent
│   └── claude-reviewer.md    # Claude review agent
├── skills/
│   └── ForgeOrchestrator/    # Workflow orchestration skill
├── scripts/
│   ├── gemini-review.ts      # Gemini API integration
│   ├── openai-review.ts      # OpenAI API integration
│   ├── get-session-id.ts     # Session ID utility
│   ├── plan-metadata.sh      # Metadata injection
│   └── session-start.sh      # Setup & settings provisioning
├── hooks/
│   └── hooks.json            # Hook definitions
├── damascus.template.md      # Settings template
└── __tests__/
    └── utils.test.ts         # Unit tests
```

## Changelog

- **3.0.0** — Document forging with plan/doc modes, settings path migration
- **2.0.0** — Multi-LLM forging workflow
- **1.1.0** — Gemini review integration
- **1.0.0** — Initial release

## License

MIT
