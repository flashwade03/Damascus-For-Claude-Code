# Damascus — Claude Code Plugin

## What This Is

A Claude Code plugin (v4.0.1) that forges documents through iterative multi-LLM review. Published on the Claude Code marketplace as `damascus@planner`.

## Project Structure

```
.claude-plugin/plugin.json   # Plugin manifest (name, version, marketplace metadata)
commands/                    # Slash commands (/forge, /forge-plan, /forge-doc, /forge-team)
agents/                      # Subagent prompts (planner, author, claude-reviewer)
skills/ForgeOrchestrator/    # v3 orchestration skill (SKILL.md + references/)
skills/ForgeTeamOrchestrator/  # v4 Agent Teams orchestration (SKILL.md + references/)
skills/AgentTeamsDebugger/     # v4 debugging skill (diagnostic procedures + known failures)
scripts/                     # TypeScript/bash utilities
  api-clients.ts             # Extracted API call functions (Gemini, OpenAI) with dry-run/mock support
  gemini-review.ts           # Gemini review script (uses api-clients)
  openai-review.ts           # OpenAI review script (uses api-clients)
  utils.ts                   # Shared utilities (settings parsing, prompt building)
  get-session-id.ts          # Session ID extraction
  plan-metadata.sh           # Frontmatter metadata injection
  session-start.sh           # SessionStart hook (installation verification + settings provisioning)
  dev-mode.sh                # Dev mode toggle (symlink plugin cache to this repo)
  smoke-test.sh              # End-to-end smoke test (dry-run mode)
hooks/hooks.json             # Hook definitions (SessionStart)
__tests__/                   # Tests
  utils.test.ts              # Unit tests for scripts/utils.ts
  api-clients.test.ts        # Unit tests for scripts/api-clients.ts
  integration/               # Integration tests (scripts as child processes)
  fixtures/                  # Test fixtures (sample plans, mock responses, settings)
  test-project/              # Fixture project for smoke/manual testing
```

## Key Conventions

- **ES modules** — `"type": "module"` in package.json. Use `.js` extensions in imports (tsx resolves .ts → .js).
- **No build step** — Scripts run via `npx tsx`. Type checking is `tsc --noEmit` only.
- **Plugin env vars** — `CLAUDE_PLUGIN_ROOT` (plugin install path), `CLAUDE_PROJECT_DIR` (user's project).
- **Settings file** — `$CLAUDE_PROJECT_DIR/.claude/damascus.local.md` with YAML frontmatter for API keys and reviewer toggles.

## Development Workflow

```bash
npm run dev:enable        # Symlink plugin cache → this repo (changes reflected immediately)
npm run dev:disable       # Restore original plugin cache
npm run dev:status        # Check current dev mode state

npm run typecheck         # tsc --noEmit
npm run test:unit         # Unit tests only (fast)
npm run test:integration  # Integration tests (scripts as child processes)
npm test                  # All vitest tests
npm run smoke             # End-to-end smoke test (dry-run, no API keys needed)
```

After `dev:enable`, restart Claude Code session for changes to take effect.

## Testing Modes

- `DAMASCUS_DRY_RUN=true` — Skips API calls, returns placeholder review text
- `DAMASCUS_MOCK_RESPONSE_FILE=path` — Returns file content as the review result
- Both are checked in `scripts/api-clients.ts` before any network call

## Forge Workflow (8 steps)

1. **Draft** — Spawn planner/author agent (resume on iteration 2+)
2. **Resolve path** — `-o` flag > project conventions > ask user
3. **Save** — Write tool (orchestrator handles directly)
4. **Metadata** — Inject timestamps + session ID via plan-metadata.sh
5. **Review** — Parallel: Claude agent + Gemini script + OpenAI script
6. **Consolidate** — Write .review.md (full overwrite, compress history)
7. **Judge** — APPROVED or NEEDS_REVISION
8. **Loop** — Resume author agent with consolidated feedback

## Current Status (v4.0.1)

- Agent Teams mode (`/forge-team`) with Explorer + single Planner architecture
- Planner-mediated cross-pollination between explorers (v4.0.1)
- Conditional reviewer spawning — only enabled reviewers are spawned (v4.0.1)
- Sequential mode (`/forge`, `/forge-plan`, `/forge-doc`) unchanged from v3
- Three reviewer backends (Claude, Gemini, OpenAI)
- AgentTeamsDebugger skill for diagnosing stuck sessions

## Project Settings (.claude/settings.json)

- `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` — Agent Teams enabled
- `teammateMode: "tmux"` — Split-pane mode for team visualization
- `plansDirectory: ./docs/plans/` — Plan output directory

## Design Documents

설계 결정은 docs/에 있다. 구현 시 해당 문서를 먼저 읽고 결정 사항을 따를 것.

| 문서 | 참조 시점 |
|------|----------|
| `docs/v4-agent-teams.md` | v4 팀 구성, 라운드 흐름, 에이전트 역할, 제약 조건 확인 시 |

## v4 — Agent Teams (Implemented)

- `/forge-team` command — Agent Teams workflow (v3 `/forge` commands unchanged)
- Lead orchestrates, Explorers (N) investigate, single Planner synthesizes, Scribe writes, Reviewers (up to 3) judge
- Round flow: Explorers explore → Planner synthesizes → Scribe writes → Reviewers review → loop or end
- Teammates stay alive across rounds — no resume needed
- Requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in `.claude/settings.json`
- Single Planner manages Explorers, submits plan via ExitPlanMode. Lead approves immediately.
- Only the Scribe writes files — all other teammates communicate via SendMessage only
- **Critical**: Lead inbox is `team-lead.json` — all prompts must use `recipient: "team-lead"`
