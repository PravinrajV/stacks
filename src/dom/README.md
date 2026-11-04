# DOM: UI & Event Handling

Real DOM rendering and interaction. No frameworks—pure TypeScript and CSS.

## Architecture

- **app.ts** — Main entry point, coordinates render/edit/run modes
- **cardCanvas.ts** — Drag/resize/pan/zoom for element editing
- **cardList.ts** — Navigation sidebar for card browsing
- **scriptEditor.ts** — Syntax highlighting, error reporting
- **runMode.ts** — Event dispatch, script execution in run mode
- **elementInspector.ts** — Property editor for selected elements
- **storage.ts** — localStorage persistence

## Key Features

### Edit Mode

- Drag elements to move
- Shift+drag to pan canvas
- Ctrl+scroll to zoom (0.25x to 4x)
- Delete key removes element
- Arrow keys nudge selected element
- Escape deselects

### Run Mode

- Click buttons to trigger `mouseUp` handlers
- Focus buttons and press Enter/Space to activate
- Scripts have full access to fields and variables
- Modal dialogs (answer, ask)

### Persistence

Stacks are auto-saved to `localStorage` under key `stacks:active-stack`.
Compatible with Cloudflare KV for deployed apps.

## Testing

Tests use `happy-dom` for a lightweight, realistic DOM simulation.
Real DOM events (MouseEvent, KeyboardEvent, WheelEvent) via `initApp()` and event dispatching.

Example test:

```typescript
import { initApp } from '../dom/app'
import { createStack, createCard, createButton } from '../model/stack'
import { saveStack } from '../dom/storage'

const stack = createStack('s1', 'Test')
const card = createCard('c1', 'Card')
const btn = createButton('b1', 'Click', { left: 10, top: 10, right: 100, bottom: 50 })
card.buttons.push(btn)
stack.cards.push(card)

saveStack(stack)
initApp()
await waitForUIUpdate()

const el = document.querySelector('[data-element-id="b1"]')
expect(el).toBeTruthy()
```

## Styling

Pure CSS in `styles.css`. 1-bit aesthetic:
- Black, white, gray only
- No external libraries (Tailwind, Material Design)
- Pixel-perfect, retro-inspired layout

## Component Modules

- **button.ts** — Render and interact with buttons
- **textInput.ts** — Render and interact with fields
- **modal.ts** — Dialog boxes (answer, ask)

## Utilities

- **utils/dom.ts** — Helper functions (createElement, setStyles, etc.)
- **utils/rect.ts** — Geometry utilities (offsetRect, rectWidth, etc.)

## Notes

- No virtual DOM or diffing; direct DOM updates
- All interactions routed through Storage and Model for consistency
- Script errors reported in modal alerts with line numbers
