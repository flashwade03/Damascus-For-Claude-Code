import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  parseSettingsFromContent,
  buildReviewPrompt,
  isResponsesAPIModel,
  extractResponsesAPIText,
  projectPathToClaudeFolder,
  getShortId,
  getPluginRoot
} from '../scripts/utils'

describe('parseSettingsFromContent', () => {
  it('should parse valid frontmatter with all settings', () => {
    const content = `---
gemini_api_key: test-gemini-key
gemini_model: gemini-3-flash
enable_gemini_review: true
openai_api_key: test-openai-key
openai_model: gpt-4o-mini
enable_openai_review: false
enable_claude_review: true
---

# Some content
`
    const settings = parseSettingsFromContent(content)

    expect(settings.gemini_api_key).toBe('test-gemini-key')
    expect(settings.gemini_model).toBe('gemini-3-flash')
    expect(settings.enable_gemini_review).toBe(true)
    expect(settings.openai_api_key).toBe('test-openai-key')
    expect(settings.openai_model).toBe('gpt-4o-mini')
    expect(settings.enable_openai_review).toBe(false)
    expect(settings.enable_claude_review).toBe(true)
  })

  it('should return empty object for content without frontmatter', () => {
    const content = '# No frontmatter here'
    const settings = parseSettingsFromContent(content)
    expect(settings).toEqual({})
  })

  it('should return empty object for empty content', () => {
    const settings = parseSettingsFromContent('')
    expect(settings).toEqual({})
  })

  it('should handle quoted values', () => {
    const content = `---
gemini_api_key: "quoted-key"
openai_api_key: 'single-quoted'
---`
    const settings = parseSettingsFromContent(content)
    expect(settings.gemini_api_key).toBe('quoted-key')
    expect(settings.openai_api_key).toBe('single-quoted')
  })

  it('should handle partial settings', () => {
    const content = `---
gemini_api_key: only-gemini
---`
    const settings = parseSettingsFromContent(content)
    expect(settings.gemini_api_key).toBe('only-gemini')
    expect(settings.openai_api_key).toBeUndefined()
  })
})

describe('buildReviewPrompt', () => {
  it('should include plan content in prompt', () => {
    const content = '# My Plan\n\n## Overview\nThis is a test plan.'
    const prompt = buildReviewPrompt(content)

    expect(prompt).toContain('# My Plan')
    expect(prompt).toContain('## Overview')
    expect(prompt).toContain('This is a test plan.')
  })

  it('should include all review criteria', () => {
    const prompt = buildReviewPrompt('test')

    expect(prompt).toContain('Codebase Grounding')
    expect(prompt).toContain('Clarity of Thinking')
    expect(prompt).toContain('Completeness')
    expect(prompt).toContain('Feasibility')
    expect(prompt).toContain('Testability')
  })

  it('should wrap content with markers', () => {
    const content = 'Document content here'
    const prompt = buildReviewPrompt(content)

    expect(prompt).toContain('Document content:')
    expect(prompt).toContain('---\nDocument content here\n---')
  })
})

describe('isResponsesAPIModel', () => {
  it('should return true for codex models', () => {
    expect(isResponsesAPIModel('gpt-5-codex')).toBe(true)
    expect(isResponsesAPIModel('gpt-5.1-codex-mini')).toBe(true)
  })

  it('should return true for o1 models', () => {
    expect(isResponsesAPIModel('o1-preview')).toBe(true)
    expect(isResponsesAPIModel('o1-mini')).toBe(true)
  })

  it('should return true for o3 models', () => {
    expect(isResponsesAPIModel('o3-mini')).toBe(true)
  })

  it('should return false for standard models', () => {
    expect(isResponsesAPIModel('gpt-4o')).toBe(false)
    expect(isResponsesAPIModel('gpt-4o-mini')).toBe(false)
    expect(isResponsesAPIModel('gpt-4-turbo')).toBe(false)
  })
})

describe('extractResponsesAPIText', () => {
  it('should extract text from message type output', () => {
    const data = {
      output: [
        { type: 'reasoning', content: [{ text: 'thinking...' }] },
        { type: 'message', content: [{ text: 'actual response' }] }
      ]
    }
    expect(extractResponsesAPIText(data)).toBe('actual response')
  })

  it('should fallback to first output if no message type', () => {
    const data = {
      output: [
        { type: 'text', content: [{ text: 'fallback text' }] }
      ]
    }
    expect(extractResponsesAPIText(data)).toBe('fallback text')
  })

  it('should fallback to output_text', () => {
    const data = {
      output: [],
      output_text: 'output text fallback'
    }
    expect(extractResponsesAPIText(data)).toBe('output text fallback')
  })

  it('should return null if no text found', () => {
    const data = { output: [] }
    expect(extractResponsesAPIText(data)).toBeNull()
  })
})

describe('projectPathToClaudeFolder', () => {
  it('should replace slashes with dashes', () => {
    expect(projectPathToClaudeFolder('/Volumes/Projects/MyApp'))
      .toBe('-Volumes-Projects-MyApp')
  })

  it('should handle paths with multiple levels', () => {
    expect(projectPathToClaudeFolder('/Users/dev/code/project/subfolder'))
      .toBe('-Users-dev-code-project-subfolder')
  })

  it('should handle single level path', () => {
    expect(projectPathToClaudeFolder('/root'))
      .toBe('-root')
  })
})

describe('getShortId', () => {
  it('should return first 8 characters', () => {
    expect(getShortId('475453ce-39b9-494e-b0ac-6cda9e8c27d8'))
      .toBe('475453ce')
  })

  it('should return full string if less than 8 chars', () => {
    expect(getShortId('abc')).toBe('abc')
  })

  it('should handle exactly 8 characters', () => {
    expect(getShortId('12345678')).toBe('12345678')
  })
})

describe('getPluginRoot', () => {
  const originalEnv = process.env.CLAUDE_PLUGIN_ROOT

  beforeEach(() => {
    delete process.env.CLAUDE_PLUGIN_ROOT
  })

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.CLAUDE_PLUGIN_ROOT = originalEnv
    } else {
      delete process.env.CLAUDE_PLUGIN_ROOT
    }
  })

  it('should prioritize CLAUDE_PLUGIN_ROOT env var', () => {
    process.env.CLAUDE_PLUGIN_ROOT = '/custom/plugin/path'
    expect(getPluginRoot()).toBe('/custom/plugin/path')
  })

  it('should derive from import.meta.url when env not set', () => {
    // import.meta.url points to scripts/utils.ts -> parent is Damascus
    const result = getPluginRoot(import.meta.url)
    expect(result).toContain('Damascus')
  })

  it('should prioritize env var even when import.meta.url provided', () => {
    process.env.CLAUDE_PLUGIN_ROOT = '/env/takes/priority'
    expect(getPluginRoot(import.meta.url)).toBe('/env/takes/priority')
  })
})
