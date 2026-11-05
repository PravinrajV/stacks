# Stacks

Live app: https://stacks-6go.pages.dev

A browser-based revival of HyperCard—visual programming for everyone.

Stacks lets you create interactive card-based applications with scriptable buttons and fields using HyperTalk, a simple, English-like programming language. No login, no build tools—just open the browser and create.

## Features

- **Two Themes**: Classic (1-bit System 7 look) and a dark premium theme with three palettes: Navy (default, ice blue/silver), Ink (champagne gold) and Graphite (copper). Pick one in the toolbar or with `?palette=navy|ink|graphite`.
- **Visual Editor**: Drag to position elements, click to select, edit properties in a sectioned inspector (Identity, Content, Typography, Position & Size). Add cards, buttons, and fields.
- **Docked AI drawer**: the AI assistant opens beside the inspector (at 1100px wide and up) so properties stay reachable.
- **Transitions**: run-mode cards fade between each other and Run fades in. Both are off under prefers-reduced-motion.
- **Edit & Run Modes**: Author scripts in Edit mode; test instantly in Run mode
- **HyperTalk Scripting**: Simple, safe scripting with no eval. Just plain English-like code.
- **Accessible UI**: Keyboard navigation, focus indicators, respects `prefers-reduced-motion`
- **Export & Import**: Share stacks as JSON files; load them back anytime
- **AI Assistant**: Generate scripts from natural language (offline demo templates by default; real AI with your own Anthropic key or local Ollama)
- **Auto-save**: Your stacks are saved to browser storage
- **Welcome Screen**: Guided intro on first visit

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

Runs all Vitest tests using happy-dom (lightweight DOM simulation). Use `npm run test -- --run` for single execution.

**Test Count**: 800 automated (48 files) unit and integration tests covering:
- Model (Stack, Card, Button, Field) serialization and round-trip
- HyperTalk lexer, parser, and runtime
- Script execution and message dispatch
- UI interactions (canvas, editor, inspector)
- Theme system and accessibility
- Storage persistence
- Error handling

### Bundle Size Check

```bash
npm run size
```

Builds and reports gzipped size of `dist/assets/*.js` and `*.css` files. Fails if total exceeds 40 KB.

## Authoring a Stack

1. **Load the app** at https://stacks-6go.pages.dev (or `npm run dev`)
2. **Create a new stack** (or use the example stack on first visit)
3. **Edit mode** (default):
   - Click the **+Button** button to add a button to the card
   - Click the **+Field** button to add a text field
   - Click and drag elements to reposition
   - Select an element and use the **Inspector** panel (right sidebar) to rename, edit properties
   - Write HyperTalk code in the **Script Editor** (bottom panel)
   - Use **Syntax Highlighting** to see code structure
4. **Run mode** (click the **Run** button):
   - Click buttons to test handlers
   - Edit fields to test input/output
   - Click **Exit** to return to Edit mode
5. **Add more cards**: Use the **+Card** button in the **Card List** sidebar (left)
6. **Rename/delete**: Use buttons in the Card List to manage cards
7. **Export**: Click **Export** to download your stack as JSON
8. **Import**: Click **Import** to load a previously exported stack

## Testing Scope

### Automated Tests ✅

Via Vitest + happy-dom:
- Unit tests for parser, lexer, runtime, serialization
- Integration tests for script execution and DOM updates
- WCAG AA contrast ratio validation
- Focus-visible and keyboard navigation
- `prefers-reduced-motion` behavior
- Theme persistence and compatibility
- Network security (no external URLs except model providers)

### Manual Testing ⚠️

Real browsers (currently untested in production):
- ✅ **Chrome**: Primary development browser
- ⚠️ **Firefox**: Not yet tested
- ⚠️ **Safari**: Not yet tested
- ⚠️ **Edge**: Not yet tested

See `docs/CROSS_BROWSER_CHECKLIST.md` for manual testing procedures.

### Out of Scope

- Mobile browsers (desktop-optimized only)
- Real-time collaboration
- Large stacks (1000+ cards)

## Try the Example

Load the **Haunted Counter** example to see Stacks in action:

1. Open the app and click the **Import** button in the header
2. Select `examples/haunted-counter.json`
3. Switch to **Run mode** (top-right button)
4. Click **Knock** to increment the counter
5. Click **Open the door** to navigate to the next card
6. Click **Say hello** and watch the message change
7. Click **Go back** to return to the first card

This example demonstrates navigation, button click handlers, field content manipulation, and variable counting.

## HyperTalk Language

Stacks uses a subset of HyperTalk, inspired by the original Apple HyperCard language.

### Statements

- `put VALUE into TARGET` — Assign value to a field or variable
- `get EXPR` — Evaluate expression (result in "it")
- `go to CARD` — Navigate to a card (or `go next card`, `go previous card`, `go first card`, `go last card`)
- `answer MESSAGE` — Show a modal dialog with buttons
- `if COND then ... else ... end if` — Conditionals
- `repeat 10 | while COND | until COND ... end repeat` — Loops
- `return VALUE` — Exit handler with result
- `exit repeat` — Break from loop

### Expressions

- **Arithmetic**: `+`, `-`, `*`, `/`
- **Comparison**: `=`, `!=`, `<`, `>`, `<=`, `>=`
- **Logical**: `and`, `or`, `not`
- **String**: `&` (concatenate)
- **Functions**: `length()`, `uppercase()`, `lowercase()`, `trim()`, `split()`, `substring()`, `contains()`, `abs()`, `round()`, `random()`, etc.

### Built-in Variables

- `it` — Result of last `get` statement
- `field "NAME"` — Access field content
- `variable "NAME"` — Access card or stack variables
- Card-level variables: `put "value" into variable "myVar"`
- Stack-level variables: accessible from all cards

### Handlers (Event Handlers)

Handlers respond to user events:

```hypertext
on mouseUp
  put "Button clicked" into field "Status"
  answer "Hello!"
end mouseUp

on openCard
  put "Welcome to Card 1" into field "Message"
end openCard
```

**Supported Events**:
- `mouseUp` — Button click or field click
- `mouseDown` — Mouse button down
- `keyDown` — Key pressed
- `keyUp` — Key released
- `openCard` — Card displayed
- `closeCard` — Card is being left

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
- **Ctrl+Enter** — Preview script (if editing handler)
- **Ctrl+/** — Toggle comment in script editor

### Run Mode

- **Click buttons** — Trigger handler
- **Enter/Space on focused button** — Activate
- **Escape** — Close dialog

## Modes

- **Edit Mode**: Arrange elements, write scripts, inspect properties
- **Run Mode**: Interact with your stack like an end-user

Switch modes via the **Run** button in the header.

## Themes

### Classic (1-Bit)

Authentic System 7 Macintosh aesthetic: pure black, white, and gray.

### Haunted (Dark)

Midnight navy surfaces with ice-blue and silver accents by default, hairline borders and soft shadows. Ink and Graphite are alternative palettes. See docs/THEMING.md.

Toggle themes using the **Theme** button in the header. Your preference is saved to browser storage.

See `docs/THEMING.md` for color tokens and customization guide.

## AI Script Writer

Three provider options:

### Mock Provider (Default)

No setup required. Works completely offline. Provides template-based code generation for common patterns.

### Anthropic Claude

Use your own API key for Claude 3.5 Sonnet:
1. Get a free API key from [console.anthropic.com](https://console.anthropic.com)
2. Click **Settings** (gear icon) in the app
3. Enter your API key in the AI Settings panel
4. The key stays in your browser tab and is never stored permanently

### Ollama (Local Models)

Run models on your machine:
1. Install [Ollama](https://ollama.ai)
2. Run `ollama serve` in a terminal
3. Click **Settings** in the app
4. Select "Ollama" from the provider dropdown
5. Works completely offline

**Privacy**: Your API key stays in this browser tab and is sent only to your chosen provider. It is never saved in stacks, exports, logs, or undo history.

See `src/generator/README.md` for detailed setup and examples.

## Architecture

- `src/model/` — Data structures (Stack, Card, Button, Field)
- `src/interpreter/` — HyperTalk lexer, parser, and runtime (no eval, fully sandboxed)
- `src/dom/` — UI, event handling, and persistence
- `src/generator/` — Script generation with multiple providers
- `src/storage/` — Compression and encoding utilities

See individual module READMEs in `src/*/README.md` for details.

## Documentation

- `docs/THEMING.md` — Color system and theme customization
- `docs/CROSS_BROWSER_CHECKLIST.md` — Manual testing checklist for browsers
- `docs/PERFORMANCE.md` — Benchmark results and performance targets

## Performance

Bundle size (gzipped): **~32 KB** (JavaScript + CSS combined)

Run `npm run size` to measure current bundle size.

## License

MIT

---

**Note**: Stacks is a work in progress. Features and APIs may change.
