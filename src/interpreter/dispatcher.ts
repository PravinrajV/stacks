/**
 * Message Dispatcher: Sends messages through the hierarchy.
 * REQ-HT-004
 * 
 * Routes messages (e.g., mouseUp, openCard) through:
 * Button → Card → Background → Stack
 */

import { Stack, Card, Button, Field, Background } from '../model/stack'
import { ExecutionContext, createExecutionContext, Runtime } from './runtime'
import { Lexer } from './lexer'
import { Parser } from './parser'

export type DispatchResult = { success: boolean; error?: any }

/**
 * Send a message to an element, propagating through hierarchy if needed.
 * REQ-HT-004, REQ-CE-001
 */
export async function send(
  messageName: string,
  target: Button | Field | Card,
  context: ExecutionContext,
  uiResponder?: any // Optional UI responder for answer/go commands
): Promise<DispatchResult> {
  // Hierarchy: element → card → background → stack
  
  // 1. Check element for handler (if target is button or field)
  if ('scripts' in target && target.scripts?.[messageName]) {
    const elementHandler = target.scripts[messageName]
    return await executeHandler(elementHandler, messageName, context, uiResponder)
  }

  // 2. Check card for handler
  if ('scripts' in context.currentCard && context.currentCard.scripts?.[messageName]) {
    const cardHandler = context.currentCard.scripts[messageName]
    return await executeHandler(cardHandler, messageName, context, uiResponder)
  }

  // 3. Check background (if exists)
  // TODO: Implement background checking if needed

  // 4. Check stack for handler
  // TODO: Implement stack-level handlers if needed

  // Message propagated through hierarchy without finding handler
  return { success: true }
}

/**
 * Execute a handler script.
 */
async function executeHandler(
  source: string,
  handlerName: string,
  context: ExecutionContext,
  uiResponder?: any
): Promise<DispatchResult> {
  try {
    const lexer = new Lexer(source)
    const tokensResult = lexer.tokenize()

    if (!Array.isArray(tokensResult)) {
      const error = `Lexer error in ${handlerName}: ${tokensResult.message}`
      console.error(error)
      if (uiResponder?.showAnswer) {
        await uiResponder.showAnswer(error)
      }
      return { success: false, error }
    }

    const parser = new Parser(tokensResult)
    const ast = parser.parse()

    if ('type' in ast && ast.type === 'ParseError') {
      const error = `Parse error in ${handlerName} at line ${(ast as any).line}: ${(ast as any).message}`
      console.error(error, ast)
      if (uiResponder?.showAnswer) {
        await uiResponder.showAnswer(`Error: ${error}`)
      }
      return { success: false, error }
    }

    // Set up UI responder for answer/go commands
    if (uiResponder) {
      ;(context as any).uiResponder = uiResponder
    }

    const runtime = new Runtime(context)
    
    // First execute the program to register handlers
    const registerResult = runtime.execute(ast)
    if (!registerResult.success) {
      const errMsg = `Runtime error in ${handlerName}: ${registerResult.error.message}`
      console.error(errMsg)
      if (uiResponder?.showAnswer) {
        await uiResponder.showAnswer(`Error: ${errMsg}`)
      }
      return { success: false, error: registerResult.error }
    }

    // Then execute the specific handler body if it exists
    // If the handler isn't found, executeHandlerBody will return an error, but we should still return success
    // because it might be a message that's handled at a different level
    const result = runtime.executeHandlerBody(handlerName)
    if (!result.success) {
      // Only treat as error if the handler was found but failed to execute
      // If handler not found, that's ok (message propagates)
      if (!result.error.message.includes('Handler not found')) {
        const errMsg = `Runtime error in ${handlerName}: ${result.error.message}`
        console.error(errMsg)
        if (uiResponder?.showAnswer) {
          await uiResponder.showAnswer(`Error: ${errMsg}`)
        }
        return { success: false, error: result.error }
      }
    }

    return { success: true }
  } catch (err) {
    const error = `Unexpected error in ${handlerName}: ${err}`
    console.error(error)
    if (uiResponder?.showAnswer) {
      await uiResponder.showAnswer(`Error: ${error}`)
    }
    return { success: false, error }
  }
}
