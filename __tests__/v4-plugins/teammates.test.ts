import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..', '..')
const PROMPTS_FILE = join(ROOT, 'skills/ForgeTeamOrchestrator/references/teammate-prompts.md')
const content = readFileSync(PROMPTS_FILE, 'utf-8')

// Known role section names (outer ## headers in teammate-prompts.md)
const ROLE_NAMES = [
  'Explorer',
  'Planner',
  'Scribe',
  'Reviewer — Claude',
  'Reviewer — Gemini',
  'Reviewer — OpenAI',
]

// Extract role sections by finding content between known ## headers
// This avoids splitting on ## headers inside code fences
function extractRoleSections(text: string): Map<string, string> {
  const sections = new Map<string, string>()
  for (let i = 0; i < ROLE_NAMES.length; i++) {
    const header = `## ${ROLE_NAMES[i]}`
    const start = text.indexOf(header)
    if (start === -1) continue
    const contentStart = start + header.length
    // Find next known role header or end of file
    let end = text.length
    for (let j = i + 1; j < ROLE_NAMES.length; j++) {
      const nextIdx = text.indexOf(`## ${ROLE_NAMES[j]}`, contentStart)
      if (nextIdx !== -1) {
        end = nextIdx
        break
      }
    }
    sections.set(ROLE_NAMES[i], text.slice(contentStart, end))
  }
  return sections
}

const roles = extractRoleSections(content)

describe('teammate roles defined', () => {
  for (const role of ROLE_NAMES) {
    it(`defines ${role}`, () => {
      expect(roles.has(role)).toBe(true)
    })
  }
})

describe('teammate prompt required sections', () => {
  // "How You Work" has valid variants: "How You Review", "Document Writing"
  const workSectionVariants = ['How You Work', 'How You Review', 'Document Writing']

  for (const roleName of ROLE_NAMES) {
    const roleContent = roles.get(roleName)
    if (!roleContent) continue

    it(`${roleName} has "Your Role" section`, () => {
      expect(roleContent).toContain('Your Role')
    })

    it(`${roleName} has a work/process section`, () => {
      const hasWorkSection = workSectionVariants.some(v => roleContent.includes(v))
      expect(hasWorkSection, `Missing work section in ${roleName}`).toBe(true)
    })

    it(`${roleName} has "Communication Protocol" section`, () => {
      expect(roleContent).toContain('Communication Protocol')
    })
  }
})

describe('agent type assignments', () => {
  it('explorer uses Explore type', () => {
    const explorer = roles.get('Explorer')!
    expect(explorer).toContain('Explore')
  })

  it('planner uses Explore type', () => {
    const planner = roles.get('Planner')!
    expect(planner).toContain('Explore')
  })

  it('scribe uses general-purpose type', () => {
    const scribe = roles.get('Scribe')!
    expect(scribe).toContain('general-purpose')
  })

  it('reviewer-claude uses Explore type', () => {
    const claude = roles.get('Reviewer — Claude')!
    expect(claude).toContain('Explore')
  })

  it('reviewer-gemini uses Explore type', () => {
    const gemini = roles.get('Reviewer — Gemini')!
    expect(gemini).toContain('Explore')
  })

  it('reviewer-openai uses Explore type', () => {
    const openai = roles.get('Reviewer — OpenAI')!
    expect(openai).toContain('Explore')
  })
})

describe('write permission constraints', () => {
  it('scribe mentions Write tool', () => {
    const scribe = roles.get('Scribe')!
    expect(scribe).toContain('Write')
  })

  it('scribe is designated as ONLY writer', () => {
    const scribe = roles.get('Scribe')!
    expect(scribe).toMatch(/ONLY.*writ/i)
  })

  it('explorers cannot write', () => {
    const explorer = roles.get('Explorer')!
    expect(explorer).toMatch(/NEVER.*Write/i)
  })

  it('planner cannot write', () => {
    const planner = roles.get('Planner')!
    expect(planner).toMatch(/NEVER.*Write/i)
  })

  it('reviewer-claude cannot write', () => {
    const claude = roles.get('Reviewer — Claude')!
    expect(claude).toMatch(/NEVER.*write/i)
  })

  it('reviewer-gemini cannot write', () => {
    const gemini = roles.get('Reviewer — Gemini')!
    expect(gemini).toMatch(/NEVER.*write/i)
  })

  it('reviewer-openai cannot write', () => {
    const openai = roles.get('Reviewer — OpenAI')!
    expect(openai).toMatch(/NEVER.*write/i)
  })
})

describe('explorer-planner architecture', () => {
  it('planner is single instance', () => {
    const planner = roles.get('Planner')!
    expect(planner).toContain('single')
  })

  it('planner manages explorers', () => {
    const planner = roles.get('Planner')!
    expect(planner).toContain('explorer')
  })

  it('planner submits plan via ExitPlanMode', () => {
    const planner = roles.get('Planner')!
    expect(planner).toContain('ExitPlanMode')
  })

  it('explorers report findings to planner', () => {
    const explorer = roles.get('Explorer')!
    expect(explorer).toContain("'planner'")
  })

  it('explorers discuss with each other', () => {
    const explorer = roles.get('Explorer')!
    expect(explorer).toContain('other explorers')
  })

  it('no prompt contains COORDINATOR', () => {
    for (const [, roleContent] of roles) {
      expect(roleContent).not.toContain('COORDINATOR')
    }
  })
})

describe('reviewer independence', () => {
  it('reviewers are independent — no coordinator', () => {
    const claude = roles.get('Reviewer — Claude')!
    expect(claude).not.toContain('COORDINATOR')
    expect(claude).toContain('review independently')
  })

  it('each reviewer sends review to lead', () => {
    for (const name of ['Reviewer — Claude', 'Reviewer — Gemini', 'Reviewer — OpenAI']) {
      const reviewer = roles.get(name)!
      expect(reviewer).toContain("'team-lead'")
    }
  })

  it('reviewers do not communicate with each other', () => {
    for (const name of ['Reviewer — Claude', 'Reviewer — Gemini', 'Reviewer — OpenAI']) {
      const reviewer = roles.get(name)!
      expect(reviewer).toMatch(/Do NOT communicate with other reviewers/i)
    }
  })

  it('lead determines verdict (stated in reviewer prompts)', () => {
    for (const name of ['Reviewer — Claude', 'Reviewer — Gemini', 'Reviewer — OpenAI']) {
      const reviewer = roles.get(name)!
      expect(reviewer).toContain('Lead collects all reviews and determines the verdict')
    }
  })
})

describe('scribe polishes plan content', () => {
  it('scribe polishes plan into publication-quality document', () => {
    const scribe = roles.get('Scribe')!
    expect(scribe).toMatch(/[Pp]olish/)
  })
})

describe('shutdown protocol', () => {
  for (const [roleName, roleContent] of roles) {
    it(`${roleName} handles shutdown_request`, () => {
      expect(roleContent).toContain('shutdown_request')
      expect(roleContent).toContain('shutdown_response')
    })
  }
})

describe('reviewer script references', () => {
  it('reviewer-gemini mentions gemini-review.ts', () => {
    const gemini = roles.get('Reviewer — Gemini')!
    expect(gemini).toContain('gemini-review.ts')
  })

  it('reviewer-openai mentions openai-review.ts', () => {
    const openai = roles.get('Reviewer — OpenAI')!
    expect(openai).toContain('openai-review.ts')
  })
})
