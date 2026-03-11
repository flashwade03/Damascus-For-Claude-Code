import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..', '..')
const V4_SKILL = join(ROOT, 'skills/ForgeTeamOrchestrator/SKILL.md')
const V4_ROUND_FLOW = join(ROOT, 'skills/ForgeTeamOrchestrator/references/round-flow.md')
const V4_TEAMMATE_PROMPTS = join(ROOT, 'skills/ForgeTeamOrchestrator/references/teammate-prompts.md')

describe('v4 file structure', () => {
  const requiredFiles = [
    'commands/forge-team.md',
    'skills/ForgeTeamOrchestrator/SKILL.md',
    'skills/ForgeTeamOrchestrator/references/round-flow.md',
    'skills/ForgeTeamOrchestrator/references/teammate-prompts.md',
  ]

  for (const file of requiredFiles) {
    it(`${file} exists`, () => {
      expect(existsSync(join(ROOT, file))).toBe(true)
    })
  }
})

describe('SKILL.md internal references', () => {
  const content = readFileSync(V4_SKILL, 'utf-8')

  it('references round-flow.md', () => {
    expect(content).toContain('references/round-flow.md')
  })

  it('references teammate-prompts.md', () => {
    expect(content).toContain('references/teammate-prompts.md')
  })

  it('referenced files exist', () => {
    expect(existsSync(V4_ROUND_FLOW)).toBe(true)
    expect(existsSync(V4_TEAMMATE_PROMPTS)).toBe(true)
  })
})

describe('round-flow.md references', () => {
  const content = readFileSync(V4_ROUND_FLOW, 'utf-8')

  it('references review-template.md', () => {
    expect(content).toContain('review-template.md')
  })

  it('v3 review template exists', () => {
    expect(existsSync(join(ROOT, 'skills/ForgeOrchestrator/references/review-template.md'))).toBe(true)
  })

  it('references review scripts', () => {
    expect(content).toContain('gemini-review.ts')
    expect(content).toContain('openai-review.ts')
  })

  it('review scripts exist', () => {
    expect(existsSync(join(ROOT, 'scripts/gemini-review.ts'))).toBe(true)
    expect(existsSync(join(ROOT, 'scripts/openai-review.ts'))).toBe(true)
  })

  it('references metadata script', () => {
    expect(content).toContain('plan-metadata.sh')
  })

  it('metadata script exists', () => {
    expect(existsSync(join(ROOT, 'scripts/plan-metadata.sh'))).toBe(true)
  })
})

describe('forge-team.md references skill', () => {
  const content = readFileSync(join(ROOT, 'commands/forge-team.md'), 'utf-8')

  it('points to forge-team-orchestrator skill', () => {
    expect(content).toContain('forge-team-orchestrator')
  })
})

describe('design document exists', () => {
  it('v4 design doc exists', () => {
    expect(existsSync(join(ROOT, 'docs/v4-agent-teams.md'))).toBe(true)
  })
})
