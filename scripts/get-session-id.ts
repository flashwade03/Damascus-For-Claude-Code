#!/usr/bin/env npx tsx
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { stdout } from 'node:process'
import { projectPathToClaudeFolder, getShortId } from './utils.js'

interface SessionEntry {
  sessionId: string
  fullPath: string
  fileMtime: number
  firstPrompt: string
  summary: string
  messageCount: number
  created: string
  modified: string
  gitBranch: string
  projectPath: string
  isSidechain: boolean
}

interface SessionsIndex {
  version: number
  entries: SessionEntry[]
  originalPath: string
}

interface Output {
  success: boolean
  sessionId?: string
  shortId?: string
  summary?: string
  error?: string
}

function output(result: Output): void {
  stdout.write(JSON.stringify(result))
}

async function main(): Promise<void> {
  try {
    const projectPath = process.cwd()
    const claudeProjectFolder = projectPathToClaudeFolder(projectPath)

    const homeDir = process.env.HOME || process.env.USERPROFILE || ''
    const sessionsIndexPath = join(
      homeDir,
      '.claude',
      'projects',
      claudeProjectFolder,
      'sessions-index.json'
    )

    if (!existsSync(sessionsIndexPath)) {
      output({
        success: false,
        error: `Sessions index not found: ${sessionsIndexPath}`
      })
      return
    }

    const content = readFileSync(sessionsIndexPath, 'utf-8')
    const sessionsIndex: SessionsIndex = JSON.parse(content)

    if (!sessionsIndex.entries || sessionsIndex.entries.length === 0) {
      output({
        success: false,
        error: 'No sessions found in index'
      })
      return
    }

    const latestSession = sessionsIndex.entries.reduce((latest, current) => {
      return current.fileMtime > latest.fileMtime ? current : latest
    })

    output({
      success: true,
      sessionId: latestSession.sessionId,
      shortId: getShortId(latestSession.sessionId),
      summary: latestSession.summary || latestSession.firstPrompt?.substring(0, 50)
    })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    output({
      success: false,
      error: message
    })
  }
}

main()
