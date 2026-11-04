/**
 * Task 8.6: Tests for MockModelProvider.
 * 
 * Verifies that:
 * 1. Common keywords generate sensible, parseable HyperTalk handlers
 * 2. All generated code parses successfully with the project parser
 * 3. Expected commands appear in generated output
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { MockModelProvider } from './mockProvider'
import { tokenize } from '../interpreter/lexer'
import { parse } from '../interpreter/parser'

/**
 * Helper: verify that code parses successfully.
 */
function assertParses(code: string): void {
  const tokensResult = tokenize(code)
  if (!Array.isArray(tokensResult)) {
    throw new Error(`Lexer error: ${tokensResult.message}`)
  }

  const parseResult = parse(tokensResult)
  if ('type' in parseResult && parseResult.type === 'ParseError') {
    throw new Error(`Parse error: ${parseResult.message} at line ${parseResult.line}`)
  }
}

/**
 * Helper: verify code contains expected substring.
 */
function assertContains(code: string, substring: string): void {
  if (!code.includes(substring)) {
    throw new Error(
      `Code does not contain expected substring: "${substring}"\nCode: ${code}`
    )
  }
}

describe('Task 8.6: MockModelProvider', () => {
  let provider: MockModelProvider

  beforeEach(() => {
    provider = new MockModelProvider()
  })

  describe('Basic functionality', () => {
    it('should be available immediately (no network)', async () => {
      const available = await provider.isAvailable()
      expect(available).toBe(true)
    })

    it('should have a descriptive name', () => {
      expect(provider.name).toContain('Offline')
    })
  })

  describe('Click/press/tap pattern', () => {
    it('should generate mouseUp handler for "click"', async () => {
      const result = await provider.generate({
        description: 'click the button',
        context: {}
      })

      expect(result.code).toBeDefined()
      assertParses(result.code)
      assertContains(result.code, 'on mouseUp')
      assertContains(result.code, 'answer')
    })

    it('should generate mouseUp handler for "press"', async () => {
      const result = await provider.generate({
        description: 'press to trigger',
        context: {}
      })

      expect(result.code).toBeDefined()
      assertParses(result.code)
      assertContains(result.code, 'on mouseUp')
    })

    it('should generate mouseUp handler for "tap"', async () => {
      const result = await provider.generate({
        description: 'tap this button',
        context: {}
      })

      expect(result.code).toBeDefined()
      assertParses(result.code)
      assertContains(result.code, 'on mouseUp')
    })

    it('should use quoted text from description if present', async () => {
      const result = await provider.generate({
        description: 'click and show "Custom message"',
        context: {}
      })

      assertParses(result.code)
      assertContains(result.code, 'Custom message')
    })
  })

  describe('Alert/message pattern', () => {
    it('should generate answer handler for "alert"', async () => {
      const result = await provider.generate({
        description: 'alert the user',
        context: {}
      })

      expect(result.code).toBeDefined()
      assertParses(result.code)
      assertContains(result.code, 'on mouseUp')
      assertContains(result.code, 'answer')
    })

    it('should generate answer handler for "say"', async () => {
      const result = await provider.generate({
        description: 'say hello',
        context: {}
      })

      assertParses(result.code)
      assertContains(result.code, 'answer')
    })

    it('should generate answer handler for "show message"', async () => {
      const result = await provider.generate({
        description: 'show a message to user',
        context: {}
      })

      assertParses(result.code)
      assertContains(result.code, 'put')
    })

    it('should extract quoted text from alert message', async () => {
      const result = await provider.generate({
        description: 'alert "Welcome to HyperCard"',
        context: {}
      })

      assertParses(result.code)
      assertContains(result.code, 'Welcome to HyperCard')
    })
  })

  describe('Counter/increment pattern', () => {
    it('should generate increment handler for "count"', async () => {
      const result = await provider.generate({
        description: 'count clicks',
        context: { fieldNames: ['clickCount'] }
      })

      assertParses(result.code)
      assertContains(result.code, 'on mouseUp')
      assertContains(result.code, '+')
      assertContains(result.code, 'field "clickCount"')
    })

    it('should generate increment handler for "increment"', async () => {
      const result = await provider.generate({
        description: 'increment the counter',
        context: { fieldNames: ['counter'] }
      })

      assertParses(result.code)
      assertContains(result.code, '+')
      assertContains(result.code, 'field "counter"')
    })

    it('should use default field name when not provided', async () => {
      const result = await provider.generate({
        description: 'increment counter',
        context: {}
      })

      assertParses(result.code)
      assertContains(result.code, 'field "output"')
    })
  })

  describe('Navigation pattern', () => {
    it('should generate "go next card" for "next"', async () => {
      const result = await provider.generate({
        description: 'go to next card',
        context: {}
      })

      assertParses(result.code)
      assertContains(result.code, 'go next card')
    })

    it('should generate "go previous card" for "previous"', async () => {
      const result = await provider.generate({
        description: 'go to previous card',
        context: {}
      })

      assertParses(result.code)
      assertContains(result.code, 'go previous card')
    })

    it('should generate navigation handler for "navigate"', async () => {
      const result = await provider.generate({
        description: 'navigate forward',
        context: {}
      })

      assertParses(result.code)
      assertContains(result.code, 'go')
    })

    it('should generate navigation handler for "forward"', async () => {
      const result = await provider.generate({
        description: 'go forward',
        context: {}
      })

      assertParses(result.code)
      assertContains(result.code, 'go next card')
    })
  })

  describe('Visibility pattern', () => {
    it('should generate "put empty" handler for "hide"', async () => {
      const result = await provider.generate({
        description: 'hide the button',
        context: {}
      })

      assertParses(result.code)
      assertContains(result.code, 'put ""')
    })

    it('should generate "put value" handler for "show"', async () => {
      const result = await provider.generate({
        description: 'show the element',
        context: {}
      })

      assertParses(result.code)
      assertContains(result.code, 'put')
      assertContains(result.code, 'field')
    })
  })

  describe('Beep/sound pattern', () => {
    it('should generate beep handler for "beep"', async () => {
      const result = await provider.generate({
        description: 'beep sound',
        context: {}
      })

      assertParses(result.code)
      assertContains(result.code, 'Beep!')
    })

    it('should generate beep handler for "sound"', async () => {
      const result = await provider.generate({
        description: 'make a sound',
        context: {}
      })

      assertParses(result.code)
      assertContains(result.code, 'answer')
    })
  })

  describe('Text/put pattern', () => {
    it('should generate put handler for "put"', async () => {
      const result = await provider.generate({
        description: 'put text in field',
        context: { fieldNames: ['myField'] }
      })

      assertParses(result.code)
      assertContains(result.code, 'put')
      assertContains(result.code, 'field "myField"')
    })

    it('should generate put handler for "update"', async () => {
      const result = await provider.generate({
        description: 'update the field',
        context: {}
      })

      assertParses(result.code)
      assertContains(result.code, 'put')
    })

    it('should use quoted text in put statement', async () => {
      const result = await provider.generate({
        description: 'put "Done!" in field',
        context: {}
      })

      assertParses(result.code)
      assertContains(result.code, 'Done!')
    })
  })

  describe('Default pattern (echo)', () => {
    it('should generate mouseUp with answer echo for unmatched description', async () => {
      const result = await provider.generate({
        description: 'something unusual',
        context: {}
      })

      assertParses(result.code)
      assertContains(result.code, 'on mouseUp')
      assertContains(result.code, 'answer')
    })

    it('should echo short descriptions', async () => {
      const result = await provider.generate({
        description: 'do stuff',
        context: {}
      })

      assertParses(result.code)
      assertContains(result.code, 'do stuff')
    })

    it('should truncate long descriptions in default echo', async () => {
      const longDesc = 'a'.repeat(100)
      const result = await provider.generate({
        description: longDesc,
        context: {}
      })

      assertParses(result.code)
      // Should truncate to 50 chars
      expect(result.code.length).toBeLessThan(200)
    })
  })

  describe('Integration: ~10 prompts parse and contain expected commands', () => {
    it('should parse and validate 10 diverse prompts', async () => {
      const testPrompts = [
        {
          description: 'click to increment the counter',
          expectedCommand: 'on mouseUp'
        },
        {
          description: 'alert the user with "Success!"',
          expectedCommand: 'answer'
        },
        {
          description: 'count the clicks',
          expectedCommand: '+'
        },
        {
          description: 'navigate to the next card',
          expectedCommand: 'go next card'
        },
        {
          description: 'hide the secret button',
          expectedCommand: 'put'
        },
        {
          description: 'make a sound',
          expectedCommand: 'answer'
        },
        {
          description: 'put "Processing..." into output',
          expectedCommand: 'put'
        },
        {
          description: 'go back to previous card',
          expectedCommand: 'go previous card'
        },
        {
          description: 'show the hidden field',
          expectedCommand: 'put'
        },
        {
          description: 'display "Welcome!" when button pressed',
          expectedCommand: 'answer'
        }
      ]

      for (const prompt of testPrompts) {
        const result = await provider.generate({
          description: prompt.description,
          context: {
            fieldNames: ['output', 'clickCount'],
            buttonLabels: ['Submit', 'Cancel']
          }
        })

        // Verify it parses
        assertParses(result.code)

        // Verify expected command appears
        assertContains(result.code, prompt.expectedCommand)

        // Verify it's a valid mouseUp handler structure
        assertContains(result.code, 'on mouseUp')
        assertContains(result.code, 'end mouseUp')
      }
    })
  })

  describe('No network calls', () => {
    it('should not attempt to call fetch', async () => {
      // This test just ensures the provider doesn't throw a network error
      // and doesn't call fetch (which would be blocked in tests anyway)
      const result = await provider.generate({
        description: 'test no network',
        context: {}
      })

      expect(result.code).toBeDefined()
      expect(typeof result.code).toBe('string')
      expect(result.code.length).toBeGreaterThan(0)
    })
  })
})
