# Damascus

> Like Damascus steel, documents become stronger through repeated forging.

A Claude Code plugin that iteratively improves documents through multi-LLM review.

## Core Concept

Damascus steel becomes stronger through repeated folding and hammering.
Similarly, this plugin refines documents through review by multiple AI models.

```
/forge [-n max] [-o path] [task description]
```

## Design Philosophy

**Intent over technique.** Claude's built-in plan mode was carefully designed by Anthropic to work optimally with the model. Rather than trying to outsmart it with elaborate prompt engineering, Damascus trusts and leverages this native capability for implementation plans.

**Explore first, write second.** Authoring agents deeply investigate the codebase before writing anything. The quality of a document is proportional to the depth of exploration.

**Document quality over iteration speed.** This plugin deliberately avoids agentic loops (automated implement-test-fix cycles). Investing in one well-forged document upfront is far more effective than iterating through implementation mistakes.

The plugin's value comes not from reinventing planning, but from the **iterative refinement loop** — using multiple LLM perspectives to strengthen what the authoring agents produce.

## Workflow

```
    ┌──────────────┐
    │ Planner or   │  Create draft
    │ Author       │
    └──────┬───────┘
           │
    ┌──────▼───────┐
    │    Writer     │  Save to file
    └──────┬───────┘
           │
    ┌──────▼───────┐
    │   Metadata    │  Inject timestamps & session ID
    └──────┬───────┘
           │
    ┌──────▼───────┐
    │  Reviewers    │  Claude + Gemini + OpenAI (parallel)
    └──────┬───────┘
           │
    ┌──────▼───────┐     ┌──────────┐
    │    Judge      │────▶│ Approved │  Done
    └──────┬───────┘     └──────────┘
           │ Needs Work
           └──▶ Back to Author (up to N times)
```

## Installation

1. Clone or copy this plugin to your plugins directory
2. Set up configuration:
   ```bash
   cp settings.template.md settings.local.md
   # Edit settings.local.md with your API keys
   ```
3. Run Claude Code with the plugin:
   ```bash
   claude --plugin-dir ./damascus
   ```

## Configuration

Copy `settings.template.md` to `settings.local.md` and configure:

```yaml
---
gemini_api_key: YOUR_GEMINI_KEY
gemini_model: gemini-3-flash-preview
enable_gemini_review: true

openai_api_key: YOUR_OPENAI_KEY
openai_model: gpt-4o-mini
enable_openai_review: true

enable_claude_review: true
---
```

## Usage

### Commands

| Command | Mode | Description |
|---------|------|-------------|
| `/forge` | Auto-detect | Orchestrator decides based on task description |
| `/forge-plan` | Plan | Implementation plans using Anthropic's plan mode |
| `/forge-doc` | Document | Technical documents — API specs, architecture, design docs, etc. |

### Examples

```bash
# Auto-detect mode
/forge implement user authentication
/forge write API spec for the payment module

# Explicit plan mode
/forge-plan refactor the database layer
/forge-plan -n 5 implement notification system

# Explicit document mode
/forge-doc architecture document for caching strategy
/forge-doc -o docs/api/payment.md write API spec for payment

# Options
-n [max]    # Max forging iterations (default: 3)
-o [path]   # Output file path (optional)
```

### Output Path

If `-o` is not specified, the orchestrator determines the path:
1. Detects existing project conventions (e.g., `docs/api/`, `docs/plans/`)
2. If uncertain, asks the user where to save

### Agents

| Agent | Model | Role |
|-------|-------|------|
| **Planner** | Opus (plan mode) | Explores codebase, creates implementation plans |
| **Author** | Opus | Explores codebase, writes technical documents |
| **Writer** | Haiku | Saves content to file (no modifications) |
| **Claude Reviewer** | Sonnet | Cross-references plan against actual codebase |

### Review Criteria

All reviewers evaluate documents against these dimensions:

1. **Codebase Grounding** — Does it reference real files, functions, and patterns?
2. **Clarity of Thinking** — Is the reasoning coherent and well-justified?
3. **Completeness** — Are there obvious gaps?
4. **Feasibility** — Is the approach technically sound?
5. **Testability** — Does it address how we'll know it works?

## Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `gemini_api_key` | Gemini API key | - |
| `gemini_model` | Gemini model | `gemini-3-flash-preview` |
| `enable_gemini_review` | Enable Gemini | `true` |
| `openai_api_key` | OpenAI API key | - |
| `openai_model` | OpenAI model | `gpt-4o-mini` |
| `enable_openai_review` | Enable OpenAI | `false` |
| `enable_claude_review` | Enable Claude | `true` |

## Structure

```
damascus/
├── commands/
│   ├── forge.md              # /forge command (auto-detect)
│   ├── forge-plan.md         # /forge-plan command (plan mode)
│   └── forge-doc.md          # /forge-doc command (documents)
├── skills/
│   └── ForgeOrchestrator/    # Workflow orchestrator
├── agents/
│   ├── planner.md            # Plan creation (plan mode)
│   ├── author.md             # Document creation (general)
│   ├── writer.md             # File saving
│   └── claude-reviewer.md    # Claude review
├── scripts/
│   ├── gemini-review.ts      # Gemini API integration
│   ├── openai-review.ts      # OpenAI API integration
│   ├── get-session-id.ts     # Session ID retrieval
│   └── plan-metadata.sh      # Metadata injection
├── __tests__/
│   └── utils.test.ts         # Utility tests
├── settings.local.md
└── README.md
```

## Version

- **3.0.0** - General document forging with plan/doc modes
- **2.0.0** - Multi-LLM forging workflow
- **1.1.0** - Gemini review
- **1.0.0** - Initial version
