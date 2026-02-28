# Review File Template

Use this template when consolidating reviews into the `.review.md` file.

## Structure

The review file has two sections:
1. **Current Iteration** — Full raw reviews from all inspectors + consolidated summary
2. **Review History** — Compressed 1-line summary per previous iteration

On each iteration, the **previous** current iteration is compressed into a history row,
and the **new** iteration becomes the current one. This keeps the file size bounded
while preserving the full convergence trail.

## Template — First Iteration

On the first iteration, there is no history table. Only the Current Iteration section:

```markdown
---
document_file: [DOCUMENT_PATH]
mode: [plan | doc]
revision: 1
reviewed_at: [timestamp]
reviewers: [gemini, openai, claude]
verdict: [APPROVED | NEEDS_REVISION]
---

# Forge Review - [Document Title]

## Current Iteration (1)

### Claude Inspection
[Claude's full feedback]

### Gemini Inspection
[Gemini's full feedback]

### OpenAI Inspection
[OpenAI's full feedback]

---

### Consolidated Summary

#### Critical Issues
- [List of must-fix items from all inspectors]

#### Suggestions
- [List of nice-to-have improvements]

---

### Verdict: [APPROVED | NEEDS_REVISION]
```

## Template — Subsequent Iterations (2+)

From iteration 2 onward, a Review History table appears above the Current Iteration.
The previous iteration is compressed into a single row.

```markdown
---
document_file: [DOCUMENT_PATH]
mode: [plan | doc]
revision: N
reviewed_at: [timestamp]
reviewers: [gemini, openai, claude]
verdict: [APPROVED | NEEDS_REVISION]
---

# Forge Review - [Document Title]

## Review History

| Iteration | Claude | Gemini | OpenAI | Verdict | Key Issues |
|-----------|--------|--------|--------|---------|------------|
| 1 | NEEDS_REVISION | APPROVED | Minor concerns | NEEDS_REVISION | Memory pool not implemented, error handling missing |
| 2 | MINOR_ISSUES | APPROVED | APPROVED | NEEDS_REVISION | _isDead reset bug in recycling |

## Current Iteration (N)

### Claude Inspection
[Claude's full feedback]

### Gemini Inspection
[Gemini's full feedback]

### OpenAI Inspection
[OpenAI's full feedback]

---

### Consolidated Summary

#### Critical Issues
- [List of must-fix items from all inspectors]

#### Suggestions
- [List of nice-to-have improvements]

---

### Verdict: [APPROVED | NEEDS_REVISION]
```

## Rules

- **First iteration**: No history table yet — only the Current Iteration section
- **Subsequent iterations**: Preserve all existing history rows, then append the previous Current Iteration as a new row (verdict + key issues in ≤15 words). Then write the new Current Iteration
- **Refinement feedback**: When refining, pass the **Consolidated Summary** section + **Review History** table to the authoring agent. Do NOT pass raw reviewer outputs from previous iterations.

## Output Format

Report to user after completion:

```
## Forge Complete

**Session**: {shortId}
**Mode**: [plan | doc]
**Status**: [APPROVED / NEEDS_REVISION (max iterations reached)]
**Iterations**: N / max_iterations
**Document**: [DOCUMENT_PATH]
**Review**: [REVIEW_PATH]

[Brief summary of the document]
```
