# Review File Template

Use this template when consolidating reviews into the `.review.md` file.

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

## Iteration N

### Claude Inspection
[Claude's feedback]

### Gemini Inspection
[Gemini's feedback]

### OpenAI Inspection (if enabled)
[OpenAI's feedback]

---

## Consolidated Summary

### Critical Issues
- [List of must-fix items from all inspectors]

### Suggestions
- [List of nice-to-have improvements]

---

## Final Verdict: [APPROVED | NEEDS_REVISION]
```

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
