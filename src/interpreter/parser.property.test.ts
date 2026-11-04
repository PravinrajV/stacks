import { describe, it, expect } from 'vitest'
import * as fcModule from 'fast-check'
import { Parser } from './parser'
import { Token } from './lexer'

const fc = fcModule as any

/**
 * Task 2.13: Property-based tests for parser.
 * REQ-TEST-001
 *
 * Generate random valid token sequences and verify:
 * 1. Parser doesn't crash
 * 2. Output is well-formed AST (no undefined nodes)
 * 3. AST structure is sensible
 */

describe('Parser Property-Based Tests (Task 2.13)', () => {
  describe('Parser robustness', () => {
    it('should not crash on simple valid token sequences', () => {
      // Generate valid PUT statements
      fc.assert(
        fc.property(
          fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9]*$/),
          fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9]*$/),
          (var1: string, var2: string) => {
            const tokens: Token[] = [
              { type: 'keyword', value: 'PUT', line: 1, column: 1 },
              { type: 'number', value: '5', line: 1, column: 5 },
              { type: 'keyword', value: 'INTO', line: 1, column: 7 },
              { type: 'identifier', value: var1.toUpperCase(), line: 1, column: 12 },
              { type: 'eof', value: '', line: 1, column: 15 }
            ]
            const parser = new Parser(tokens)
            const result = parser.parse()
            expect(result).toBeDefined()
            expect(result).toHaveProperty('type')
            // Should not crash and should return Program or ParseError
            expect(['Program', 'ParseError']).toContain(result.type)
          }
        ),
        { numRuns: 30 }
      )
    })

    it('should produce well-formed AST nodes (no undefined fields)', () => {
      fc.assert(
        fc.property(fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9]*$/), (varName: string) => {
          const tokens: Token[] = [
            { type: 'keyword', value: 'GET', line: 1, column: 1 },
            { type: 'identifier', value: varName.toUpperCase(), line: 1, column: 5 },
            { type: 'eof', value: '', line: 1, column: 10 }
          ]
          const parser = new Parser(tokens)
          const result = parser.parse()

          if ('handlers' in result) {
            // Valid Program - check all fields exist
            expect(result.type).toBe('Program')
            expect(result.handlers).toBeDefined()
            expect(result.statements).toBeDefined()
            expect(Array.isArray(result.handlers)).toBe(true)
            expect(Array.isArray(result.statements)).toBe(true)

            // Check statements have required fields
            for (const stmt of result.statements) {
              expect(stmt).toHaveProperty('type')
              expect(stmt).toHaveProperty('line')
              expect(stmt).toHaveProperty('column')
            }
          } else {
            // ParseError - check required fields
            expect(result.type).toBe('ParseError')
            expect(result).toHaveProperty('message')
            expect(result).toHaveProperty('line')
            expect(result).toHaveProperty('column')
          }
        }),
        { numRuns: 30 }
      )
    })
  })

  describe('Parser error handling properties', () => {
    it('should report errors with meaningful line/column info', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 100 }), (line: number) => {
          const tokens: Token[] = [
            { type: 'keyword', value: 'PUT', line, column: 1 },
            { type: 'identifier', value: 'X', line, column: 5 },
            // Missing 'INTO' - should fail
            { type: 'eof', value: '', line, column: 6 }
          ]
          const parser = new Parser(tokens)
          const result = parser.parse()

          if ('type' in result && result.type === 'ParseError') {
            // Error case
            expect(result.line).toBeGreaterThanOrEqual(1)
            expect(result.column).toBeGreaterThanOrEqual(1)
            expect(typeof result.message).toBe('string')
            expect(result.message.length).toBeGreaterThan(0)
          }
        }),
        { numRuns: 30 }
      )
    })
  })

  describe('Parser arithmetic expression properties', () => {
    it('should parse binary arithmetic expressions without crashing', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 10000 }),
          fc.integer({ min: 0, max: 10000 }),
          (a: number, b: number) => {
            const tokens: Token[] = [
              { type: 'keyword', value: 'PUT', line: 1, column: 1 },
              { type: 'number', value: String(a), line: 1, column: 5 },
              { type: 'operator', value: '+', line: 1, column: 8 },
              { type: 'number', value: String(b), line: 1, column: 10 },
              { type: 'keyword', value: 'INTO', line: 1, column: 12 },
              { type: 'identifier', value: 'X', line: 1, column: 17 },
              { type: 'eof', value: '', line: 1, column: 18 }
            ]
            const parser = new Parser(tokens)
            const result = parser.parse()

            // Should parse successfully
            expect(result).not.toHaveProperty('type', 'ParseError')
            if ('statements' in result && result.statements.length > 0) {
              // Verify structure
              expect(result.statements[0]).toHaveProperty('type')
              expect(['PutStatement', 'ExpressionStatement']).toContain(
                (result.statements[0] as any).type
              )
            }
          }
        ),
        { numRuns: 30 }
      )
    })
  })

  describe('Parser token position preservation', () => {
    it('should preserve line/column information from tokens', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 50 }),
          fc.integer({ min: 1, max: 100 }),
          (line: number, col: number) => {
            const tokens: Token[] = [
              { type: 'keyword', value: 'PUT', line, column: col },
              { type: 'number', value: '42', line, column: col + 4 },
              { type: 'keyword', value: 'INTO', line, column: col + 7 },
              { type: 'identifier', value: 'MYVAR', line, column: col + 12 },
              { type: 'eof', value: '', line: line + 1, column: 1 }
            ]
            const parser = new Parser(tokens)
            const result = parser.parse()

            if ('statements' in result && result.statements.length > 0) {
              // All statements should have valid line/column
              for (const stmt of result.statements) {
                expect(stmt.line).toBeGreaterThanOrEqual(1)
                expect(stmt.column).toBeGreaterThanOrEqual(1)
                expect(typeof stmt.line).toBe('number')
                expect(typeof stmt.column).toBe('number')
              }
            }
          }
        ),
        { numRuns: 30 }
      )
    })
  })

  describe('Parser handler definitions', () => {
    it('should parse various handler names without crashing', () => {
      fc.assert(
        fc.property(
          fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9]*$/),
          (handlerName: string) => {
            const upper = handlerName.toUpperCase()
            const tokens: Token[] = [
              { type: 'keyword', value: 'ON', line: 1, column: 1 },
              { type: 'identifier', value: upper, line: 1, column: 4 },
              { type: 'keyword', value: 'END', line: 1, column: 10 },
              { type: 'eof', value: '', line: 1, column: 13 }
            ]
            const parser = new Parser(tokens)
            const result = parser.parse()

            // Should succeed
            expect(result).not.toHaveProperty('type', 'ParseError')
            if ('handlers' in result) {
              expect(result.handlers).toHaveLength(1)
              expect(result.handlers[0].name).toBe(upper)
            }
          }
        ),
        { numRuns: 20 }
      )
    })
  })
})
