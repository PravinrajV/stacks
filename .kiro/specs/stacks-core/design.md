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

## Interface Boundaries

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

