/**
 * Lexer for HyperTalk: converts source code into tokens.
 *
 * Handles:
 * - Keywords (case-insensitive)
 * - Identifiers and field/button references
 * - Numbers (integers and floats)
 * - Strings with escape sequences
 * - Operators and punctuation
 * - Line/column tracking for error reporting
 */

/**
 * Token interface represents a single token with type, value, and position.
 * REQ-HT-001
 */
export interface Token {
  type:
    | 'keyword'
    | 'identifier'
    | 'string'
    | 'number'
    | 'operator'
    | 'punctuation'
    | 'eof'
  value: string
  line: number
  column: number
  start?: number // Byte offset in source
  end?: number   // Byte offset in source
}

/**
 * Reserved HyperTalk keywords (uppercase for case-insensitive matching).
 * REQ-HT-001, REQ-HT-002
 */
const KEYWORDS = new Set([
  'IF',
  'THEN',
  'ELSE',
  'END',
  'REPEAT',
  'WHILE',
  'UNTIL',
  'PUT',
  'INTO',
  'GET',
  'GO',
  'TO',
  'CARD',
  'STACK',
  'BACKGROUND',
  'NEXT',
  'PREVIOUS',
  'FIRST',
  'LAST',
  'ANSWER',
  'WITH',
  'OR',
  'BUTTON',
  'FIELD',
  'ON',
  'AND',
  'NOT',
  'RETURN',
  'EXIT',
  'TIMES',
  'TRUE',
  'FALSE',
  'THE',
  'OF',
  'FROM'
])

/**
 * Operators and multi-character operators.
 * REQ-HT-001, REQ-HT-004
 */
const OPERATORS = ['!=', '<=', '>=', '+', '-', '*', '/', '<', '>', '=', '&']

/**
 * Punctuation characters.
 * REQ-HT-001
 */
const PUNCTUATION = ['(', ')', '{', '}', '[', ']', ':', ',']

/**
 * Lexer error interface for detailed error reporting.
 * REQ-HT-001, REQ-EH-001
 */
export interface LexError {
  type: 'LexError'
  message: string
  line: number
  column: number
}

/**
 * Lexer class: tokenizes HyperTalk source code.
 * Tracks line/column for error reporting.
 * REQ-HT-001, REQ-EH-001
 */
export class Lexer {
  private source: string
  private position: number = 0
  private line: number = 1
  private column: number = 1
  private tokens: Token[] = []
  private tokenStart: number = 0

  constructor(source: string) {
    this.source = source
  }

  /**
   * Tokenize the source code and return array of tokens.
   * Handles keywords, identifiers, strings, numbers, operators, punctuation.
   * REQ-HT-001
   */
  tokenize(): Token[] | LexError {
    while (this.position < this.source.length) {
      this.skipWhitespace()

      if (this.position >= this.source.length) break

      this.tokenStart = this.position
      const ch = this.source[this.position]

      // String literal
      if (ch === '"') {
        const result = this.readString()
        if ('type' in result && result.type === 'LexError') return result
        this.tokens.push(result)
      }
      // Number
      else if (this.isDigit(ch)) {
        this.tokens.push(this.readNumber())
      }
      // Identifier or keyword
      else if (this.isIdentifierStart(ch)) {
        this.tokens.push(this.readIdentifierOrKeyword())
      }
      // Operators (check multi-char first)
      else if (this.isOperatorStart(ch)) {
        this.tokens.push(this.readOperator())
      }
      // Punctuation
      else if (PUNCTUATION.includes(ch)) {
        const token: Token = {
          type: 'punctuation',
          value: ch,
          line: this.line,
          column: this.column,
          start: this.position,
          end: this.position + 1
        }
        this.tokens.push(token)
        this.advance()
      }
      // Unknown character
      else {
        return {
          type: 'LexError',
          message: `Unknown character: '${ch}'`,
          line: this.line,
          column: this.column
        }
      }
    }

    // Add EOF token
    this.tokens.push({
      type: 'eof',
      value: '',
      line: this.line,
      column: this.column,
      start: this.position,
      end: this.position
    })

    return this.tokens
  }

  /**
   * Read a string literal with escape sequence handling.
   * Supports: \", \\, \n, \t, \r
   * REQ-HT-001, REQ-HT-003
   */
  private readString(): Token | LexError {
    const startLine = this.line
    const startColumn = this.column
    const start = this.position
    this.advance() // Skip opening quote

    let value = ''
    while (this.position < this.source.length) {
      const ch = this.source[this.position]

      if (ch === '"') {
        const end = this.position + 1
        this.advance() // Skip closing quote
        return {
          type: 'string',
          value,
          line: startLine,
          column: startColumn,
          start,
          end
        }
      } else if (ch === '\\') {
        this.advance()
        if (this.position >= this.source.length) {
          return {
            type: 'LexError',
            message: 'Unterminated string escape sequence',
            line: this.line,
            column: this.column
          }
        }
        const nextCh = this.source[this.position]
        switch (nextCh) {
          case '"':
            value += '"'
            break
          case '\\':
            value += '\\'
            break
          case 'n':
            value += '\n'
            break
          case 't':
            value += '\t'
            break
          case 'r':
            value += '\r'
            break
          default:
            value += nextCh
        }
        this.advance()
      } else if (ch === '\n') {
        return {
          type: 'LexError',
          message: 'Unterminated string (newline in string)',
          line: this.line,
          column: this.column
        }
      } else {
        value += ch
        this.advance()
      }
    }

    return {
      type: 'LexError',
      message: `Unterminated string at line ${startLine}, column ${startColumn}`,
      line: startLine,
      column: startColumn
    }
  }

  /**
   * Read a number (integer or float).
   * Does not support scientific notation.
   * REQ-HT-001, REQ-HT-003
   */
  private readNumber(): Token {
    const startLine = this.line
    const startColumn = this.column
    const start = this.position
    let value = ''

    while (this.position < this.source.length && this.isDigit(this.source[this.position])) {
      value += this.source[this.position]
      this.advance()
    }

    // Check for decimal point
    if (
      this.position < this.source.length &&
      this.source[this.position] === '.' &&
      this.position + 1 < this.source.length &&
      this.isDigit(this.source[this.position + 1])
    ) {
      value += '.'
      this.advance()
      while (this.position < this.source.length && this.isDigit(this.source[this.position])) {
        value += this.source[this.position]
        this.advance()
      }
    }

    return {
      type: 'number',
      value,
      line: startLine,
      column: startColumn,
      start,
      end: this.position
    }
  }

  /**
   * Read an identifier or keyword.
   * Keywords are case-insensitive.
   * REQ-HT-001, REQ-HT-002
   */
  private readIdentifierOrKeyword(): Token {
    const startLine = this.line
    const startColumn = this.column
    const start = this.position
    let value = ''

    while (
      this.position < this.source.length &&
      this.isIdentifierPart(this.source[this.position])
    ) {
      value += this.source[this.position]
      this.advance()
    }

    const upperValue = value.toUpperCase()
    const isKeyword = KEYWORDS.has(upperValue)

    return {
      type: isKeyword ? 'keyword' : 'identifier',
      value: isKeyword ? upperValue : value, // Keep uppercase for keywords for parser compatibility
      line: startLine,
      column: startColumn,
      start,
      end: this.position
    }
  }

  /**
   * Read an operator (including multi-character operators like !=, <=, >=).
   * REQ-HT-001, REQ-HT-004
   */
  private readOperator(): Token {
    const startLine = this.line
    const startColumn = this.column
    const start = this.position

    // Check for multi-character operators
    for (const op of OPERATORS) {
      if (this.source.substring(this.position, this.position + op.length) === op) {
        for (let i = 0; i < op.length; i++) {
          this.advance()
        }
        return {
          type: 'operator',
          value: op,
          line: startLine,
          column: startColumn,
          start,
          end: this.position
        }
      }
    }

    // Single-character operator (shouldn't reach here if code is correct)
    const value = this.source[this.position]
    this.advance()
    return {
      type: 'operator',
      value,
      line: startLine,
      column: startColumn,
      start,
      end: this.position
    }
  }

  /**
   * Skip whitespace (spaces, tabs, newlines) and track line/column.
   * REQ-HT-001, REQ-EH-001
   */
  private skipWhitespace(): void {
    while (this.position < this.source.length) {
      const ch = this.source[this.position]
      if (ch === '\n') {
        this.line++
        this.column = 1
        this.position++
      } else if (ch === '\r') {
        // Handle \r or \r\n
        if (this.position + 1 < this.source.length && this.source[this.position + 1] === '\n') {
          this.position++
        }
        this.line++
        this.column = 1
        this.position++
      } else if (ch === ' ' || ch === '\t') {
        this.column++
        this.position++
      } else {
        break
      }
    }
  }

  /**
   * Advance position by one character and update column.
   */
  private advance(): void {
    if (this.position < this.source.length && this.source[this.position] === '\n') {
      this.line++
      this.column = 1
    } else {
      this.column++
    }
    this.position++
  }

  /**
   * Check if character is a digit.
   */
  private isDigit(ch: string): boolean {
    return ch >= '0' && ch <= '9'
  }

  /**
   * Check if character can start an identifier.
   */
  private isIdentifierStart(ch: string): boolean {
    return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_'
  }

  /**
   * Check if character can be part of an identifier.
   */
  private isIdentifierPart(ch: string): boolean {
    return this.isIdentifierStart(ch) || this.isDigit(ch)
  }

  /**
   * Check if character can start an operator.
   */
  private isOperatorStart(ch: string): boolean {
    return OPERATORS.some((op) => op[0] === ch)
  }
}

/**
 * Convenience function to tokenize source code.
 * Returns tokens or error.
 */
export function tokenize(source: string): Token[] | LexError {
  const lexer = new Lexer(source)
  return lexer.tokenize()
}
