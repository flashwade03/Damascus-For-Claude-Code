import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..', '..')

function parseFrontmatter(filePath: string): Record<string, string> {
  const content = readFileSync(join(ROOT, filePath), 'utf-8')
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return {}
  const result: Record<string, string> = {}
  for (const line of match[1].split('\n')) {
    const sep = line.indexOf(':')
    if (sep > 0) {
      result[line.slice(0, sep).trim()] = line.slice(sep + 1).trim()
    }
  }
  return result
}

describe('forge-team.md frontmatter', () => {
  const fm = parseFrontmatter('commands/forge-team.md')

  it('has name field', () => {
    expect(fm.name).toBe('forge-team')
  })

  it('has non-empty description', () => {
    expect(fm.description).toBeTruthy()
    expect(fm.description.length).toBeGreaterThan(10)
  })

  it('has argument-hint with expected flags', () => {
    expect(fm['argument-hint']).toBeTruthy()
    expect(fm['argument-hint']).toContain('-n')
    expect(fm['argument-hint']).toContain('-o')
  })
})

describe('ForgeTeamOrchestrator SKILL.md frontmatter', () => {
  const fm = parseFrontmatter('skills/ForgeTeamOrchestrator/SKILL.md')

  it('has name field', () => {
    expect(fm.name).toBe('Forge Team Orchestrator')
  })

  it('has non-empty description', () => {
    expect(fm.description).toBeTruthy()
    expect(fm.description.length).toBeGreaterThan(10)
  })

  it('description mentions forge-team command', () => {
    expect(fm.description.toLowerCase()).toContain('forge-team')
  })
})

describe('v3 frontmatter consistency', () => {
  const v3 = parseFrontmatter('commands/forge-plan.md')
  const v4 = parseFrontmatter('commands/forge-team.md')

  it('v4 command has same argument structure as v3', () => {
    // Both should accept -n and -o flags
    expect(v3['argument-hint']).toContain('-n')
    expect(v3['argument-hint']).toContain('-o')
    expect(v4['argument-hint']).toContain('-n')
    expect(v4['argument-hint']).toContain('-o')
  })
})
