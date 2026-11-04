# HyperTalk Language Conventions

Style guide for implementing and testing HyperTalk features in the Stacks interpreter.

## Lexer Conventions

- Keywords: case-insensitive (IF, if, If all valid)
- Identifiers: alphanumeric + underscore
- Strings: double-quoted, support escape sequences (\n, \t, \\, \")
- Comments: `--` to end of line
- Numbers: integers and floats (42, 3.14)

## Parser Conventions

- Handler definitions: `on HANDLER_NAME ... end HANDLER_NAME`
- Statements: lowercase keywords in AST (put, get, go, answer, if, repeat, return, exit)
- Expressions: operators with standard precedence (unary > *, / > +, - > comparison > logical)
- Field access: `field "NAME"` syntax
- Variable scoping: local (function scope), card-level, stack-level

## Runtime Conventions

- Variable scope chain: local → card → stack
- "it" variable: holds result of last get statement
- Field content: access via field reference, update via put statement
- Handler invocation: message name + optional parameters
- Error handling: throw with error message and context

## Testing Conventions

- Test files colocated: `*.test.ts` next to source files
- Property-based tests for lexer/parser: use fast-check
- Integration tests: use initApp() and real DOM events
- No mock stubs for DOM or storage in core interpreter tests
- Name tests descriptively: "parse field access", not "test1"

## Comments & Documentation

- JSDoc on public exports
- Line comments for complex logic: `// Divide by zoom level to convert client pixels to card units`
- No code comments for obvious operations

## Code Style

- Strict TypeScript
- Discriminated union types for AST nodes
- No eval or dynamic code generation
- Error types: explicit interfaces (LexError, ParseError)
- Null handling: explicit null checks, not optional chaining for critical paths

## Security

- Sandbox all script execution: no fetch, require, window access
- Validate all field/variable references before access
- No innerHTML; use textContent or safe DOM APIs
- Input validation: trim strings, check bounds before array access
