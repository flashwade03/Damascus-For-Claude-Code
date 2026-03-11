import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { callGeminiAPI, callOpenAIAPI, isDryRun, getMockResponse } from '../scripts/api-clients.js'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const FIXTURES_DIR = join(import.meta.dirname, 'fixtures')

describe('isDryRun', () => {
  const original = process.env.DAMASCUS_DRY_RUN

  afterEach(() => {
    if (original !== undefined) process.env.DAMASCUS_DRY_RUN = original
    else delete process.env.DAMASCUS_DRY_RUN
  })

  it('should return true when DAMASCUS_DRY_RUN=true', () => {
    process.env.DAMASCUS_DRY_RUN = 'true'
    expect(isDryRun()).toBe(true)
  })

  it('should return false when not set', () => {
    delete process.env.DAMASCUS_DRY_RUN
    expect(isDryRun()).toBe(false)
  })

  it('should return false for other values', () => {
    process.env.DAMASCUS_DRY_RUN = '1'
    expect(isDryRun()).toBe(false)
  })
})

describe('getMockResponse', () => {
  const original = process.env.DAMASCUS_MOCK_RESPONSE_FILE

  afterEach(() => {
    if (original !== undefined) process.env.DAMASCUS_MOCK_RESPONSE_FILE = original
    else delete process.env.DAMASCUS_MOCK_RESPONSE_FILE
  })

  it('should return null when not set', () => {
    delete process.env.DAMASCUS_MOCK_RESPONSE_FILE
    expect(getMockResponse()).toBeNull()
  })

  it('should return file content when set to valid path', () => {
    process.env.DAMASCUS_MOCK_RESPONSE_FILE = join(FIXTURES_DIR, 'gemini-mock-response.txt')
    const result = getMockResponse()
    expect(result).toContain('Auth Module Refactoring Plan')
  })

  it('should return null for non-existent file', () => {
    process.env.DAMASCUS_MOCK_RESPONSE_FILE = '/nonexistent/file.txt'
    expect(getMockResponse()).toBeNull()
  })
})

describe('callGeminiAPI - dry run', () => {
  const originalDry = process.env.DAMASCUS_DRY_RUN
  const originalMock = process.env.DAMASCUS_MOCK_RESPONSE_FILE

  afterEach(() => {
    if (originalDry !== undefined) process.env.DAMASCUS_DRY_RUN = originalDry
    else delete process.env.DAMASCUS_DRY_RUN
    if (originalMock !== undefined) process.env.DAMASCUS_MOCK_RESPONSE_FILE = originalMock
    else delete process.env.DAMASCUS_MOCK_RESPONSE_FILE
  })

  it('should return dry-run message without calling API', async () => {
    process.env.DAMASCUS_DRY_RUN = 'true'
    const result = await callGeminiAPI('test prompt', 'fake-key', 'gemini-3-flash')
    expect(result).toContain('[DRY RUN]')
    expect(result).toContain('Gemini')
    expect(result).toContain('gemini-3-flash')
  })

  it('should return mock response when mock file is set', async () => {
    delete process.env.DAMASCUS_DRY_RUN
    process.env.DAMASCUS_MOCK_RESPONSE_FILE = join(FIXTURES_DIR, 'gemini-mock-response.txt')
    const result = await callGeminiAPI('test prompt', 'fake-key', 'gemini-3-flash')
    expect(result).toContain('Auth Module Refactoring Plan')
  })
})

describe('callOpenAIAPI - dry run', () => {
  const originalDry = process.env.DAMASCUS_DRY_RUN
  const originalMock = process.env.DAMASCUS_MOCK_RESPONSE_FILE

  afterEach(() => {
    if (originalDry !== undefined) process.env.DAMASCUS_DRY_RUN = originalDry
    else delete process.env.DAMASCUS_DRY_RUN
    if (originalMock !== undefined) process.env.DAMASCUS_MOCK_RESPONSE_FILE = originalMock
    else delete process.env.DAMASCUS_MOCK_RESPONSE_FILE
  })

  it('should return dry-run message without calling API', async () => {
    process.env.DAMASCUS_DRY_RUN = 'true'
    const result = await callOpenAIAPI('test prompt', 'fake-key', 'gpt-4o-mini')
    expect(result).toContain('[DRY RUN]')
    expect(result).toContain('OpenAI')
    expect(result).toContain('gpt-4o-mini')
  })

  it('should return mock response when mock file is set', async () => {
    delete process.env.DAMASCUS_DRY_RUN
    process.env.DAMASCUS_MOCK_RESPONSE_FILE = join(FIXTURES_DIR, 'openai-mock-response.txt')
    const result = await callOpenAIAPI('test prompt', 'fake-key', 'gpt-4o-mini')
    expect(result).toContain('CORS configuration')
  })
})
