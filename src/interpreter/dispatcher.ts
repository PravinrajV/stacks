/**
 * Message Dispatcher: Sends messages through the hierarchy.
 * REQ-HT-004
 * 
 * Routes messages (e.g., mouseUp, openCard) through:
 * Button → Card → Background → Stack
 */

import { Stack, Card, Button, Field, Background, getHandler } from '../model/stack'
import { ExecutionContext, createExecutionContext, Runtime } from './runtime'
import { Lexer } from './lexer'
import { Parser } from './parser'

/**
 * Send a message to an element, propagating through hierarchy if needed.
 * REQ-HT-004, REQ-CE-001
 */
export async function send(
  messageName: string,
  target: Button | Field,
  context: ExecutionContext,
  uiResponder?: any // Optional UI responder for answer/go commands
): Promise<void> {
  // Hierarchy: element → card → background → stack
  
  // 1. Check element for handler
  const elementHandler = target.scripts?.[messageName]
  if (elementHandler) {
    await executeHandler(elementHandler, messageName, context, uiResponder)
    return
  }

  // 2. Check card for handler
  const cardHandler = context.currentCard.scripts?.[messageName]
  if (cardHandler) {
    await executeHandler(cardHandler, messageName, context, uiResponder)
    return
  }

  // 3. Check background (if exists)
  // TODO: Implement background checking if needed

  // 4. Check stack for handler
  // const stackHandler = context.stack.scripts?.[messageName]
  // if (stackHandler) {
  //   await executeHandler(stackHandler, messageName, context, uiResponder)
  //   return
  // }

  // Message propagated through hierarchy without finding handler
}

/**
 * Execute a handler script.
 */
async function executeHandler(
  source: string,
  handlerName: string,
  context: ExecutionContext,
  uiResponder?: any
): Promise<void> {
  try {
    const lexer = new Lexer(source)
    const tokensResult = lexer.tokenize()

    if (!Array.isArray(tokensResult)) {
      console.error(`Lexer error in ${handlerName}: ${tokensResult.message}`)
      return
    }

    const parser = new Parser(tokensResult)
    const ast = parser.parse()

    if ('type' in ast && ast.type === 'ParseError') {
      console.error(`Parse error in ${handlerName}:`, ast)
      return
    }

    // Set up UI responder for answer/go commands
    if (uiResponder) {
      ;(context as any).uiResponder = uiResponder
    }

    const runtime = new Runtime(context)
    const result = runtime.execute(ast)

    if (!result.success) {
      console.error(`Runtime error in ${handlerName}:`, result.error.message)
    }
  } catch (err) {
    console.error(`Unexpected error in ${handlerName}:`, err)
  }
}
