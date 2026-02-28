---
name: forge-doc
description: Damascus workflow that forges technical documents through multi-LLM review. API specs, architecture docs, design docs, etc.
argument-hint: "[-n max] [-o path] <task description>"
---

# Forge Document

Forge a technical document with deep codebase exploration and multi-LLM review.
The author explores the actual codebase first, then writes documentation grounded in real code — not generic advice.

## Workflow

1. **Author** (Opus) → Explore codebase and write technical document
2. **Save** → Write document to file
3. **Reviewers** → Multi-LLM parallel review (Claude / Gemini / OpenAI)
4. **Judge** → Approve or request re-forging (up to `-n` iterations)

## Usage

```
/forge-doc [-n max] [-o output_path] [task description]
```

- `-n`: Maximum forging iterations (default: 3)
- `-o`: Output file path (optional — if omitted, determined automatically or asked)

Examples:
```
/forge-doc write API spec for the payment module
/forge-doc -n 4 architecture document for the notification system
/forge-doc -o docs/architecture/caching.md design doc for the caching strategy
```

---

**Instructions:** Follow the `forge-orchestrator` skill to execute this workflow.

**Parse arguments:**
- Extract `-n [number]` if present → `max_iterations` (default: 3)
- Extract `-o [path]` if present → `output_path` (default: none)
- Remaining text → `task_description`

**Mode:** doc
**Output path:** (parsed from -o flag, or empty)
**User input:** $ARGUMENTS
