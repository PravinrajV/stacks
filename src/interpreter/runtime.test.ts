/**
 * Tests for HyperTalk Runtime (tree-walking evaluator).
 *
 * Tests cover:
 * - ExecutionContext and variable scoping (local, card, stack)
 * - Expression evaluation (literals, operators, functions)
 * - Statement execution (if, repeat, put, get, go, answer)
 * - Built-in commands and functions
 * - Timeout and step limit enforcement
 * - Error handling
 *
 * REQ-HT-003, REQ-HT-005, REQ-HT-006, REQ-EH-002, REQ-EH-003
 */

import { describe, it, expect } from 'vitest'
import { Parser, PutStatement, IdentifierExpr, LiteralExpr, Program } from './parser'
import { Lexer } from './lexer'
import { Runtime, createExecutionContext, executeProgram, ExecutionContext } from './runtime'
import { Stack, Card, Field, Background, createField, createButton, createCard, createStack } from '../model/stack'
import { Rect } from '../model/types'

/**
 * Helper: tokenize and parse HyperTalk code.
 */
function parseCode(code: string) {
  const lexer = new Lexer(code)
  const tokensOrError = lexer.tokenize()
  if ('type' in tokensOrError && tokensOrError.type === 'LexError') {
    throw new Error(`Lex error: ${tokensOrError.message}`)
  }
  const tokens = tokensOrError as any[]
  const parser = new Parser(tokens)
  const ast = parser.parse()
  if ('type' in ast && ast.type === 'ParseError') {
    throw new Error(`Parse error: ${ast.message}`)
  }
  return ast
}

/**
 * Helper: create a minimal card for testing.
 */
function createTestCard(): { stack: Stack; card: Card } {
  const rect: Rect = { left: 0, top: 0, right: 512, bottom: 342 }
  const stack: Stack = {
    id: 'test-stack',
    name: 'Test Stack',
    version: '1.0',
    backgrounds: [],
    cards: [],
    variables: new Map(),
  }

  const card: Card = {
    id: 'test-card',
    backgroundId: null,
    name: 'Test Card',
    buttons: [],
    fields: [],
    scripts: {},
    variables: new Map(),
  }

  stack.cards.push(card)
  return { stack, card }
}

describe('Runtime: ExecutionContext', () => {
  it('creates a fresh execution context', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)

    expect(ctx.stack).toBe(stack)
    expect(ctx.currentCard).toBe(card)
    expect(ctx.localVariables.size).toBe(0)
    expect(ctx.callStack).toEqual([])
    expect(ctx.stepCount).toBe(0)
    expect(ctx.sandboxViolations).toEqual([])
  })

  it('manually executes a put statement', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    // Manually create AST for: put 42 into x
    const putStmt: PutStatement = {
      type: 'PutStatement',
      value: {
        type: 'Literal',
        value: 42,
        line: 1,
        column: 1,
      } as LiteralExpr,
      target: {
        type: 'Identifier',
        name: 'x',
        line: 1,
        column: 1,
      } as IdentifierExpr,
      line: 1,
      column: 1,
    }

    const program: Program = {
      type: 'Program',
      handlers: [],
      statements: [putStmt],
      line: 1,
      column: 1,
    }

    const result = runtime.execute(program)
    expect(result.success).toBe(true)
    expect(ctx.localVariables.get('x')).toBe(42)
  })
})

describe('Runtime: Variable Scoping (REQ-HT-006)', () => {
  it('resolves local variables', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put 42 into x`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    expect(ctx.localVariables.get('x')).toBe(42)
  })

  it('resolves card-scoped variables', () => {
    const { stack, card } = createTestCard()
    card.variables.set('myVar', 'card-value')

    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put myVar into result`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
  })

  it('resolves stack-scoped variables', () => {
    const { stack, card } = createTestCard()
    stack.variables.set('stackVar', 'stack-value')

    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put stackVar into result`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
  })

  it('local variables shadow card and stack variables', () => {
    const { stack, card } = createTestCard()
    card.variables.set('x', 'card-value')
    stack.variables.set('x', 'stack-value')

    const ctx = createExecutionContext(stack, card)
    ctx.localVariables.set('x', 'local-value')
    const runtime = new Runtime(ctx)

    const code = `get x`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.value).toBe('local-value')
    }
  })

  it('reports undefined variable error', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `get undefinedVar`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(false)
    expect((result as any).error.message).toContain('Undefined')
  })
})

describe('Runtime: Expression Evaluator (3.4)', () => {
  it('evaluates literals (string, number, boolean)', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put "hello" into a
put 42 into b
put true into c`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    expect(ctx.localVariables.get('a')).toBe('hello')
    expect(ctx.localVariables.get('b')).toBe(42)
    expect(ctx.localVariables.get('c')).toBe(true)
  })

  it('evaluates arithmetic operators', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put 2 + 3 into sum
put 5 - 2 into diff
put 4 * 3 into prod
put 10 / 2 into quot`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    expect(ctx.localVariables.get('sum')).toBe(5)
    expect(ctx.localVariables.get('diff')).toBe(3)
    expect(ctx.localVariables.get('prod')).toBe(12)
    expect(ctx.localVariables.get('quot')).toBe(5)
  })

  it('evaluates comparison operators', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put 5 > 3 into gt
put 2 < 4 into lt
put 5 = 5 into eq
put 3 != 4 into ne`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    expect(ctx.localVariables.get('gt')).toBe(true)
    expect(ctx.localVariables.get('lt')).toBe(true)
    expect(ctx.localVariables.get('eq')).toBe(true)
    expect(ctx.localVariables.get('ne')).toBe(true)
  })

  it('evaluates logical operators with short-circuit', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put true and false into andResult
put true or false into orResult
put not false into notResult`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    expect(ctx.localVariables.get('andResult')).toBe(false)
    expect(ctx.localVariables.get('orResult')).toBe(true)
    expect(ctx.localVariables.get('notResult')).toBe(true)
  })

  it('respects operator precedence', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    // 2 + 3 * 4 should be 14, not 20
    const code = `put 2 + 3 * 4 into result`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    expect(ctx.localVariables.get('result')).toBe(14)
  })

  it('handles division by zero', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put 10 / 0 into result`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(false)
    expect((result as any).error.message).toContain('Division by zero')
  })

  it('evaluates unary operators', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put -5 into neg
put not true into notTrue`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    expect(ctx.localVariables.get('neg')).toBe(-5)
    expect(ctx.localVariables.get('notTrue')).toBe(false)
  })
})

describe('Runtime: Put/Get Commands (3.7, 3.8)', () => {
  it('put command assigns to local variable', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put 123 into myVar`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    expect(ctx.localVariables.get('myVar')).toBe(123)
  })

  it('put command assigns to field', () => {
    const { stack, card } = createTestCard()
    const field = createField('f1', 'myField', '')
    card.fields.push(field)

    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put "hello" into field "myField"`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    expect(field.content).toBe('hello')
  })

  it('get command retrieves field content', () => {
    const { stack, card } = createTestCard()
    const field = createField('f1', 'myField', 'field-value')
    card.fields.push(field)

    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put field "myField" into result`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    expect(ctx.localVariables.get('result')).toBe('field-value')
  })

  it('put into non-existent field returns error', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put "test" into field "nonExistent"`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(false)
    expect((result as any).error.message).toContain('Field not found')
  })
})

describe('Runtime: Navigation - Go Command (3.9)', () => {
  it('navigates to next card', () => {
    const { stack } = createTestCard()
    const card1: Card = {
      id: 'card1',
      backgroundId: null,
      name: 'Card 1',
      buttons: [],
      fields: [],
      scripts: {},
      variables: new Map(),
    }
    const card2: Card = {
      id: 'card2',
      backgroundId: null,
      name: 'Card 2',
      buttons: [],
      fields: [],
      scripts: {},
      variables: new Map(),
    }
    stack.cards = [card1, card2]

    const ctx = createExecutionContext(stack, card1)
    const runtime = new Runtime(ctx)

    const code = `go next card`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    expect(ctx.currentCard).toBe(card2)
  })

  it('navigates to previous card', () => {
    const { stack } = createTestCard()
    const card1: Card = {
      id: 'card1',
      backgroundId: null,
      name: 'Card 1',
      buttons: [],
      fields: [],
      scripts: {},
      variables: new Map(),
    }
    const card2: Card = {
      id: 'card2',
      backgroundId: null,
      name: 'Card 2',
      buttons: [],
      fields: [],
      scripts: {},
      variables: new Map(),
    }
    stack.cards = [card1, card2]

    const ctx = createExecutionContext(stack, card2)
    const runtime = new Runtime(ctx)

    const code = `go previous card`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    expect(ctx.currentCard).toBe(card1)
  })

  it('navigates to first card', () => {
    const { stack } = createTestCard()
    const card1: Card = {
      id: 'card1',
      backgroundId: null,
      name: 'Card 1',
      buttons: [],
      fields: [],
      scripts: {},
      variables: new Map(),
    }
    const card2: Card = {
      id: 'card2',
      backgroundId: null,
      name: 'Card 2',
      buttons: [],
      fields: [],
      scripts: {},
      variables: new Map(),
    }
    stack.cards = [card1, card2]

    const ctx = createExecutionContext(stack, card2)
    const runtime = new Runtime(ctx)

    const code = `go first card`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    expect(ctx.currentCard).toBe(card1)
  })

  it('navigates to last card', () => {
    const { stack } = createTestCard()
    const card1: Card = {
      id: 'card1',
      backgroundId: null,
      name: 'Card 1',
      buttons: [],
      fields: [],
      scripts: {},
      variables: new Map(),
    }
    const card2: Card = {
      id: 'card2',
      backgroundId: null,
      name: 'Card 2',
      buttons: [],
      fields: [],
      scripts: {},
      variables: new Map(),
    }
    stack.cards = [card1, card2]

    const ctx = createExecutionContext(stack, card1)
    const runtime = new Runtime(ctx)

    const code = `go last card`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    expect(ctx.currentCard).toBe(card2)
  })

  it('handles invalid card navigation', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `go next card`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(false)
    expect((result as any).error.message).toContain('Card not found')
  })
})

describe('Runtime: Answer Command (3.10)', () => {
  it('answer command returns button index', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `answer "Hello"`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    expect((result as any).value).toBe(-1) // No button index
  })

  it('answer command with no buttons', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `answer "Hello"`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    expect((result as any).value).toBe(-1) // No button index
  })
})

describe('Runtime: Control Flow (3.3, 3.5)', () => {
  it('executes if statement with true condition', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `if true then
  put 42 into result
end if`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    expect(ctx.localVariables.get('result')).toBe(42)
  })

  it('executes if statement with false condition', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `if false then
  put 42 into result
end if`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    expect(ctx.localVariables.has('result')).toBe(false)
  })

  it('executes else branch', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `if false then
  put 1 into result
else
  put 2 into result
end if`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    expect(ctx.localVariables.get('result')).toBe(2)
  })

  it('repeat N times loops correctly', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put 0 into counter
repeat 5 times
  put counter + 1 into counter
end repeat`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    expect(ctx.localVariables.get('counter')).toBe(5)
  })

  it('repeat while loops correctly', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put 0 into counter
repeat while counter < 5
  put counter + 1 into counter
end repeat`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    expect(ctx.localVariables.get('counter')).toBe(5)
  })

  it('repeat until loops correctly', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put 0 into counter
repeat until counter = 3
  put counter + 1 into counter
end repeat`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    expect(ctx.localVariables.get('counter')).toBe(3)
  })

  it('return statement exits early', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put 1 into result
return 42
put 2 into result`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.value).toBe(42)
    }
    expect(ctx.localVariables.get('result')).toBe(1) // Not updated to 2
  })
})

describe('Runtime: Math Functions', () => {
  it('add function', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put add(2, 3) into result`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    expect(ctx.localVariables.get('result')).toBe(5)
  })

  it('subtract function', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put subtract(10, 3) into result`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    expect(ctx.localVariables.get('result')).toBe(7)
  })

  it('multiply function', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put multiply(4, 5) into result`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    expect(ctx.localVariables.get('result')).toBe(20)
  })

  it('divide function', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put divide(20, 4) into result`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    expect(ctx.localVariables.get('result')).toBe(5)
  })

  it('sqrt function', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put sqrt(16) into result`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    expect(ctx.localVariables.get('result')).toBe(4)
  })

  it('round function', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put round(3.7) into result`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    expect(ctx.localVariables.get('result')).toBe(4)
  })

  it('random function', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put random(1, 10) into result`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    const value = ctx.localVariables.get('result')
    expect(typeof value).toBe('number')
    expect(value).toBeGreaterThanOrEqual(1)
    expect(value).toBeLessThanOrEqual(10)
  })
})

describe('Runtime: String Functions', () => {
  it('concat function', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put concat("hello", " ", "world") into result`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    expect(ctx.localVariables.get('result')).toBe('hello world')
  })

  it('length function', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put length("hello") into result`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    expect(ctx.localVariables.get('result')).toBe(5)
  })

  it('contains function', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put contains("hello world", "world") into result`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    expect(ctx.localVariables.get('result')).toBe(true)
  })

  it('split function', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put split("a,b,c", ",") into result`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    expect(ctx.localVariables.get('result')).toEqual(['a', 'b', 'c'])
  })

  it('uppercase function', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put uppercase("hello") into result`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    expect(ctx.localVariables.get('result')).toBe('HELLO')
  })

  it('lowercase function', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put lowercase("HELLO") into result`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    expect(ctx.localVariables.get('result')).toBe('hello')
  })

  it('substring function', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put substring("hello", 1, 3) into result`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    expect(ctx.localVariables.get('result')).toBe('he')
  })

  it('trim function', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put trim("  hello  ") into result`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    expect(ctx.localVariables.get('result')).toBe('hello')
  })
})

describe('Runtime: Timeout and Step Limits (3.5, REQ-EH-003)', () => {
  it('enforces step limit', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    // Manually set high step count to trigger limit
    ctx.stepCount = 100000

    const code = `put 1 into x`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(false)
    expect((result as any).error.type).toBe('ExecutionTimeout')
  })

  it('enforces time limit', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    // Manually set start time to past to trigger timeout
    ctx.startTime = Date.now() - 6000

    const code = `put 1 into x`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(false)
    expect((result as any).error.type).toBe('ExecutionTimeout')
  })

  it('loop respects step limit', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    // Set step count high to trigger on loop iteration
    ctx.stepCount = 99998

    const code = `repeat 5 times
  put 1 into x
end repeat`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(false)
    expect((result as any).error.type).toBe('ExecutionTimeout')
  })
})

describe('Runtime: Error Handling (REQ-EH-002, 3.6)', () => {
  it('catches and reports undefined variable error', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `get undefinedVar`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(false)
    expect((result as any).error.type).toBe('RuntimeError')
    expect((result as any).error.message).toContain('Undefined')
  })

  it('catches and reports invalid function', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put unknownFunc(1) into result`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.type).toBe('RuntimeError')
      expect(result.error.message).toContain('Unknown function')
    }
  })

  it('catches wrong argument count errors', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put add(2) into result`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.type).toBe('RuntimeError')
      expect(result.error.message).toContain('expects 2 arguments')
    }
  })
})

describe('Runtime: Integration', () => {
  it('executes complete script with multiple statements', () => {
    const { stack, card } = createTestCard()
    const field = createField('f1', 'output', '')
    card.fields.push(field)

    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put 5 into x
put 3 into y
put x + y into sum
put sum into field "output"`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    expect(ctx.localVariables.get('x')).toBe(5)
    expect(ctx.localVariables.get('y')).toBe(3)
    expect(ctx.localVariables.get('sum')).toBe(8)
    expect(field.content).toBe('8')
  })

  it('executes script with nested control flow', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put 0 into result
repeat 3 times
  if result < 2 then
    put result + 1 into result
  end if
end repeat`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    expect(ctx.localVariables.get('result')).toBe(2)
  })
})
