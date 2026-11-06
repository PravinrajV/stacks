# Interpreter: HyperTalk Script Execution

Safe, sandboxed execution engine for HyperTalk scripts. No `eval`, no DOM access from scripts.

## Architecture

- **Lexer** (`lexer.ts`) — Tokenizes source code
- **Parser** (`parser.ts`) — Builds Abstract Syntax Tree (AST)
- **Runtime** (`runtime.ts`) — Executes AST in a controlled sandbox
- **Dispatcher** (`dispatcher.ts`) — Routes messages to handlers on cards/buttons

## HyperTalk Subset Supported

### Statements

- `put VALUE into TARGET` — Assign value
- `get EXPRESSION` — Read value (result in "it")
- `go to CARD` — Navigate
- `answer MESSAGE` — Show dialog
- `if COND then ... else ...` — Conditionals
- `repeat TIMES | while COND | until COND ... end repeat` — Loops
- `return VALUE` — Exit handler with result
- `exit repeat` — Break from loop

### Expressions

- Arithmetic: `+`, `-`, `*`, `/`
- Comparison: `=`, `!=`, `<`, `>`, `<=`, `>=`
- Logical: `and`, `or`, `not`
- String concatenation: `&`
- Field access: `field "NAME"`
- Variables: `card name`, `stack name`, or a bare local name (`put 1 into n` lasts only for that handler)

### Built-in Functions

- **String**: `length(s)`, `char(n,s)`, `uppercase(s)`, `lowercase(s)`, `trim(s)`
- **Array**: `split(s,delim)`, `join(arr,delim)`
- **Math**: `abs(n)`, `floor(n)`, `ceil(n)`, `round(n)`, `min(a,b)`, `max(a,b)`

### Handlers

```hypertext
on mouseUp
  put "Handler invoked" into field "Log"
end mouseUp
```

Supported events:
- `mouseUp`, `mouseDown`, `mousemove`
- `keyDown`, `keyUp`
- `openCard`, `closeCard`

## Sandbox & Security

- No access to `window`, `document`, `fetch`, `require`
- No inline `eval`
- All variables scoped to card/stack context
- Field access restricted to named fields on current card

## Example

```typescript
import { Lexer } from './lexer'
import { Parser } from './parser'
import { Runtime } from './runtime'

const script = `on mouseUp
  put "Hello, World" into field "Message"
  answer "Button clicked!"
end mouseUp`

const lexer = new Lexer(script)
const tokens = lexer.tokenize()
const parser = new Parser(tokens)
const ast = parser.parse()

const runtime = new Runtime()
runtime.execute(ast, { /* context */ })
```

## Error Handling

Lexer and Parser return either `Token[] | LexError` and `Program | ParseError` respectively.
The runtime throws on execution errors with stack traces.

## Performance

See `docs/PERFORMANCE.md` for measured benchmarks.
