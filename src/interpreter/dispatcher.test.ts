/**
 * Tests for Message Dispatcher: routing messages through element hierarchy.
 * REQ-HT-004, REQ-CE-001
 */

import { describe, it, expect } from 'vitest'
import { send } from './dispatcher'
import { createExecutionContext, Runtime } from './runtime'
import { Stack, createCard, createButton, createField } from '../model/stack'
import { Lexer } from './lexer'
import { Parser } from './parser'

/**
 * Helper: create a test stack with cards.
 */
function createTestStack(): Stack {
  const stack: Stack = {
    id: 'test-stack',
    name: 'Test Stack',
    version: '1.0',
    backgrounds: [],
    cards: [],
    variables: new Map(),
  }

  const card1 = createCard('card1', 'Card 1', null)
  const card2 = createCard('card2', 'Card 2', null)
  stack.cards.push(card1, card2)

  return stack
}

/**
 * Helper: parse HyperTalk code.
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

describe('Message Dispatcher', () => {
  it('dispatches message to button handler', async () => {
    const stack = createTestStack()
    const card = stack.cards[0]

    const button = createButton('btn1', 'Click Me', { left: 10, top: 10, right: 110, bottom: 50 })
    card.buttons.push(button)

    // Attach handler to button
    button.scripts['mouseUp'] = `put "clicked" into x`

    const context = createExecutionContext(stack, card)
    const result = await send('mouseUp', button, context)

    expect(result.success).toBe(true)
    expect(context.localVariables.get('x')).toBe('clicked')
  })

  it('propagates message to card handler when element has no handler', async () => {
    const stack = createTestStack()
    const card = stack.cards[0]

    const button = createButton('btn1', 'Click Me', { left: 10, top: 10, right: 110, bottom: 50 })
    card.buttons.push(button)

    // Attach handler to card only
    card.scripts['mouseUp'] = `put "card handler" into x`

    const context = createExecutionContext(stack, card)
    const result = await send('mouseUp', button, context)

    expect(result.success).toBe(true)
    expect(context.localVariables.get('x')).toBe('card handler')
  })

  it('returns success when message has no handlers', async () => {
    const stack = createTestStack()
    const card = stack.cards[0]

    const button = createButton('btn1', 'Click Me', { left: 10, top: 10, right: 110, bottom: 50 })
    card.buttons.push(button)

    const context = createExecutionContext(stack, card)
    const result = await send('unknownMessage', button, context)

    expect(result.success).toBe(true)
  })

  it('handles lexer errors in handler', async () => {
    const stack = createTestStack()
    const card = stack.cards[0]

    const button = createButton('btn1', 'Click Me', { left: 10, top: 10, right: 110, bottom: 50 })
    card.buttons.push(button)

    // Attach invalid handler (unterminated string)
    button.scripts['mouseUp'] = `put "unterminated`

    const context = createExecutionContext(stack, card)
    const uiResponder = {
      showAnswer: async (msg: string) => {},
    }

    const result = await send('mouseUp', button, context, uiResponder)

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('handles parse errors in handler', async () => {
    const stack = createTestStack()
    const card = stack.cards[0]

    const button = createButton('btn1', 'Click Me', { left: 10, top: 10, right: 110, bottom: 50 })
    card.buttons.push(button)

    // Attach invalid handler (missing end)
    button.scripts['mouseUp'] = `if true`

    const context = createExecutionContext(stack, card)
    const uiResponder = {
      showAnswer: async (msg: string) => {},
    }

    const result = await send('mouseUp', button, context, uiResponder)

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('handles runtime errors in handler', async () => {
    const stack = createTestStack()
    const card = stack.cards[0]

    const button = createButton('btn1', 'Click Me', { left: 10, top: 10, right: 110, bottom: 50 })
    card.buttons.push(button)

    // Attach handler with runtime error (undefined variable)
    button.scripts['mouseUp'] = `put undefinedVar into x`

    const context = createExecutionContext(stack, card)
    const uiResponder = {
      showAnswer: async (msg: string) => {},
    }

    const result = await send('mouseUp', button, context, uiResponder)

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('sends message to field handler', async () => {
    const stack = createTestStack()
    const card = stack.cards[0]

    const field = createField('f1', 'myField', 'initial')
    card.fields.push(field)

    // Attach handler to field
    field.scripts['mouseUp'] = `put "field clicked" into x`

    const context = createExecutionContext(stack, card)
    const result = await send('mouseUp', field, context)

    expect(result.success).toBe(true)
    expect(context.localVariables.get('x')).toBe('field clicked')
  })

  it('updates UI responder context during message dispatch', async () => {
    const stack = createTestStack()
    const card = stack.cards[0]

    const button = createButton('btn1', 'Click Me', { left: 10, top: 10, right: 110, bottom: 50 })
    card.buttons.push(button)

    button.scripts['mouseUp'] = `put "ok" into result`

    const context = createExecutionContext(stack, card)
    const uiResponder = {
      showAnswer: async (msg: string) => {},
    }

    const result = await send('mouseUp', button, context, uiResponder)

    expect(result.success).toBe(true)
    expect((context as any).uiResponder).toBe(uiResponder)
  })

  it('dispatches to card when button has no handler', async () => {
    const stack = createTestStack()
    const card = stack.cards[0]

    const button = createButton('btn1', 'Click Me', { left: 10, top: 10, right: 110, bottom: 50 })
    card.buttons.push(button)

    // No handler on button, only on card
    card.scripts['mouseUp'] = `put "handled by card" into result`

    const context = createExecutionContext(stack, card)

    const result = await send('mouseUp', button, context)

    expect(result.success).toBe(true)
    expect(context.localVariables.get('result')).toBe('handled by card')
  })
})
