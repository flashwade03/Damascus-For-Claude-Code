import { describe, it, expect, afterEach } from 'vitest'
import { execSync } from 'node:child_process'
import { join } from 'node:path'
import { existsSync, mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'

const PROJECT_ROOT = join(import.meta.dirname, '..', '..')
const SCRIPT = join(PROJECT_ROOT, 'scripts', 'session-start.sh')

let tempDirs: string[] = []

function createTempProject(): string {
  const dir = mkdtempSync(join(tmpdir(), 'damascus-session-'))
  tempDirs.push(dir)
  return dir
}

afterEach(() => {
  for (const dir of tempDirs) {
    try { rmSync(dir, { recursive: true }) } catch {}
  }
  tempDirs = []
})

describe('session-start.sh', () => {
  it('should create settings file from template', () => {
    const projectDir = createTempProject()

    const raw = execSync(`echo '' | CLAUDE_PLUGIN_ROOT="${PROJECT_ROOT}" CLAUDE_PROJECT_DIR="${projectDir}" bash "${SCRIPT}"`, {
      encoding: 'utf-8'
    })

    const result = JSON.parse(raw)
    expect(result.continue).toBe(true)

    const settingsPath = join(projectDir, '.claude', 'damascus.local.md')
    expect(existsSync(settingsPath)).toBe(true)

    const content = readFileSync(settingsPath, 'utf-8')
    expect(content).toContain('gemini_api_key')
    expect(content).toContain('enable_claude_review')
  })

  it('should report ready when settings already exist', () => {
    const projectDir = createTempProject()

    // Run twice — first creates, second should report ready
    execSync(`echo '' | CLAUDE_PLUGIN_ROOT="${PROJECT_ROOT}" CLAUDE_PROJECT_DIR="${projectDir}" bash "${SCRIPT}"`, {
      encoding: 'utf-8'
    })

    const raw = execSync(`echo '' | CLAUDE_PLUGIN_ROOT="${PROJECT_ROOT}" CLAUDE_PROJECT_DIR="${projectDir}" bash "${SCRIPT}"`, {
      encoding: 'utf-8'
    })

    const result = JSON.parse(raw)
    expect(result.continue).toBe(true)
    expect(result.systemMessage).toContain('Ready')
  })

  it('should warn about missing files with bad plugin root', () => {
    const projectDir = createTempProject()
    const fakeRoot = createTempProject()

    const raw = execSync(`echo '' | CLAUDE_PLUGIN_ROOT="${fakeRoot}" CLAUDE_PROJECT_DIR="${projectDir}" bash "${SCRIPT}"`, {
      encoding: 'utf-8'
    })

    const result = JSON.parse(raw)
    expect(result.continue).toBe(true)
    expect(result.systemMessage).toContain('missing')
  })
})
