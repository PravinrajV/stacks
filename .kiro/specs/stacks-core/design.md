# Stacks Core: Architecture and Design

## Overview

This document describes the architecture, data models, component interfaces, error handling, and testing strategy for the Stacks core engine.

---

## Architecture Layers

```
┌─────────────────────────────────────────────────────┐
│ UI Layer (DOM Renderer)                             │
│ - Renders cards, buttons, fields to DOM             │
│ - Handles user interactions (click, input)          │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│ Message Dispatcher & Handler Execution             │
│ - Routes mouseUp, openCard, etc. through hierarchy │
│ - Invokes handlers in sandbox context              │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│ HyperTalk Interpreter (Lexer → Parser → Runtime)  │
│ - Lexer: tokenizes source                          │
│ - Parser: builds AST                               │
│ - Runtime: tree-walking evaluator in sandbox       │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│ Model Layer (Immutable Data Structures)            │
│ - Stack, Card, Background, Field, Button           │
│ - Scoped variables (local, card, stack)            │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│ Storage & Serialization                            │
│ - JSON serialization (stack.toJSON())              │
│ - URL compression (stack ID generation)            │
│ - Cloudflare KV persistence                        │
└─────────────────────────────────────────────────────┘
```

---

## Data Models

### Stack Model

```typescript
interface Stack {
  id: string;                          // Unique stack ID
  name: string;                        // Stack name
  version: string;                     // Schema version ("1.0")
  backgrounds: Background[];           // Reusable backgrounds
  cards: Card[];                       // Ordered cards in stack
  variables: Map<string, any>;        // Stack-scoped variables
}
```

### Background Model

```typescript
interface Background {
  id: string;                          // Unique background ID
  name: string;                        // Background name
  buttons: Button[];                   // Background buttons
  fields: Field[];                     // Background fields
  scripts: { [handlerName: string]: string };  // Handler scripts
}
```

### Card Model

```typescript
interface Card {
  id: string;                          // Unique card ID
  backgroundId: string;                // Reference to background (or null)
  name: string;                        // Card name/title
  buttons: Button[];                   // Card-specific buttons
  fields: Field[];                     // Card-specific fields
  scripts: { [handlerName: string]: string };  // Handler scripts (e.g., "on openCard")
  variables: Map<string, any>;        // Card-scoped variables
}
```

### Button Model

```typescript
interface Button {
  id: string;                          // Unique button ID
  label: string;                       // Button text
  rect: Rect;                          // Position and size
  style: "default" | "transparent" | "popup";  // Button appearance
  scripts: { [handlerName: string]: string };  // Attached scripts (e.g., "on mouseUp")
}
```

### Field Model

```typescript
interface Field {
  id: string;                          // Unique field ID
  name: string;                        // Field identifier for scripts
  content: string;                     // Current text content
  rect: Rect;                          // Position and size
  font: string;                        // Font family (e.g., "Monaco", "Chicago")
  fontSize: number;                    // Font size in pixels
  textStyle: {
    bold: boolean;
    italic: boolean;
    underline: boolean;
  };
  editable: boolean;                   // Whether user can edit
  scripts: { [handlerName: string]: string };  // Attached scripts
}
```

### Rect Model

```typescript
interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}
```

### Serialization Format (JSON)

```json
{
  "version": "1.0",
  "stack": {
    "id": "abc123",
    "name": "My First Stack",
    "backgrounds": [
      {
        "id": "bg1",
        "name": "Navigation Background",
        "buttons": [{ "id": "btn1", "label": "Next", ... }],
        "fields": [],
        "scripts": { "on openCard": "..." }
      }
    ],
    "cards": [
      {
        "id": "card1",
        "backgroundId": "bg1",
        "name": "Title Card",
        "buttons": [{ "id": "btn2", "label": "Start", ... }],
        "fields": [{ "id": "fld1", "name": "title", "content": "Welcome", ... }],
        "scripts": { "on openCard": "answer \"Hello!\"" }
      }
    ]
  }
}
```

---

## Interpreter Architecture

### Lexer (Tokenization)

**Input**: HyperTalk source string  
**Output**: Array of Token objects

```typescript
interface Token {
  type: "keyword" | "identifier" | "string" | "number" | "operator" | "punctuation" | "eof";
  value: string;
  line: number;
  column: number;
}

// Keywords: if, else, repeat, while, put, get, go, answer, on, end, etc.
// Operators: +, -, *, /, <, >, =, !=, and, or, not
// Punctuation: (, ), {, }, [, ], :, ,
```

**Lexer Responsibilities**:
- Recognize HyperTalk keywords and identifiers (case-insensitive).
- Handle strings with quote escaping (\", \\, \n).
- Track line and column for error reporting.
- Distinguish numbers (integers, floats) from identifiers.

---

### Parser (AST Generation)

**Input**: Array of tokens  
**Output**: Program AST (array of statements/handler definitions)

```typescript
interface ASTNode {
  type: string;  // "Statement", "IfStatement", "RepeatStatement", etc.
  line: number;
  column: number;
}

interface IfStatement extends ASTNode {
  type: "IfStatement";
  condition: Expression;
  thenBranch: Statement[];
  elseBranch?: Statement[];
}

interface RepeatStatement extends ASTNode {
  type: "RepeatStatement";
  kind: "while" | "until" | "count";
  condition?: Expression;
  count?: Expression;
  body: Statement[];
}

interface PutStatement extends ASTNode {
  type: "PutStatement";
  value: Expression;
  target: Expression;  // Can be "field X", "card variable Y", etc.
}

interface GoStatement extends ASTNode {
  type: "GoStatement";
  destination: Expression;  // "card X", "next card", "first card"
}

interface HandlerDefinition extends ASTNode {
  type: "HandlerDefinition";
  name: string;  // "mouseUp", "openCard"
  parameters?: string[];
  body: Statement[];
}

interface Expression extends ASTNode {
  // Binary, unary, literal, function call, variable reference
}
```

**Parser Responsibilities**:
- Respect operator precedence (arithmetic > comparison > logical).
- Handle nested expressions and function calls.
- Recognize handler definitions (on <name> ... end).
- Report syntax errors with line/column info.
- Validate statement structure (e.g., if/end matching).

---

### Runtime (Tree-Walking Evaluator)

**Execution Context**:

```typescript
interface ExecutionContext {
  stack: Stack;
  currentCard: Card;
  localVariables: Map<string, any>;  // Handler-scoped
  callStack: string[];                // For debugging
  stepCount: number;                  // For timeout detection
  startTime: number;                  // For timeout detection
  sandboxViolations: string[];        // Rejected operations
}
```

**Runtime Responsibilities**:
- Walk the AST and execute statements in sequence.
- Maintain variable scopes (local → card → stack).
- Handle handler invocation and message passing.
- Execute built-in commands (put, get, go, answer, math, string ops).
- Enforce sandbox: block fetch, eval, require, network access.
- Monitor execution time (5s limit) and step count (100k limit).
- Catch and report runtime errors without crashing.

---

## Message Passing and Handler Execution

### Message Flow

When a user clicks a button:

1. **Dispatch**: `dispatcher.send("mouseUp", button, currentCard)`
2. **Hierarchy**: Button → Card → Background → Stack
3. **Lookup**: For each level, check if a handler exists (e.g., `on mouseUp`).
4. **Execute**: If found, run the handler in the execution context.
5. **Stop**: If a handler completes, message propagates to the next level unless `stop propagation` is used.

### Handler Definition

```typescript
interface Handler {
  name: string;                // "mouseUp", "openCard", etc.
  parameters?: string[];       // Arguments passed to handler
  ast: Statement[];            // Parsed body
  source: string;              // Original source for debugging
}
```

### Built-in Commands

#### Control Flow
- **if**: Conditional execution. `if x > 5 then ... else ... end if`
- **repeat**: Loop execution. `repeat while condition`, `repeat 10 times`, `repeat until condition`

#### Variables and Data
- **put**: Assign value to target. `put 5 into x`, `put field "name" into card myVar`
- **get**: Retrieve value. `get field "score"` (implicit, used in expressions)

#### Navigation
- **go**: Navigate to card. `go to card 1`, `go next card`, `go previous card`

#### UI
- **answer**: Show modal dialog. `answer "Hello" with button "OK" or button "Cancel"`

#### Math Functions
- `add(a, b)`, `subtract(a, b)`, `multiply(a, b)`, `divide(a, b)`
- `sqrt(x)`, `round(x)`, `random(min, max)`

#### String Functions
- `concat(a, b)`, `length(s)`, `contains(s, substring)`
- `split(s, delimiter)`, `uppercase(s)`, `lowercase(s)`
- `substring(s, start, end)`, `trim(s)`

---

## Error Handling

### Parse Errors

```typescript
interface ParseError {
  type: "SyntaxError";
  message: string;
  line: number;
  column: number;
  source: string;  // Snippet of offending code
}

// Example: "Error at line 3, column 5: Expected 'end if' but found 'endif'"
```

### Runtime Errors

```typescript
interface RuntimeError {
  type: "RuntimeError" | "SandboxViolation" | "ExecutionTimeout";
  message: string;
  handlerName?: string;
  stackTrace?: string[];
  line?: number;  // If available from AST
}

// Examples:
// "Undefined variable: myVar"
// "Type error: Cannot add string and number"
// "Operation not allowed in scripts: fetch"
// "Execution timeout (exceeded 5 seconds)"
```

### Error Recovery

- **Parse**: Report error, highlight in editor, don't execute.
- **Runtime**: Catch error, log it, emit user notification, allow continued interaction.
- **Sandbox**: Reject operation, emit error, continue execution (if safe).

---

## Script Generation (AI Integration)

### Prompt Engineering

```typescript
interface ScriptGenRequest {
  description: string;              // User's plain English request
  context: {
    cardName?: string;
    fieldNames?: string[];
    buttonLabels?: string[];
  };
  provider: "claude" | "ollama" | "local-ggml";  // Model provider
  style?: "terse" | "verbose" | "commented";
}

interface ScriptGenResponse {
  code: string;                       // Generated HyperTalk
  explanation?: string;               // Optional explanation
  confidence?: number;                // 0-1, how confident the model is
}
```

### Validation Pipeline

1. **Parse**: Attempt to parse generated code.
2. **Type Check**: Verify no obvious type errors (if available).
3. **Safety Check**: Ensure no sandbox violations.
4. **Preview**: Show diff to user before insertion.
5. **Insert**: Update handler script and re-parse.

### Model Provider Interface

```typescript
interface ModelProvider {
  name: string;
  async generate(request: ScriptGenRequest): Promise<ScriptGenResponse>;
  async isAvailable(): Promise<boolean>;
}

// Implementations:
// - CloudModelProvider (Claude API)
// - OllamaProvider (Local Ollama instance)
// - LocalGGMLProvider (WASM/Worker-based local model)
```

---

## Testing Strategy

### Unit Tests

#### Lexer Tests
- **Property**: For any valid HyperTalk string, tokenize and verify tokens match expected types.
- **Edge Cases**: Empty strings, unclosed quotes, special characters, very long identifiers.
- **Example**: `"put 5 into x"` → tokens: [keyword "put", number "5", keyword "into", identifier "x"]

#### Parser Tests
- **Property**: For any sequence of valid tokens, parse into AST without crash.
- **Specific**: Verify operator precedence (e.g., `2 + 3 * 4` = 14, not 20).
- **Example**: `if x > 5 then put "big" into field "label" end if` → valid IfStatement AST.

#### Runtime Tests
- **Handler Execution**: `on mouseUp: put 5 into x; get x` → x = 5.
- **Variable Scoping**: Local, card, stack variables resolved correctly.
- **Message Passing**: Handler on card receives mouseUp; if no handler, background receives it.
- **Built-in Functions**: `add(2, 3)` = 5, `contains("hello", "ell")` = true, etc.
- **Error Handling**: Division by zero caught; undefined variable reported; timeout enforced.

#### Serialization Tests
- **Round-trip**: Stack → JSON → Stack → JSON (both JSONs equal).
- **Fidelity**: All fields, buttons, scripts preserved exactly.
- **Invalid Input**: Malformed JSON rejects with clear error.

### Property-Based Tests (fast-check)

```typescript
import { fc } from "fast-check";

// Generate random valid HyperTalk and verify it parses
fc.assert(
  fc.property(
    genValidHyperTalk(),  // Arbitrary generator for HyperTalk AST
    (source) => {
      const tokens = lexer.tokenize(source);
      const ast = parser.parse(tokens);
      return ast !== null;  // Parse success
    }
  )
);

// Generate random field updates and verify serialization round-trip
fc.assert(
  fc.property(
    fc.array(genField()),
    (fields) => {
      const original = { fields };
      const json = JSON.stringify(original);
      const restored = JSON.parse(json);
      return JSON.stringify(restored) === json;
    }
  )
);
```

### Integration Tests

- **Stack Creation**: Create stack, add card, add field, serialize, deserialize → all data present.
- **Script Execution**: Load stack from JSON, click button → handler fires, field updates.
- **Navigation**: go to card 2 → openCard handler fires, card content renders.
- **Error Recovery**: Load stack with invalid script → error reported, stack still functional.

### Test Coverage Goals

- **Lexer**: 95%+ line coverage.
- **Parser**: 90%+ coverage (edge cases in operator precedence).
- **Runtime**: 85%+ coverage (focus on built-ins, scoping, message passing).
- **Model Serialization**: 100% coverage.
- **Script Generation**: 70%+ (depends on model provider availability).

### Test Execution

```bash
# Run all tests
npm run test

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch

# Property-based tests only
npm run test:property
```

---

## UI Layer: Architecture and Component Design

### Overview

The UI layer bridges the user-facing editor and the core engine. It is built with vanilla DOM (no frameworks), CSS for styling, and TypeScript for state management.

```
┌─────────────────────────────────────────────────────────┐
│ User (clicking buttons, typing scripts)                 │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│ UI Layer (src/dom/)                                     │
│ - App container (layout, state machine)                 │
│ - Card list panel (sidebar with card CRUD)             │
│ - Card canvas (visual editor with drag/resize)         │
│ - Element inspector (properties panel)                 │
│ - Script editor (syntax highlighting, error display)   │
│ - Storage manager (localStorage, JSON import/export)   │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│ Core Engine (src/model/, src/interpreter/)             │
│ - Stack/Card/Button/Field model                        │
│ - Parser and Runtime                                   │
└─────────────────────────────────────────────────────────┘
```

### UI Module Structure

```
src/dom/
├── app.ts                  # Main app controller, state machine, layout
├── styles.css              # Global 1-bit aesthetic CSS
├── cardList.ts             # Card list panel UI component
├── cardCanvas.ts           # Card editor canvas (drag/resize elements)
├── elementInspector.ts     # Properties panel for selected element
├── scriptEditor.ts         # Script editor with syntax highlighting & error display
├── runMode.ts              # Card viewer for executing scripts (Run Mode)
├── storage.ts              # localStorage and JSON import/export
├── components/             # Reusable DOM components
│   ├── button.ts           # Styled button wrapper
│   ├── textInput.ts        # Styled text input
│   ├── modal.ts            # Modal dialog component
│   └── icons.ts            # 1-bit icon rendering
└── utils/
    ├── dom.ts              # DOM utility functions (createElement helpers, event delegation)
    ├── rect.ts             # Rectangle utilities (intersection, contain, etc.)
    └── css.ts              # Dynamic class/style management
```

### State Management

The app maintains a single state tree at the top level (App class in `app.ts`):

```typescript
interface AppState {
  stack: Stack;                    // Current stack model
  currentCardId: string;           // ID of card being edited
  selectedElementId: string | null; // ID of selected button/field
  mode: "edit" | "run";            // Edit Mode or Run Mode
  undoStack: Stack[];              // For undo/redo
  redoStack: Stack[];
  isDirty: boolean;                // Has unsaved changes
}
```

#### State Flow

1. **User Action** (e.g., click button, type in field) → Event handler fires
2. **Model Update** (e.g., update card.buttons[0].label) → Update AppState
3. **Re-render** (e.g., call cardCanvas.render(card)) → DOM reflects new state

#### Component Hierarchy

- **App**: Top-level state holder, layout container
  - **CardListPanel**: Displays card list, "Add Card" button, delete buttons
    - *No local state; receives `stack`, `currentCardId`, `onSelectCard`, `onAddCard`, `onDeleteCard` props*
  - **CardCanvas**: Main editor view for card layout
    - *Local state: selected element, drag state*
    - *Receives `card`, `onElementClick`, `onElementDrag`, `onElementResize` props*
  - **ElementInspector**: Properties panel for selected element
    - *Local state: form field values for element properties*
    - *Receives `element`, `onPropertyChange` props*
  - **ScriptEditor**: Script editor for selected element's handler
    - *Local state: script text, parse error*
    - *Receives `handler`, `onScriptChange`, `onScriptRun` props*
  - **RunModeViewer**: Full-screen card viewer (only in Run Mode)
    - *Local state: execution context, modal dialogs*
    - *Receives `card`, `onNavigate`, `onExit` props*

### Component Interfaces

#### CardCanvas

```typescript
interface CardCanvas {
  render(card: Card, background: Background | null): void;
  // Renders card with buttons and fields at their rects
  
  setSelectedElement(element: Button | Field | null): void;
  // Highlight selected element with bounding box
  
  getSelectedElement(): Button | Field | null;
}
```

#### ScriptEditor

```typescript
interface ScriptEditor {
  setScript(handlerName: string, source: string): void;
  // Display script in editor, tokenize/highlight
  
  getScript(): string;
  // Get current script text
  
  getError(): ParseError | RuntimeError | null;
  // Get parse/runtime error (if any)
  
  runPreview(context: ExecutionContext): void;
  // Execute script in test context, show result
}
```

#### ElementInspector

```typescript
interface ElementInspector {
  setElement(element: Button | Field): void;
  // Display element properties in form fields
  
  getElement(): Button | Field;
  // Get currently edited element with updates from form
  
  onChange(handler: (element: Button | Field) => void): void;
  // Subscribe to property changes
}
```

#### RunModeViewer

```typescript
interface RunModeViewer {
  render(card: Card, background: Background | null): void;
  // Render card in interactive mode
  
  simulateButtonClick(button: Button): Promise<void>;
  // Fire mouseUp handler, execute script, update UI
  
  simulateFieldEdit(field: Field, newContent: string): Promise<void>;
  // Update field, trigger any change handlers
}
```

### Integration: UI → Interpreter

When a button is clicked in Run Mode:

1. **Click Event** → `RunModeViewer` captures click
2. **Message Dispatch** → `runtime.send("mouseUp", button, executionContext)`
3. **Handler Execution** → Parser + runtime execute `on mouseUp { ... }` script
4. **Field Update** → Script calls `put "result" into field X`
5. **UI Sync** → Runtime notifies UI of field update; `RunModeViewer.setFieldContent(field)` re-renders
6. **User Sees Result** → Field text changes on screen

```typescript
// Example in RunModeViewer
private async onButtonClick(button: Button): Promise<void> {
  try {
    const context = new ExecutionContext(this.stack, this.currentCard);
    await this.runtime.send("mouseUp", button, context);
    
    // After execution, re-render affected fields
    for (const field of this.currentCard.fields) {
      this.updateFieldDisplay(field);
    }
  } catch (error) {
    this.showErrorModal(error.message);
  }
}
```

### Storage and Persistence

#### localStorage Workflow

```typescript
// Save
const json = stack.toJSON();
localStorage.setItem("stacks_current", json);
localStorage.setItem("stacks_undo_history", JSON.stringify(undoStack));

// Load
const json = localStorage.getItem("stacks_current");
if (json) {
  const stack = Stack.fromJSON(json);
  appState.stack = stack;
}
```

#### JSON Export/Import

```typescript
// Export
const element = document.createElement("a");
element.href = "data:application/json;base64," + btoa(JSON.stringify(stack));
element.download = "my-stack.json";
element.click();

// Import
input.addEventListener("change", (e) => {
  const file = e.target.files[0];
  const reader = new FileReader();
  reader.onload = (e) => {
    const json = JSON.parse(e.target.result);
    appState.stack = Stack.fromJSON(json);
    appState.isDirty = true;
    render();
  };
  reader.readAsText(file);
});
```

### Script Editor: Syntax Highlighting

The script editor uses a simple token-based approach (no external highlighter):

```typescript
// In ScriptEditor.render()
const tokens = lexer.tokenize(scriptSource);
for (const token of tokens) {
  const span = document.createElement("span");
  span.classList.add(`token-${token.type}`); // token-keyword, token-string, etc.
  span.textContent = token.value;
  editorContainer.appendChild(span);
}
```

CSS for highlighting:

```css
.token-keyword { color: black; font-weight: bold; }
.token-string  { color: #666; }
.token-number  { color: #333; }
.token-comment { color: #999; }
.error-line    { background-color: #f0f0f0; border-left: 3px solid red; }
```

### Error Display

#### Parse Errors in Script Editor

When a user types in the script editor, parse errors are shown inline:

```typescript
// In ScriptEditor.onChange()
const tokens = lexer.tokenize(this.scriptText);
const parseResult = parser.parse(tokens);

if (parseResult.error) {
  this.errorLine = parseResult.error.line;
  this.errorMessage = parseResult.error.message;
  this.highlightErrorLine();
} else {
  this.clearError();
}
```

#### Runtime Errors in Run Mode

When a script is executed in Run Mode and fails, a modal is shown:

```typescript
// In RunModeViewer.onButtonClick()
try {
  await this.runtime.send("mouseUp", button, context);
} catch (error) {
  this.showErrorModal(`Error: ${error.message}`);
}
```

### Responsive Layout with CSS Grid

```css
body {
  display: grid;
  grid-template-columns: 250px 1fr 300px;
  grid-template-rows: 40px 1fr 200px;
  height: 100vh;
  gap: 1px;
  background: #ccc;
}

.card-list   { grid-column: 1; grid-row: 1 / 3; }
.card-canvas { grid-column: 2; grid-row: 1 / 3; }
.inspector   { grid-column: 3; grid-row: 1 / 2; }
.script-editor { grid-column: 2 / 4; grid-row: 3; }
```

Collapsible sidebars adjust grid columns on resize or user collapse action.

---

## Interface Boundaries (Updated for UI)

### UI → Model

```typescript
// UI reads from model
interface ModelRead {
  stack: Stack;
  card: Card;
  buttons: Button[];
  fields: Field[];
  getVariable(scope: "card" | "stack", name: string): any;
}

// UI writes to model
interface ModelWrite {
  addCard(stack: Stack): Card;
  deleteCard(stack: Stack, cardId: string): void;
  addButton(card: Card, label: string): Button;
  addField(card: Card, name: string): Field;
  updateButton(button: Button, updates: Partial<Button>): void;
  updateField(field: Field, updates: Partial<Field>): void;
  updateScript(element: Button | Field, handlerName: string, source: string): void;
}
```

### UI → Interpreter

```typescript
interface RuntimeControl {
  parseScript(source: string): { ast: ASTNode[] } | { error: ParseError };
  executeScript(source: string, handler: string, context: ExecutionContext): Promise<void>;
  send(message: string, target: Button | Field, context: ExecutionContext): Promise<void>;
}
```

---

## Testing Strategy for UI (Updated)

### DOM Testing with jsdom/happy-dom via Vitest

Since the UI uses vanilla DOM, tests will use `jsdom` or `happy-dom` to simulate a browser environment:

```typescript
// Example test in src/dom/cardCanvas.test.ts
import { JSDOM } from "jsdom";
import { describe, it, expect, beforeEach } from "vitest";
import { CardCanvas } from "./cardCanvas";
import { Card, Button } from "../model/stack";

describe("CardCanvas", () => {
  let canvas: CardCanvas;
  let container: HTMLElement;

  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><div id="app"></div>');
    container = dom.window.document.getElementById("app")!;
    canvas = new CardCanvas(container);
  });

  it("renders buttons at their rect positions", () => {
    const card = new Card("c1", "bg1", "Test Card", [], [], {});
    const button = new Button("b1", "Click Me", { left: 10, top: 20, right: 100, bottom: 50 });
    card.buttons = [button];

    canvas.render(card, null);

    const buttonEl = container.querySelector("[data-button-id='b1']") as HTMLElement;
    expect(buttonEl).toBeTruthy();
    expect(buttonEl.style.left).toBe("10px");
    expect(buttonEl.style.top).toBe("20px");
  });

  it("allows dragging elements", async () => {
    // Test drag/resize interaction
  });
});
```

### Integration Tests for UI ↔ Interpreter

```typescript
// Example in tests/ui-interpreter.test.ts
describe("UI → Interpreter Integration", () => {
  it("executes button click handler and updates field", async () => {
    const stack = createTestStack();
    const card = stack.cards[0];
    const button = card.buttons[0];
    const field = card.fields[0];

    button.scripts["mouseUp"] = 'put "clicked" into field "output"';

    const runtime = new Runtime(stack, card);
    await runtime.send("mouseUp", button, new ExecutionContext(stack, card));

    expect(field.content).toBe("clicked");
  });

  it("displays parse error in script editor when code is invalid", () => {
    const editor = new ScriptEditor(container);
    editor.setScript("mouseUp", "if x = 5"); // Missing 'end if'

    const error = editor.getError();
    expect(error).toBeTruthy();
    expect(error.message).toContain("Expected 'end if'");
  });

  it("imports and exports stack JSON preserves all data", () => {
    const originalStack = createTestStack();
    const json = originalStack.toJSON();
    const restoredStack = Stack.fromJSON(json);

    expect(JSON.stringify(restoredStack)).toBe(JSON.stringify(originalStack));
  });
});
```

---

## Performance Considerations for UI

- **Rendering**: Use element reuse when possible. Don't recreate DOM on every state change; use innerHTML for full redraws only for small containers.
- **Event Delegation**: Use event bubbling and a single listener on parent containers instead of individual listeners on many elements.
- **Script Parsing**: Cache parsed AST for scripts to avoid re-parsing on every mode switch.
- **Large Stacks**: If a stack has 100+ cards, consider virtual scrolling in the card list.

---

## Extensibility for UI

- **Custom Button Styles**: Register new button style types (e.g., "rounded", "gradient") and add corresponding CSS.
- **Drag/Resize Handlers**: Allow plugins to register custom drag/resize behavior for elements.
- **Storage Backends**: Implement additional storage providers (IndexedDB, cloud sync) by extending the storage interface.

### Card Engine → Renderer

```typescript
// Renderer consumes card data and syncs to DOM
interface CardRenderer {
  render(card: Card, background: Background | null): void;
  update(field: Field, newContent: string): void;
  handleButtonClick(button: Button): void;
}
```

### Interpreter → Model

```typescript
// Runtime reads/writes to card and stack
interface RuntimeModel {
  getField(card: Card, fieldName: string): Field | null;
  setFieldContent(card: Card, field: Field, content: string): void;
  getVariable(scope: "local" | "card" | "stack", name: string): any;
  setVariable(scope: "local" | "card" | "stack", name: string, value: any): void;
}
```

### Script Generator → Parser

```typescript
// Generator validates output using parser
interface ScriptValidator {
  parse(source: string): { ast: Statement[] } | { error: ParseError };
}
```

---

## Performance Considerations

- **Parser**: O(n) for n tokens. Memoize during development, optimize if bottleneck.
- **Runtime**: O(s) for s steps in execution. Monitor with step counter.
- **Serialization**: O(m) for m elements (fields, buttons, cards). Use streaming for very large stacks.
- **DOM Rendering**: Use virtual diffing (or simple shadow DOM) to minimize reflows.

---

## Extensibility

- **Built-in Functions**: Register new functions in `builtins.ts` with safety checks.
- **Model Providers**: Implement `ModelProvider` interface for new AI backends.
- **Message Types**: Add new handler types (e.g., `on idle`, `on closeCard`) without modifying core message dispatcher.

---

## Phase 8: Demo Readiness Design

### Layout and Viewport Scaling

The card is a fixed logical size of 512×342 pixels (classic HyperCard dimensions). The viewport may be larger or smaller, so the entire card scales proportionally (with aspect ratio preserved) to fit the available space.

**Implementation Approach**:

```typescript
interface CardViewport {
  logicalWidth: number;   // 512
  logicalHeight: number;  // 342
  scale: number;          // Computed based on available space
  offsetX: number;        // Centering offset
  offsetY: number;        // Centering offset
}

// Calculate scale
function calculateCardScale(availableWidth: number, availableHeight: number): CardViewport {
  const maxScaleX = availableWidth / 512;
  const maxScaleY = availableHeight / 342;
  const scale = Math.min(maxScaleX, maxScaleY, 1);  // Don't enlarge
  return {
    logicalWidth: 512,
    logicalHeight: 342,
    scale,
    offsetX: (availableWidth - 512 * scale) / 2,
    offsetY: (availableHeight - 342 * scale) / 2
  };
}
```

**DOM Structure**:

```html
<div class="viewport">
  <div class="card" style="transform: scale(${scale}); transform-origin: 0 0; margin: ${offsetY}px ${offsetX}px;">
    <!-- Card content: buttons, fields -->
  </div>
</div>
```

**Interaction**: When dragging elements in edit mode, convert screen coordinates to logical coordinates:

```typescript
function screenToLogical(screenX: number, screenY: number, viewport: CardViewport): { x: number, y: number } {
  return {
    x: (screenX - viewport.offsetX) / viewport.scale,
    y: (screenY - viewport.offsetY) / viewport.scale
  };
}
```

### In-UI Authoring

**Card Management**:
- Card list panel shows all cards with +Add and delete buttons.
- Right-click card to rename (inline editor or modal).
- Delete prompts for confirmation.

**Element Creation**:
- "Add Button" creates Button at (100, 100) with size (100, 30), label "Button X", unique ID.
- "Add Field" creates Field at (100, 150) with size (300, 60), name "field_X", empty content, unique ID.
- Elements appear on canvas immediately; can be dragged/resized.

**Starter Stack**:
- On first visit, load `examples/haunted-counter.json` (or create empty if missing).
- Subsequent visits restore last-saved stack from localStorage.

### 1-Bit Aesthetic Design

**Color Palette**:
- Primary: `#000` (black), `#fff` (white)
- Secondary: `#ccc` (light gray), `#999` (medium gray), `#666` (dark gray)
- No other colors; no gradients, shadows, or transparency effects

**Typography**:
- Monospace: Monaco, "Courier New", or system-ui fallback
- Font sizes: typically 12–14px for UI, 11–13px for editor
- Line height: 1.5 for readability

**Borders and Outlines**:
- 1px solid for most borders; 2px for emphasis (focus, hover)
- No rounded corners (border-radius: 0)
- No drop shadows (box-shadow: none)

**Focus Indicators**:
- Keyboard focus: show a 2px inset border or inverted colors
- Contrast: all text must be ≥4.5:1 against background (WCAG AA standard)
- Ensure visible focus on buttons, inputs, and interactive elements

**Classic Menu Bar** (optional):
- Horizontal bar at top: File, Edit, View, Help
- Black text on white or light gray background
- Standard Mac-style spacing and alignment

**Patterns** (optional for depth):
- CSS `repeating-linear-gradient` or SVG patterns for dithered/checker backgrounds
- Used sparingly to add visual depth without breaking 1-bit constraint

### Answer Modal Dialog Design

The `answer` command in a script triggers a modal overlay. The modal is rendered on top of the card and captures focus.

**DOM Structure**:

```html
<div class="modal-overlay">
  <div class="modal-dialog">
    <div class="modal-message">Message text here</div>
    <div class="modal-buttons">
      <button>OK</button>
      <button>Cancel</button>
    </div>
  </div>
</div>
```

**Behavior**:
- Script execution pauses while modal is open.
- When user clicks a button, the modal closes and the handler receives the button index (0, 1, 2, ...).
- Keyboard: Tab to navigate buttons, Enter/Space to confirm.
- Modal blocks all interaction with the card behind it.

**Integration**:

```typescript
// In runtime.ts
async executeAnswerCommand(message: string, buttons: string[], context: ExecutionContext) {
  const buttonIndex = await showAnswerModal(message, buttons);  // Async, waits for user input
  return buttonIndex;
}

// In runMode.ts
function showAnswerModal(message: string, buttons: string[]): Promise<number> {
  return new Promise((resolve) => {
    const modal = createModalElement(message, buttons, (index) => {
      modal.remove();
      resolve(index);
    });
    document.body.appendChild(modal);
  });
}
```

### Script Editor Highlight Layer Design

The script editor consists of a hidden `<textarea>` for input and an overlay `<div>` for syntax highlighting. They must be perfectly aligned so text and highlights stay in sync.

**DOM Structure**:

```html
<div class="script-editor-container">
  <textarea class="script-editor-input" id="editor-textarea"></textarea>
  <div class="script-editor-highlights" id="editor-highlights"></div>
</div>
```

**CSS**:

```css
.script-editor-container {
  position: relative;
  font-family: Monaco, Courier New, monospace;
  font-size: 13px;
  line-height: 1.5;
}

.script-editor-input {
  position: relative;
  z-index: 2;
  background: transparent;
  color: transparent;  /* Make text invisible; highlights show behind */
  border: 1px solid #000;
  width: 100%;
  height: 200px;
  padding: 8px;
  margin: 0;
  white-space: pre;
  overflow-y: scroll;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
}

.script-editor-highlights {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
  padding: 8px;
  overflow-y: scroll;
  white-space: pre;
  pointer-events: none;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
}

.token-keyword { color: #000; font-weight: bold; }
.token-string { color: #666; }
.token-number { color: #333; }
.token-comment { color: #999; }
```

**Synchronization Logic**:

```typescript
// When textarea is scrolled, update highlight div's scroll position
textareaElement.addEventListener('scroll', () => {
  highlightDiv.scrollTop = textareaElement.scrollTop;
  highlightDiv.scrollLeft = textareaElement.scrollLeft;
});

// When textarea content changes, tokenize and update highlights
textareaElement.addEventListener('input', () => {
  const source = textareaElement.value;
  const tokens = lexer.tokenize(source);
  
  // Rebuild highlight div with tokens
  highlightDiv.innerHTML = '';
  for (const token of tokens) {
    const span = document.createElement('span');
    span.classList.add(`token-${token.type}`);
    span.textContent = token.value;
    highlightDiv.appendChild(span);
  }
});
```

**Measurement**: If font metrics differ slightly, use JavaScript to measure and adjust:

```typescript
function alignHighlightLayer(textarea: HTMLTextAreaElement, highlightDiv: HTMLElement) {
  const computed = window.getComputedStyle(textarea);
  highlightDiv.style.font = computed.font;
  highlightDiv.style.padding = computed.padding;
  highlightDiv.style.border = 'none';  // Highlight layer invisible; no border
  highlightDiv.style.width = computed.width;
  highlightDiv.style.height = computed.height;
}
```

### Offline Mock AI Provider Design

The `MockProvider` is a fallback when no API key is configured. It returns template handlers for common requests.

**Templates**:

```typescript
const templates: Record<string, string> = {
  click:      'on mouseUp\n  answer "Button clicked!"\nend mouseUp',
  alert:      'on mouseUp\n  answer "Alert!"\nend mouseUp',
  count:      'on mouseUp\n  put card counter + 1 into card counter\nend mouseUp',
  increment:  'on mouseUp\n  put card count + 1 into card count\nend mouseUp',
  next:       'on mouseUp\n  go next card\nend mouseUp',
  previous:   'on mouseUp\n  go previous card\nend mouseUp',
  show:       'on mouseUp\n  answer "Show logic"\nend mouseUp',
  hide:       'on mouseUp\n  answer "Hide logic"\nend mouseUp',
  text:       'on mouseUp\n  put "Updated text" into field "output"\nend mouseUp',
};

// Implement ModelProvider interface
class MockProvider implements ModelProvider {
  async generate(request: ScriptGenRequest): Promise<ScriptGenResponse> {
    const description = request.description.toLowerCase();
    let code = templates.click;  // Default
    
    for (const [keyword, template] of Object.entries(templates)) {
      if (description.includes(keyword)) {
        code = template;
        break;
      }
    }
    
    return {
      code,
      explanation: "Offline demo mode - add your own API key in AI Settings for real AI",
      confidence: 0.5
    };
  }
  
  async isAvailable(): Promise<boolean> {
    return true;  // Always available offline
  }
}
```

**Integration**: In settings panel, detect missing API key and label generated code with the disclaimer.

### Documentation Design

**README**:
- Clearly state testing scope: "Tested headless (Chromium only). Manual cross-browser testing required for production use."
- List implemented features (only those actually coded).
- Tech stack: TypeScript, Vite, Vitest, happy-dom, vanilla DOM.
- Quick-start guide: open app, load/create stack, write script, test in Run Mode.
- Link to cross-browser checklist.

**Cross-Browser Checklist** (new file: `docs/BROWSER_SUPPORT.md`):
- Template table for testers:
  - Column 1: Feature (Layout, Buttons, Fields, Script Execution, localStorage, Modals, Error Messages)
  - Columns 2–5: Chrome, Firefox, Safari, Edge (with checkboxes and notes)
- Instructions: manually test on each browser, record pass/fail/notes.
- Known limitations: e.g., "Safari: touch events not tested" or "IE: not supported."



---

## Phase 9: Haunted Premium UI – Design and Architecture

### Overview

Phase 9 introduces a polished, Kiroween-themed dark aesthetic while maintaining the Classic 1-bit theme as an opt-in alternative. The design emphasizes cohesion, accessibility, performance, and smooth micro-interactions without external dependencies.

### Design System

#### Color Palette

**Haunted Theme (Default)**
- **Background**: Deep near-black/indigo (`#0f0f1e` or similar)
- **Surface (Glass)**: Semi-transparent (`rgba(255, 255, 255, 0.05)` or similar for backdrop blur effect)
- **Primary Accent**: Glowing purple (`#a855f7`)
- **Secondary Accent**: Pumpkin orange (`#f97316`)
- **Text Primary**: Light (`#f5f5f5`)
- **Text Secondary**: Muted light (`#a0a0a0`)
- **Border**: Subtle light with opacity (`rgba(255, 255, 255, 0.1)`)
- **Shadow**: Soft, dark (`rgba(0, 0, 0, 0.3)`)

**Classic Theme (Optional)**
- Black, white, gray only (REQ-P8-003: inherited from Phase 8)
- No glass effects, soft shadows, or modern styling
- Retains 1-bit aesthetic

#### Typography

**Headings and Card Titles**: Pixel/Monospace Face
- System stack: Monaco → Courier New → monospace
- OR: Committed OFL-licensed pixel font (e.g., "Press Start 2P" or "JetBrains Mono")
- Font size: 12px–16px (pixel-friendly)
- Weight: 400 (no bold)

**UI Text**: System-ui Stack
- System stack: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif
- Font size: 13px–14px
- Weight: 400 (regular), 500 (semi-bold for buttons)

#### Shadows and Glass Effects

**Glass Morphism**:
```css
.glass-panel {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
}
```

**Hover/Active States**:
- Hover: Slight increase in background opacity + shadow intensity (transition: 150ms ease-out)
- Active/Pressed: Scale-down 2% + shadow decrease (transition: 50ms ease-out)

### Layout and Spacing

#### Toolbar
- Height: 44px (iOS standard)
- Padding: 8px horizontal, centered vertically
- Icons: 24px × 24px (inline SVG)
- Icon gap: 4px
- Tooltips: Position above icons on hover (14px font, Haunted theme styling)

#### Panels (Card List, Inspector, Script Editor)
- Border: 1px glass morphism border
- Padding: 12px
- Gap between sections: 8px
- Background: Glass panel color

#### Card Canvas
- Fixed aspect ratio: 512×342 (classic HyperCard)
- Centered in viewport
- Scale to fit with max 90% viewport width/height
- Gutter: 20px around card for controls

### Animations and Transitions

**Prefers-Reduced-Motion Support**:
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0s !important;
    transition-duration: 0s !important;
  }
}
```

**Card Navigation Transition**:
- Fade out + Fade in (200–250ms cubic-bezier(0.25, 0.46, 0.45, 0.94))
- OR: Flip on Y-axis (300ms) for more dramatic effect
- Ensure final state is fully interactive upon completion

**Mode Switch (Edit ↔ Run)**:
- Scale + Fade (150–200ms ease-out)
- Card grows to fill space in Run Mode; shrinks in Edit Mode

**Button/Element Hover**:
- Scale: 1 → 1.05 (very subtle)
- Opacity/Shadow: +5–10% (transition: 100ms ease-out)

**Button Press**:
- Scale: 1.05 → 0.98 (down press feedback)
- Shadow: decrease (transition: 50ms ease-in)
- Completion: 100ms total
- Return to hover state on release

**Modal Fade-In**:
- Opacity: 0 → 1 (100–150ms ease-out)
- Backdrop: Fade in simultaneously
- Scale: 0.95 → 1.0 (optional, subtle pop)

### Theme Toggle Implementation

#### Storage
```typescript
// localStorage
localStorage.setItem("stacks_theme", "haunted" | "classic");
```

#### CSS Class Strategy
```html
<!-- Root element -->
<body class="theme-haunted">
  <!-- or -->
  <body class="theme-classic">
```

#### CSS Variables (for Haunted theme)
```css
:root[data-theme="haunted"] {
  --bg-primary: #0f0f1e;
  --bg-secondary: rgba(255, 255, 255, 0.05);
  --color-primary: #f5f5f5;
  --color-secondary: #a0a0a0;
  --accent-purple: #a855f7;
  --accent-orange: #f97316;
  --border-color: rgba(255, 255, 255, 0.1);
  --shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
}

:root[data-theme="classic"] {
  --bg-primary: #ffffff;
  --bg-secondary: #f0f0f0;
  --color-primary: #000000;
  --color-secondary: #666666;
  --accent-purple: #000000;
  --accent-orange: #000000;
  --border-color: #000000;
  --shadow: none;
}
```

#### Toggle Button in Toolbar
```typescript
// In toolbar or settings
const themeToggle = createButton({
  icon: sunIcon(), // or moonIcon() depending on current theme
  tooltip: "Toggle Theme (Haunted / Classic)",
  onClick: () => toggleTheme()
});

function toggleTheme() {
  const current = localStorage.getItem("stacks_theme") || "haunted";
  const next = current === "haunted" ? "classic" : "haunted";
  localStorage.setItem("stacks_theme", next);
  document.documentElement.setAttribute("data-theme", next);
  // Re-render components as needed
}
```

### SVG Icons (Inline)

All icons are defined as inline SVG functions to avoid CDN requests:

```typescript
// src/dom/icons.ts
export function addCardIcon(): SVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "24");
  svg.setAttribute("height", "24");
  svg.setAttribute("fill", "currentColor");
  
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z");
  svg.appendChild(path);
  
  return svg;
}

export function undoIcon(): SVGElement { /* ... */ }
export function redoIcon(): SVGElement { /* ... */ }
export function deleteIcon(): SVGElement { /* ... */ }
export function saveIcon(): SVGElement { /* ... */ }
export function exportIcon(): SVGElement { /* ... */ }
export function importIcon(): SVGElement { /* ... */ }
export function runIcon(): SVGElement { /* ... */ }
export function themeIcon(theme: "sun" | "moon"): SVGElement { /* ... */ }
```

Icons are colored via CSS `currentColor` property, inheriting text color from parent theme.

### Script Editor Dark Theme

```css
.script-editor[data-theme="haunted"] {
  background: #1a1a2e;
  color: #f5f5f5;
}

.script-editor[data-theme="haunted"] .token-keyword {
  color: #a855f7; /* purple */
}

.script-editor[data-theme="haunted"] .token-string {
  color: #f97316; /* orange */
}

.script-editor[data-theme="haunted"] .token-number {
  color: #06b6d4; /* cyan */
}

.script-editor[data-theme="haunted"] .token-comment {
  color: #6b7280; /* gray */
}

.script-editor[data-theme="haunted"] .error-line {
  background: rgba(239, 68, 68, 0.1); /* red tint */
  border-left: 3px solid #ef4444;
}

.script-editor[data-theme="classic"] {
  /* Revert to Phase 8 1-bit styling */
  background: #ffffff;
  color: #000000;
}

.script-editor[data-theme="classic"] .token-keyword {
  color: #000000;
  font-weight: bold;
}

.script-editor[data-theme="classic"] .token-string {
  color: #333333;
}

.script-editor[data-theme="classic"] .error-line {
  background: #f0f0f0;
  border-left: 3px solid #ff0000;
}
```

### Styled Dialogs

Replace `window.alert()`, `window.confirm()`, `window.prompt()` with custom modals:

```typescript
// src/dom/components/styledDialogs.ts

interface DialogOptions {
  title?: string;
  message: string;
  buttons?: string[];
  type?: "info" | "warning" | "error" | "confirm";
  theme?: "haunted" | "classic";
}

export async function showAlert(options: DialogOptions): Promise<void> {
  // Render modal, await button click or dismiss
}

export async function showConfirm(options: DialogOptions): Promise<boolean> {
  // Render modal with Yes/No, return boolean
}

export async function showPrompt(options: DialogOptions & { defaultValue?: string }): Promise<string | null> {
  // Render modal with text input, return string or null
}

export async function showRename(currentName: string, theme: "haunted" | "classic"): Promise<string | null> {
  // Specialized rename dialog with pre-filled value
}
```

### AI Panel Styling

```html
<div class="ai-panel" data-theme="haunted">
  <header>
    <h2>Generate Script</h2>
    <button class="close-btn">✕</button>
  </header>
  
  <div class="ai-input">
    <textarea placeholder="Describe what you want the script to do..."></textarea>
    <button class="generate-btn">Generate</button>
  </div>
  
  <div class="ai-preview">
    <!-- Side-by-side diff will render here -->
  </div>
  
  <footer>
    <button class="reject-btn">Reject</button>
    <button class="accept-btn primary">Accept</button>
  </footer>
</div>
```

```css
.ai-panel[data-theme="haunted"] {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  backdrop-filter: blur(8px);
  border-radius: 8px;
  padding: 16px;
}

.ai-preview {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin: 12px 0;
  max-height: 300px;
  overflow-y: auto;
}

.ai-preview .line-removed {
  background: rgba(239, 68, 68, 0.2);
}

.ai-preview .line-added {
  background: rgba(34, 197, 94, 0.2);
}
```

### Empty State / Welcome Screen

```html
<div class="welcome-screen" data-theme="haunted">
  <div class="welcome-container">
    <h1>Welcome to Stacks</h1>
    <p>A visual programming environment inspired by HyperCard.</p>
    
    <div class="welcome-features">
      <div class="feature">
        <div class="feature-icon">🃏</div>
        <p>Create interactive stacks of cards with buttons and fields.</p>
      </div>
      <div class="feature">
        <div class="feature-icon">✍️</div>
        <p>Write scripts in HyperTalk-style syntax.</p>
      </div>
      <div class="feature">
        <div class="feature-icon">🤖</div>
        <p>Use AI to generate scripts from English descriptions.</p>
      </div>
    </div>
    
    <div class="welcome-actions">
      <button class="btn-primary" onclick="createNewStack()">Create New Stack</button>
      <button class="btn-secondary" onclick="loadExample()">Load Example Stack</button>
    </div>
  </div>
</div>
```

```css
.welcome-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: linear-gradient(135deg, var(--bg-primary), rgba(168, 85, 247, 0.1));
}

.welcome-container {
  text-align: center;
  max-width: 600px;
  padding: 40px;
}

.welcome-container h1 {
  font-size: 32px;
  font-family: var(--font-display);
  margin-bottom: 12px;
  color: var(--color-primary);
}

.welcome-features {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin: 40px 0;
}

.feature-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.welcome-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.btn-primary {
  background: var(--accent-purple);
  color: #ffffff;
  padding: 12px 24px;
  border-radius: 6px;
  transition: all 150ms ease-out;
}

.btn-primary:hover {
  transform: scale(1.05);
  box-shadow: 0 8px 16px rgba(168, 85, 247, 0.3);
}
```

### Contrast and Accessibility Verification

**WCAG AA Requirements**:
- Normal text (< 18px): 4.5:1 contrast ratio
- Large text (≥ 18px): 3:1 contrast ratio
- UI components (buttons, inputs): 3:1 contrast ratio

**Verification Matrix**:

| Element | Haunted Theme | Classic Theme | Ratio |
|---------|---------------|---------------|-------|
| Text on background | #f5f5f5 on #0f0f1e | #000000 on #ffffff | 12:1 ✓ |
| Button text | #ffffff on #a855f7 | #000000 on white | 7.5:1 ✓ |
| Secondary text | #a0a0a0 on #0f0f1e | #666666 on #ffffff | 5.2:1 ✓ |
| Accent text | #f97316 on #0f0f1e | #000000 on white | 8.1:1 ✓ |
| Focus ring | #a855f7 | #000000 | 4.5:1 min ✓ |

### Performance Optimization

#### Critical Path Rendering
1. Base theme CSS (variables, glass effects): ~2 kB
2. Layout CSS (grid, flexbox, panels): ~3 kB
3. Fonts (embedded or system stack): 0–5 kB (if OFL embedded)
4. Icons (SVG functions): ~3 kB

**Target**: 8–13 kB CSS total (gzipped ~2–4 kB)

#### JavaScript Optimization
1. Theme toggle logic: ~500 bytes
2. Modal/dialog components: ~2 kB
3. Animation/transition triggers: ~1 kB

**Target**: ~4 kB JS (gzipped ~1–2 kB)

#### Deferrable/Optional
- Complex animations: disable in prefers-reduced-motion
- AI panel (defer loading until user requests): ~2 kB
- Extra polish (micro-interactions): ~1 kB

**Total Budget**: CSS + JS + embedded fonts (gzipped) ≤ 40 kB
- Expected: 15–25 kB (leaving margin for unforeseen additions)

### Component Structure and Reusability

#### Themed Components
```typescript
// src/dom/components/themedButton.ts
interface ThemedButtonProps {
  icon?: SVGElement;
  label?: string;
  tooltip?: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
  theme?: "haunted" | "classic";
}

export function createThemedButton(props: ThemedButtonProps): HTMLElement {
  const button = document.createElement("button");
  button.className = `btn btn-${props.variant || "secondary"} theme-${props.theme || "haunted"}`;
  // ... setup
  return button;
}
```

#### Themed Panels
```typescript
// src/dom/components/themedPanel.ts
interface ThemedPanelProps {
  title?: string;
  theme?: "haunted" | "classic";
  children?: HTMLElement[];
}

export function createThemedPanel(props: ThemedPanelProps): HTMLElement {
  const panel = document.createElement("div");
  panel.className = `panel glass-morphism theme-${props.theme || "haunted"}`;
  // ... setup
  return panel;
}
```

### Class Names and Data-Attributes (Preserved from Phase 8)

To maintain test compatibility:
- Keep existing class names (e.g., `card-canvas`, `element-inspector`, `script-editor`)
- Preserve data-attributes (e.g., `data-button-id`, `data-field-id`, `data-card-id`)
- Add new theme-specific classes without renaming old ones:
  - `class="card-canvas theme-haunted"` (not `class="card-canvas-haunted"`)
  - `data-theme="haunted"` on root or specific containers

