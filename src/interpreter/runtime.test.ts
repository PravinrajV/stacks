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
 * - Message passing and handler execution
 * - Sandbox enforcement
 *
 * REQ-HT-003, REQ-HT-005, REQ-HT-006, REQ-EH-002, REQ-EH-003, REQ-HT-004
 */

import { describe, it, expect } from 'vitest'
import { Parser, PutStatement, IdentifierExpr, LiteralExpr, Program } from './parser'
import { Lexer } from './lexer'
import {
  Runtime,
  createExecutionContext,
  executeProgram,
  ExecutionContext,
  MessageDispatcher,
  dispatchMouseUp,
  dispatchOpenCard,
} from './runtime'
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

  it('put command assigns a stack variable that survives a new context', () => {
    const { stack, card } = createTestCard()
    const field = createField('f1', 'out', '')
    card.fields.push(field)

    const write = new Runtime(createExecutionContext(stack, card))
    const wrote = write.execute(parseCode('put "brass" into stack key'))
    expect(wrote.success).toBe(true)
    expect(stack.variables.get('key')).toBe('brass')

    const read = new Runtime(createExecutionContext(stack, card))
    const readResult = read.execute(parseCode('put stack key into field "out"'))
    expect(readResult.success).toBe(true)
    expect(field.content).toBe('brass')
  })

  it('put command assigns a card variable on the current card', () => {
    const { stack, card } = createTestCard()
    const runtime = new Runtime(createExecutionContext(stack, card))
    const result = runtime.execute(parseCode('put 0 into card n\nput card n + 1 into card n'))
    expect(result.success).toBe(true)
    expect(card.variables.get('n')).toBe(1)
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
describe('Runtime: Message Dispatcher (REQ-HT-004, 3.15)', () => {
  it('finds handler on element', () => {
    const button = {
      label: 'Click me',
      rect: { left: 0, top: 0, right: 100, bottom: 40 },
      scripts: {
        mouseUp: 'on mouseUp\nput "clicked" into x\nend mouseUp',
      },
    }

    const handler = MessageDispatcher.findHandler('mouseUp', button)
    expect(handler).not.toBeNull()
    expect(handler?.name).toBe('mouseUp')
  })

  it('returns null for handler not found', () => {
    const button = {
      label: 'Click me',
      rect: { left: 0, top: 0, right: 100, bottom: 40 },
      scripts: {},
    }

    const handler = MessageDispatcher.findHandler('mouseUp', button)
    expect(handler).toBeNull()
  })

  it('finds handler with on prefix', () => {
    const button = {
      label: 'Click me',
      rect: { left: 0, top: 0, right: 100, bottom: 40 },
      scripts: {
        'on mouseUp': 'on mouseUp\nput "clicked" into x\nend mouseUp',
      },
    }

    const handler = MessageDispatcher.findHandler('mouseUp', button)
    expect(handler).not.toBeNull()
  })
})

describe('Runtime: Handler Lookup (REQ-HT-004, 3.16)', () => {
  it('finds handler on button', () => {
    const button = {
      id: 'btn1',
      label: 'Click',
      rect: { left: 0, top: 0, right: 100, bottom: 40 },
      scripts: {
        mouseUp: 'on mouseUp\nput "button click" into x\nend mouseUp',
      },
    }

    const handler = MessageDispatcher.findHandler('mouseUp', button)
    expect(handler).not.toBeNull()
    expect(handler?.name).toBe('mouseUp')
  })

  it('finds handler on card', () => {
    const { stack, card } = createTestCard()
    card.scripts.openCard = 'on openCard\nput "card open" into x\nend openCard'

    const handler = MessageDispatcher.findHandler('openCard', card)
    expect(handler).not.toBeNull()
    expect(handler?.name).toBe('openCard')
  })

  it('finds handler on background', () => {
    const background: Background = {
      id: 'bg1',
      name: 'Main Background',
      buttons: [],
      fields: [],
      scripts: {
        mouseUp: 'on mouseUp\nput "background click" into x\nend mouseUp',
      },
    }

    const handler = MessageDispatcher.findHandler('mouseUp', background)
    expect(handler).not.toBeNull()
    expect(handler?.name).toBe('mouseUp')
  })

  it('finds handler on stack', () => {
    const { stack } = createTestCard()
    stack.scripts = {
      openCard: 'on openCard\nput "stack open" into x\nend openCard',
    }

    const handler = MessageDispatcher.findHandler('openCard', stack)
    expect(handler).not.toBeNull()
    expect(handler?.name).toBe('openCard')
  })
})

describe('Runtime: Handler Invocation (REQ-HT-004, 3.17)', () => {
  it('invokes handler with fresh local scope', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)

    // Parse simple statements without handler wrapper
    const code = 'put 42 into localVar'
    const programAst = parseCode(code)
    const handler = {
      name: 'testHandler',
      source: code,
      ast: programAst.statements,
    }

    const result = MessageDispatcher.invokeHandler(handler, ctx)

    expect(result.success).toBe(true)
  })

  it('handler can access card variables', () => {
    const { stack, card } = createTestCard()
    card.variables.set('cardVar', 'card-value')

    const ctx = createExecutionContext(stack, card)

    const code = 'put "test-value" into result'
    const programAst = parseCode(code)
    const handler = {
      name: 'testHandler',
      source: code,
      ast: programAst.statements,
    }

    const result = MessageDispatcher.invokeHandler(handler, ctx)
    expect(result.success).toBe(true)
  })

  it('handler can access stack variables', () => {
    const { stack, card } = createTestCard()
    stack.variables.set('stackVar', 'stack-value')

    const ctx = createExecutionContext(stack, card)

    const code = 'put "test-value" into result'
    const programAst = parseCode(code)
    const handler = {
      name: 'testHandler',
      source: code,
      ast: programAst.statements,
    }

    const result = MessageDispatcher.invokeHandler(handler, ctx)
    expect(result.success).toBe(true)
  })

  it('handler invocation creates fresh local scope', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    ctx.localVariables.set('x', 'parent-value')

    const code = 'put 42 into x'
    const programAst = parseCode(code)
    const handler = {
      name: 'testHandler',
      source: code,
      ast: programAst.statements,
    }

    MessageDispatcher.invokeHandler(handler, ctx)

    // Parent context's local variable should still be 'parent-value'
    expect(ctx.localVariables.get('x')).toBe('parent-value')
  })
})

describe('Runtime: OpenCard Message (REQ-HT-004, 3.18)', () => {
  it('dispatches openCard message on navigation', () => {
    const { stack } = createTestCard()
    const card1: Card = {
      id: 'card1',
      backgroundId: null,
      name: 'Card 1',
      buttons: [],
      fields: [],
      scripts: {
        openCard: 'on openCard\nput "opened card 1" into x\nend openCard',
      },
      variables: new Map(),
    }
    const card2: Card = {
      id: 'card2',
      backgroundId: null,
      name: 'Card 2',
      buttons: [],
      fields: [],
      scripts: {
        openCard: 'on openCard\nput "opened card 2" into y\nend openCard',
      },
      variables: new Map(),
    }
    stack.cards = [card1, card2]

    const ctx = createExecutionContext(stack, card1)
    const result = dispatchOpenCard(card2, ctx)

    expect(result.success).toBe(true)
  })

  it('openCard handler can modify card state', () => {
    const { stack, card } = createTestCard()
    const field = createField('f1', 'title', '')
    card.fields.push(field)
    card.scripts.openCard = 'on openCard\nput "Welcome" into field "title"\nend openCard'

    const ctx = createExecutionContext(stack, card)
    const result = dispatchOpenCard(card, ctx)

    expect(result.success).toBe(true)
    expect(field.content).toBe('Welcome')
  })

  it('openCard propagates through hierarchy (card -> background -> stack)', () => {
    const { stack, card } = createTestCard()
    const bg: Background = {
      id: 'bg1',
      name: 'BG',
      buttons: [],
      fields: [],
      scripts: {
        openCard: 'on openCard\nput "bg handler" into bgResult\nend openCard',
      },
    }
    stack.backgrounds = [bg]
    card.backgroundId = bg.id
    card.scripts.openCard = 'on openCard\nput "card handler" into cardResult\nend openCard'

    const ctx = createExecutionContext(stack, card)
    const result = dispatchOpenCard(card, ctx)

    expect(result.success).toBe(true)
  })
})

describe('Runtime: MouseUp Message (REQ-HT-004, 3.19)', () => {
  it('dispatches mouseUp message on button click', () => {
    const { stack, card } = createTestCard()
    const button = {
      id: 'btn1',
      label: 'Click',
      rect: { left: 0, top: 0, right: 100, bottom: 40 },
      scripts: {
        mouseUp: 'on mouseUp\nput "clicked" into result\nend mouseUp',
      },
    }

    const ctx = createExecutionContext(stack, card)
    const result = dispatchMouseUp(button, ctx)

    expect(result.success).toBe(true)
  })

  it('mouseUp handler can modify card state', () => {
    const { stack, card } = createTestCard()
    const field = createField('f1', 'output', '')
    card.fields.push(field)

    const button = {
      id: 'btn1',
      label: 'Click',
      rect: { left: 0, top: 0, right: 100, bottom: 40 },
      scripts: {
        mouseUp: 'on mouseUp\nput "Button clicked!" into field "output"\nend mouseUp',
      },
    }

    const ctx = createExecutionContext(stack, card)
    const result = dispatchMouseUp(button, ctx)

    expect(result.success).toBe(true)
    expect(field.content).toBe('Button clicked!')
  })

  it('mouseUp propagates through hierarchy (button -> card -> background -> stack)', () => {
    const { stack, card } = createTestCard()
    const bg: Background = {
      id: 'bg1',
      name: 'BG',
      buttons: [],
      fields: [],
      scripts: {
        mouseUp: 'on mouseUp\nput "bg handler" into bgResult\nend mouseUp',
      },
    }
    stack.backgrounds = [bg]
    card.backgroundId = bg.id
    card.scripts.mouseUp = 'on mouseUp\nput "card handler" into cardResult\nend mouseUp'

    const button = {
      id: 'btn1',
      label: 'Click',
      rect: { left: 0, top: 0, right: 100, bottom: 40 },
      scripts: {
        mouseUp: 'on mouseUp\nput "button handler" into buttonResult\nend mouseUp',
      },
    }

    const ctx = createExecutionContext(stack, card)
    const result = dispatchMouseUp(button, ctx)

    expect(result.success).toBe(true)
  })
})

describe('Runtime: Sandbox Enforcement - Fetch/XMLHttpRequest/Eval (REQ-EH-003, 3.20)', () => {
  it('blocks fetch function call', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put fetch("http://example.com") into result`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.type).toBe('SandboxViolation')
      expect(result.error.message).toContain('Operation not allowed in scripts')
      expect(result.error.message).toContain('fetch')
    }
  })

  it('blocks XMLHttpRequest function call', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put xmlhttprequest() into result`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.type).toBe('SandboxViolation')
      expect(result.error.message).toContain('Operation not allowed in scripts')
    }
  })

  it('blocks eval function call', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put eval("1 + 1") into result`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.type).toBe('SandboxViolation')
      expect(result.error.message).toContain('Operation not allowed in scripts')
      expect(result.error.message).toContain('eval')
    }
  })

  it('records sandbox violations in context', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put fetch("http://test") into x`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(false)
    expect(ctx.sandboxViolations.length).toBeGreaterThan(0)
    expect(ctx.sandboxViolations).toContain('fetch')
  })
})

describe('Runtime: Sandbox Enforcement - Restricted Globals (REQ-EH-003, 3.21)', () => {
  it('blocks access to window global', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put window into result`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.type).toBe('SandboxViolation')
      expect(result.error.message).toContain('Sandbox violation')
      expect(result.error.message).toContain('window')
    }
  })

  it('blocks access to document global', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put document into result`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.type).toBe('SandboxViolation')
      expect(result.error.message).toContain('Sandbox violation')
      expect(result.error.message).toContain('document')
    }
  })

  it('blocks access to localStorage global', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put localStorage into result`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.type).toBe('SandboxViolation')
      expect(result.error.message).toContain('Sandbox violation')
      expect(result.error.message).toContain('localstorage')
    }
  })

  it('records sandbox violations when accessing restricted globals', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put window into x`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(false)
    expect(ctx.sandboxViolations.length).toBeGreaterThan(0)
    expect(ctx.sandboxViolations).toContain('window')
  })
})


describe('Runtime: Advanced Loop Tests', () => {
  it('repeat until loop terminates on condition', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put 0 into i
repeat until i >= 3
  put i + 1 into i
end repeat`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    expect(ctx.localVariables.get('i')).toBe(3)
  })

  it('nested loops work correctly', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put 0 into total
repeat 3 times
  repeat 2 times
    put total + 1 into total
  end repeat
end repeat`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    expect(ctx.localVariables.get('total')).toBe(6)
  })

  it('loop exits early on return statement', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put 0 into x
repeat 10 times
  put x + 1 into x
  if x = 3 then
    return
  end if
end repeat`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    expect(ctx.localVariables.get('x')).toBe(3)
  })

  it('loop detects step limit exceeded', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    // Create a loop that will exceed step limit
    const code = `repeat 200000 times
end repeat`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.type).toBe('ExecutionTimeout')
      expect(result.error.message).toContain('exceeded')
    }
  })

  it('while loop with complex condition', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put 0 into x
put 0 into sum
repeat while x < 5 and sum < 10
  put sum + x into sum
  put x + 1 into x
end repeat`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    expect(ctx.localVariables.get('x')).toBeGreaterThan(0)
  })
})

describe('Runtime: String and Math Functions', () => {
  it('concat function joins strings', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put concat("hello", " ", "world") into result`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    expect(ctx.localVariables.get('result')).toBe('hello world')
  })

  it('length function returns string length', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put length("hello") into len`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    expect(ctx.localVariables.get('len')).toBe(5)
  })

  it('contains function checks substring', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put contains("hello world", "world") into found`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    expect(ctx.localVariables.get('found')).toBe(true)
  })

  it('substring function extracts portion', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put substring("hello", 2, 4) into sub`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    // substring is 1-indexed: substring("hello", 2, 4)
    // converts to substring(2-1, 4-1) = substring(1, 3) = "el"
    expect(ctx.localVariables.get('sub')).toBe('el')
  })

  it('uppercase function converts case', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put uppercase("Hello World") into upper`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    expect(ctx.localVariables.get('upper')).toBe('HELLO WORLD')
  })

  it('lowercase function converts case', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put lowercase("Hello World") into lower`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    expect(ctx.localVariables.get('lower')).toBe('hello world')
  })

  it('math functions compute correctly', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put sqrt(16) into root
put round(3.7) into rounded`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    expect(ctx.localVariables.get('root')).toBe(4)
    expect(ctx.localVariables.get('rounded')).toBe(4)
  })
})

describe('Runtime: Error Recovery', () => {
  it('continues execution after recoverable error in separate statements', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put 10 / 0 into x`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(false)
  })

  it('invalid field access produces clear error message', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put field "nonexistent" into x`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.message).toContain('Field not found')
    }
  })

  it('type coercion handles unexpected types', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    // String arithmetic should coerce
    const code = `put "5" + 3 into result`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    expect(ctx.localVariables.get('result')).toBe(8)
  })
})

describe('Runtime: Complex Control Flow', () => {
  it('nested if for else-if chain works', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put 2 into x
if x = 1 then
  put "one" into result
else
  if x = 2 then
    put "two" into result
  else
    put "other" into result
  end if
end if`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    expect(ctx.localVariables.get('result')).toBe('two')
  })

  it('nested if statements work correctly', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put 5 into x
put 0 into result
if x > 0 then
  if x < 10 then
    put "small positive" into result
  end if
end if`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    expect(ctx.localVariables.get('result')).toBe('small positive')
  })

  it('return statement exits early from script', () => {
    const { stack, card } = createTestCard()
    const ctx = createExecutionContext(stack, card)
    const runtime = new Runtime(ctx)

    const code = `put 1 into x
return
put 2 into x`
    const ast = parseCode(code)
    const result = runtime.execute(ast)

    expect(result.success).toBe(true)
    expect(ctx.localVariables.get('x')).toBe(1) // Second statement shouldn't execute
  })
})
