import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..', '..')
const SKILL = readFileSync(join(ROOT, 'skills/ForgeTeamOrchestrator/SKILL.md'), 'utf-8')
const ROUND_FLOW = readFileSync(join(ROOT, 'skills/ForgeTeamOrchestrator/references/round-flow.md'), 'utf-8')

const VALID_TEAMMATES = [
  'planner',
  'explorer-1', 'explorer-2', 'explorer-3',
  'explorer-[N]',
  'scribe',
  'reviewer-claude', 'reviewer-gemini', 'reviewer-openai',
  '[TEAMMATE_NAME]',
]

// Extract all SendMessage recipient values from markdown
function extractRecipients(text: string): string[] {
  const recipients: string[] = []
  const patterns = [
    /recipient:\s*"([^"]+)"/g,
    /recipient:\s*"([^"]+)"/g,
  ]
  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(text)) !== null) {
      recipients.push(match[1])
    }
  }
  return recipients
}

// Extract SendMessage type values (exclude subagent_type, agent_type, etc.)
function extractMessageTypes(text: string): string[] {
  const types: string[] = []
  const pattern = /(?<![a-zA-Z_])type:\s*"([^"]+)"/g
  let match
  while ((match = pattern.exec(text)) !== null) {
    types.push(match[1])
  }
  return types
}

describe('SendMessage recipients in round-flow.md', () => {
  const recipients = extractRecipients(ROUND_FLOW)

  it('has SendMessage invocations', () => {
    expect(recipients.length).toBeGreaterThan(0)
  })

  it('all recipients are valid teammate names', () => {
    for (const r of recipients) {
      const isValid = VALID_TEAMMATES.some(
        valid => r === valid || r.match(new RegExp(`^${valid.replace(/\[.*?\]/g, '.*')}$`))
      )
      expect(isValid, `Invalid recipient: "${r}"`).toBe(true)
    }
  })

  it('includes planner', () => {
    expect(recipients).toContain('planner')
  })

  it('includes scribe', () => {
    expect(recipients).toContain('scribe')
  })

  it('includes reviewer-claude', () => {
    expect(recipients).toContain('reviewer-claude')
  })

  it('includes reviewer-gemini', () => {
    expect(recipients).toContain('reviewer-gemini')
  })

  it('includes reviewer-openai', () => {
    expect(recipients).toContain('reviewer-openai')
  })
})

describe('SendMessage recipients in SKILL.md', () => {
  const recipients = extractRecipients(SKILL)

  it('shutdown requests use valid recipient placeholder', () => {
    expect(recipients.some(r => r === '[TEAMMATE_NAME]' || VALID_TEAMMATES.includes(r))).toBe(true)
  })
})

describe('SendMessage types are valid', () => {
  const allContent = SKILL + '\n' + ROUND_FLOW
  const types = extractMessageTypes(allContent)

  const validTypes = ['message', 'broadcast', 'shutdown_request', 'shutdown_response', 'plan_approval_request', 'plan_approval_response']

  it('has message types', () => {
    expect(types.length).toBeGreaterThan(0)
  })

  it('all types are valid SendMessage types', () => {
    for (const t of types) {
      expect(validTypes, `Invalid type: "${t}"`).toContain(t)
    }
  })

  it('uses "message" type for teammate instructions', () => {
    expect(types).toContain('message')
  })

  it('uses "shutdown_request" for team teardown', () => {
    expect(types).toContain('shutdown_request')
  })
})

describe('SendMessage field completeness in round-flow.md', () => {
  // Count SendMessage invocations by type
  // plan_approval_response has different required fields (approve, request_id) — exclude from content/summary checks
  const sendMessageCount = (ROUND_FLOW.match(/^SendMessage\(/gm) || []).length
  const planApprovalCount = (ROUND_FLOW.match(/type:\s*"plan_approval_response"/gm) || []).length
  const messageCount = sendMessageCount - planApprovalCount

  it('has SendMessage examples', () => {
    expect(sendMessageCount).toBeGreaterThan(0)
  })

  it('every message-type SendMessage has a matching summary field', () => {
    const summaryCount = (ROUND_FLOW.match(/^\s*summary:\s*"/gm) || []).length
    expect(summaryCount).toBe(messageCount)
  })

  it('every SendMessage has a recipient field', () => {
    const recipientCount = (ROUND_FLOW.match(/^\s*recipient:\s*"/gm) || []).length
    expect(recipientCount).toBe(sendMessageCount)
  })

  it('every SendMessage has a type field', () => {
    // Only count standalone type: (not subagent_type:)
    const typeCount = (ROUND_FLOW.match(/^\s+type:\s*"/gm) || []).length
    expect(typeCount).toBe(sendMessageCount)
  })

  it('every message-type SendMessage has a content field', () => {
    const contentCount = (ROUND_FLOW.match(/^\s*content:\s*"/gm) || []).length
    expect(contentCount).toBe(messageCount)
  })
})

describe('workflow phase ordering in SKILL.md', () => {
  it('defines sequential phases: Plan → Write → Review → Consolidate', () => {
    expect(SKILL).toContain('Plan → Write → Review → Consolidate')
  })

  it('enforces phase completion before next begins', () => {
    expect(SKILL).toMatch(/each.*complet.*before.*next/i)
  })
})

describe('workflow phase ordering in round-flow.md', () => {
  const phase1Idx = ROUND_FLOW.indexOf('## Phase 1: Planning')
  const phase2Idx = ROUND_FLOW.indexOf('## Phase 2: Writing')
  const phase3Idx = ROUND_FLOW.indexOf('## Phase 3: Review')
  const phase4Idx = ROUND_FLOW.indexOf('## Phase 4: Consolidate')
  const phase5Idx = ROUND_FLOW.indexOf('## Phase 5: Loop or Complete')

  it('Phase 1 (Planning) comes first', () => {
    expect(phase1Idx).toBeGreaterThan(-1)
  })

  it('Phase 2 (Writing) follows Phase 1', () => {
    expect(phase2Idx).toBeGreaterThan(phase1Idx)
  })

  it('Phase 3 (Review) follows Phase 2', () => {
    expect(phase3Idx).toBeGreaterThan(phase2Idx)
  })

  it('Phase 4 (Consolidate) follows Phase 3', () => {
    expect(phase4Idx).toBeGreaterThan(phase3Idx)
  })

  it('Phase 5 (Loop/Complete) follows Phase 4', () => {
    expect(phase5Idx).toBeGreaterThan(phase4Idx)
  })
})

describe('SKILL.md key rules', () => {
  it('Lead does not write files', () => {
    expect(SKILL).toMatch(/Lead.*NOT.*write/i)
  })

  it('Lead determines the verdict', () => {
    expect(SKILL).toMatch(/Lead.*determines.*verdict/i)
  })

  it('Teammates stay alive across rounds', () => {
    expect(SKILL).toMatch(/stay alive|Do NOT shut down teammates between rounds/i)
  })

  it('requires at least one reviewer', () => {
    expect(SKILL).toMatch(/at least one reviewer/i)
  })

  it('scribe handles all file writes', () => {
    expect(SKILL).toMatch(/Scribe.*all.*writ/i)
  })
})

describe('mode detection', () => {
  const planKeywords = ['implement', 'build', 'change', 'refactor', 'develop', 'add', 'fix', 'migrate', 'upgrade']
  const docKeywords = ['write', 'document', 'specify']

  for (const kw of planKeywords) {
    it(`plan mode keyword "${kw}" is listed`, () => {
      expect(SKILL).toContain(kw)
    })
  }

  for (const kw of docKeywords) {
    it(`doc mode keyword "${kw}" is listed`, () => {
      expect(SKILL).toContain(kw)
    })
  }

  it('defaults to plan when ambiguous', () => {
    expect(SKILL).toMatch(/default.*plan.*ambiguous/i)
  })
})

describe('team lifecycle', () => {
  it('creates team with TeamCreate', () => {
    expect(SKILL).toContain('TeamCreate')
  })

  it('deletes team with TeamDelete', () => {
    expect(SKILL).toContain('TeamDelete')
  })

  it('sends shutdown_request before TeamDelete', () => {
    const shutdownIdx = SKILL.indexOf('shutdown_request')
    const deleteIdx = SKILL.indexOf('TeamDelete()')
    expect(shutdownIdx).toBeGreaterThan(-1)
    expect(deleteIdx).toBeGreaterThan(shutdownIdx)
  })
})
