# Stacks: Technical Architecture

## Stack & Tooling

- **Language**: TypeScript (strict mode).
- **Build & Dev**: Vite (fast HMR, minimal config).
- **UI**: Vanilla DOM (no React, Vue, Svelte). Direct element manipulation.
- **Testing**: Vitest with happy-dom. Real DOM events (MouseEvent, KeyboardEvent, WheelEvent). Property-based tests for parser (fast-check).
- **Deployment**: Cloudflare Pages (static hosting) + Cloudflare Workers (serverless, optional AI gateway).

## Core Modules

1. **Model Layer** (`src/model/`)
   - Immutable data structures: Stack, Card, Button, Field, Background
   - JSON serialization with validation
   - Rect geometry type

2. **Interpreter** (`src/interpreter/`)
   - Lexer: HyperTalk tokenization (keywords, strings, numbers, operators)
   - Parser: AST generation with error reporting (line/column)
   - Runtime: Sandboxed script execution (no eval, no fetch, no window access)
   - Dispatcher: Message routing to handlers on cards/buttons
   - Built-in functions: string, array, math operations

3. **DOM Layer** (`src/dom/`)
   - App: Main coordinator, state management, undo/redo, mode switching
   - CardCanvas: Drag, resize, pan (Shift+drag), zoom (Ctrl+scroll)
   - CardList: Navigation sidebar
   - ScriptEditor: Syntax highlighting, error reporting, preview, AI panel
   - RunMode: Event dispatch, script execution
   - ElementInspector: Property editor for selected elements
   - Storage: localStorage persistence
   - Components: Button, TextInput, Modal

4. **Generator** (`src/generator/`)
   - ScriptGen: Entry point for text-to-code
   - MockProvider: Template-based mock for testing
   - ProviderRegistry: Plugin system with fallback chain
   - ModelProvider: Interface for real LLM backends

5. **Storage Utilities** (`src/storage/`)
   - Compression: gzip via fflate
   - Encoding: Base64 for URL sharing

## HyperTalk Subset Supported

### Statements
- `put VALUE into TARGET` — Variable assignment
- `get EXPR` — Evaluate (result in "it")
- `go to CARD` — Navigation
- `answer MESSAGE` — Dialog
- `if...then...else...end if` — Conditionals
- `repeat N | while COND | until COND...end repeat` — Loops
- `return VALUE` — Exit handler
- `exit repeat` — Break

### Expressions
- Arithmetic: `+`, `-`, `*`, `/`
- Comparison: `=`, `!=`, `<`, `>`, `<=`, `>=`
- Logical: `and`, `or`, `not`
- String: `&` (concatenate)
- Functions: `length()`, `uppercase()`, `trim()`, `split()`, `abs()`, `round()`, etc.

### Handlers
- `on mouseUp...end mouseUp`
- `on mouseDown...end mouseDown`
- `on keyDown...end keyDown`
- `on keyUp...end keyUp`
- `on openCard...end openCard`
- `on closeCard...end closeCard`

### Built-in Variables
- `it` — Last get result
- `field "NAME"` — Field access
- Card/stack variables via put/get

## Constraints & Security

- **No eval**: Parser-based execution only
- **No DOM access from scripts**: No window, document, fetch, require
- **No innerHTML**: All DOM updates via safe methods (textContent, setAttribute)
- **Sandbox**: All variables scoped to card/stack context
- **Validation**: Input sanitization on all user entries
- **Bundle size**: < 500KB gzipped (verified via npm run size)

## Testing

- **Happy-dom**: Lightweight DOM simulation for fast tests
- **Real events**: Tests dispatch actual MouseEvent, KeyboardEvent, WheelEvent
- **Property-based**: Parser tests use fast-check
- **Integration**: Tests go through initApp() and real DOM updates
- **Benchmarks**: Vitest bench for performance tracking (see docs/PERFORMANCE.md)

## Performance Targets

- Parse + execute 1000-iteration loop: < 100ms
- Dispatch 1000 mouseUp messages: < 100ms
- Bundle size gzipped: ≤ 500KB

## No Browser Testing Claims

Tests use happy-dom, not real browsers. For production, test manually with Chrome, Firefox, Safari, Edge.

