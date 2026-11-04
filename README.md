# Stacks

Live app: https://stacks-6go.pages.dev

A browser-based revival of HyperCard—visual programming for everyone.

Stacks lets you create interactive card-based applications with scriptable buttons and fields using HyperTalk, a simple, English-like programming language. No login, no build tools—just open the browser and create.

## Features

- **Visual Editor**: Drag to position elements, click to select, inspect properties
- **HyperTalk Scripting**: Simple, safe scripting with no eval. Just plain code.
- **Run Mode**: Test your scripts instantly
- **Share**: Export stacks as JSON; load them back anytime
- **Zoom & Pan**: Edit at any scale; Ctrl+scroll to zoom
- **Auto-save**: Your stacks are saved to browser storage

## Quick Start

### Install Dependencies

```bash
npm ci
```

### Development

```bash
npm run dev
```

Starts a dev server at `http://localhost:5173` with hot reload.

### Build

```bash
npm run build
```

Produces optimized bundle in `dist/`.

### Test

```bash
npm test
```

Runs all Vitest tests. Use `npm test -- --run` for single execution or `npm test -- --watch` for interactive mode.

### Bundle Size Check

```bash
npm run size
```

Builds and reports gzipped bundle size. Fails if bundle exceeds 500KB limit.

## HyperTalk Language

### Statements

- `put VALUE into TARGET` — Assign value to a field or variable
- `get EXPR` — Evaluate expression (result in "it")
- `go to CARD` — Navigate to a card
- `answer MESSAGE` — Show a dialog
- `if COND then ... else ...` — Conditionals
- `repeat 10 | while COND | until COND ... end repeat` — Loops
- `return VALUE` — Exit handler with result
- `exit repeat` — Break from loop

### Expressions

- **Arithmetic**: `+`, `-`, `*`, `/`
- **Comparison**: `=`, `!=`, `<`, `>`, `<=`, `>=`
- **Logical**: `and`, `or`, `not`
- **String**: `&` (concatenate)
- **Functions**: `length()`, `uppercase()`, `trim()`, `split()`, `abs()`, `round()`, etc.

### Built-in Variables

- `it` — Result of last `get`
- Field content: `field "NAME"`
- Card variables: `put "value" into variable "myVar"`

### Handlers

Handlers respond to events:

```hypertext
on mouseUp
  put "Button clicked" into field "Status"
  answer "Hello!"
end mouseUp

on openCard
  put "Welcome to Card 1" into field "Message"
end openCard
```

Supported events: `mouseUp`, `mouseDown`, `keyDown`, `keyUp`, `openCard`, `closeCard`

## Keyboard Shortcuts

### Edit Mode

- **Click** — Select element
- **Drag** — Move element
- **Shift+Drag** — Pan canvas
- **Ctrl+Scroll** — Zoom in/out
- **Arrow keys** — Nudge selected element by 1px
- **Shift+Arrow keys** — Nudge by 10px
- **Delete** — Remove selected element
- **Escape** — Deselect
- **Ctrl+Enter** — Run selected element's script (if button)
- **Ctrl+/** — Toggle comment in script editor

### Run Mode

- **Click buttons** — Trigger handler
- **Enter/Space on focused button** — Activate
- **Escape** — Close dialog

## Modes

- **Edit Mode**: Arrange elements, write scripts
- **Run Mode**: Interact with your stack like an end-user

Switch modes via the **Run** button in the header.

## AI Script Writer (Bring Your Own Key)

Three provider options:

1. **Mock Provider** — No setup required, works offline (testing/demo)
2. **Anthropic Claude** — Use your own API key for Claude 3.5 Sonnet
   - Get a free API key from [console.anthropic.com](https://console.anthropic.com)
   - Enter it in Settings (encrypted in sessionStorage, never stored permanently)
3. **Ollama** — Run local models on your machine
   - Install [Ollama](https://ollama.ai), run `ollama serve`, then select "Ollama" in Settings
   - Works completely offline

**Privacy:** Your API key stays in this browser tab and is sent only to your chosen provider. It is never saved in stacks, exports, logs, or undo history.

See `src/generator/README.md` for detailed setup and examples.

## Architecture

- `src/model/` — Data structures (Stack, Card, Button, Field)
- `src/interpreter/` — HyperTalk lexer, parser, and runtime (no eval)
- `src/dom/` — UI, event handling, and persistence
- `src/generator/` — Script generation (mock provider only)
- `src/storage/` — Compression and encoding utilities

See individual module READMEs in `src/*/README.md` for details.

## No Browser Testing Claims

This project is tested with happy-dom (a lightweight DOM simulation) and not with real browsers. For production deployment, test manually with Chrome, Firefox, Safari, and Edge.

## Performance

See `docs/PERFORMANCE.md` for benchmark results.

## License

MIT

---

**Note**: Stacks is a work in progress. Features and APIs may change.
