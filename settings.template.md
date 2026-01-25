---
gemini_api_key: YOUR_GEMINI_API_KEY
gemini_model: gemini-3-flash-preview
enable_gemini_review: false
openai_api_key: YOUR_OPENAI_API_KEY
openai_model: gpt-5.1-codex-mini
enable_openai_review: false
enable_claude_review: true
---

# Workflow Hooks Configuration

This file stores the settings for the workflow-hooks plugin.

## Setup

Copy this file to `settings.local.md` and fill in your API keys:

```bash
cp settings.template.md settings.local.md
```

## Configuration Options

- `gemini_api_key`: Gemini API key (required if Gemini review enabled)
- `gemini_model`: Gemini model to use (default: gemini-2.0-flash)
- `enable_gemini_review`: Enable/disable Gemini review (true/false)
- `openai_api_key`: OpenAI API key (required if OpenAI review enabled)
- `openai_model`: OpenAI model to use (default: gpt-4o-mini)
- `enable_openai_review`: Enable/disable OpenAI review (true/false)
- `enable_claude_review`: Enable/disable Claude review (true/false), fixed model: Claude Sonnet 4.5
