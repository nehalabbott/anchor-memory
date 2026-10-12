import { describe, expect, it } from 'vitest'
import { getModelCandidates, resolveGroqModel } from './index.js'

describe('Groq model configuration', () => {
  it('uses a supported fallback model when GROQ_MODEL is unset', () => {
    expect(resolveGroqModel(undefined)).toBe('qwen/qwen3.8-27b')
    expect(resolveGroqModel('   ')).toBe('qwen/qwen3.8-27b')
  })

  it('keeps an explicit model override and retries with the supported fallback when it is stale', () => {
    expect(resolveGroqModel('openai/gpt-oss-20b')).toBe('openai/gpt-oss-20b')
    expect(getModelCandidates('llama-3.1-8b-instant')).toEqual([
      'llama-3.1-8b-instant',
      'qwen/qwen3.8-27b',
    ])
  })
})
