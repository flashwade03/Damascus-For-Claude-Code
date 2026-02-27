---
gemini_api_key: YOUR_GEMINI_API_KEY
gemini_model: gemini-3-flash-preview
enable_gemini_review: false
openai_api_key: YOUR_OPENAI_API_KEY
openai_model: gpt-5.1-codex-mini
enable_openai_review: false
enable_claude_review: true
---

# Damascus Configuration

Settings for multi-LLM review in the Damascus forge workflow.

This file is automatically created at `.claude/damascus.local.md` in your project directory when a session starts. Fill in your API keys to enable external reviewers.

## Configuration Options

- `gemini_api_key`: Gemini API key (required if Gemini review enabled)
- `gemini_model`: Gemini model to use (default: gemini-3-flash-preview)
- `enable_gemini_review`: Enable/disable Gemini review (true/false)
- `openai_api_key`: OpenAI API key (required if OpenAI review enabled)
- `openai_model`: OpenAI model to use (default: gpt-5.1-codex-mini)
- `enable_openai_review`: Enable/disable OpenAI review (true/false)
- `enable_claude_review`: Enable/disable Claude review (true/false)
