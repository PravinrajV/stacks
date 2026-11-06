/**
 * Parser for HyperTalk: converts tokens into an Abstract Syntax Tree (AST).
 *
 * Handles:
 * - Expression parsing with operator precedence
 * - Statement parsing (if/else, repeat/while, put, get, go, answer, return)
 * - Handler definitions (on <name> ... end)
 * - Function calls
 * - Error reporting with line/column information
 */

import { Token, LexError } from './lexer'

/**
 * Base AST node interface.
 * REQ-HT-002
 */
export interface ASTNode {
  type: string
  line: number
  column: number
}

/**
 * Expression node types (discriminated union base).
 * REQ-HT-002, REQ-HT-005
 */
export interface ExpressionBase extends ASTNode {
  type:
    | 'Literal'
    | 'Identifier'
    | 'BinaryOp'
    | 'UnaryOp'
    | 'FunctionCall'
    | 'FieldAccess'
    | 'VariableAccess'
}

export interface LiteralExpr extends ExpressionBase {
  type: 'Literal'
  value: string | number | boolean
}

export interface IdentifierExpr extends ExpressionBase {
  type: 'Identifier'
  name: string
}

export interface BinaryOpExpr extends ExpressionBase {
  type: 'BinaryOp'
  op: string
  left: Expression
  right: Expression
}

export interface UnaryOpExpr extends ExpressionBase {
  type: 'UnaryOp'
  op: string
  operand: Expression
}

export interface FunctionCallExpr extends ExpressionBase {
  type: 'FunctionCall'
  name: string
  args: Expression[]
}

export interface FieldAccessExpr extends ExpressionBase {
  type: 'FieldAccess'
  fieldName: Expression // Can be string or identifier
}

export interface VariableAccessExpr extends ExpressionBase {
  type: 'VariableAccess'
  name: string
  scope?: 'card' | 'stack' | 'local'
}

/**
 * Expression discriminated union.
 */
export type Expression =
  | LiteralExpr
  | IdentifierExpr
  | BinaryOpExpr
  | UnaryOpExpr
  | FunctionCallExpr
  | FieldAccessExpr
  | VariableAccessExpr

/**
 * Statement node types (must be defined after expression for forward references).
 * REQ-HT-002, REQ-HT-005
 */
export interface PutStatement extends ASTNode {
  type: 'PutStatement'
  value: Expression
  target: Expression
}

export interface GetStatement extends ASTNode {
  type: 'GetStatement'
  expr: Expression
}

export interface GoStatement extends ASTNode {
  type: 'GoStatement'
  destination: Expression
}

export interface AnswerStatement extends ASTNode {
  type: 'AnswerStatement'
  message: Expression
  buttons?: Expression[]
}

export interface IfStatement extends ASTNode {
  type: 'IfStatement'
  condition: Expression
  thenBranch: Statement[]
  elseBranch?: Statement[]
}

export interface RepeatStatement extends ASTNode {
  type: 'RepeatStatement'
  kind: 'while' | 'until' | 'count'
  condition?: Expression
  count?: Expression
  body: Statement[]
}

export interface ReturnStatement extends ASTNode {
  type: 'ReturnStatement'
  value?: Expression
}

export interface ExpressionStatement extends ASTNode {
  type: 'ExpressionStatement'
  expr: Expression
}

/**
 * Statement discriminated union.
 */
export type Statement =
  | PutStatement
  | GetStatement
  | GoStatement
  | AnswerStatement
  | IfStatement
  | RepeatStatement
  | ReturnStatement
  | ExpressionStatement

/**
 * Deprecated: Use Statement type directly instead.
 * Statement node type discriminated union.
 */
export type StatementNode = Statement

/**
 * Handler definition.
 * REQ-HT-002, REQ-HT-004
 */
export interface HandlerDefinition extends ASTNode {
  type: 'HandlerDefinition'
  name: string
  parameters?: string[]
  body: Statement[]
}

/**
 * Program: array of handler definitions or statements.
 */
export interface Program extends ASTNode {
  type: 'Program'
  handlers: HandlerDefinition[]
  statements: Statement[]
}

/**
 * Parse error interface.
 * REQ-HT-002, REQ-EH-001
 */
export interface ParseError {
  type: 'ParseError'
  message: string
  line: number
  column: number
}

/**
 * Parser class: converts tokens to AST.
 * REQ-HT-002, REQ-EH-001
 */
export class Parser {
  private tokens: Token[]
  private current: number = 0
  private inHandler: boolean = false

  constructor(tokens: Token[]) {
    this.tokens = tokens
  }

  /**
   * Parse tokens into a Program AST.
   * REQ-HT-002
   */
  parse(): Program | ParseError {
    const handlers: HandlerDefinition[] = []
    const statements: Statement[] = []

    try {
      while (!this.isAtEnd()) {
        if (this.check('keyword') && this.peek().value === 'ON') {
          const handler = this.parseHandlerDefinition()
          if ('type' in handler && handler.type === 'ParseError') return handler
          handlers.push(handler as HandlerDefinition)
        } else if (!this.check('eof')) {
          const stmt = this.parseStatement()
          if ('type' in stmt && stmt.type === 'ParseError') return stmt
          statements.push(stmt as Statement)
        } else {
          break
        }
      }

      return {
        type: 'Program',
        handlers,
        statements,
        line: 1,
        column: 1
      }
    } catch (e) {
      return {
        type: 'ParseError',
        message: (e as Error).message || 'Parse error',
        line: this.peek().line,
        column: this.peek().column
      }
    }
  }

  /**
   * Parse a handler definition: on <name> <statements> end
   * REQ-HT-002, REQ-HT-004
   */
  private parseHandlerDefinition(): HandlerDefinition | ParseError {
    const startToken = this.advance()
    if (startToken.value !== 'ON') {
      return this.error('Expected "on"')
    }

    if (!this.check('identifier')) {
      return this.error('Expected handler name')
    }
    const nameToken = this.advance()
    const name = nameToken.value

    // Parse parameters if present (optional for now)
    const parameters: string[] = []

    // Parse body until 'end'
    const body: Statement[] = []
    const prevInHandler = this.inHandler
    this.inHandler = true
    while (!this.isAtEnd() && !(this.check('keyword') && this.peek().value === 'END')) {
      const stmt = this.parseStatement()
      if ('type' in stmt && stmt.type === 'ParseError') {
        this.inHandler = prevInHandler
        return stmt
      }
      body.push(stmt as Statement)
    }
    this.inHandler = prevInHandler

    if (!this.match('keyword', 'END')) {
      return this.error('Expected "end"')
    }

    // Consume optional handler name after end (e.g., "end mouseUp")
    if (this.check('identifier')) {
      this.advance()
    }

    return {
      type: 'HandlerDefinition',
      name,
      parameters: parameters.length > 0 ? parameters : undefined,
      body,
      line: startToken.line,
      column: startToken.column
    }
  }

  /**
   * Parse a statement.
   * REQ-HT-002, REQ-HT-005
   */
  private parseStatement(): Statement | ParseError {
    // Check for keyword statements first
    if (this.check('keyword')) {
      const keyword = this.peek().value

      if (keyword === 'IF') {
        this.advance()
        return this.parseIfStatement()
      }

      if (keyword === 'REPEAT') {
        this.advance()
        return this.parseRepeatStatement()
      }

      if (keyword === 'PUT') {
        this.advance()
        return this.parsePutStatement()
      }

      if (keyword === 'GET') {
        this.advance()
        return this.parseGetStatement()
      }

      if (keyword === 'GO') {
        this.advance()
        return this.parseGoStatement()
      }

      if (keyword === 'ANSWER') {
        this.advance()
        return this.parseAnswerStatement()
      }

      if (keyword === 'RETURN') {
        this.advance()
        return this.parseReturnStatement()
      }
    }

    // expression statement (fallback)
    const expr = this.parseExpression()
    if ('type' in expr && expr.type === 'ParseError') return expr
    return {
      type: 'ExpressionStatement',
      expr: expr as Expression,
      line: (expr as Expression).line,
      column: (expr as Expression).column
    } as ExpressionStatement
  }

  /**
   * Parse if statement: if <expr> then <stmts> [else <stmts>] end if
   * REQ-HT-002, REQ-HT-005
   */
  private parseIfStatement(): IfStatement | ParseError {
    const startToken = this.previous()

    const condition = this.parseExpression()
    if ('type' in condition && condition.type === 'ParseError') return condition

    if (!this.match('keyword', 'THEN')) {
      return this.error('Expected "then" after if condition')
    }

    const thenBranch: Statement[] = []
    const prevInHandler = this.inHandler
    this.inHandler = true
    while (
      !this.isAtEnd() &&
      !(this.check('keyword') && (this.peek().value === 'ELSE' || this.peek().value === 'END'))
    ) {
      const stmt = this.parseStatement()
      if ('type' in stmt && stmt.type === 'ParseError') {
        this.inHandler = prevInHandler
        return stmt
      }
      thenBranch.push(stmt as Statement)
    }

    let elseBranch: Statement[] | undefined = undefined
    if (this.match('keyword', 'ELSE')) {
      elseBranch = []
      while (!this.isAtEnd() && !(this.check('keyword') && this.peek().value === 'END')) {
        const stmt = this.parseStatement()
        if ('type' in stmt && stmt.type === 'ParseError') {
          this.inHandler = prevInHandler
          return stmt
        }
        elseBranch.push(stmt as Statement)
      }
    }

    this.inHandler = prevInHandler

    if (!this.match('keyword', 'END')) {
      return this.error('Expected "end" to close if statement')
    }

    // Must have 'if' after 'end'
    if (!this.match('keyword', 'IF')) {
      return this.error('Expected "if" after "end"')
    }

    return {
      type: 'IfStatement',
      condition: condition as Expression,
      thenBranch,
      elseBranch,
      line: startToken.line,
      column: startToken.column
    } as IfStatement
  }


  /**
   * Parse repeat statement: repeat while/until/count
   * REQ-HT-002, REQ-HT-005
   */
  private parseRepeatStatement(): RepeatStatement | ParseError {
    const startToken = this.previous()

    let kind: 'while' | 'until' | 'count' = 'count'
    let condition: Expression | undefined = undefined
    let count: Expression | undefined = undefined

    if (this.match('keyword', 'WHILE')) {
      kind = 'while'
      const cond = this.parseExpression()
      if ('type' in cond && cond.type === 'ParseError') return cond
      condition = cond as Expression
    } else if (this.match('keyword', 'UNTIL')) {
      kind = 'until'
      const cond = this.parseExpression()
      if ('type' in cond && cond.type === 'ParseError') return cond
      condition = cond as Expression
    } else {
      // repeat N times
      kind = 'count'
      const cnt = this.parseExpression()
      if ('type' in cnt && cnt.type === 'ParseError') return cnt
      count = cnt as Expression
      if (!this.match('keyword', 'TIMES')) {
        return this.error('Expected "times" after repeat count')
      }
    }

    const body: Statement[] = []
    const prevInHandler = this.inHandler
    this.inHandler = true
    while (!this.isAtEnd() && !(this.check('keyword') && this.peek().value === 'END')) {
      const stmt = this.parseStatement()
      if ('type' in stmt && stmt.type === 'ParseError') {
        this.inHandler = prevInHandler
        return stmt
      }
      body.push(stmt as Statement)
    }
    this.inHandler = prevInHandler

    if (!this.match('keyword', 'END')) {
      return this.error('Expected "end" to close repeat statement')
    }

    if (this.check('keyword') && this.peek().value === 'REPEAT') {
      this.advance()
    }

    return {
      type: 'RepeatStatement',
      kind,
      condition,
      count,
      body,
      line: startToken.line,
      column: startToken.column
    } as RepeatStatement
  }

  /**
   * Parse put statement: put <expr> [into <target>]
   * REQ-HT-002, REQ-HT-005
   */
  private parsePutStatement(): PutStatement | ParseError {
    const startToken = this.previous()

    const value = this.parseExpression()
    if ('type' in value && value.type === 'ParseError') return value

    let target: Expression
    if (this.match('keyword', 'INTO')) {
      const tgt = this.parseExpression()
      if ('type' in tgt && tgt.type === 'ParseError') return tgt
      target = tgt as Expression
    } else if (this.inHandler) {
      // Inside a handler, default to 'result' variable
      target = {
        type: 'Identifier',
        name: 'result',
        line: startToken.line,
        column: startToken.column
      } as IdentifierExpr
    } else {
      // At top level, 'into' is required
      return this.error('Expected "into" in put statement')
    }

    return {
      type: 'PutStatement',
      value: value as Expression,
      target,
      line: startToken.line,
      column: startToken.column
    } as PutStatement
  }

  /**
   * Parse get statement: get <expr>
   * REQ-HT-002, REQ-HT-005
   */
  private parseGetStatement(): GetStatement | ParseError {
    const startToken = this.previous()

    const expr = this.parseExpression()
    if ('type' in expr && expr.type === 'ParseError') return expr

    return {
      type: 'GetStatement',
      expr: expr as Expression,
      line: startToken.line,
      column: startToken.column
    } as GetStatement
  }

  /**
   * Parse go statement: go to card <expr>, go next/previous/first/last card
   * REQ-HT-002, REQ-HT-005
   */
  private parseGoStatement(): GoStatement | ParseError {
    const startToken = this.previous()

    // Optional 'to'
    this.match('keyword', 'TO')

    let destination: Expression
    if (this.match('keyword', 'NEXT')) {
      this.match('keyword', 'CARD')
      destination = {
        type: 'Identifier',
        name: 'next',
        line: this.previous().line,
        column: this.previous().column
      } as IdentifierExpr
    } else if (this.match('keyword', 'PREVIOUS')) {
      this.match('keyword', 'CARD')
      destination = {
        type: 'Identifier',
        name: 'previous',
        line: this.previous().line,
        column: this.previous().column
      } as IdentifierExpr
    } else if (this.match('keyword', 'FIRST')) {
      this.match('keyword', 'CARD')
      destination = {
        type: 'Identifier',
        name: 'first',
        line: this.previous().line,
        column: this.previous().column
      } as IdentifierExpr
    } else if (this.match('keyword', 'LAST')) {
      this.match('keyword', 'CARD')
      destination = {
        type: 'Identifier',
        name: 'last',
        line: this.previous().line,
        column: this.previous().column
      } as IdentifierExpr
    } else if (this.match('keyword', 'CARD')) {
      // go to card <expr>
      const cardNum = this.parseExpression()
      if ('type' in cardNum && cardNum.type === 'ParseError') return cardNum
      destination = cardNum as Expression
    } else {
      const dest = this.parseExpression()
      if ('type' in dest && dest.type === 'ParseError') return dest
      destination = dest as Expression
    }

    return {
      type: 'GoStatement',
      destination: destination as Expression,
      line: startToken.line,
      column: startToken.column
    } as GoStatement
  }

  /**
   * Parse answer statement: answer <message> [with button ...]
   * REQ-HT-002, REQ-HT-005
   */
  private parseAnswerStatement(): AnswerStatement | ParseError {
    const startToken = this.previous()

    const message = this.parseExpression()
    if ('type' in message && message.type === 'ParseError') return message

    const buttons: Expression[] = []
    while (this.match('keyword', 'WITH')) {
      if (!this.match('keyword', 'BUTTON')) {
        return this.error('Expected "button" after "with"')
      }
      const button = this.parseExpression()
      if ('type' in button && button.type === 'ParseError') return button
      buttons.push(button as Expression)

      if (!this.match('keyword', 'OR')) {
        break
      }
    }

    return {
      type: 'AnswerStatement',
      message: message as Expression,
      buttons: buttons.length > 0 ? buttons : undefined,
      line: startToken.line,
      column: startToken.column
    } as AnswerStatement
  }

  /**
   * Parse return statement: return [<expr>]
   * REQ-HT-002, REQ-HT-005
   */
  private parseReturnStatement(): ReturnStatement | ParseError {
    const startToken = this.previous()

    let value: Expression | undefined = undefined
    if (!this.isAtEnd() && !this.check('keyword')) {
      const val = this.parseExpression()
      if ('type' in val && val.type === 'ParseError') return val
      value = val as Expression
    }

    return {
      type: 'ReturnStatement',
      value,
      line: startToken.line,
      column: startToken.column
    } as ReturnStatement
  }

  /**
   * Parse expression with operator precedence.
   * Precedence: * / > + - > comparison > logical
   * REQ-HT-002, REQ-HT-005, REQ-HT-008
   */
  private parseExpression(): Expression | ParseError {
    return this.parseLogicalOr()
  }

  /**
   * Parse logical OR (lowest precedence).
   */
  private parseLogicalOr(): Expression | ParseError {
    let expr = this.parseLogicalAnd()
    if ('type' in expr && expr.type === 'ParseError') return expr

    while (this.match('keyword', 'OR')) {
      const op = this.previous().value
      const right = this.parseLogicalAnd()
      if ('type' in right && right.type === 'ParseError') return right
      expr = {
        type: 'BinaryOp',
        op,
        left: expr as Expression,
        right: right as Expression,
        line: (expr as Expression).line,
        column: (expr as Expression).column
      } as BinaryOpExpr
    }

    return expr
  }

  /**
   * Parse logical AND.
   */
  private parseLogicalAnd(): Expression | ParseError {
    let expr = this.parseComparison()
    if ('type' in expr && expr.type === 'ParseError') return expr

    while (this.match('keyword', 'AND')) {
      const op = this.previous().value
      const right = this.parseComparison()
      if ('type' in right && right.type === 'ParseError') return right
      expr = {
        type: 'BinaryOp',
        op,
        left: expr as Expression,
        right: right as Expression,
        line: (expr as Expression).line,
        column: (expr as Expression).column
      } as BinaryOpExpr
    }

    return expr
  }

  /**
   * Parse comparison operators.
   */
  private parseComparison(): Expression | ParseError {
    let expr = this.parseAdditive()
    if ('type' in expr && expr.type === 'ParseError') return expr

    while (
      this.match('operator', '<') ||
      this.match('operator', '>') ||
      this.match('operator', '=') ||
      this.match('operator', '!=') ||
      this.match('operator', '<=') ||
      this.match('operator', '>=')
    ) {
      const op = this.previous().value
      const right = this.parseAdditive()
      if ('type' in right && right.type === 'ParseError') return right
      expr = {
        type: 'BinaryOp',
        op,
        left: expr as Expression,
        right: right as Expression,
        line: (expr as Expression).line,
        column: (expr as Expression).column
      } as BinaryOpExpr
    }

    return expr
  }

  /**
   * Parse additive operators (+ - &).
   * & is string concatenation.
   */
  private parseAdditive(): Expression | ParseError {
    let expr = this.parseMultiplicative()
    if ('type' in expr && expr.type === 'ParseError') return expr

    while (this.match('operator', '+') || this.match('operator', '-') || this.match('operator', '&')) {
      const op = this.previous().value
      const right = this.parseMultiplicative()
      if ('type' in right && right.type === 'ParseError') return right
      expr = {
        type: 'BinaryOp',
        op,
        left: expr as Expression,
        right: right as Expression,
        line: (expr as Expression).line,
        column: (expr as Expression).column
      } as BinaryOpExpr
    }

    return expr
  }

  /**
   * Parse multiplicative operators (* /).
   */
  private parseMultiplicative(): Expression | ParseError {
    let expr = this.parseUnary()
    if ('type' in expr && expr.type === 'ParseError') return expr

    while (this.match('operator', '*') || this.match('operator', '/')) {
      const op = this.previous().value
      const right = this.parseUnary()
      if ('type' in right && right.type === 'ParseError') return right
      expr = {
        type: 'BinaryOp',
        op,
        left: expr as Expression,
        right: right as Expression,
        line: (expr as Expression).line,
        column: (expr as Expression).column
      } as BinaryOpExpr
    }

    return expr
  }

  /**
   * Parse unary operators (NOT, -).
   */
  private parseUnary(): Expression | ParseError {
    if (this.match('keyword', 'NOT')) {
      const operand = this.parseUnary()
      if ('type' in operand && operand.type === 'ParseError') return operand
      return {
        type: 'UnaryOp',
        op: 'NOT',
        operand: operand as Expression,
        line: this.previous().line,
        column: this.previous().column
      } as UnaryOpExpr
    }

    if (this.match('operator', '-')) {
      const operand = this.parseUnary()
      if ('type' in operand && operand.type === 'ParseError') return operand
      return {
        type: 'UnaryOp',
        op: '-',
        operand: operand as Expression,
        line: this.previous().line,
        column: this.previous().column
      } as UnaryOpExpr
    }

    return this.parsePostfix()
  }

  /**
   * Parse postfix expressions (function calls, field/variable access).
   * REQ-HT-002, REQ-HT-005, REQ-HT-011
   */
  private parsePostfix(): Expression | ParseError {
    let expr = this.parsePrimary()
    if ('type' in expr && expr.type === 'ParseError') return expr

    while (true) {
      if (this.match('punctuation', '(')) {
        // Function call
        if ((expr as any).type !== 'Identifier') {
          return this.error('Invalid function call')
        }
        const name = (expr as IdentifierExpr).name
        const args: Expression[] = []

        if (!this.check('punctuation', ')')) {
          while (true) {
            const arg = this.parseExpression()
            if ('type' in arg && arg.type === 'ParseError') return arg
            args.push(arg as Expression)
            if (!this.match('punctuation', ',')) {
              break
            }
          }
        }

        if (!this.match('punctuation', ')')) {
          return this.error('Expected ")" after function arguments')
        }

        expr = {
          type: 'FunctionCall',
          name,
          args,
          line: (expr as Expression).line,
          column: (expr as Expression).column
        } as FunctionCallExpr
      } else {
        break
      }
    }

    return expr
  }

  /**
   * Parse primary expressions (literals, identifiers, parenthesized, field/variable access).
   * REQ-HT-002, REQ-HT-005
   */
  private parsePrimary(): Expression | ParseError {
    const token = this.peek()

    // Literal: string
    if (this.match('string')) {
      const value = this.previous().value
      return {
        type: 'Literal',
        value,
        line: token.line,
        column: token.column
      } as LiteralExpr
    }

    // Literal: number
    if (this.match('number')) {
      const value = parseFloat(this.previous().value)
      return {
        type: 'Literal',
        value,
        line: token.line,
        column: token.column
      } as LiteralExpr
    }

    // Literal: boolean
    if (this.match('keyword', 'TRUE')) {
      return {
        type: 'Literal',
        value: true,
        line: token.line,
        column: token.column
      } as LiteralExpr
    }

    if (this.match('keyword', 'FALSE')) {
      return {
        type: 'Literal',
        value: false,
        line: token.line,
        column: token.column
      } as LiteralExpr
    }

    // field/button access
    if (this.match('keyword', 'FIELD')) {
      const fieldName = this.parsePrimary()
      if ('type' in fieldName && fieldName.type === 'ParseError') return fieldName
      return {
        type: 'FieldAccess',
        fieldName: fieldName as Expression,
        line: token.line,
        column: token.column
      } as FieldAccessExpr
    }

    // Scoped variables: `card name` and `stack name`.
    // A bare identifier is local to the handler and does not survive the click.
    if (this.check('keyword', 'CARD') || this.check('keyword', 'STACK')) {
      const scopeToken = this.advance()
      const scope = scopeToken.value === 'STACK' ? 'stack' : 'card'
      if (!this.match('identifier')) {
        return this.error(`Expected variable name after ${scope}`)
      }
      const name = this.previous().value
      return {
        type: 'VariableAccess',
        name,
        scope,
        line: token.line,
        column: token.column
      } as VariableAccessExpr
    }

    // Parenthesized expression
    if (this.match('punctuation', '(')) {
      const expr = this.parseExpression()
      if ('type' in expr && expr.type === 'ParseError') return expr
      if (!this.match('punctuation', ')')) {
        return this.error('Expected ")" after expression')
      }
      return expr
    }

    // Identifier
    if (this.match('identifier')) {
      const name = this.previous().value
      return {
        type: 'Identifier',
        name,
        line: token.line,
        column: token.column
      } as IdentifierExpr
    }

    return this.error(`Unexpected token: ${token.value}`)
  }

  // ===== Helper methods =====

  /**
   * Check if current token matches type.
   */
  private check(type: string, value?: string): boolean {
    if (this.isAtEnd()) return false
    const token = this.peek()
    if (token.type !== type) return false
    if (value && token.value !== value) return false
    return true
  }

  /**
   * Check and consume token if it matches.
   */
  private match(type: string, value?: string): boolean {
    if (this.check(type, value)) {
      this.advance()
      return true
    }
    return false
  }

  /**
   * Advance and return previous token.
   */
  private advance(): Token {
    if (!this.isAtEnd()) this.current++
    return this.previous()
  }

  /**
   * Check if at end of tokens.
   */
  private isAtEnd(): boolean {
    return this.peek().type === 'eof'
  }

  /**
   * Get current token.
   */
  private peek(): Token {
    return this.tokens[this.current]
  }

  /**
   * Get previous token.
   */
  private previous(): Token {
    return this.tokens[this.current - 1]
  }

  /**
   * Emit parse error.
   */
  private error(message: string): ParseError {
    const token = this.peek()
    return {
      type: 'ParseError',
      message,
      line: token.line,
      column: token.column
    }
  }
}

/**
 * Convenience function to parse tokens into AST.
 * REQ-HT-002
 */
export function parse(tokens: Token[]): Program | ParseError {
  const parser = new Parser(tokens)
  return parser.parse()
}
