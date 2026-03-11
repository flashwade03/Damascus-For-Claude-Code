import { describe, it, expect, afterEach } from 'vitest'
import { execSync } from 'node:child_process'
import { join } from 'node:path'
import { writeFileSync, readFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'

const PROJECT_ROOT = join(import.meta.dirname, '..', '..')
const SCRIPT = join(PROJECT_ROOT, 'scripts', 'plan-metadata.sh')

let tempDirs: string[] = []

function createTempFile(content: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'damascus-meta-'))
  tempDirs.push(dir)
  const filePath = join(dir, 'test-doc.md')
  writeFileSync(filePath, content)
  return filePath
}

afterEach(() => {
  for (const dir of tempDirs) {
    try { rmSync(dir, { recursive: true }) } catch {}
  }
  tempDirs = []
})

describe('plan-metadata.sh', () => {
  it('should add frontmatter to a file without one', () => {
    const filePath = createTempFile('# My Plan\n\nSome content here.')
    const input = JSON.stringify({ file_path: filePath })

    execSync(`echo '${input}' | CLAUDE_SESSION_ID=test1234 bash "${SCRIPT}"`, {
      encoding: 'utf-8'
    })

    const result = readFileSync(filePath, 'utf-8')
    expect(result).toContain('---')
    expect(result).toContain('session_id: test1234')
    expect(result).toContain('created:')
    expect(result).toContain('# My Plan')
  })

  it('should update existing frontmatter', () => {
    const filePath = createTempFile(`---
created: 2026-01-01 10:00
modified: 2026-01-01 10:00
session_id: old-session
---

# Existing Plan`)

    const input = JSON.stringify({ file_path: filePath })

    execSync(`echo '${input}' | CLAUDE_SESSION_ID=new-sess bash "${SCRIPT}"`, {
      encoding: 'utf-8'
    })

    const result = readFileSync(filePath, 'utf-8')
    expect(result).toContain('session_id: new-sess')
    expect(result).not.toContain('session_id: old-session')
    expect(result).toContain('# Existing Plan')
  })

  it('should fail gracefully with missing file_path', () => {
    const raw = execSync(`echo '{}' | bash "${SCRIPT}"`, { encoding: 'utf-8' })
    const result = JSON.parse(raw)
    expect(result.success).toBe(false)
    expect(result.error).toContain('No file_path')
  })

  it('should fail gracefully with non-existent file', () => {
    const input = JSON.stringify({ file_path: '/nonexistent/file.md' })
    const raw = execSync(`echo '${input}' | bash "${SCRIPT}"`, { encoding: 'utf-8' })
    const result = JSON.parse(raw)
    expect(result.success).toBe(false)
    expect(result.error).toContain('File not found')
  })
})
