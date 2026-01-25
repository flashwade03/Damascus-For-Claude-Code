# Damascus

> Like Damascus steel, plans become stronger through repeated forging.

A Claude Code plugin that iteratively improves plans through multi-LLM review.

## Core Concept

Damascus steel becomes stronger through repeated folding and hammering.
Similarly, this plugin refines plans through review by multiple AI models.

```
/forge [-n max] [task description]
```

## Design Philosophy

Many plugins invest heavily in crafting sophisticated, skill-intensive prompts for planning. While I respect that approach, Damascus takes a different path.

**Intent over technique.** Claude's built-in plan mode was carefully designed by Anthropic to work optimally with the model. Rather than trying to outsmart it with elaborate prompt engineering, Damascus trusts and leverages this native capability as intended.

**Plan quality over iteration speed.** This plugin deliberately avoids agentic loops (automated implement-test-fix cycles). Depending on your environment, such loops may face constraints or require additional setup. More importantly, for users of black-box engines like Unity, rapid iteration isn't always practical — compile times, manual play-mode testing, and unpredictable engine behavior make automated trial-and-error costly. In such environments, investing in one well-forged plan upfront is far more effective than iterating through implementation mistakes.

The plugin's value comes not from reinventing planning, but from the **iterative refinement loop** — using multiple LLM perspectives to strengthen what Claude's plan mode already does well.

## Workflow

```
    ┌──────────┐
    │ Planner  │  Create plan
    └────┬─────┘
         │
    ┌────▼─────┐
    │  Writer  │  Save to file
    └────┬─────┘
         │
    ┌────▼─────┐
    │ Reviewers│  Gemini + OpenAI + Claude parallel review
    └────┬─────┘
         │
    ┌────▼─────┐     ┌──────────┐
    │  Judge   │────▶│ Approved │  Approved → Done
    └────┬─────┘     └──────────┘
         │ Needs Work
         │
    └────▶ Back to Planner (up to N times)
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

### Basic Usage

```bash
/forge implement user authentication
```

### Specify Iteration Count

```bash
/forge -n 5 complex architecture design   # Max 5 iterations
/forge -n 2 simple feature                # Max 2 iterations
```

- Default: 3 iterations
- Early completion if approved

### Output

- `docs/plans/{session-id}.md` - Forged plan
- `docs/plans/{session-id}.review.md` - Review history

## Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `gemini_api_key` | Gemini API key | - |
| `gemini_model` | Gemini model | `gemini-2.0-flash` |
| `enable_gemini_review` | Enable Gemini | `true` |
| `openai_api_key` | OpenAI API key | - |
| `openai_model` | OpenAI model | `gpt-4o-mini` |
| `enable_openai_review` | Enable OpenAI | `false` |
| `enable_claude_review` | Enable Claude | `true` |

## Structure

```
damascus/
├── commands/
│   └── forge.md              # /forge command
├── skills/
│   └── ForgeOrchestrator/    # Workflow orchestrator
├── agents/
│   ├── planner.md            # Plan creation
│   ├── writer.md             # File saving
│   └── claude-reviewer.md    # Claude review
├── scripts/
│   ├── gemini-review.ts
│   ├── openai-review.ts
│   └── get-session-id.ts
├── settings.local.md
└── README.md
```

## Version

- **2.0.0** Damascus - Multi-LLM forging workflow
- **1.1.0** - Gemini review
- **1.0.0** - Initial version
