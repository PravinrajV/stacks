/**
 * Tests for script generation module.
 * Tests prompt building, response parsing, validation, and diff generation.
 * Uses a mock provider for testing.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  buildPrompt,
  parseResponse,
  validateGenerated,
  generateDiff,
  generateScript
} from './scriptGen'
import { ModelProvider, ScriptGenRequest, ScriptGenResponse } from './modelProvider'

/**
 * Mock ModelProvider for testing.
 */
class MockModelProvider extends ModelProvider {
  name = 'MockProvider'
  private shouldAvailable = true
  private responseCode = ''

  setAvailable(available: boolean): void {
    this.shouldAvailable = available
  }

  setResponseCode(code: string): void {
    this.responseCode = code
  }

  async generate(request: ScriptGenRequest): Promise<ScriptGenResponse> {
    return {
      code: this.responseCode || 'on mouseUp\n  answer "Hello"\nend mouseUp',
      explanation: 'Mock explanation'
    }
  }

  async isAvailable(): Promise<boolean> {
    return this.shouldAvailable
  }
}

describe('Task 4.4: Prompt Building', () => {
  it('should build a basic prompt with only description', () => {
    const prompt = buildPrompt('Show an alert when clicked', {})
    expect(prompt).toContain('Show an alert when clicked')
    expect(prompt).toContain('Generate HyperTalk code')
  })

  it('should include card context in prompt', () => {
    const prompt = buildPrompt('Show card name', {
      cardName: 'Title Card'
    })
    expect(prompt).toContain('Title Card')
  })

  it('should include field names in prompt', () => {
    const prompt = buildPrompt('Update score', {
      fieldNames: ['score', 'message', 'timestamp']
    })
    expect(prompt).toContain('score')
    expect(prompt).toContain('message')
    expect(prompt).toContain('timestamp')
  })

  it('should include button labels in prompt', () => {
    const prompt = buildPrompt('Navigate on click', {
      buttonLabels: ['Next', 'Previous', 'Home']
    })
    expect(prompt).toContain('Next')
    expect(prompt).toContain('Previous')
    expect(prompt).toContain('Home')
  })

  it('should include all context when provided', () => {
    const prompt = buildPrompt('Complex request', {
      cardName: 'Results',
      fieldNames: ['name', 'score'],
      buttonLabels: ['Submit', 'Reset']
    })
    expect(prompt).toContain('Results')
    expect(prompt).toContain('name')
    expect(prompt).toContain('score')
    expect(prompt).toContain('Submit')
    expect(prompt).toContain('Reset')
  })
})

describe('Task 4.5: Response Parsing', () => {
  it('should extract code from markdown code block with hyperscript language', () => {
    const response = `Here is the code:
\`\`\`hyperscript
on mouseUp
  answer "Clicked"
end mouseUp
\`\`\``
    const code = parseResponse(response)
    expect(code).toContain('on mouseUp')
    expect(code).toContain('answer')
    expect(code).not.toContain('```')
  })

  it('should extract code from markdown code block with hypertalk language', () => {
    const response = `\`\`\`hypertalk
put 5 into x
get x
\`\`\``
    const code = parseResponse(response)
    expect(code).toContain('put 5 into x')
  })

  it('should extract code from plain markdown code block', () => {
    const response = `\`\`\`
on openCard
  put "loaded" into field "status"
end openCard
\`\`\``
    const code = parseResponse(response)
    expect(code).toContain('on openCard')
  })

  it('should handle code block with no language specified', () => {
    const response = '```\non mouseUp\nend mouseUp\n```'
    const code = parseResponse(response)
    expect(code).toContain('on mouseUp')
  })

  it('should return entire response if no code block found', () => {
    const response = `on mouseUp
  put "hello" into x
end mouseUp`
    const code = parseResponse(response)
    expect(code).toBe(response)
  })

  it('should handle indented code blocks', () => {
    const response = `Example:
    on mouseUp
    answer "test"
    end mouseUp`
    const code = parseResponse(response)
    expect(code).toMatch(/on mouseUp|answer/)
  })

  it('should trim whitespace', () => {
    const response = '  \n  on mouseUp\n  end mouseUp\n  '
    const code = parseResponse(response)
    expect(code).not.toMatch(/^\s/)
    expect(code).not.toMatch(/\s$/)
  })
})

describe('Task 4.6: Validation via Parser', () => {
  it('should validate correct HyperTalk code', () => {
    const code = `on mouseUp
  put 5 into x
end mouseUp`
    const result = validateGenerated(code)
    expect(result.valid).toBe(true)
  })

  it('should validate handler with function calls', () => {
    const code = `on openCard
  answer "Welcome"
end openCard`
    const result = validateGenerated(code)
    expect(result.valid).toBe(true)
  })

  it('should reject invalid syntax', () => {
    const code = `on mouseUp
  put 5 into
end mouseUp`
    const result = validateGenerated(code)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error.message).toBeDefined()
    }
  })

  it('should reject incomplete handler', () => {
    const code = `on mouseUp
  put 5 into x`
    const result = validateGenerated(code)
    expect(result.valid).toBe(false)
  })

  it('should reject handler with unmatched keywords', () => {
    const code = `on mouseUp
  if x > 5
    answer "big"
end mouseUp`
    const result = validateGenerated(code)
    expect(result.valid).toBe(false)
  })

  it('should accept simple expressions', () => {
    const code = `on mouseUp
  put 2 + 3 into result
end mouseUp`
    const result = validateGenerated(code)
    expect(result.valid).toBe(true)
  })

  it('should accept repeat loops', () => {
    const code = `on mouseUp
  repeat 10 times
    put "x" into field "log"
  end repeat
end mouseUp`
    const result = validateGenerated(code)
    expect(result.valid).toBe(true)
  })
})

describe('Task 4.7: Diff Generation', () => {
  it('should generate diff for new code', () => {
    const oldCode = ''
    const newCode = `on mouseUp
  answer "hello"
end mouseUp`
    const diff = generateDiff(oldCode, newCode)
    expect(diff.length).toBeGreaterThan(0)
    expect(diff.some(d => d.type === 'add')).toBe(true)
  })

  it('should show unchanged lines as context', () => {
    const oldCode = `on mouseUp
  answer "hello"
end mouseUp`
    const newCode = `on mouseUp
  answer "hello"
end mouseUp`
    const diff = generateDiff(oldCode, newCode)
    expect(diff.every(d => d.type === 'context')).toBe(true)
  })

  it('should mark added lines', () => {
    const oldCode = `on mouseUp
end mouseUp`
    const newCode = `on mouseUp
  answer "hello"
end mouseUp`
    const diff = generateDiff(oldCode, newCode)
    const addedLines = diff.filter(d => d.type === 'add')
    expect(addedLines.length).toBeGreaterThan(0)
    expect(addedLines.some(d => d.content.includes('answer'))).toBe(true)
  })

  it('should mark removed lines', () => {
    const oldCode = `on mouseUp
  put 5 into x
end mouseUp`
    const newCode = `on mouseUp
end mouseUp`
    const diff = generateDiff(oldCode, newCode)
    const removedLines = diff.filter(d => d.type === 'remove')
    expect(removedLines.some(d => d.content.includes('put 5'))).toBe(true)
  })

  it('should mark changed lines', () => {
    const oldCode = `on mouseUp
  answer "old"
end mouseUp`
    const newCode = `on mouseUp
  answer "new"
end mouseUp`
    const diff = generateDiff(oldCode, newCode)
    const hasRemove = diff.some(d => d.type === 'remove' && d.content.includes('old'))
    const hasAdd = diff.some(d => d.type === 'add' && d.content.includes('new'))
    expect(hasRemove && hasAdd).toBe(true)
  })

  it('should include line numbers', () => {
    const oldCode = ''
    const newCode = 'line 1\nline 2\nline 3'
    const diff = generateDiff(oldCode, newCode)
    expect(diff.every(d => d.lineNumber !== undefined)).toBe(true)
  })
})

describe('Integration: generateScript', () => {
  let mockProvider: MockModelProvider

  beforeEach(() => {
    mockProvider = new MockModelProvider()
  })

  it('should reject if provider unavailable', async () => {
    mockProvider.setAvailable(false)
    const result = await generateScript(mockProvider, 'test request', {})
    expect('error' in result).toBe(true)
    if ('error' in result) {
      expect(result.error).toContain('not available')
    }
  })

  it('should generate script with valid provider', async () => {
    mockProvider.setAvailable(true)
    mockProvider.setResponseCode(`on mouseUp
  answer "Generated"
end mouseUp`)
    const result = await generateScript(mockProvider, 'show alert', {})
    expect('code' in result).toBe(true)
    if ('code' in result) {
      expect(result.code).toContain('on mouseUp')
    }
  })

  it('should validate generated code', async () => {
    mockProvider.setAvailable(true)
    mockProvider.setResponseCode(`on mouseUp
  if x > 5
  answer "missing end if"
end mouseUp`)
    const result = await generateScript(mockProvider, 'test', {})
    expect('error' in result).toBe(true)
  })

  it('should generate diff in result', async () => {
    mockProvider.setAvailable(true)
    mockProvider.setResponseCode(`on mouseUp
  answer "New"
end mouseUp`)
    const result = await generateScript(mockProvider, 'test', {}, 'on mouseUp\nend mouseUp')
    expect('diff' in result).toBe(true)
    if ('diff' in result) {
      expect(result.diff.length).toBeGreaterThan(0)
    }
  })

  it('should include explanation if provided', async () => {
    mockProvider.setAvailable(true)
    mockProvider.setResponseCode(`on mouseUp
  answer "Hello"
end mouseUp`)
    const result = await generateScript(mockProvider, 'test', {})
    expect('explanation' in result).toBe(true)
    if ('explanation' in result) {
      expect(result.explanation).toBeDefined()
    }
  })

  it('should handle parse errors gracefully', async () => {
    mockProvider.setAvailable(true)
    mockProvider.setResponseCode(`on mouseUp
  put into x
end mouseUp`)
    const result = await generateScript(mockProvider, 'test', {})
    expect('error' in result).toBe(true)
  })

  it('should build context into prompt', async () => {
    mockProvider.setAvailable(true)
    const genSpy = vi.spyOn(mockProvider, 'generate')
    mockProvider.setResponseCode(`on mouseUp
  answer "test"
end mouseUp`)

    await generateScript(mockProvider, 'update score', {
      cardName: 'Game',
      fieldNames: ['score', 'level'],
      buttonLabels: ['Next', 'Quit']
    })

    expect(genSpy).toHaveBeenCalledWith(expect.objectContaining({
      context: expect.objectContaining({
        cardName: 'Game'
      })
    }))
  })
})
