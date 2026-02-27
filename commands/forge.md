---
name: forge
description: Damascus workflow that forges documents through multi-LLM review. Auto-detects whether to create a plan or a document.
argument-hint: "[-n max] [-o path] <task description>"
---

# Forge

Like Damascus steel, documents become stronger through repeated forging.
Auto-detects whether to invoke the **planner** (implementation plans) or **author** (technical documents) based on task keywords.

- Plan keywords: implement, build, change, refactor, develop, add, fix, migrate, upgrade
- Document keywords: write, document, specify, design doc, API spec, architecture

## Workflow

1. **Author/Planner** → Create initial draft with deep codebase exploration
2. **Writer** → Save to file
3. **Reviewers** → Multi-LLM parallel review (Claude / Gemini / OpenAI)
4. **Judge** → Approve or request re-forging (up to `-n` iterations)

## Usage

```
/forge [-n max] [-o output_path] [task description]
```

- `-n`: Maximum forging iterations (default: 3)
- `-o`: Output file path (optional — if omitted, determined automatically or asked)

Examples:
```
/forge implement user authentication
/forge write API spec for the payment module
/forge -n 5 architecture document for the notification system
/forge -o docs/api/payment.md write API spec for payment
```

---

**Instructions:** Follow the `forge-orchestrator` skill to execute this workflow.

**Parse arguments:**
- Extract `-n [number]` if present → `max_iterations` (default: 3)
- Extract `-o [path]` if present → `output_path` (default: none)
- Remaining text → `task_description`

**Mode:** auto
**Output path:** (parsed from -o flag, or empty)
**User input:** $ARGUMENTS
