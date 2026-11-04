import { describe, it, expect } from 'vitest'
import { parse, Parser, IfStatement, RepeatStatement, BinaryOpExpr, ParseError } from './parser'
import { tokenize } from './lexer'

// Helper to tokenize and parse
function parseCode(code: string) {
  const tokens = tokenize(code)
  if ('type' in tokens && tokens.type === 'LexError') {
    throw new Error(`Lex error: ${tokens.message}`)
  }
  return parse(tokens as any)
}

describe('Parser (Tasks 2.7-2.12)', () => {
  describe('Task 2.7: ASTNode interfaces', () => {
    it('should create AST nodes with type, line, column', () => {
      const result = parseCode('put 5 into x')
      expect(result).toHaveProperty('type', 'Program')
      expect(result).toHaveProperty('line')
      expect(result).toHaveProperty('column')
      if (!('handlers' in result)) throw new Error('Expected Program')
      const stmt = result.statements[0]
      expect(stmt).toHaveProperty('type')
      expect(stmt).toHaveProperty('line')
      expect(stmt).toHaveProperty('column')
    })
  })

  describe('Task 2.8: Expression parser with operator precedence', () => {
    it('should parse arithmetic with correct precedence: * / before + -', () => {
      // 2 + 3 * 4 should parse as 2 + (3 * 4), not (2 + 3) * 4
      const result = parseCode('put 2 + 3 * 4 into x')
      expect(result).not.toHaveProperty('type', 'ParseError')
      if (!('statements' in result)) throw new Error('Expected Program')
      const stmt = result.statements[0]
      expect(stmt.type).toBe('PutStatement')
      const value = (stmt as any).value
      expect(value.type).toBe('BinaryOp')
      expect(value.op).toBe('+')
      // Right side should be multiplication
      expect(value.right.type).toBe('BinaryOp')
      expect(value.right.op).toBe('*')
    })

    it('should parse parenthesized expressions', () => {
      // (2 + 3) * 4
      const result = parseCode('put (2 + 3) * 4 into x')
      expect(result).not.toHaveProperty('type', 'ParseError')
      if (!('statements' in result)) throw new Error('Expected Program')
      const stmt = result.statements[0]
      const value = (stmt as any).value
      expect(value.type).toBe('BinaryOp')
      expect(value.op).toBe('*')
      // Left side should be parenthesized addition
      expect(value.left.type).toBe('BinaryOp')
      expect(value.left.op).toBe('+')
    })

    it('should handle comparison operators', () => {
      const result = parseCode('put x > 5 into bool')
      expect(result).not.toHaveProperty('type', 'ParseError')
      if (!('statements' in result)) throw new Error('Expected Program')
      const value = (result.statements[0] as any).value
      expect(value.type).toBe('BinaryOp')
      expect(value.op).toBe('>')
    })

    it('should handle logical AND/OR', () => {
      const result = parseCode('put x > 5 and y < 10 into bool')
      expect(result).not.toHaveProperty('type', 'ParseError')
      if (!('statements' in result)) throw new Error('Expected Program')
      const value = (result.statements[0] as any).value
      expect(value.type).toBe('BinaryOp')
      expect(value.op).toBe('AND')
    })
  })

  describe('Task 2.9: Statement parser', () => {
    it('should parse if/else statements', () => {
      const result = parseCode('if x > 5 then put "big" end if')
      expect(result).not.toHaveProperty('type', 'ParseError')
      if (!('statements' in result)) throw new Error('Expected Program')
      const stmt = result.statements[0]
      expect(stmt.type).toBe('IfStatement')
      expect((stmt as IfStatement).thenBranch.length).toBeGreaterThan(0)
    })

    it('should parse if/else with else branch', () => {
      const result = parseCode('if x > 5 then put "big" else put "small" end if')
      expect(result).not.toHaveProperty('type', 'ParseError')
      if (!('statements' in result)) throw new Error('Expected Program')
      const stmt = result.statements[0]
      expect(stmt.type).toBe('IfStatement')
      expect((stmt as IfStatement).elseBranch).toBeDefined()
    })

    it('should parse repeat/while loops', () => {
      const result = parseCode('repeat while x < 10\nput x into y\nend repeat')
      expect(result).not.toHaveProperty('type', 'ParseError')
      if (!('statements' in result)) throw new Error('Expected Program')
      const stmt = result.statements[0]
      expect(stmt.type).toBe('RepeatStatement')
      expect((stmt as RepeatStatement).kind).toBe('while')
    })

    it('should parse repeat/until loops', () => {
      const result = parseCode('repeat until x >= 10\nput x into y\nend repeat')
      expect(result).not.toHaveProperty('type', 'ParseError')
      if (!('statements' in result)) throw new Error('Expected Program')
      const stmt = result.statements[0]
      expect(stmt.type).toBe('RepeatStatement')
      expect((stmt as RepeatStatement).kind).toBe('until')
    })

    it('should parse repeat N times', () => {
      const result = parseCode('repeat 5 times\nput 1 into x\nend repeat')
      expect(result).not.toHaveProperty('type', 'ParseError')
      if (!('statements' in result)) throw new Error('Expected Program')
      const stmt = result.statements[0]
      expect(stmt.type).toBe('RepeatStatement')
      expect((stmt as RepeatStatement).kind).toBe('count')
      expect((stmt as RepeatStatement).count).toBeDefined()
    })

    it('should parse put statements', () => {
      const result = parseCode('put 5 into x')
      expect(result).not.toHaveProperty('type', 'ParseError')
      if (!('statements' in result)) throw new Error('Expected Program')
      const stmt = result.statements[0]
      expect(stmt.type).toBe('PutStatement')
    })

    it('should parse get statements', () => {
      const result = parseCode('get x')
      expect(result).not.toHaveProperty('type', 'ParseError')
      if (!('statements' in result)) throw new Error('Expected Program')
      const stmt = result.statements[0]
      expect(stmt.type).toBe('GetStatement')
    })

    it('should parse go statements', () => {
      const result = parseCode('go to card 1')
      expect(result).not.toHaveProperty('type', 'ParseError')
      if (!('statements' in result)) throw new Error('Expected Program')
      const stmt = result.statements[0]
      expect(stmt.type).toBe('GoStatement')
    })

    it('should parse go next/previous/first/last', () => {
      const tests = ['go next card', 'go previous card', 'go first card', 'go last card']
      for (const test of tests) {
        const result = parseCode(test)
        expect(result).not.toHaveProperty('type', 'ParseError')
      }
    })

    it('should parse answer statements', () => {
      const result = parseCode('answer "Hello" with button "OK"')
      expect(result).not.toHaveProperty('type', 'ParseError')
      if (!('statements' in result)) throw new Error('Expected Program')
      const stmt = result.statements[0]
      expect(stmt.type).toBe('AnswerStatement')
    })

    it('should parse return statements', () => {
      const result = parseCode('return 42')
      expect(result).not.toHaveProperty('type', 'ParseError')
      if (!('statements' in result)) throw new Error('Expected Program')
      const stmt = result.statements[0]
      expect(stmt.type).toBe('ReturnStatement')
    })

    it('should handle nested if/repeat', () => {
      const result = parseCode(
        'if x > 5 then\nrepeat 3 times\nput 1 into y\nend repeat\nend if'
      )
      expect(result).not.toHaveProperty('type', 'ParseError')
      if (!('statements' in result)) throw new Error('Expected Program')
      const stmt = result.statements[0]
      expect(stmt.type).toBe('IfStatement')
      expect((stmt as IfStatement).thenBranch[0].type).toBe('RepeatStatement')
    })
  })

  describe('Task 2.10: Handler definition parser', () => {
    it('should parse handler definitions', () => {
      const result = parseCode('on mouseUp\nanswer "clicked"\nend')
      expect(result).not.toHaveProperty('type', 'ParseError')
      if (!('handlers' in result)) throw new Error('Expected Program')
      expect(result.handlers.length).toBeGreaterThan(0)
      const handler = result.handlers[0]
      expect(handler.type).toBe('HandlerDefinition')
      expect(handler.name).toBe('MOUSEUP')
    })

    it('should parse multiple handlers', () => {
      const result = parseCode('on mouseUp\nanswer "hi"\nend\non openCard\nanswer "opened"\nend')
      expect(result).not.toHaveProperty('type', 'ParseError')
      if (!('handlers' in result)) throw new Error('Expected Program')
      expect(result.handlers.length).toBe(2)
    })

    it('should parse handler with statements in body', () => {
      const result = parseCode('on mouseUp\nput 5 into x\nget x\nend')
      expect(result).not.toHaveProperty('type', 'ParseError')
      if (!('handlers' in result)) throw new Error('Expected Program')
      const handler = result.handlers[0]
      expect(handler.body.length).toBe(2)
    })
  })

  describe('Task 2.11: Function call parser', () => {
    it('should parse function calls with no arguments', () => {
      const result = parseCode('put random() into x')
      expect(result).not.toHaveProperty('type', 'ParseError')
      if (!('statements' in result)) throw new Error('Expected Program')
      const expr = (result.statements[0] as any).value
      expect(expr.type).toBe('FunctionCall')
      expect(expr.name).toBe('RANDOM')
      expect(expr.args.length).toBe(0)
    })

    it('should parse function calls with one argument', () => {
      const result = parseCode('put sqrt(4) into x')
      expect(result).not.toHaveProperty('type', 'ParseError')
      if (!('statements' in result)) throw new Error('Expected Program')
      const expr = (result.statements[0] as any).value
      expect(expr.type).toBe('FunctionCall')
      expect(expr.name).toBe('SQRT')
      expect(expr.args.length).toBe(1)
    })

    it('should parse function calls with multiple arguments', () => {
      const result = parseCode('put add(2, 3) into x')
      expect(result).not.toHaveProperty('type', 'ParseError')
      if (!('statements' in result)) throw new Error('Expected Program')
      const expr = (result.statements[0] as any).value
      expect(expr.type).toBe('FunctionCall')
      expect(expr.args.length).toBe(2)
    })

    it('should parse nested function calls', () => {
      const result = parseCode('put add(2, multiply(3, 4)) into x')
      expect(result).not.toHaveProperty('type', 'ParseError')
      if (!('statements' in result)) throw new Error('Expected Program')
      const expr = (result.statements[0] as any).value
      expect(expr.type).toBe('FunctionCall')
      expect(expr.args[1].type).toBe('FunctionCall')
    })
  })

  describe('Task 2.12: Parser error handling', () => {
    it('should report error for mismatched end if', () => {
      const result = parseCode('if x > 5 then put 1 end')
      expect(result).toHaveProperty('type', 'ParseError')
    })

    it('should report error for missing end', () => {
      const result = parseCode('if x > 5 then put 1')
      expect(result).toHaveProperty('type', 'ParseError')
    })

    it('should report error location with line and column', () => {
      const result = parseCode('if x > 5\nput 1')
      expect(result).toHaveProperty('type', 'ParseError')
      if ('line' in result && 'column' in result) {
        expect(result.line).toBeGreaterThan(0)
        expect(result.column).toBeGreaterThan(0)
      }
    })

    it('should report helpful error messages', () => {
      const result = parseCode('put 5')
      expect(result).toHaveProperty('type', 'ParseError')
      if ('message' in result) {
        expect((result as any).message.length).toBeGreaterThan(0)
      }
    })

    it('should handle unexpected tokens', () => {
      const result = parseCode('put into x')
      expect(result).toHaveProperty('type', 'ParseError')
    })

    it('should handle missing closing parenthesis', () => {
      const result = parseCode('put add(2, 3 into x')
      expect(result).toHaveProperty('type', 'ParseError')
    })
  })

  describe('Integration: Real HyperTalk programs', () => {
    it('should parse simple counter program', () => {
      const code = `
on mouseUp
put 0 into count
repeat 10 times
put count + 1 into count
end repeat
answer count
end
`
      const result = parseCode(code)
      expect(result).not.toHaveProperty('type', 'ParseError')
      if (!('handlers' in result)) throw new Error('Expected Program')
      expect(result.handlers.length).toBeGreaterThan(0)
    })

    it('should parse conditional program', () => {
      const code = `
on mouseUp
get field "input"
if result > 5 then
put "big" into field "output"
else
put "small" into field "output"
end if
end
`
      const result = parseCode(code)
      expect(result).not.toHaveProperty('type', 'ParseError')
    })

    it('should parse math expressions', () => {
      const code = 'put sqrt(add(2, 3)) into x'
      const result = parseCode(code)
      expect(result).not.toHaveProperty('type', 'ParseError')
    })

    it('should parse complex boolean expressions', () => {
      const code = 'if x > 5 and y < 10 or z = true then put 1 end if'
      const result = parseCode(code)
      expect(result).not.toHaveProperty('type', 'ParseError')
    })
  })
})
