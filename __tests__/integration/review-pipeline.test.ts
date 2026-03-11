import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'

const PROJECT_ROOT = join(import.meta.dirname, '..', '..')
const SCRIPTS_DIR = join(PROJECT_ROOT, 'scripts')
const FIXTURES_DIR = join(import.meta.dirname, '..', 'fixtures')

function runScript(script: string, args: string[], env: Record<string, string> = {}, stdinData?: string): string {
  if (args.length === 0 && stdinData !== undefined) {
    // When no args, script reads from stdin — pipe stdinData via shell
    return execFileSync('bash', ['-c', `echo '${stdinData}' | npx tsx "${join(SCRIPTS_DIR, script)}"`], {
      env: {
        ...process.env,
        ...env,
        CLAUDE_PROJECT_DIR: '/tmp/damascus-test-nonexistent'
      },
      encoding: 'utf-8',
      timeout: 15000
    })
  }
  return execFileSync('npx', ['tsx', join(SCRIPTS_DIR, script), ...args], {
    env: {
      ...process.env,
      ...env,
      CLAUDE_PROJECT_DIR: '/tmp/damascus-test-nonexistent'
    },
    encoding: 'utf-8',
    timeout: 15000
  })
}

function parseOutput(raw: string): { success: boolean; review?: string; error?: string } {
  return JSON.parse(raw)
}

describe('gemini-review.ts', () => {
  it('should fail with no file path via stdin', () => {
    const raw = runScript('gemini-review.ts', [], {}, '{}')
    const result = parseOutput(raw)
    expect(result.success).toBe(false)
    expect(result.error).toContain('No file_path')
  })

  it('should fail with non-existent file', () => {
    const raw = runScript('gemini-review.ts', ['/nonexistent/file.md'])
    const result = parseOutput(raw)
    expect(result.success).toBe(false)
    expect(result.error).toContain('File not found')
  })

  it('should fail without API key (settings disabled)', () => {
    const raw = runScript('gemini-review.ts', [join(FIXTURES_DIR, 'sample-plan.md')], {
      GEMINI_API_KEY: ''
    })
    const result = parseOutput(raw)
    expect(result.success).toBe(false)
    expect(result.error).toContain('No Gemini API key')
  })

  it('should succeed in dry-run mode', () => {
    const raw = runScript('gemini-review.ts', [join(FIXTURES_DIR, 'sample-plan.md')], {
      GEMINI_API_KEY: 'fake-key-for-dry-run',
      DAMASCUS_DRY_RUN: 'true'
    })
    const result = parseOutput(raw)
    expect(result.success).toBe(true)
    expect(result.review).toContain('[DRY RUN]')
  })

  it('should succeed with mock response file', () => {
    const raw = runScript('gemini-review.ts', [join(FIXTURES_DIR, 'sample-plan.md')], {
      GEMINI_API_KEY: 'fake-key-for-mock',
      DAMASCUS_MOCK_RESPONSE_FILE: join(FIXTURES_DIR, 'gemini-mock-response.txt')
    })
    const result = parseOutput(raw)
    expect(result.success).toBe(true)
    expect(result.review).toContain('token expiration')
  })
})

describe('openai-review.ts', () => {
  it('should fail with no file path via stdin', () => {
    const raw = runScript('openai-review.ts', [], {}, '{}')
    const result = parseOutput(raw)
    expect(result.success).toBe(false)
    expect(result.error).toContain('No file_path')
  })

  it('should fail with non-existent file', () => {
    const raw = runScript('openai-review.ts', ['/nonexistent/file.md'])
    const result = parseOutput(raw)
    expect(result.success).toBe(false)
    expect(result.error).toContain('File not found')
  })

  it('should succeed in dry-run mode', () => {
    const raw = runScript('openai-review.ts', [join(FIXTURES_DIR, 'sample-plan.md')], {
      OPENAI_API_KEY: 'fake-key-for-dry-run',
      DAMASCUS_DRY_RUN: 'true'
    })
    const result = parseOutput(raw)
    expect(result.success).toBe(true)
    expect(result.review).toContain('[DRY RUN]')
  })

  it('should succeed with mock response file', () => {
    const raw = runScript('openai-review.ts', [join(FIXTURES_DIR, 'sample-plan.md')], {
      OPENAI_API_KEY: 'fake-key-for-mock',
      DAMASCUS_MOCK_RESPONSE_FILE: join(FIXTURES_DIR, 'openai-mock-response.txt')
    })
    const result = parseOutput(raw)
    expect(result.success).toBe(true)
    expect(result.review).toContain('CORS')
  })
})
