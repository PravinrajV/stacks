/**
 * HyperTalk Runtime: Tree-walking evaluator for executing AST.
 *
 * Handles:
 * - ExecutionContext with variable scoping (local, card, stack)
 * - Expression evaluation (literals, operators, function calls)
 * - Statement execution (if, repeat, put, get, go, answer)
 * - Built-in commands and functions
 * - Timeout and step limit enforcement
 * - Error handling without crashing
 * - Sandbox enforcement (no fetch, eval, etc.)
 *
 * REQ-HT-003, REQ-HT-005, REQ-HT-006, REQ-EH-002, REQ-EH-003
 */

import { Stack, Card, Field, Background } from '../model/stack'
import {
  Statement,
  Expression,
  Program,
  HandlerDefinition,
  PutStatement,
  GetStatement,
  GoStatement,
  AnswerStatement,
  IfStatement,
  RepeatStatement,
  ReturnStatement,
  ExpressionStatement,
  BinaryOpExpr,
  UnaryOpExpr,
  FunctionCallExpr,
  FieldAccessExpr,
  VariableAccessExpr,
  LiteralExpr,
  IdentifierExpr,
} from './parser'
import { Lexer } from './lexer'
import { Parser } from './parser'

/**
 * UI Response callback interface for showing dialogs.
 * REQ-P8-004: answer command integration with UI
 */
export interface UIResponder {
  /**
   * Show an answer dialog with message and buttons.
   * Returns a promise that resolves to the button index clicked (0, 1, 2, ...).
   * REQ-P8-004: async dialog that blocks script execution until answered
   */
  showAnswer(message: string, buttons: string[]): Promise<number>
}

/**
 * Execution Context: maintains state during script execution.
 * REQ-HT-003, REQ-EH-002, REQ-P8-004
 */
export interface ExecutionContext {
  stack: Stack
  currentCard: Card
  localVariables: Map<string, any>
  callStack: string[]
  stepCount: number
  startTime: number
  sandboxViolations: string[]
  uiResponder?: UIResponder
}

/**
 * Runtime error interface.
 * REQ-EH-002
 */
export interface RuntimeError {
  type: 'RuntimeError' | 'SandboxViolation' | 'ExecutionTimeout'
  message: string
  handlerName?: string
  line?: number
  column?: number
}

/**
 * Result of execution: either success with value or error.
 */
export type ExecutionResult = { success: true; value: any } | { success: false; error: RuntimeError }

/**
 * Constants for execution limits.
 * REQ-HT-003, REQ-EH-003
 */
const MAX_STEPS = 100000
const MAX_TIME_MS = 5000

/**
 * Create a fresh execution context.
 * REQ-HT-003
 */
export function createExecutionContext(stack: Stack, currentCard: Card): ExecutionContext {
  return {
    stack,
    currentCard,
    localVariables: new Map(),
    callStack: [],
    stepCount: 0,
    startTime: Date.now(),
    sandboxViolations: [],
  }
}

/**
 * Runtime evaluator for executing AST.
 * REQ-HT-003
 */
export class Runtime {
  private context: ExecutionContext
  private returnValue: any = undefined
  private shouldReturn: boolean = false
  private handlers: Map<string, HandlerDefinition> = new Map()

  constructor(context: ExecutionContext) {
    this.context = context
  }

  /**
   * Execute a program (handlers + statements).
   * REQ-HT-003
   * 
   * Note: This is synchronous and doesn't support async answer dialogs.
   * Use executeAsync() if you need async support with UIResponder.
   */
  execute(program: Program): ExecutionResult {
    try {
      // Store handlers for potential later invocation
      const handlerMap = new Map<string, HandlerDefinition>()
      for (const handler of program.handlers) {
        handlerMap.set(handler.name.toLowerCase(), handler)
      }
      this.handlers = handlerMap

      let lastValue: any = undefined
      for (const statement of program.statements) {
        const result = this.executeStatement(statement)
        if (!result.success) return result
        // Store the value from this statement (for answer, get, etc.)
        lastValue = result.value
      }
      // Return last statement's value, or return value if set
      return { success: true, value: this.returnValue !== undefined ? this.returnValue : lastValue }
    } catch (e) {
      return {
        success: false,
        error: {
          type: 'RuntimeError',
          message: (e as Error).message || 'Unknown runtime error',
        },
      }
    }
  }

  /**
   * Execute a program (handlers + statements) asynchronously.
   * REQ-HT-003, REQ-P8-004
   * 
   * This version processes answer statements asynchronously with UI callbacks.
   */
  async executeAsync(program: Program): Promise<ExecutionResult> {
    try {
      // Store handlers for potential later invocation
      const handlerMap = new Map<string, HandlerDefinition>()
      for (const handler of program.handlers) {
        handlerMap.set(handler.name.toLowerCase(), handler)
      }
      this.handlers = handlerMap

      return this.executeStatementsAsync(program.statements)
    } catch (e) {
      return {
        success: false,
        error: {
          type: 'RuntimeError',
          message: (e as Error).message || 'Unknown runtime error',
        },
      }
    }
  }

  /**
   * Execute a handler's body statements.
   */
  executeHandlerBody(handlerName: string): ExecutionResult {
    const handler = this.handlers.get(handlerName.toLowerCase())
    if (!handler) {
      return {
        success: false,
        error: {
          type: 'RuntimeError',
          message: `Handler not found: ${handlerName}`,
        },
      }
    }

    let lastValue: any = undefined
    for (const statement of handler.body) {
      const result = this.executeStatement(statement)
      if (!result.success) return result
      lastValue = result.value
      if (this.shouldReturn) break
    }

    return { success: true, value: this.returnValue !== undefined ? this.returnValue : lastValue }
  }

  /**
   * Execute a handler's body statements asynchronously.
   * REQ-P8-004: Allows answer dialogs to block handler execution
   * 
   * Used by RunMode to execute handlers with UI integration.
   */
  async executeHandlerBodyAsync(handlerName: string): Promise<ExecutionResult> {
    const handler = this.handlers.get(handlerName.toLowerCase())
    if (!handler) {
      return {
        success: false,
        error: {
          type: 'RuntimeError',
          message: `Handler not found: ${handlerName}`,
        },
      }
    }

    return this.executeStatementsAsync(handler.body)
  }

  /**
   * Run statements, awaiting answer dialogs even when they sit inside if/else.
   * The sync walker cannot show a dialog, so a conditional `answer` used to no-op.
   */
  private async executeStatementsAsync(statements: Statement[]): Promise<ExecutionResult> {
    let lastValue: any = undefined
    for (const statement of statements) {
      const result = await this.executeStatementAsync(statement)
      if (!result.success) return result
      lastValue = result.value
      if (this.shouldReturn) break
    }
    return { success: true, value: this.returnValue !== undefined ? this.returnValue : lastValue }
  }

  private async executeStatementAsync(stmt: Statement): Promise<ExecutionResult> {
    if (stmt.type === 'AnswerStatement') {
      return this.executeAnswerStatementAsync(stmt as AnswerStatement)
    }
    if (stmt.type === 'IfStatement') {
      return this.executeIfStatementAsync(stmt as IfStatement)
    }
    // repeat still runs synchronously; an answer nested only inside repeat
    // does not open a dialog. The haunted-house scripts do not do that.
    return this.executeStatement(stmt)
  }

  private async executeIfStatementAsync(stmt: IfStatement): Promise<ExecutionResult> {
    this.context.stepCount++
    if (this.context.stepCount > MAX_STEPS) {
      return {
        success: false,
        error: {
          type: 'ExecutionTimeout',
          message: `Execution timeout: exceeded ${MAX_STEPS} steps`,
          line: stmt.line,
          column: stmt.column,
        },
      }
    }

    const elapsedMs = Date.now() - this.context.startTime
    if (elapsedMs > MAX_TIME_MS) {
      return {
        success: false,
        error: {
          type: 'ExecutionTimeout',
          message: `Execution timeout: exceeded ${MAX_TIME_MS}ms`,
          line: stmt.line,
          column: stmt.column,
        },
      }
    }

    if (this.shouldReturn) {
      return { success: true, value: this.returnValue }
    }

    const condResult = this.evaluateExpression(stmt.condition)
    if (!condResult.success) return condResult

    const branch = this.isTruthy(condResult.value) ? stmt.thenBranch : stmt.elseBranch
    if (!branch) {
      return { success: true, value: undefined }
    }
    return this.executeStatementsAsync(branch)
  }

  /**
   * Execute a single statement.
   * Made public for MessageDispatcher to use.
   * REQ-HT-003, REQ-HT-005
   */
  executeStatement(stmt: Statement): ExecutionResult {
    // Check timeout and step limit.
    this.context.stepCount++
    const stmtAny = stmt as any
    if (this.context.stepCount > MAX_STEPS) {
      return {
        success: false,
        error: {
          type: 'ExecutionTimeout',
          message: `Execution timeout: exceeded ${MAX_STEPS} steps`,
          line: stmtAny.line,
          column: stmtAny.column,
        },
      }
    }

    const elapsedMs = Date.now() - this.context.startTime
    if (elapsedMs > MAX_TIME_MS) {
      return {
        success: false,
        error: {
          type: 'ExecutionTimeout',
          message: `Execution timeout: exceeded ${MAX_TIME_MS}ms`,
          line: stmtAny.line,
          column: stmtAny.column,
        },
      }
    }

    // Handle return early.
    if (this.shouldReturn) {
      return { success: true, value: this.returnValue }
    }

    if (stmt.type === 'IfStatement') {
      return this.executeIfStatement(stmt as IfStatement)
    } else if (stmt.type === 'RepeatStatement') {
      return this.executeRepeatStatement(stmt as RepeatStatement)
    } else if (stmt.type === 'PutStatement') {
      return this.executePutStatement(stmt as PutStatement)
    } else if (stmt.type === 'GetStatement') {
      return this.executeGetStatement(stmt as GetStatement)
    } else if (stmt.type === 'GoStatement') {
      return this.executeGoStatement(stmt as GoStatement)
    } else if (stmt.type === 'AnswerStatement') {
      return this.executeAnswerStatement(stmt as AnswerStatement)
    } else if (stmt.type === 'ReturnStatement') {
      return this.executeReturnStatement(stmt as ReturnStatement)
    } else if (stmt.type === 'ExpressionStatement') {
      const exprStmt = stmt as ExpressionStatement
      const result = this.evaluateExpression(exprStmt.expr)
      if (!result.success) return result
      return { success: true, value: result.value }
    }

    return {
      success: false,
      error: {
        type: 'RuntimeError',
        message: `Unknown statement type: ${(stmt as any).type}`,
        line: (stmt as any).line,
        column: (stmt as any).column,
      },
    }
  }

  /**
   * Execute if statement.
   * REQ-HT-005
   */
  private executeIfStatement(stmt: IfStatement): ExecutionResult {
    const condResult = this.evaluateExpression(stmt.condition)
    if (!condResult.success) return condResult

    const isTruthy = this.isTruthy(condResult.value)

    const branch = isTruthy ? stmt.thenBranch : stmt.elseBranch
    if (!branch) {
      return { success: true, value: undefined }
    }

    for (const s of branch) {
      const result = this.executeStatement(s)
      if (!result.success) return result
      if (this.shouldReturn) break
    }

    return { success: true, value: undefined }
  }

  /**
   * Execute repeat statement (while, until, count).
   * REQ-HT-005
   */
  private executeRepeatStatement(stmt: RepeatStatement): ExecutionResult {
    if (stmt.kind === 'count') {
      // repeat N times
      const countResult = this.evaluateExpression(stmt.count!)
      if (!countResult.success) return countResult

      const count = this.coerceToNumber(countResult.value)
      for (let i = 0; i < count; i++) {
        // Check timeout on each iteration
        this.context.stepCount++
        if (this.context.stepCount > MAX_STEPS) {
          return {
            success: false,
            error: {
              type: 'ExecutionTimeout',
              message: `Execution timeout: exceeded ${MAX_STEPS} steps`,
              line: stmt.line,
              column: stmt.column,
            },
          }
        }

        const elapsedMs = Date.now() - this.context.startTime
        if (elapsedMs > MAX_TIME_MS) {
          return {
            success: false,
            error: {
              type: 'ExecutionTimeout',
              message: `Execution timeout: exceeded ${MAX_TIME_MS}ms`,
              line: stmt.line,
              column: stmt.column,
            },
          }
        }

        for (const s of stmt.body) {
          const result = this.executeStatement(s)
          if (!result.success) return result
          if (this.shouldReturn) break
        }

        if (this.shouldReturn) break
      }
    } else if (stmt.kind === 'while') {
      // repeat while condition
      while (true) {
        const condResult = this.evaluateExpression(stmt.condition!)
        if (!condResult.success) return condResult

        if (!this.isTruthy(condResult.value)) break

        this.context.stepCount++
        if (this.context.stepCount > MAX_STEPS) {
          return {
            success: false,
            error: {
              type: 'ExecutionTimeout',
              message: `Execution timeout: exceeded ${MAX_STEPS} steps`,
              line: stmt.line,
              column: stmt.column,
            },
          }
        }

        const elapsedMs = Date.now() - this.context.startTime
        if (elapsedMs > MAX_TIME_MS) {
          return {
            success: false,
            error: {
              type: 'ExecutionTimeout',
              message: `Execution timeout: exceeded ${MAX_TIME_MS}ms`,
              line: stmt.line,
              column: stmt.column,
            },
          }
        }

        for (const s of stmt.body) {
          const result = this.executeStatement(s)
          if (!result.success) return result
          if (this.shouldReturn) break
        }

        if (this.shouldReturn) break
      }
    } else if (stmt.kind === 'until') {
      // repeat until condition
      while (true) {
        const condResult = this.evaluateExpression(stmt.condition!)
        if (!condResult.success) return condResult

        if (this.isTruthy(condResult.value)) break

        this.context.stepCount++
        if (this.context.stepCount > MAX_STEPS) {
          return {
            success: false,
            error: {
              type: 'ExecutionTimeout',
              message: `Execution timeout: exceeded ${MAX_STEPS} steps`,
              line: stmt.line,
              column: stmt.column,
            },
          }
        }

        const elapsedMs = Date.now() - this.context.startTime
        if (elapsedMs > MAX_TIME_MS) {
          return {
            success: false,
            error: {
              type: 'ExecutionTimeout',
              message: `Execution timeout: exceeded ${MAX_TIME_MS}ms`,
              line: stmt.line,
              column: stmt.column,
            },
          }
        }

        for (const s of stmt.body) {
          const result = this.executeStatement(s)
          if (!result.success) return result
          if (this.shouldReturn) break
        }

        if (this.shouldReturn) break
      }
    }

    return { success: true, value: undefined }
  }

  /**
   * Execute put statement: put <value> into <target>
   * REQ-HT-005, 3.7
   */
  private executePutStatement(stmt: PutStatement): ExecutionResult {
    const valueResult = this.evaluateExpression(stmt.value)
    if (!valueResult.success) return valueResult

    // Determine target (variable or field)
    if (stmt.target.type === 'Identifier') {
      const varName = (stmt.target as IdentifierExpr).name
      this.context.localVariables.set(varName, valueResult.value)
      return { success: true, value: undefined }
    } else if (stmt.target.type === 'FieldAccess') {
      // put into field
      const fieldAccessExpr = stmt.target as FieldAccessExpr
      const fieldNameResult = this.evaluateExpression(fieldAccessExpr.fieldName)
      if (!fieldNameResult.success) return fieldNameResult

      const fieldName = String(fieldNameResult.value)
      const field = this.findFieldByName(this.context.currentCard, fieldName)
      if (!field) {
        return {
          success: false,
          error: {
            type: 'RuntimeError',
            message: `Field not found: ${fieldName}`,
            line: stmt.line,
            column: stmt.column,
          },
        }
      }

      field.content = String(valueResult.value)
      return { success: true, value: undefined }
    } else if (stmt.target.type === 'VariableAccess') {
      // put into scoped variable
      const varAccessExpr = stmt.target as VariableAccessExpr
      return this.setVariable(varAccessExpr.name, varAccessExpr.scope || 'local', valueResult.value)
    }

    return {
      success: false,
      error: {
        type: 'RuntimeError',
        message: `Invalid put target`,
        line: stmt.line,
        column: stmt.column,
      },
    }
  }

  /**
   * Execute get statement: get <expr>
   * REQ-HT-005, 3.8
   */
  private executeGetStatement(stmt: GetStatement): ExecutionResult {
    const result = this.evaluateExpression(stmt.expr)
    if (!result.success) return result
    // get evaluates but doesn't store; value is implicit
    return { success: true, value: result.value }
  }

  /**
   * Execute go statement: go to card <expr>, go next/previous/first/last card
   * REQ-HT-005, 3.9
   */
  private executeGoStatement(stmt: GoStatement): ExecutionResult {
    // Check if destination is a special keyword (next, previous, first, last)
    if (stmt.destination.type === 'Identifier') {
      const idExpr = stmt.destination as IdentifierExpr
      const keyword = idExpr.name.toLowerCase()
      if (['next', 'previous', 'first', 'last'].includes(keyword)) {
        // Handle special keywords without evaluating as variables
        return this.navigateToCard(keyword)
      }
    }

    const destResult = this.evaluateExpression(stmt.destination)
    if (!destResult.success) return destResult

    const dest = destResult.value
    return this.navigateToCard(dest)
  }

  /**
   * Navigate to a card by destination spec.
   */
  private navigateToCard(dest: any): ExecutionResult {
    let targetCard: Card | null = null

    if (dest === 'next') {
      const currentIndex = this.context.stack.cards.indexOf(this.context.currentCard)
      if (currentIndex !== -1 && currentIndex < this.context.stack.cards.length - 1) {
        targetCard = this.context.stack.cards[currentIndex + 1]
      }
    } else if (dest === 'previous') {
      const currentIndex = this.context.stack.cards.indexOf(this.context.currentCard)
      if (currentIndex > 0) {
        targetCard = this.context.stack.cards[currentIndex - 1]
      }
    } else if (dest === 'first') {
      if (this.context.stack.cards.length > 0) {
        targetCard = this.context.stack.cards[0]
      }
    } else if (dest === 'last') {
      if (this.context.stack.cards.length > 0) {
        targetCard = this.context.stack.cards[this.context.stack.cards.length - 1]
      }
    } else {
      // Treat as card ID or index
      const cardIdOrIndex = String(dest)
      const cardIndex = parseInt(cardIdOrIndex, 10)
      if (!isNaN(cardIndex) && cardIndex >= 0 && cardIndex < this.context.stack.cards.length) {
        targetCard = this.context.stack.cards[cardIndex]
      } else {
        targetCard = this.context.stack.cards.find((c) => c.id === cardIdOrIndex) || null
      }
    }

    if (!targetCard) {
      return {
        success: false,
        error: {
          type: 'RuntimeError',
          message: `Card not found: ${dest}`,
        },
      }
    }

    // Switch context to new card
    this.context.currentCard = targetCard

    // Notify UI responder of navigation
    if ((this.context as any).uiResponder?.handleNavigation) {
      (this.context as any).uiResponder.handleNavigation(targetCard.id)
    }

    return { success: true, value: undefined }
  }

  /**
   * Execute answer statement: answer <message> [with button ...]
   * REQ-HT-005, 3.10, REQ-P8-004
   * 
   * In sync mode: simulates first button click
   * In async mode: uses uiResponder.showAnswer() to display real dialog
   */
  private executeAnswerStatement(stmt: AnswerStatement): ExecutionResult {
    const messageResult = this.evaluateExpression(stmt.message)
    if (!messageResult.success) return messageResult

    const message = String(messageResult.value)
    const buttons: string[] = []

    if (stmt.buttons) {
      for (const buttonExpr of stmt.buttons) {
        const buttonResult = this.evaluateExpression(buttonExpr)
        if (!buttonResult.success) return buttonResult
        buttons.push(String(buttonResult.value))
      }
    }

    // If UI responder is available, we can't use it in sync mode
    // The async method executeAnswerStatementAsync must be used instead
    // For sync mode: simulate user clicking first button or return -1 if no buttons.
    const buttonIndex = buttons.length > 0 ? 0 : -1

    return { success: true, value: buttonIndex }
  }

  /**
   * Execute answer statement asynchronously with real UI dialog.
   * REQ-P8-004: answer command shows real modal, script waits for response
   * 
   * This method should be used when uiResponder is available and async execution is possible.
   */
  async executeAnswerStatementAsync(stmt: AnswerStatement): Promise<ExecutionResult> {
    const messageResult = this.evaluateExpression(stmt.message)
    if (!messageResult.success) return messageResult

    const message = String(messageResult.value)
    const buttons: string[] = []

    if (stmt.buttons) {
      for (const buttonExpr of stmt.buttons) {
        const buttonResult = this.evaluateExpression(buttonExpr)
        if (!buttonResult.success) return buttonResult
        buttons.push(String(buttonResult.value))
      }
    }

    // Use UI responder if available, otherwise fallback to sync behavior
    if (this.context.uiResponder?.showAnswer) {
      const buttonIndex = await this.context.uiResponder.showAnswer(
        message,
        buttons.length > 0 ? buttons : ['OK']
      )
      return { success: true, value: buttonIndex }
    }

    // Fallback to sync behavior
    const buttonIndex = buttons.length > 0 ? 0 : -1
    return { success: true, value: buttonIndex }
  }

  /**
   * Execute return statement.
   * REQ-HT-005
   */
  private executeReturnStatement(stmt: ReturnStatement): ExecutionResult {
    if (stmt.value) {
      const result = this.evaluateExpression(stmt.value)
      if (!result.success) return result
      this.returnValue = result.value
    } else {
      this.returnValue = undefined
    }
    this.shouldReturn = true
    return { success: true, value: this.returnValue }
  }

  /**
   * Evaluate an expression.
   * REQ-HT-003, REQ-HT-005, 3.4, 3.21
   */
  evaluateExpression(expr: Expression): ExecutionResult {
    if (expr.type === 'Literal') {
      const litExpr = expr as LiteralExpr
      return { success: true, value: litExpr.value }
    } else if (expr.type === 'Identifier') {
      const idExpr = expr as IdentifierExpr
      const varName = idExpr.name.toLowerCase()

      // Sandbox: block access to restricted globals
      // REQ-EH-003, 3.21
      if (varName === 'window' || varName === 'document' || varName === 'localstorage') {
        this.context.sandboxViolations.push(varName)
        return {
          success: false,
          error: {
            type: 'SandboxViolation',
            message: `Sandbox violation: cannot access ${varName}`,
            line: expr.line,
            column: expr.column,
          },
        }
      }

      const result = this.getVariable('local', idExpr.name)
      if (result.success) {
        return result
      }
      // Try card scope
      const cardResult = this.getVariable('card', idExpr.name)
      if (cardResult.success) {
        return cardResult
      }
      // Try stack scope
      return this.getVariable('stack', idExpr.name)
    } else if (expr.type === 'BinaryOp') {
      return this.evaluateBinaryOp(expr as BinaryOpExpr)
    } else if (expr.type === 'UnaryOp') {
      return this.evaluateUnaryOp(expr as UnaryOpExpr)
    } else if (expr.type === 'FunctionCall') {
      return this.evaluateFunctionCall(expr as FunctionCallExpr)
    } else if (expr.type === 'FieldAccess') {
      return this.evaluateFieldAccess(expr as FieldAccessExpr)
    } else if (expr.type === 'VariableAccess') {
      const varAccessExpr = expr as VariableAccessExpr
      return this.getVariable(varAccessExpr.scope || 'local', varAccessExpr.name)
    }

    return {
      success: false,
      error: {
        type: 'RuntimeError',
        message: `Unknown expression type: ${(expr as any).type}`,
        line: (expr as any).line,
        column: (expr as any).column,
      },
    }
  }

  /**
   * Evaluate binary operation.
   * REQ-HT-005, 3.4
   */
  private evaluateBinaryOp(expr: BinaryOpExpr): ExecutionResult {
    // Short-circuit evaluation for logical operators
    if (expr.op === 'AND' || expr.op === 'and') {
      const leftResult = this.evaluateExpression(expr.left)
      if (!leftResult.success) return leftResult
      if (!this.isTruthy(leftResult.value)) {
        return { success: true, value: false }
      }
      const rightResult = this.evaluateExpression(expr.right)
      if (!rightResult.success) return rightResult
      return { success: true, value: this.isTruthy(rightResult.value) }
    }

    if (expr.op === 'OR' || expr.op === 'or') {
      const leftResult = this.evaluateExpression(expr.left)
      if (!leftResult.success) return leftResult
      if (this.isTruthy(leftResult.value)) {
        return { success: true, value: true }
      }
      const rightResult = this.evaluateExpression(expr.right)
      if (!rightResult.success) return rightResult
      return { success: true, value: this.isTruthy(rightResult.value) }
    }

    const leftResult = this.evaluateExpression(expr.left)
    if (!leftResult.success) return leftResult

    const rightResult = this.evaluateExpression(expr.right)
    if (!rightResult.success) return rightResult

    const left = leftResult.value
    const right = rightResult.value

    if (expr.op === '+') {
      return { success: true, value: this.coerceToNumber(left) + this.coerceToNumber(right) }
    } else if (expr.op === '-') {
      return { success: true, value: this.coerceToNumber(left) - this.coerceToNumber(right) }
    } else if (expr.op === '*') {
      return { success: true, value: this.coerceToNumber(left) * this.coerceToNumber(right) }
    } else if (expr.op === '/') {
      const divisor = this.coerceToNumber(right)
      if (divisor === 0) {
        return {
          success: false,
          error: {
            type: 'RuntimeError',
            message: 'Division by zero',
            line: expr.line,
            column: expr.column,
          },
        }
      }
      return { success: true, value: this.coerceToNumber(left) / divisor }
    } else if (expr.op === '<') {
      return { success: true, value: this.coerceToNumber(left) < this.coerceToNumber(right) }
    } else if (expr.op === '>') {
      return { success: true, value: this.coerceToNumber(left) > this.coerceToNumber(right) }
    } else if (expr.op === '<=') {
      return { success: true, value: this.coerceToNumber(left) <= this.coerceToNumber(right) }
    } else if (expr.op === '>=') {
      return { success: true, value: this.coerceToNumber(left) >= this.coerceToNumber(right) }
    } else if (expr.op === '=') {
      return { success: true, value: left === right }
    } else if (expr.op === '!=') {
      return { success: true, value: left !== right }
    } else if (expr.op === '&') {
      // String concatenation
      return { success: true, value: String(left) + String(right) }
    }

    return {
      success: false,
      error: {
        type: 'RuntimeError',
        message: `Unknown operator: ${expr.op}`,
        line: expr.line,
        column: expr.column,
      },
    }
  }

  /**
   * Evaluate unary operation.
   * REQ-HT-005
   */
  private evaluateUnaryOp(expr: UnaryOpExpr): ExecutionResult {
    const operandResult = this.evaluateExpression(expr.operand)
    if (!operandResult.success) return operandResult

    const operand = operandResult.value

    if (expr.op === 'NOT' || expr.op === 'not') {
      return { success: true, value: !this.isTruthy(operand) }
    } else if (expr.op === '-') {
      return { success: true, value: -this.coerceToNumber(operand) }
    }

    return {
      success: false,
      error: {
        type: 'RuntimeError',
        message: `Unknown unary operator: ${expr.op}`,
        line: expr.line,
        column: expr.column,
      },
    }
  }

  /**
   * Evaluate function call.
   * REQ-HT-005, 3.20
   */
  private evaluateFunctionCall(expr: FunctionCallExpr): ExecutionResult {
    const funcName = expr.name.toLowerCase()

    // Sandbox: block dangerous functions
    // REQ-EH-003, 3.20
    if (funcName === 'fetch' || funcName === 'xmlhttprequest') {
      this.context.sandboxViolations.push(funcName)
      return {
        success: false,
        error: {
          type: 'SandboxViolation',
          message: `Operation not allowed in scripts: ${funcName}`,
          line: expr.line,
          column: expr.column,
        },
      }
    }

    if (funcName === 'eval') {
      this.context.sandboxViolations.push('eval')
      return {
        success: false,
        error: {
          type: 'SandboxViolation',
          message: 'Operation not allowed in scripts: eval',
          line: expr.line,
          column: expr.column,
        },
      }
    }

    // Math functions
    if (funcName === 'add') {
      if (expr.args.length !== 2) {
        return {
          success: false,
          error: {
            type: 'RuntimeError',
            message: 'add() expects 2 arguments',
            line: expr.line,
            column: expr.column,
          },
        }
      }
      const arg1Result = this.evaluateExpression(expr.args[0])
      if (!arg1Result.success) return arg1Result
      const arg2Result = this.evaluateExpression(expr.args[1])
      if (!arg2Result.success) return arg2Result
      return {
        success: true,
        value: this.coerceToNumber(arg1Result.value) + this.coerceToNumber(arg2Result.value),
      }
    }

    if (funcName === 'subtract') {
      if (expr.args.length !== 2) {
        return {
          success: false,
          error: {
            type: 'RuntimeError',
            message: 'subtract() expects 2 arguments',
            line: expr.line,
            column: expr.column,
          },
        }
      }
      const arg1Result = this.evaluateExpression(expr.args[0])
      if (!arg1Result.success) return arg1Result
      const arg2Result = this.evaluateExpression(expr.args[1])
      if (!arg2Result.success) return arg2Result
      return {
        success: true,
        value: this.coerceToNumber(arg1Result.value) - this.coerceToNumber(arg2Result.value),
      }
    }

    if (funcName === 'multiply') {
      if (expr.args.length !== 2) {
        return {
          success: false,
          error: {
            type: 'RuntimeError',
            message: 'multiply() expects 2 arguments',
            line: expr.line,
            column: expr.column,
          },
        }
      }
      const arg1Result = this.evaluateExpression(expr.args[0])
      if (!arg1Result.success) return arg1Result
      const arg2Result = this.evaluateExpression(expr.args[1])
      if (!arg2Result.success) return arg2Result
      return {
        success: true,
        value: this.coerceToNumber(arg1Result.value) * this.coerceToNumber(arg2Result.value),
      }
    }

    if (funcName === 'divide') {
      if (expr.args.length !== 2) {
        return {
          success: false,
          error: {
            type: 'RuntimeError',
            message: 'divide() expects 2 arguments',
            line: expr.line,
            column: expr.column,
          },
        }
      }
      const arg1Result = this.evaluateExpression(expr.args[0])
      if (!arg1Result.success) return arg1Result
      const arg2Result = this.evaluateExpression(expr.args[1])
      if (!arg2Result.success) return arg2Result
      const divisor = this.coerceToNumber(arg2Result.value)
      if (divisor === 0) {
        return {
          success: false,
          error: {
            type: 'RuntimeError',
            message: 'Division by zero',
            line: expr.line,
            column: expr.column,
          },
        }
      }
      return {
        success: true,
        value: this.coerceToNumber(arg1Result.value) / divisor,
      }
    }

    if (funcName === 'sqrt') {
      if (expr.args.length !== 1) {
        return {
          success: false,
          error: {
            type: 'RuntimeError',
            message: 'sqrt() expects 1 argument',
            line: expr.line,
            column: expr.column,
          },
        }
      }
      const argResult = this.evaluateExpression(expr.args[0])
      if (!argResult.success) return argResult
      return {
        success: true,
        value: Math.sqrt(this.coerceToNumber(argResult.value)),
      }
    }

    if (funcName === 'round') {
      if (expr.args.length !== 1) {
        return {
          success: false,
          error: {
            type: 'RuntimeError',
            message: 'round() expects 1 argument',
            line: expr.line,
            column: expr.column,
          },
        }
      }
      const argResult = this.evaluateExpression(expr.args[0])
      if (!argResult.success) return argResult
      return {
        success: true,
        value: Math.round(this.coerceToNumber(argResult.value)),
      }
    }

    if (funcName === 'random') {
      if (expr.args.length !== 2) {
        return {
          success: false,
          error: {
            type: 'RuntimeError',
            message: 'random() expects 2 arguments (min, max)',
            line: expr.line,
            column: expr.column,
          },
        }
      }
      const minResult = this.evaluateExpression(expr.args[0])
      if (!minResult.success) return minResult
      const maxResult = this.evaluateExpression(expr.args[1])
      if (!maxResult.success) return maxResult
      const min = Math.floor(this.coerceToNumber(minResult.value))
      const max = Math.floor(this.coerceToNumber(maxResult.value))
      return {
        success: true,
        value: Math.floor(Math.random() * (max - min + 1)) + min,
      }
    }

    // String functions
    if (funcName === 'concat') {
      if (expr.args.length < 2) {
        return {
          success: false,
          error: {
            type: 'RuntimeError',
            message: 'concat() expects at least 2 arguments',
            line: expr.line,
            column: expr.column,
          },
        }
      }
      let result = ''
      for (const arg of expr.args) {
        const argResult = this.evaluateExpression(arg)
        if (!argResult.success) return argResult
        result += String(argResult.value)
      }
      return { success: true, value: result }
    }

    if (funcName === 'length') {
      if (expr.args.length !== 1) {
        return {
          success: false,
          error: {
            type: 'RuntimeError',
            message: 'length() expects 1 argument',
            line: expr.line,
            column: expr.column,
          },
        }
      }
      const argResult = this.evaluateExpression(expr.args[0])
      if (!argResult.success) return argResult
      return {
        success: true,
        value: String(argResult.value).length,
      }
    }

    if (funcName === 'contains') {
      if (expr.args.length !== 2) {
        return {
          success: false,
          error: {
            type: 'RuntimeError',
            message: 'contains() expects 2 arguments',
            line: expr.line,
            column: expr.column,
          },
        }
      }
      const hayResult = this.evaluateExpression(expr.args[0])
      if (!hayResult.success) return hayResult
      const needleResult = this.evaluateExpression(expr.args[1])
      if (!needleResult.success) return needleResult
      const haystack = String(hayResult.value)
      const needle = String(needleResult.value)
      return { success: true, value: haystack.includes(needle) }
    }

    if (funcName === 'split') {
      if (expr.args.length !== 2) {
        return {
          success: false,
          error: {
            type: 'RuntimeError',
            message: 'split() expects 2 arguments',
            line: expr.line,
            column: expr.column,
          },
        }
      }
      const strResult = this.evaluateExpression(expr.args[0])
      if (!strResult.success) return strResult
      const delimResult = this.evaluateExpression(expr.args[1])
      if (!delimResult.success) return delimResult
      const str = String(strResult.value)
      const delim = String(delimResult.value)
      return { success: true, value: str.split(delim) }
    }

    if (funcName === 'uppercase') {
      if (expr.args.length !== 1) {
        return {
          success: false,
          error: {
            type: 'RuntimeError',
            message: 'uppercase() expects 1 argument',
            line: expr.line,
            column: expr.column,
          },
        }
      }
      const argResult = this.evaluateExpression(expr.args[0])
      if (!argResult.success) return argResult
      return {
        success: true,
        value: String(argResult.value).toUpperCase(),
      }
    }

    if (funcName === 'lowercase') {
      if (expr.args.length !== 1) {
        return {
          success: false,
          error: {
            type: 'RuntimeError',
            message: 'lowercase() expects 1 argument',
            line: expr.line,
            column: expr.column,
          },
        }
      }
      const argResult = this.evaluateExpression(expr.args[0])
      if (!argResult.success) return argResult
      return {
        success: true,
        value: String(argResult.value).toLowerCase(),
      }
    }

    if (funcName === 'substring') {
      if (expr.args.length !== 3) {
        return {
          success: false,
          error: {
            type: 'RuntimeError',
            message: 'substring() expects 3 arguments',
            line: expr.line,
            column: expr.column,
          },
        }
      }
      const strResult = this.evaluateExpression(expr.args[0])
      if (!strResult.success) return strResult
      const startResult = this.evaluateExpression(expr.args[1])
      if (!startResult.success) return startResult
      const endResult = this.evaluateExpression(expr.args[2])
      if (!endResult.success) return endResult
      const str = String(strResult.value)
      // HyperTalk uses 1-based inclusive indexing
      // Convert to 0-indexed: start stays -1, end also -1 (since it's exclusive in JS)
      const start = Math.floor(this.coerceToNumber(startResult.value)) - 1
      const end = Math.floor(this.coerceToNumber(endResult.value)) - 1
      return { success: true, value: str.substring(Math.max(0, start), Math.max(0, end)) }
    }

    if (funcName === 'trim') {
      if (expr.args.length !== 1) {
        return {
          success: false,
          error: {
            type: 'RuntimeError',
            message: 'trim() expects 1 argument',
            line: expr.line,
            column: expr.column,
          },
        }
      }
      const argResult = this.evaluateExpression(expr.args[0])
      if (!argResult.success) return argResult
      return {
        success: true,
        value: String(argResult.value).trim(),
      }
    }

    return {
      success: false,
      error: {
        type: 'RuntimeError',
        message: `Unknown function: ${expr.name}`,
        line: expr.line,
        column: expr.column,
      },
    }
  }

  /**
   * Evaluate field access.
   */
  private evaluateFieldAccess(expr: FieldAccessExpr): ExecutionResult {
    const fieldNameResult = this.evaluateExpression(expr.fieldName)
    if (!fieldNameResult.success) return fieldNameResult

    const fieldName = String(fieldNameResult.value)
    const field = this.findFieldByName(this.context.currentCard, fieldName)
    if (!field) {
      return {
        success: false,
        error: {
          type: 'RuntimeError',
          message: `Field not found: ${fieldName}`,
          line: expr.line,
          column: expr.column,
        },
      }
    }

    return { success: true, value: field.content }
  }

  /**
   * Variable scoping: resolve variable name in local → card → stack scope.
   * REQ-HT-006, 3.2
   */
  private getVariable(scope: 'local' | 'card' | 'stack', name: string): ExecutionResult {
    if (scope === 'local') {
      if (this.context.localVariables.has(name)) {
        return { success: true, value: this.context.localVariables.get(name) }
      }
      return {
        success: false,
        error: {
          type: 'RuntimeError',
          message: `Undefined variable: ${name}`,
        },
      }
    }

    if (scope === 'card') {
      if (this.context.currentCard.variables.has(name)) {
        return { success: true, value: this.context.currentCard.variables.get(name) }
      }
      return {
        success: false,
        error: {
          type: 'RuntimeError',
          message: `Undefined card variable: ${name}`,
        },
      }
    }

    if (scope === 'stack') {
      if (this.context.stack.variables.has(name)) {
        return { success: true, value: this.context.stack.variables.get(name) }
      }
      return {
        success: false,
        error: {
          type: 'RuntimeError',
          message: `Undefined stack variable: ${name}`,
        },
      }
    }

    return {
      success: false,
      error: {
        type: 'RuntimeError',
        message: `Unknown scope: ${scope}`,
      },
    }
  }

  /**
   * Set variable in specified scope.
   * REQ-HT-006, 3.2
   */
  private setVariable(name: string, scope: 'local' | 'card' | 'stack', value: any): ExecutionResult {
    if (scope === 'local') {
      this.context.localVariables.set(name, value)
    } else if (scope === 'card') {
      this.context.currentCard.variables.set(name, value)
    } else if (scope === 'stack') {
      this.context.stack.variables.set(name, value)
    } else {
      return {
        success: false,
        error: {
          type: 'RuntimeError',
          message: `Unknown scope: ${scope}`,
        },
      }
    }
    return { success: true, value: undefined }
  }

  /**
   * Helper: find field by name in card (or background).
   */
  private findFieldByName(card: Card, fieldName: string): Field | null {
    // Check card fields
    for (const field of card.fields) {
      if (field.name.toLowerCase() === fieldName.toLowerCase()) {
        return field
      }
    }

    // Check background fields if card has a background
    if (card.backgroundId) {
      const background = this.context.stack.backgrounds.find((b) => b.id === card.backgroundId)
      if (background) {
        for (const field of background.fields) {
          if (field.name.toLowerCase() === fieldName.toLowerCase()) {
            return field
          }
        }
      }
    }

    return null
  }

  /**
   * Helper: coerce value to number.
   */
  private coerceToNumber(value: any): number {
    if (typeof value === 'number') return value
    if (typeof value === 'boolean') return value ? 1 : 0
    if (typeof value === 'string') {
      const parsed = parseFloat(value)
      return isNaN(parsed) ? 0 : parsed
    }
    return 0
  }

  /**
   * Helper: check if value is truthy.
   */
  private isTruthy(value: any): boolean {
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value !== 0
    if (typeof value === 'string') return value.length > 0
    if (value === null || value === undefined) return false
    return true
  }
}

/**
 * Convenience function to create context and execute program.
 * REQ-HT-003
 */
export function executeProgram(program: Program, stack: Stack, currentCard: Card): ExecutionResult {
  const context = createExecutionContext(stack, currentCard)
  const runtime = new Runtime(context)
  return runtime.execute(program)
}

/**
 * Handler interface for message passing.
 * REQ-HT-004
 */
export interface Handler {
  name: string
  source: string
  ast: Statement[]
}

/**
 * Message Dispatcher: routes messages through element hierarchy.
 * REQ-HT-004, 3.15, 3.16, 3.17, 3.18, 3.19
 */
export class MessageDispatcher {
  /**
   * Send a message to a target element, propagating through hierarchy:
   * element → card → background → stack.
   * REQ-HT-004, 3.15
   */
  static send(
    messageName: string,
    targetElement: any,
    context: ExecutionContext,
  ): ExecutionResult {
    const scope: Array<{ element: any; type: string }> = []

    // Determine hierarchy based on target type
    if (targetElement.type === 'button' || (targetElement.label !== undefined && targetElement.rect !== undefined)) {
      // Target is a button
      scope.push({ element: targetElement, type: 'button' })
      scope.push({ element: context.currentCard, type: 'card' })

      // Add background if card has one
      if (context.currentCard.backgroundId) {
        const bg = context.stack.backgrounds.find((b) => b.id === context.currentCard.backgroundId)
        if (bg) scope.push({ element: bg, type: 'background' })
      }

      scope.push({ element: context.stack, type: 'stack' })
    } else if (targetElement === context.currentCard || targetElement.id === context.currentCard.id) {
      // Target is a card
      scope.push({ element: context.currentCard, type: 'card' })

      // Add background if card has one
      if (context.currentCard.backgroundId) {
        const bg = context.stack.backgrounds.find((b) => b.id === context.currentCard.backgroundId)
        if (bg) scope.push({ element: bg, type: 'background' })
      }

      scope.push({ element: context.stack, type: 'stack' })
    } else {
      // Direct element
      scope.push({ element: targetElement, type: 'unknown' })
      scope.push({ element: context.currentCard, type: 'card' })

      if (context.currentCard.backgroundId) {
        const bg = context.stack.backgrounds.find((b) => b.id === context.currentCard.backgroundId)
        if (bg) scope.push({ element: bg, type: 'background' })
      }

      scope.push({ element: context.stack, type: 'stack' })
    }

    // Walk hierarchy and invoke handlers
    for (const { element, type } of scope) {
      const handler = MessageDispatcher.findHandler(messageName, element)
      if (handler) {
        const result = MessageDispatcher.invokeHandler(handler, context)
        if (!result.success) return result
        // Handler executed; continue to next in hierarchy
      }
    }

    return { success: true, value: undefined }
  }

  /**
   * Find handler by name on element/card/background/stack.
   * REQ-HT-004, 3.16
   */
  static findHandler(handlerName: string, element: any): Handler | null {
    if (!element || !element.scripts) return null

    // Try exact match (no "on" prefix)
    const source = element.scripts[handlerName]
    if (source) {
      return MessageDispatcher.parseHandler(handlerName, source)
    }

    // Try with "on" prefix
    const onPrefixSource = element.scripts[`on ${handlerName}`]
    if (onPrefixSource) {
      return MessageDispatcher.parseHandler(handlerName, onPrefixSource)
    }

    return null
  }

  /**
   * Parse handler source into AST statements.
   */
  private static parseHandler(handlerName: string, source: string): Handler | null {
    try {
      let toparse = source

      // If source already starts with "on", parse it as-is
      if (toparse.trim().toLowerCase().startsWith('on ')) {
        const lexer = new Lexer(toparse)
        const tokensOrError = lexer.tokenize()
        if ('type' in tokensOrError && tokensOrError.type === 'LexError') {
          return null
        }

        const parser = new Parser(tokensOrError as any[])
        const ast = parser.parse()
        if ('type' in ast && ast.type === 'ParseError') {
          return null
        }

        const program = ast as Program

        // Find the handler in the program
        for (const handler of program.handlers) {
          if (handler.name.toLowerCase() === handlerName.toLowerCase()) {
            return {
              name: handlerName,
              source,
              ast: handler.body,
            }
          }
        }

        // If no named handler found, treat all statements as handler body
        return {
          name: handlerName,
          source,
          ast: program.statements,
        }
      } else {
        // Source doesn't have handler wrapper; treat as plain statements
        // Wrap in a handler for parsing
        toparse = `on ${handlerName}\n${source}\nend ${handlerName}`

        const lexer = new Lexer(toparse)
        const tokensOrError = lexer.tokenize()
        if ('type' in tokensOrError && tokensOrError.type === 'LexError') {
          return null
        }

        const parser = new Parser(tokensOrError as any[])
        const ast = parser.parse()
        if ('type' in ast && ast.type === 'ParseError') {
          return null
        }

        const program = ast as Program

        // Get the statements from the handler
        if (program.handlers.length > 0) {
          return {
            name: handlerName,
            source,
            ast: program.handlers[0].body,
          }
        }

        return {
          name: handlerName,
          source,
          ast: program.statements,
        }
      }
    } catch (e) {
      console.error(`Failed to parse handler ${handlerName}:`, e)
      return null
    }
  }

  /**
   * Invoke handler with new execution context.
   * REQ-HT-004, 3.17
   */
  static invokeHandler(handler: Handler, parentContext: ExecutionContext): ExecutionResult {
    // Create new context with fresh local scope but inherited card/stack variables
    const freshContext: ExecutionContext = {
      stack: parentContext.stack,
      currentCard: parentContext.currentCard,
      localVariables: new Map(), // Fresh local scope
      callStack: [...parentContext.callStack, handler.name],
      stepCount: parentContext.stepCount,
      startTime: parentContext.startTime,
      sandboxViolations: parentContext.sandboxViolations,
    }

    const runtime = new Runtime(freshContext)

    // Execute handler statements
    for (const stmt of handler.ast) {
      const result = runtime.executeStatement(stmt as Statement)
      if (!result.success) return result
    }

    // Update parent context with any sandbox violations that occurred
    parentContext.sandboxViolations = freshContext.sandboxViolations
    parentContext.stepCount = freshContext.stepCount

    return { success: true, value: undefined }
  }
}

/**
 * Convenience function to dispatch mouseUp message on a button.
 * REQ-HT-004, 3.19
 */
export function dispatchMouseUp(button: any, context: ExecutionContext): ExecutionResult {
  return MessageDispatcher.send('mouseUp', button, context)
}

/**
 * Convenience function to dispatch openCard message on a card.
 * REQ-HT-004, 3.18
 */
export function dispatchOpenCard(card: Card, context: ExecutionContext): ExecutionResult {
  return MessageDispatcher.send('openCard', card, context)
}
