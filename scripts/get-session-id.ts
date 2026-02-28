#!/usr/bin/env npx tsx
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join, basename } from 'node:path'
import { stdout } from 'node:process'
import { projectPathToClaudeFolder, getShortId } from './utils.js'

interface Output {
  success: boolean
  sessionId?: string
  shortId?: string
  error?: string
}

function output(result: Output): void {
  stdout.write(JSON.stringify(result))
}

async function main(): Promise<void> {
  try {
    // 1. CLAUDE_SESSION_ID env var (set by hooks)
    const envSessionId = process.env.CLAUDE_SESSION_ID
    if (envSessionId) {
      output({
        success: true,
        sessionId: envSessionId,
        shortId: getShortId(envSessionId)
      })
      return
    }

    // 2. Find latest .jsonl session file
    const projectPath = process.env.CLAUDE_PROJECT_DIR || process.cwd()
    const claudeProjectFolder = projectPathToClaudeFolder(projectPath)
    const homeDir = process.env.HOME || process.env.USERPROFILE || ''
    const sessionsDir = join(homeDir, '.claude', 'projects', claudeProjectFolder)

    if (!existsSync(sessionsDir)) {
      // Fallback: generate a deterministic ID from project path
      const fallbackId = 'damascus-forge'
      output({
        success: true,
        sessionId: fallbackId,
        shortId: fallbackId
      })
      return
    }

    const jsonlFiles = readdirSync(sessionsDir)
      .filter(f => f.endsWith('.jsonl'))
      .map(f => ({
        name: f,
        mtime: statSync(join(sessionsDir, f)).mtimeMs
      }))
      .sort((a, b) => b.mtime - a.mtime)

    if (jsonlFiles.length === 0) {
      // Fallback: no session files yet
      const fallbackId = 'damascus-forge'
      output({
        success: true,
        sessionId: fallbackId,
        shortId: fallbackId
      })
      return
    }

    const sessionId = basename(jsonlFiles[0].name, '.jsonl')

    output({
      success: true,
      sessionId,
      shortId: getShortId(sessionId)
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
