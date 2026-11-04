import { describe, it, expect } from 'vitest'
import { Lexer, Token, tokenize, LexError } from './lexer'

describe('Lexer (Tasks 2.1-2.6)', () => {
  describe('Task 2.1: Token interface', () => {
    it('should create tokens with type, value, line, column', () => {
      const lexer = new Lexer('put 5 into x')
      const result = lexer.tokenize()
      expect(Array.isArray(result)).toBe(true)
      if (Array.isArray(result)) {
        const token = result[0] as Token
        expect(token).toHaveProperty('type')
        expect(token).toHaveProperty('value')
        expect(token).toHaveProperty('line')
        expect(token).toHaveProperty('column')
      }
    })
  })

  describe('Task 2.2: Keyword recognition', () => {
    it('should tokenize keywords (case-insensitive)', () => {
      const keywords = ['if', 'then', 'else', 'end', 'repeat', 'while', 'until', 'put', 'get', 'go', 'answer', 'on']
      for (const kw of keywords) {
        const result = tokenize(kw)
        expect(Array.isArray(result)).toBe(true)
        if (Array.isArray(result)) {
          expect(result[0].type).toBe('keyword')
          expect(result[0].value).toBe(kw.toUpperCase())
        }
      }
    })

    it('should handle keywords in mixed case', () => {
      const result = tokenize('Put 5 Into x')
      expect(Array.isArray(result)).toBe(true)
      if (Array.isArray(result)) {
        expect(result[0].value).toBe('PUT')
        expect(result[2].value).toBe('INTO')
      }
    })

    it('should not tokenize keywords as keywords when part of identifier', () => {
      // This should be handled by not treating them as keywords in identifiers
      // Actually, 'ifx' should be an identifier, not keyword 'if' + identifier 'x'
      const result = tokenize('ifx')
      expect(Array.isArray(result)).toBe(true)
      if (Array.isArray(result)) {
        expect(result[0].type).toBe('identifier')
      }
    })
  })

  describe('Task 2.3: Identifiers, numbers, strings with escapes', () => {
    it('should tokenize identifiers', () => {
      const result = tokenize('myVar _test abc123')
      expect(Array.isArray(result)).toBe(true)
      if (Array.isArray(result)) {
        expect(result[0].type).toBe('identifier')
        expect(result[0].value).toBe('myVar')
        expect(result[1].type).toBe('identifier')
        expect(result[2].type).toBe('identifier')
      }
    })

    it('should tokenize integers', () => {
      const result = tokenize('42 0 12345')
      expect(Array.isArray(result)).toBe(true)
      if (Array.isArray(result)) {
        expect(result[0].value).toBe('42')
        expect(result[1].value).toBe('0')
        expect(result[2].value).toBe('12345')
      }
    })

    it('should tokenize floats', () => {
      const result = tokenize('3.14 0.5 123.456')
      expect(Array.isArray(result)).toBe(true)
      if (Array.isArray(result)) {
        expect(result[0].value).toBe('3.14')
        expect(result[1].value).toBe('0.5')
        expect(result[2].value).toBe('123.456')
      }
    })

    it('should tokenize strings with basic content', () => {
      const result = tokenize('"hello"')
      expect(Array.isArray(result)).toBe(true)
      if (Array.isArray(result)) {
        expect(result[0].type).toBe('string')
        expect(result[0].value).toBe('hello')
      }
    })

    it('should handle escape sequences in strings', () => {
      // Test \" escape
      const result1 = tokenize('"say \\"hi\\""')
      expect(Array.isArray(result1)).toBe(true)
      if (Array.isArray(result1)) {
        expect(result1[0].value).toBe('say "hi"')
      }

      // Test \\ escape
      const result2 = tokenize('"path\\\\to\\\\file"')
      expect(Array.isArray(result2)).toBe(true)
      if (Array.isArray(result2)) {
        expect(result2[0].value).toBe('path\\to\\file')
      }

      // Test \n escape
      const result3 = tokenize('"line1\\nline2"')
      expect(Array.isArray(result3)).toBe(true)
      if (Array.isArray(result3)) {
        expect(result3[0].value).toBe('line1\nline2')
      }
    })

    it('should handle very long identifiers', () => {
      const longId = 'a'.repeat(1000)
      const result = tokenize(longId)
      expect(Array.isArray(result)).toBe(true)
      if (Array.isArray(result)) {
        expect(result[0].type).toBe('identifier')
        expect(result[0].value.length).toBe(1000)
      }
    })

    it('should handle empty strings', () => {
      const result = tokenize('""')
      expect(Array.isArray(result)).toBe(true)
      if (Array.isArray(result)) {
        expect(result[0].type).toBe('string')
        expect(result[0].value).toBe('')
      }
    })
  })

  describe('Task 2.4: Operators and punctuation', () => {
    it('should tokenize binary operators', () => {
      const ops = ['+', '-', '*', '/', '<', '>', '=']
      for (const op of ops) {
        const result = tokenize(op)
        expect(Array.isArray(result)).toBe(true)
        if (Array.isArray(result)) {
          expect(result[0].type).toBe('operator')
          expect(result[0].value).toBe(op)
        }
      }
    })

    it('should tokenize multi-character operators', () => {
      const multiOps = ['!=', '<=', '>=']
      for (const op of multiOps) {
        const result = tokenize(op)
        expect(Array.isArray(result)).toBe(true)
        if (Array.isArray(result)) {
          expect(result[0].type).toBe('operator')
          expect(result[0].value).toBe(op)
        }
      }
    })

    it('should tokenize punctuation', () => {
      const punct = ['(', ')', '{', '}', '[', ']', ':', ',']
      for (const p of punct) {
        const result = tokenize(p)
        expect(Array.isArray(result)).toBe(true)
        if (Array.isArray(result)) {
          expect(result[0].type).toBe('punctuation')
          expect(result[0].value).toBe(p)
        }
      }
    })

    it('should distinguish minus from other uses', () => {
      // "5 - 3" should have minus operator between numbers
      const result = tokenize('5 - 3')
      expect(Array.isArray(result)).toBe(true)
      if (Array.isArray(result)) {
        expect(result[1].type).toBe('operator')
        expect(result[1].value).toBe('-')
      }
    })

    it('should handle keyword operators like AND, OR', () => {
      const result = tokenize('x and y or z')
      expect(Array.isArray(result)).toBe(true)
      if (Array.isArray(result)) {
        expect(result[1].type).toBe('keyword')
        expect(result[1].value).toBe('AND')
        expect(result[3].type).toBe('keyword')
        expect(result[3].value).toBe('OR')
      }
    })
  })

  describe('Task 2.5: Line/column tracking', () => {
    it('should track line numbers', () => {
      const result = tokenize('put 5\ninto x')
      expect(Array.isArray(result)).toBe(true)
      if (Array.isArray(result)) {
        expect(result[0].line).toBe(1)
        expect(result[2].line).toBe(2) // "into" is on line 2
      }
    })

    it('should track column numbers', () => {
      const result = tokenize('put 5 into')
      expect(Array.isArray(result)).toBe(true)
      if (Array.isArray(result)) {
        expect(result[0].column).toBe(1) // "put"
        expect(result[1].column).toBe(5) // "5"
        expect(result[2].column).toBe(7) // "into"
      }
    })

    it('should reset column on new line', () => {
      const result = tokenize('abc\ndef')
      expect(Array.isArray(result)).toBe(true)
      if (Array.isArray(result)) {
        expect(result[0].line).toBe(1)
        expect(result[0].column).toBe(1)
        expect(result[1].line).toBe(2)
        expect(result[1].column).toBe(1) // Should reset to 1 on new line
      }
    })

    it('should report error location for unterminated string', () => {
      const result = tokenize('put "unterminated')
      expect(result).toHaveProperty('type', 'LexError')
      if ('line' in result) {
        expect(result.line).toBe(1)
        expect(result.column).toBeGreaterThan(0)
      }
    })
  })

  describe('Task 2.6: Lexer error handling', () => {
    it('should handle unterminated string', () => {
      const result = tokenize('"hello')
      expect(result).toHaveProperty('type', 'LexError')
      if ('message' in result) {
        expect(result.message).toContain('Unterminated')
      }
    })

    it('should handle invalid escape sequence', () => {
      // Actually, we treat unknown escapes as literals, so this should work
      const result = tokenize('"test\\x"')
      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle unknown token', () => {
      const result = tokenize('@')
      expect(result).toHaveProperty('type', 'LexError')
    })

    it('should report error line/column for unknown character', () => {
      const result = tokenize('put 5 @ into x')
      expect(result).toHaveProperty('type', 'LexError')
      if ('line' in result && 'column' in result) {
        expect(result.line).toBe(1)
        expect(result.column).toBeGreaterThan(0)
      }
    })

    it('should handle newline in string (error)', () => {
      const result = tokenize('"hello\nworld"')
      expect(result).toHaveProperty('type', 'LexError')
      if ('message' in result) {
        expect(result.message).toContain('newline')
      }
    })
  })

  describe('Integration: real HyperTalk snippets', () => {
    it('should tokenize simple statement', () => {
      const result = tokenize('put 5 into x')
      expect(Array.isArray(result)).toBe(true)
      if (Array.isArray(result)) {
        expect(result[0].value).toBe('PUT')
        expect(result[1].value).toBe('5')
        expect(result[2].value).toBe('INTO')
        expect(result[3].value).toBe('x')
      }
    })

    it('should tokenize if statement', () => {
      const result = tokenize('if x > 5 then put "big" end if')
      expect(Array.isArray(result)).toBe(true)
      if (Array.isArray(result)) {
        expect(result[0].value).toBe('IF')
        expect(result[2].value).toBe('>')
        expect(result[4].value).toBe('THEN')
      }
    })

    it('should tokenize handler definition', () => {
      const result = tokenize('on mouseUp\nanswer "clicked"\nend mouseUp')
      expect(Array.isArray(result)).toBe(true)
      if (Array.isArray(result)) {
        expect(result[0].value).toBe('ON')
        expect(result[1].value).toBe('mouseUp')
      }
    })

    it('should tokenize function call', () => {
      const result = tokenize('add(2, 3)')
      expect(Array.isArray(result)).toBe(true)
      if (Array.isArray(result)) {
        expect(result[0].value).toBe('add')
        expect(result[1].value).toBe('(')
        expect(result[2].value).toBe('2')
        expect(result[3].value).toBe(',')
        expect(result[4].value).toBe('3')
        expect(result[5].value).toBe(')')
      }
    })
  })
})
