# Stacks Core: Implementation Plan

This document outlines the implementation tasks for the Stacks core engine, organized by module and phase. Each task is numbered, linked to requirements, and ordered for logical dependency flow.

---

## Phase 1: Data Model and Serialization

### Card Engine: Model Definitions

- [x] **1.1** Implement `Rect` interface and utility functions (center, width, height, intersect). *(Ref: REQ-CE-002, REQ-CE-003)*
  - Location: `src/model/types.ts`
  - Tests: `src/model/types.test.ts`

- [x] **1.2** Implement `Field` interface and class with getters/setters for content, style, rect. *(Ref: REQ-CE-002, REQ-CE-004)*
  - Location: `src/model/stack.ts`
  - Methods: `content`, `setContent()`, `isEditable()`, `serialize()`
  - Tests: Field serialization round-trip, content validation

- [x] **1.3** Implement `Button` interface and class with label, rect, style, and scripts map. *(Ref: REQ-CE-002, REQ-CE-004)*
  - Location: `src/model/stack.ts`
  - Methods: `getScript(handlerName)`, `setScript()`, `serialize()`
  - Tests: Script attachment, button lookup by ID

- [x] **1.4** Implement `Background` interface with fields, buttons, and scripts. *(Ref: REQ-CE-003, REQ-CE-004)*
  - Location: `src/model/stack.ts`
  - Methods: `getElementsInZOrder()`, `findElement(id)`, `serialize()`
  - Tests: Element lookup, z-order rendering

- [x] **1.5** Implement `Card` interface with backgroundId ref, buttons, fields, scripts, and card-scoped variables. *(Ref: REQ-CE-001, REQ-CE-002, REQ-CE-004, REQ-HT-006)*
  - Location: `src/model/stack.ts`
  - Methods: `getHandler(name)`, `setHandler()`, `getVariable()`, `setVariable()`, `serialize()`
  - Tests: Handler lookup, variable scoping, card references valid background IDs

- [x] **1.6** Implement `Stack` interface with backgrounds, cards, stack-scoped variables, and ID. *(Ref: REQ-CE-001, REQ-CE-004, REQ-HT-006)*
  - Location: `src/model/stack.ts`
  - Methods: `getCard(id)`, `addCard()`, `getHandler(name)`, `getVariable()`, `setVariable()`, `serialize()`, `deserialize(json)`
  - Tests: Card lookup, variable scoping, valid stack structure

### Serialization

- [x] **1.7** Implement JSON serialization for Stack, Card, Background, Button, Field (to JSON). *(Ref: REQ-CE-004)*
  - Location: `src/model/serialization.ts`
  - Ensure output matches canonical JSON schema (version "1.0").
  - Tests: `REQ-TEST-002` - Round-trip serialization, verify no data loss.

- [x] **1.8** Implement JSON deserialization (JSON to Stack object). *(Ref: REQ-CE-004)*
  - Location: `src/model/serialization.ts`
  - Validate schema, restore all elements, error handling for malformed JSON.
  - Tests: Invalid JSON rejected, error line/column reported. Valid JSON reconstructs correctly.

- [x] **1.9** Implement stack ID generation and URL-safe encoding (base32 or similar). *(Ref: REQ-CE-005)*
  - Location: `src/storage/encoding.ts`
  - Methods: `generateStackId()`, `encodeStackId(id)`, `decodeStackId(encoded)`
  - Tests: Encoding/decoding round-trip, URL-safe characters only.

- [x] **1.10** Implement stack compression (gzip or LZ4) for URL embedding. *(Ref: REQ-CE-005)*
  - Location: `src/storage/compression.ts`
  - Methods: `compress(json)`, `decompress(compressed)`
  - Tests: Compression ratio, round-trip fidelity.

---

## Phase 2: HyperTalk Interpreter (Lexer, Parser, AST)

### Lexer (Tokenization)

- [x] **2.1** Implement `Token` interface with type, value, line, column. *(Ref: REQ-HT-001)*
  - Location: `src/interpreter/lexer.ts`

- [x] **2.2** Implement keyword recognition (if, else, repeat, while, put, get, go, answer, on, end, etc.). *(Ref: REQ-HT-001)*
  - Location: `src/interpreter/lexer.ts`
  - Case-insensitive matching, reserved word list.
  - Tests: Each keyword tokenizes correctly, case variations work.

- [x] **2.3** Implement tokenization for identifiers, numbers, strings with escape sequences. *(Ref: REQ-HT-001)*
  - Location: `src/interpreter/lexer.ts`
  - String: handle `\"`, `\\`, `\n` escapes.
  - Numbers: integers, floats (no scientific notation yet).
  - Tests: Property-based: random valid identifiers tokenize. Edge cases: very long names, numbers with decimals.

- [x] **2.4** Implement operator and punctuation tokenization (+, -, *, /, <, >, =, !=, and, or, not, (, ), {, }, [, ], :, ,). *(Ref: REQ-HT-001)*
  - Location: `src/interpreter/lexer.ts`
  - Distinguish between - (minus) and - (prefix negation).
  - Tests: All operators tokenize, precedence preserved in later parsing.

- [x] **2.5** Implement line/column tracking for error reporting. *(Ref: REQ-HT-001, REQ-EH-001)*
  - Location: `src/interpreter/lexer.ts`
  - Track line breaks and position in each line.
  - Tests: Errors report correct line/column for multi-line input.

- [x] **2.6** Implement lexer error handling (unterminated string, invalid escape, unknown token). *(Ref: REQ-HT-001, REQ-EH-001)*
  - Location: `src/interpreter/lexer.ts`
  - Raise error with position info, halt tokenization.
  - Tests: Unterminated string at line X, column Y reported correctly.

### Parser (AST Generation)

- [x] **2.7** Implement `ASTNode` base interface and node types (IfStatement, RepeatStatement, PutStatement, GoStatement, HandlerDefinition, Expression). *(Ref: REQ-HT-002)*
  - Location: `src/interpreter/parser.ts`
  - Each node includes type, line, column for error reporting.

- [x] **2.8** Implement expression parser with operator precedence (arithmetic > comparison > logical). *(Ref: REQ-HT-002, REQ-HT-005)*
  - Location: `src/interpreter/parser.ts`
  - Precedence: * / before + -, then <>, then and/or.
  - Handle parenthesized expressions.
  - Tests: `2 + 3 * 4 = 14`, `(2 + 3) * 4 = 20`, boolean short-circuit evaluation.

- [x] **2.9** Implement statement parser (if/else, repeat/while, put, get, go, answer, return). *(Ref: REQ-HT-002, REQ-HT-005)*
  - Location: `src/interpreter/parser.ts`
  - Parse structured blocks (if...end if, repeat...end repeat).
  - Tests: Nested if/repeat, mismatched end keywords report parse errors.

- [x] **2.10** Implement handler definition parser (on <name> <statements> end). *(Ref: REQ-HT-002, REQ-HT-004)*
  - Location: `src/interpreter/parser.ts`
  - Parse handler name, optional parameters, body statements.
  - Tests: `on mouseUp: answer "clicked"` parses correctly. Parameters parsed (if used).

- [x] **2.11** Implement function call parser (e.g., `add(2, 3)`, `contains(str, substr)`). *(Ref: REQ-HT-002, REQ-HT-005)*
  - Location: `src/interpreter/parser.ts`
  - Parse identifier followed by parentheses and argument list.
  - Tests: Function calls with 0, 1, multiple arguments parse correctly.

- [x] **2.12** Implement parser error handling with line/column reporting and helpful messages. *(Ref: REQ-HT-002, REQ-EH-001)*
  - Location: `src/interpreter/parser.ts`
  - Report: "Expected 'end if' but found 'endif' at line 3, column 5".
  - Tests: Syntax errors produce expected error messages.

- [x] **2.13** Add property-based tests for parser: generate random valid tokens, verify parse doesn't crash. *(Ref: REQ-TEST-001)*
  - Location: `src/interpreter/parser.test.ts`
  - Use fast-check to generate valid token sequences.
  - Verify all generated ASTs are well-formed (no undefined nodes).

---

## Phase 3: HyperTalk Runtime (Tree-Walking Evaluator)

### Runtime Core

- [x] **3.1** Implement `ExecutionContext` with stack, currentCard, localVariables, callStack, stepCount, startTime. *(Ref: REQ-HT-003, REQ-EH-002)*
  - Location: `src/interpreter/runtime.ts`

- [x] **3.2** Implement variable scoping: local → card → stack lookup order. *(Ref: REQ-HT-006)*
  - Location: `src/interpreter/runtime.ts`
  - Methods: `getVariable(scope, name)`, `setVariable(scope, name, value)`, `resolveVariable(name)`.
  - Tests: Variable shadowing (local overrides card overrides stack).

- [x] **3.3** Implement basic tree-walking evaluator that executes AST statements in order. *(Ref: REQ-HT-003)*
  - Location: `src/interpreter/runtime.ts`
  - Method: `execute(ast, context): void`
  - Handle statement types (if, repeat, put, get, go, answer, return).
  - Tests: Sequential statements execute in order. Variables persist across statements.

- [x] **3.4** Implement expression evaluator (literals, variables, operators, function calls). *(Ref: REQ-HT-003, REQ-HT-005)*
  - Location: `src/interpreter/runtime.ts`
  - Method: `evaluateExpression(expr, context): any`
  - Support arithmetic (+, -, *, /), comparison (<, >, =, !=), logical (and, or, not).
  - Tests: `2 + 3 = 5`, `"hello" concat "world" = "helloworld"`, boolean logic short-circuits.

- [x] **3.5** Implement execution timeout and step limit enforcement (5s, 100k steps). *(Ref: REQ-HT-003, REQ-EH-003)*
  - Location: `src/interpreter/runtime.ts`
  - Check time elapsed and step count in each statement/loop.
  - Halt with "Execution timeout" error if exceeded.
  - Tests: Script that runs too long halts, step counter increments correctly.

- [x] **3.6** Implement error catching and reporting without crashing. *(Ref: REQ-HT-003, REQ-EH-002)*
  - Location: `src/interpreter/runtime.ts`
  - Catch runtime errors (undefined variable, type error, division by zero).
  - Emit user-facing error message, log stack trace.
  - Tests: Undefined variable error caught, continue execution on next handler.

### Built-in Commands and Functions

- [x] **3.7** Implement `put` command (assign value to field or variable). *(Ref: REQ-HT-005)*
  - Location: `src/interpreter/builtins.ts`
  - Syntax: `put <expr> into <target>` where target is field, card var, or stack var.
  - Tests: `put 5 into x`, `put "hi" into field "name"` work correctly.

- [x] **3.8** Implement `get` command (retrieve value from field or variable). *(Ref: REQ-HT-005)*
  - Location: `src/interpreter/builtins.ts`
  - Syntax: `get <expr>` (typically used in expressions, implicit return).
  - Tests: `get field "score"` returns field content.

- [x] **3.9** Implement `go` command (navigate to card). *(Ref: REQ-HT-005, REQ-CE-001)*
  - Location: `src/interpreter/builtins.ts`
  - Syntax: `go to card <id>`, `go next card`, `go previous card`, `go first card`, `go last card`.
  - Emit `openCard` message to target card.
  - Tests: Navigation to valid/invalid cards. openCard handler fires correctly.

- [x] **3.10** Implement `answer` command (modal dialog with buttons). *(Ref: REQ-HT-005)*
  - Location: `src/interpreter/builtins.ts`
  - Syntax: `answer "message" with button "OK" or button "Cancel"`.
  - Return which button was clicked (0, 1, 2, ...).
  - Tests: Dialog displays, correct button index returned based on user click.

- [x] **3.11** Implement math functions (add, subtract, multiply, divide, sqrt, round, random). *(Ref: REQ-HT-005)*
  - Location: `src/interpreter/builtins.ts`
  - Tests: Each function computes correctly. Division by zero caught.

- [x] **3.12** Implement string functions (concat, length, contains, split, uppercase, lowercase, substring, trim). *(Ref: REQ-HT-005)*
  - Location: `src/interpreter/builtins.ts`
  - Tests: Each function manipulates strings correctly. Edge cases: empty strings, out-of-bounds indices.

- [x] **3.13** Implement if/else control flow. *(Ref: REQ-HT-005)*
  - Location: `src/interpreter/runtime.ts`
  - Evaluate condition, execute then or else branch.
  - Tests: Conditions evaluated correctly, else branch skipped if condition true.

- [x] **3.14** Implement repeat control flow (repeat N times, repeat while, repeat until). *(Ref: REQ-HT-005)*
  - Location: `src/interpreter/runtime.ts`
  - Tests: Loops execute correct number of times, while/until conditions respected.

### Message Passing and Handler Execution

- [x] **3.15** Implement message dispatcher (send message to element hierarchy). *(Ref: REQ-HT-004)*
  - Location: `src/interpreter/runtime.ts` or `src/dispatcher.ts`
  - Method: `send(messageName, target, context): void`
  - Hierarchy: element → card → background → stack.
  - Tests: Message propagates through hierarchy, handler lookup works at each level.

- [x] **3.16** Implement handler lookup (find handler by name on element/card/background/stack). *(Ref: REQ-HT-004)*
  - Location: `src/interpreter/runtime.ts`
  - Method: `findHandler(name, scope): Handler | null`
  - Tests: Handler found on correct scope, not found returns null.

- [x] **3.17** Implement handler invocation (invoke handler with new execution context). *(Ref: REQ-HT-004)*
  - Location: `src/interpreter/runtime.ts`
  - Method: `invokeHandler(handler, context): void`
  - Create new local scope for handler, inherit card/stack variables.
  - Tests: Handler variables local, card/stack variables accessible.

- [x] **3.18** Implement openCard message (fired when card is displayed). *(Ref: REQ-HT-004, REQ-CE-001)*
  - Location: `src/interpreter/runtime.ts`
  - Send openCard to card, then background, then stack when card navigation completes.
  - Tests: openCard handlers execute in order, can update fields.

- [x] **3.19** Implement mouseUp message (fired when button is clicked). *(Ref: REQ-HT-004, REQ-CE-001)*
  - Location: `src/interpreter/runtime.ts`
  - Send mouseUp to button, then card, then background, then stack.
  - Tests: Handler on button executes first; if absent, handler on card executes, etc.

### Sandbox Enforcement

- [x] **3.20** Implement sandbox: block fetch, XMLHttpRequest, eval. *(Ref: REQ-EH-003)*
  - Location: `src/interpreter/sandbox.ts`
  - When these are called, raise "Operation not allowed in scripts" error.
  - Tests: Each blocked operation raises error, execution continues.

- [x] **3.21** Implement sandbox: block access to restricted globals (window, document, localStorage). *(Ref: REQ-EH-003)*
  - Location: `src/interpreter/sandbox.ts`
  - When accessed, raise "Sandbox violation" error.
  - Tests: Cannot access window properties from script.

---

## Phase 4: Script Generation (AI-Assisted)

### Model Provider Interface

- [x] **4.1** Define `ModelProvider` interface and abstract class. *(Ref: REQ-SG-002)*
  - Location: `src/ai/modelProvider.ts`
  - Methods: `generate(request): Promise<ScriptGenResponse>`, `isAvailable(): Promise<boolean>`.

- [x] **4.2** Implement `CloudModelProvider` for Claude API. *(Ref: REQ-SG-002)*
  - Location: `src/ai/cloudModelProvider.ts`
  - Initialize with API key, construct prompts, make HTTP requests, parse responses.
  - Tests: Mock API calls, verify requests well-formed, responses parsed correctly.

- [x] **4.3** Implement `OllamaProvider` for local Ollama instance (optional, can defer). *(Ref: REQ-SG-002)*
  - Location: `src/ai/ollamaProvider.ts`
  - Connect to local Ollama server, send prompts, parse responses.
  - Tests: If Ollama available, verify connection and generation.

### Prompt and Validation

- [x] **4.4** Implement prompt template and context building for script generation. *(Ref: REQ-SG-001)*
  - Location: `src/ai/scriptGen.ts`
  - Build prompt from user description, card name, field names, button labels.
  - Example: "Generate HyperTalk code: When the user clicks, show an alert with the card title."
  - Tests: Prompts generated correctly, context injected.

- [x] **4.5** Implement response parsing (extract code from model output). *(Ref: REQ-SG-001)*
  - Location: `src/ai/scriptGen.ts`
  - Find HyperTalk code block in response (e.g., between ````hyperscript`` markers or plain code).
  - Tests: Code extracted correctly from various response formats.

- [x] **4.6** Implement output validation using parser (parse generated code before insertion). *(Ref: REQ-SG-001, REQ-SG-003)*
  - Location: `src/ai/scriptGen.ts`
  - Method: `validateGenerated(code): { valid: true } | { valid: false, error: ParseError }`
  - Tests: Invalid code rejected, valid code accepted.

- [x] **4.7** Implement diff generation (show what will be added/changed). *(Ref: REQ-SG-003)*
  - Location: `src/ai/diff.ts` or inline in UI
  - Generate visual diff comparing current script and generated code.
  - Tests: Diff highlights new/changed/deleted lines.

- [x] **4.8** Implement model provider fallback and error handling. *(Ref: REQ-SG-002)*
  - Location: `src/ai/scriptGen.ts`
  - If primary provider unavailable, try fallback. If all fail, emit clear error.
  - Tests: Error message: "Model provider unreachable. Check configuration."

### Integration with UI (Script Editor)

- [x] **4.9** Integrate script generator with script editor UI. *(Ref: REQ-SG-001, REQ-SG-003, REQ-SG-004)*
  - Location: `src/dom/editor.ts` (or new `src/dom/scriptGenPanel.ts`)
  - UI: Text input for description, "Generate" button, diff preview, "Accept" / "Reject" buttons.
  - On "Accept": insert code and re-parse handler.
  - Tests: UI flows correctly, generated code inserted and parsed successfully.

---

## Phase 5: Integration and Testing

### Unit Tests (Colocated)

- [x] **5.1** Write comprehensive unit tests for `src/model/stack.ts`. *(Ref: REQ-TEST-002)*
  - Location: `src/model/stack.test.ts`
  - Coverage: Field/Button/Card/Background/Stack creation, lookup, serialization, variable scoping.
  - Target: 95%+ line coverage.

- [x] **5.2** Write comprehensive unit tests for lexer. *(Ref: REQ-TEST-001, REQ-TEST-002)*
  - Location: `src/interpreter/lexer.test.ts`
  - Coverage: All token types, keywords, escape sequences, error cases.
  - Target: 95%+ line coverage.

- [x] **5.3** Write comprehensive unit tests for parser. *(Ref: REQ-TEST-001, REQ-TEST-002)*
  - Location: `src/interpreter/parser.test.ts`
  - Coverage: All statement types, expressions, operator precedence, error cases, handler definitions.
  - Target: 90%+ line coverage.
  - Include property-based tests for random valid token sequences.

- [x] **5.4** Write comprehensive unit tests for runtime. *(Ref: REQ-TEST-001, REQ-TEST-002)*
  - Location: `src/interpreter/runtime.test.ts`
  - Coverage: Built-in commands, functions, scoping, message passing, timeout, sandbox.
  - Target: 85%+ line coverage.

- [x] **5.5** Write unit tests for serialization round-trip. *(Ref: REQ-TEST-002)*
  - Location: `src/model/serialization.test.ts`
  - Coverage: Stack → JSON → Stack equivalence, invalid JSON rejection.
  - Target: 100% coverage.

- [x] **5.6** Write unit tests for script generation and validation. *(Ref: REQ-TEST-002)*
  - Location: `src/ai/scriptGen.test.ts`
  - Coverage: Prompt building, response parsing, validation, error handling.
  - Mock model provider for testing.
  - Target: 70%+ coverage.

### Integration Tests

- [x] **5.7** Test end-to-end stack creation, serialization, navigation. *(Ref: REQ-CE-001, REQ-CE-004, REQ-CE-005)*
  - Location: `tests/integration.test.ts` or new file
  - Scenario: Create stack with cards, add fields/buttons, serialize to JSON, load from JSON, navigate, verify data intact.

- [x] **5.8** Test end-to-end script execution (handler firing on button click, field update). *(Ref: REQ-HT-004, REQ-HT-005)*
  - Location: `tests/integration.test.ts`
  - Scenario: Create card with button, attach mouseUp handler with `put "clicked" into field X`, click button, verify field updated.

- [x] **5.9** Test script generation workflow (describe → generate → validate → preview → insert). *(Ref: REQ-SG-001, REQ-SG-003)*
  - Location: `tests/integration.test.ts`
  - Scenario: Request script generation, verify code generated, diff shown, insertion succeeds.

- [x] **5.10** Test error handling and recovery (invalid script, parse error, runtime error, timeout). *(Ref: REQ-EH-001, REQ-EH-002, REQ-EH-003)*
  - Location: `tests/integration.test.ts`
  - Scenarios: Load invalid JSON → error reported; execute script with undefined var → error caught, continue; timeout → halted.

### Bundle Size and Performance

- [x] **5.11** Measure bundle size (target: <500KB gzipped). *(Ref: Tech constraints)*
  - Run: `npm run build` and check dist/ size.
  - If over budget, identify and optimize largest modules.

- [x] **5.12** Profile runtime performance (ensure handler execution is fast). *(Ref: Tech constraints)*
  - Benchmark: Parse and execute 100 stacks with 50 cards each.
  - Target: <1s total for typical stack operations.

---

## Phase 6: Polish and Documentation

- [x] **6.1** Add code comments and docstrings to all public interfaces. *(Ref: Documentation)*
  - Location: All `src/` modules.
  - Ensure TypeScript JSDoc comments for all exported functions.

- [x] **6.2** Create module-level README for interpreter, model, and AI components. *(Ref: Documentation)*
  - Location: `src/interpreter/README.md`, `src/model/README.md`, `src/ai/README.md`

- [x] **6.3** Add syntax highlighting and error underline to script editor. *(Ref: REQ-EH-001)*
  - Location: `src/dom/editor.ts`
  - Highlight keywords, strings, numbers; underline parse errors in red.

- [x] **6.4** Add keyboard shortcuts for common actions (Cmd+Enter to submit script, Ctrl+/ for comment). *(Ref: UX polish)*
  - Location: `src/dom/editor.ts`

- [ ] **6.5** Test across browsers (Chrome, Firefox, Safari on desktop). *(Ref: REQ-CE-001)*
  - Verify rendering, script execution, serialization work consistently.

---

## Dependency Graph

```
Phase 1 (Model) → Phase 2 (Lexer/Parser) → Phase 3 (Runtime) → Phase 4 (Script Gen) → Phase 5 (Testing) → Phase 6 (Polish)
```

- Tasks in Phase 1 are independent; can work in parallel.
- Phase 2 depends on Phase 1 (needs model structures for AST).
- Phase 3 depends on Phase 2 (needs parser output).
- Phase 4 depends on Phase 2 and 3 (needs parser for validation, runtime for execution).
- Phase 5 depends on earlier phases (writes tests for all modules).
- Phase 6 is polish; can run in parallel with Phase 5.

---

## Phase 7: UI Layer Implementation

### App Shell and Layout

- [x] **7.1** Implement `App` class with state management and layout. *(Ref: REQ-UI-007, REQ-UI-CONST-001)*
  - Location: `src/dom/app.ts`
  - Maintains `AppState` (stack, currentCard, selectedElement, mode, undo/redo).
  - Renders 3-column layout with card list, canvas, inspector.
  - Methods: `setState()`, `render()`, `switchMode(mode)`, `undo()`, `redo()`.
  - Tests: `src/dom/app.test.ts` - State updates trigger re-render; undo/redo work correctly.

- [x] **7.2** Implement `CardListPanel` UI component. *(Ref: REQ-UI-001)*
  - Location: `src/dom/cardList.ts`
  - Displays list of card names/thumbnails with +/- buttons.
  - Highlights current card, fires `onSelectCard`, `onAddCard`, `onDeleteCard` callbacks.
  - Tests: Card list renders, selection works, add/delete buttons respond.

- [x] **7.3** Implement `CardCanvas` editor component with drag/resize. *(Ref: REQ-UI-002)*
  - Location: `src/dom/cardCanvas.ts`
  - Renders card background, buttons, and fields at their rects.
  - On element click: show bounding box and select element.
  - On mouse drag: update element rect and model.
  - On resize handle drag: update element dimensions.
  - Tests: Elements render at correct positions; drag/resize updates model.

- [x] **7.4** Implement `ElementInspector` properties panel. *(Ref: REQ-UI-002, REQ-UI-003)*
  - Location: `src/dom/elementInspector.ts`
  - Show properties (label, name, position, size, font, editable, scripts) in form fields.
  - On input change: update model and re-render canvas.
  - Support different field types (text input, checkbox, select).
  - Tests: Inspector renders correct properties; changes update model.

- [x] **7.5** Implement `ScriptEditor` with syntax highlighting. *(Ref: REQ-UI-005, REQ-UI-EH-001)*
  - Location: `src/dom/scriptEditor.ts`
  - Display script text in editor (textarea with custom token highlighting overlay).
  - Parse on every keystroke; show parse errors with underline.
  - Provide "Preview" button to execute script in test context.
  - Tests: Script highlighting works; errors displayed on correct lines; preview executes.

- [x] **7.6** Implement `RunModeViewer` for card execution. *(Ref: REQ-UI-004, REQ-UI-EH-002)*
  - Location: `src/dom/runMode.ts`
  - Render card in full-screen mode (buttons clickable, fields editable).
  - On button click: fire mouseUp handler via runtime, execute script, update fields.
  - On field edit: update field content.
  - Show runtime errors in a toast/modal.
  - Tests: Button clicks fire handlers; field updates visible; errors display.

- [x] **7.7** Implement `storage.ts` for localStorage persistence. *(Ref: REQ-UI-006)*
  - Location: `src/dom/storage.ts`
  - Methods: `saveStack(stack)`, `loadStack()`, `exportJSON(stack)`, `importJSON(json)`.
  - Save current stack + undo/redo history to localStorage on every model change.
  - Load on app startup; restore undo/redo state.
  - Export: trigger download of JSON file.
  - Import: read JSON from file or drag-drop, validate, load into app.
  - Tests: Round-trip persistence, export/import fidelity, error handling for invalid JSON.

- [x] **7.8** Implement styles.css with 1-bit aesthetic. *(Ref: REQ-UI-CONST-002)*
  - Location: `src/dom/styles.css`
  - Color palette: black, white, #ccc (light gray), #999 (medium gray).
  - Typography: monospace font (Monaco, Courier New fallback).
  - Borders: 1-2px solid black/gray, no rounded corners, no shadows.
  - Layout: CSS Grid for main layout, flexbox for components.
  - Tests: Visual regression tests (screenshot comparison) via jsdom HTML output.

### DOM Utilities and Components

- [x] **7.9** Implement DOM utility functions in `src/dom/utils/dom.ts`. *(Ref: REQ-UI-CONST-001)*
  - Helper functions: `createElement()`, `setAttributes()`, `addEventListener()` (with cleanup), `removeAllChildren()`.
  - Centralize DOM manipulation to prevent direct `innerHTML` use (prevent XSS).
  - Tests: Helpers create correct elements, manage events without memory leaks.

- [x] **7.10** Implement `src/dom/components/button.ts` - styled button wrapper. *(Ref: REQ-UI-CONST-2)*
  - Wraps standard `<button>` with 1-bit styling, click handler.
  - Methods: `setText()`, `setDisabled()`, `onClick()`.
  - Tests: Button renders, click fires callback, disabled state works.

- [x] **7.11** Implement `src/dom/components/textInput.ts` - styled text input. *(Ref: REQ-UI-CONST-002)*
  - Wraps `<input type="text">` or `<textarea>` with 1-bit styling.
  - Methods: `getValue()`, `setValue()`, `onInput()`, `setPlaceholder()`.
  - Tests: Input renders, value updates, input event fires.

- [x] **7.12** Implement `src/dom/components/modal.ts` - modal dialog. *(Ref: REQ-UI-004, REQ-UI-EH-002)*
  - Display modal with message and buttons, return which button was clicked.
  - Used for `answer` command and error dialogs.
  - Methods: `show(message, buttons)`, returns Promise<number> (button index).
  - Tests: Modal displays, buttons clickable, correct button index returned.

### Integration Tests for UI

- [x] **7.13** Write end-to-end test: create card, add button, write script, click button in Run Mode. *(Ref: REQ-UI-004, REQ-UI-005)*
  - Location: `tests/ui-e2e.test.ts`
  - Scenario: Create stack → add card → add button "Click Me" → attach script `put "Clicked!" into field "output"` → add field → switch to Run Mode → click button → verify field content.
  - Use jsdom/happy-dom for DOM simulation.

- [x] **7.14** Write test: import/export JSON preserves all stack data. *(Ref: REQ-UI-006)*
  - Location: `tests/ui-storage.test.ts`
  - Scenario: Create stack with cards/buttons/fields/scripts → export JSON → import JSON → verify stack identical.

- [x] **7.15** Write test: script editor displays parse errors with line/column. *(Ref: REQ-UI-005, REQ-UI-EH-001)*
  - Location: `tests/ui-editor.test.ts`
  - Scenario: Type invalid script → verify error underlined on correct line → hover error → verify tooltip displays message.

- [x] **7.16** Write test: undo/redo works for element add/delete/move. *(Ref: REQ-UI-008)*
  - Location: `tests/ui-undo.test.ts`
  - Scenario: Add button → undo → button removed → redo → button restored with same properties.

- [x] **7.17** Write test: localStorage persistence across page reload. *(Ref: REQ-UI-006, REQ-UI-008)*
  - Location: `tests/ui-persistence.test.ts`
  - Scenario: Create/modify stack → save → simulate page reload → verify stack restored with correct state and undo history.

### Accessibility and Polish

- [x] **7.18** Add keyboard shortcuts and accessible labels. *(Ref: REQ-UI-CONST-001)*
  - Location: `src/dom/app.ts`, all components
  - Shortcuts: Cmd/Ctrl+S (save), Cmd/Ctrl+Z (undo), Cmd/Ctrl+Shift+Z (redo), Tab (navigate elements), Delete (remove selected).
  - Add `aria-label`, `aria-describedby` to interactive elements.
  - Tests: Keyboard navigation works, screen reader text present.

- [x] **7.19** Implement responsive canvas scrolling for large cards. *(Ref: REQ-UI-007)*
  - Location: `src/dom/cardCanvas.ts`
  - Allow pan/zoom if card is larger than viewport.
  - Keyboard: arrow keys to pan, Cmd+scroll to zoom.
  - Tests: Panning and zooming work correctly, elements remain selectable.

- [x] **7.20** Cross-browser testing (Chrome, Firefox, Safari). *(Ref: REQ-CE-001)*
  - Location: Manual testing or Playwright/Cypress integration tests
  - Verify layout, rendering, script execution consistent across browsers.
  - Test touch events (if mobile is in scope) or note desktop-only.

---

## Dependency Graph (Updated)

```
Phase 1 (Model)
     ↓
Phase 2 (Lexer/Parser)
     ↓
Phase 3 (Runtime)
  ↙      ↖
Phase 4   Phase 7 (UI)
(Script   (depends on
 Gen)     1, 2, 3, 4)
  ↓         ↓
   ↖       ↗
Phase 5 (Testing & Integration)
     ↓
Phase 6 (Polish & Documentation)
```

- **Phase 7** depends on all prior phases.
  - Uses Model (Phase 1) to read/write cards.
  - Uses Parser (Phase 2) for script validation.
  - Uses Runtime (Phase 3) to execute scripts.
  - Uses Script Generation (Phase 4) for AI-assisted writing (optional integration).
- **Phase 5 & 6** run in parallel with Phase 7 or after.

---

## Execution Notes (Updated)

- **Commit Strategy**: Commit after each task or small group of related tasks.
- **Testing**: Run `npm run test` after each task to catch regressions. Phase 7 tests require jsdom setup (already in Vitest config).
- **Code Review**: Use peer review for major components (App state machine, CardCanvas, ScriptEditor).
- **Documentation**: Add JSDoc comments to all public UI methods; keep README updated.
- **UI Testing**: Since DOM testing is harder to visualize, create simple HTML pages (`/index.html`) that manually test components during development.
- **Bundle Size**: Monitor that UI + core stays <500KB gzipped; remove unused CSS/components if needed.

---

## Phase 8: Demo Readiness

### Layout and Viewport Management

- [x] **8.1** Implement fixed 512×342 logical card size with responsive scaling. *(Ref: REQ-P8-001)*
  - Location: `src/dom/cardCanvas.ts`, `src/dom/runMode.ts`
  - The card renders at fixed logical dimensions and scales proportionally to fit available viewport.
  - Implement a scale transform or CSS zoom that maintains aspect ratio.
  - Elements (buttons, fields) scale with the card; drag/resize uses logical coordinates.
  - Tests: Verify card scales correctly on viewport resize; elements remain selectable and interactive at any scale.

### In-UI Authoring Tools

- [x] **8.2** Add "Add Card", "Add Button", "Add Field", "Delete Card", "Rename" UI controls. *(Ref: REQ-P8-002)*
  - Location: `src/dom/cardList.ts`, `src/dom/cardCanvas.ts`, `src/dom/elementInspector.ts`
  - Card list: add +/Delete buttons for cards; context menu for rename.
  - Canvas: add +Button/+Field buttons in toolbar or context menu.
  - Element creation: new elements get default positions/sizes and unique names.
  - Rename: inline text editor or modal dialog for card/button/field names.
  - Delete: confirmation prompt before removal.
  - Tests: All CRUD operations work; elements created with correct defaults; renames persist.

- [x] **8.2b** Load starter stack (`examples/haunted-counter.json`) on first visit when no saved stack exists. *(Ref: REQ-P8-002)*
  - Location: `src/dom/app.ts`, `src/dom/storage.ts`
  - On app startup: check localStorage for saved stack.
  - If no stack exists: load `examples/haunted-counter.json` as default.
  - If file not found: create empty starter stack with one blank card.
  - Auto-save any changes to localStorage.
  - Tests: First visit shows starter stack; subsequent visits show last-saved stack.

### 1-Bit Visual Design

- [x] **8.3** Implement classic Mac 1-bit aesthetic: black/white/gray, monospace font, borders, menu bar, accessible contrast. *(Ref: REQ-P8-003)*
  - Location: `src/dom/styles.css`, all DOM components
  - Color palette: limit to #000, #fff, #ccc, #999, #666.
  - Typography: monospace (Monaco, "Courier New", system-ui fallback).
  - Borders: 1–2px solid, no rounded corners, no drop shadows.
  - Focus indicators: inverted colors or thicker border, meets WCAG AA (4.5:1 contrast minimum).
  - Menu bar: horizontal top bar with classic Mac styling (if added).
  - Patterns: optional dithered/checker backgrounds for visual depth (SVG or CSS patterns).
  - Tests: Visual regression testing (screenshot comparison); contrast ratios verified; focus states visible on keyboard navigation.

### Answer Modal Dialog

- [x] **8.4** Implement accessible modal dialog for `answer` command in run mode. *(Ref: REQ-P8-004)*
  - Location: `src/dom/components/modal.ts`, `src/interpreter/runtime.ts`
  - Modal displays message text and a row of buttons.
  - Focus is captured in the modal; clicking a button returns its index to the script.
  - Keyboard accessible: Tab navigates buttons, Enter/Space confirms.
  - Modal blocks interaction with card below.
  - Tests: Modal displays correctly; button clicks return correct index; keyboard navigation works; focus restored on close.

### Script Editor Syntax Highlight Layer

- [x] **8.5** Implement perfectly-aligned syntax highlight overlay (textarea + div layer) with synchronized scrolling. *(Ref: REQ-P8-005)*
  - Location: `src/dom/scriptEditor.ts`
  - Use `<textarea>` for user input and `<div contenteditable="false">` for highlights.
  - Apply identical CSS: font, font-size, line-height, padding, border, white-space: pre.
  - Position highlight layer absolutely over textarea at (0, 0).
  - Synchronize scrolling: when textarea scrolls, update highlight div's scroll position.
  - On keystroke: update highlight tokens in real-time (same content, just styled).
  - Measure font metrics via JavaScript if needed to ensure exact alignment.
  - Tests in Chromium: verify no text drift under normal typing, multi-line input, and rapid scrolling.

### Offline Mock AI Provider

- [x] **8.6** Implement offline mock AI provider with sensible templates for common requests. *(Ref: REQ-P8-006)*
  - Location: `src/generator/mockProvider.ts`
  - Detect API key absence; use MockProvider as fallback.
  - Template patterns: "click"/"alert" → `on mouseUp: answer "Hello"`; "count"/"increment" → increment card variable; "next"/"previous card" → `go next/previous card`; "show"/"hide" → placeholder; "put"/"text" → `put value into field`.
  - Return non-empty, functional handler code (not placeholders).
  - Label output: "Offline demo mode - add your own API key in AI Settings for real AI".
  - On API key addition in settings: switch to real provider, remove label.
  - Tests: Common requests generate valid, runnable code; label appears/disappears correctly.

### Documentation

- [ ] **8.7** Update README to reflect testing scope and cross-browser checklist. *(Ref: REQ-P8-007)*
  - Location: `README.md`, `docs/BROWSER_SUPPORT.md` (or new checklist file)
  - README: clearly state "Tested headless (Chromium only). Manual cross-browser testing required for production."
  - Feature list: ensure all described features are implemented.
  - Tech stack: verify TypeScript, Vite, Vitest, happy-dom, vanilla DOM are accurately listed.
  - Cross-browser checklist: template for testers to verify Chrome, Firefox, Safari, Edge (layout, interaction, scripts, localStorage, modals, errors).
  - Tests: README accuracy verified (no promised unimplemented features).


---

## Phase 9: Haunted Premium UI

### Theme System and Token Foundation

- [ ] **9.1.1** Define theme color variables and CSS system. *(Ref: REQ-P9-001, REQ-P9-002, REQ-P9-003)*
  - Location: `src/dom/styles.css`
  - Define CSS custom properties for Haunted theme (colors, shadows, borders, fonts).
  - Define CSS custom properties for Classic theme (overrides).
  - Implement `[data-theme="haunted"]` and `[data-theme="classic"]` selectors.
  - Tests: Verify CSS variables are accessible, color values correct, contrast meets WCAG AA (4.5:1 for text).

- [ ] **9.1.2** Implement theme toggle logic and localStorage persistence. *(Ref: REQ-P9-003)*
  - Location: `src/dom/app.ts`
  - Add `toggleTheme()` method to App class.
  - Read/write theme preference to localStorage on load and toggle.
  - Default to Haunted theme if no preference saved.
  - Update `document.documentElement.setAttribute("data-theme", theme)` on toggle.
  - Tests: Verify theme persists across page reload, toggle works, both themes render correctly.

- [ ] **9.1.3** Create theme token documentation and usage guide. *(Ref: Design: Theme System)*
  - Location: `docs/THEME.md`
  - Document color palette (Haunted and Classic).
  - Document typography system (display vs. UI fonts).
  - Document spacing, shadows, and glass-morphism values.
  - Provide CSS variable reference.

---

### Toolbar with Icons and Micro-Interactions

- [ ] **9.2.1** Implement inline SVG icon library. *(Ref: REQ-P9-004)*
  - Location: `src/dom/icons.ts`
  - Create SVG functions for: Add Card, Add Button, Add Field, Delete, Undo, Redo, Run, Save, Export, Import, Theme Toggle.
  - Icons use `currentColor` to inherit theme colors.
  - Each function returns SVGElement (no external icon fonts or CDN).
  - Tests: All icons render, SVG structure valid, scale smoothly at different sizes.

- [ ] **9.2.2** Implement polished toolbar component with button layout. *(Ref: REQ-P9-004)*
  - Location: `src/dom/components/toolbar.ts`
  - Create toolbar container with icon buttons.
  - Support grouping (navigation, editing, view mode, file actions, theme).
  - Buttons themed with Haunted/Classic colors and hover effects.
  - Tests: Toolbar renders, buttons are clickable, theme switching applies to toolbar.

- [ ] **9.2.3** Implement tooltip system for toolbar buttons. *(Ref: REQ-P9-004)*
  - Location: `src/dom/components/tooltip.ts`
  - On button hover, show tooltip with action name and keyboard shortcut.
  - Tooltip positioned above button, themed (glass morphism in Haunted).
  - Fade in/out (100ms) with slight delay (300ms) on hover.
  - Tests: Tooltips display on hover, disappear on mouse leave, show correct text and shortcuts.

- [ ] **9.2.4** Implement micro-interactions for buttons (scale, shadow, color transitions). *(Ref: REQ-P9-005)*
  - Location: `src/dom/styles.css`
  - Hover: scale 1 → 1.05, shadow increase (100–150ms ease-out).
  - Press: scale 1.05 → 0.98, shadow decrease (50ms ease-in).
  - Transition completion: 100ms total (return to hover state on release).
  - Tests: Micro-interactions smooth, no jank, prefers-reduced-motion disables transitions.

---

### Dark Panels and Inspector Theming

- [ ] **9.3.1** Apply glass-morphism styling to panels (card list, inspector, script editor). *(Ref: REQ-P9-005)*
  - Location: `src/dom/styles.css`
  - Update `.card-list`, `.element-inspector`, `.script-editor` with glass background, backdrop blur, soft shadow.
  - Haunted theme: semi-transparent white background with blur, light border.
  - Classic theme: solid white/gray with 1px border (no blur).
  - Tests: Panels render with correct styling in both themes, readability maintained.

- [ ] **9.3.2** Implement dark script editor theme with token colors. *(Ref: REQ-P9-007)*
  - Location: `src/dom/scriptEditor.ts` and `src/dom/styles.css`
  - Dark background (#1a1a2e) in Haunted theme.
  - Token colors: keywords (purple), strings (orange), numbers (cyan), comments (gray).
  - Error highlighting: red tint on error line.
  - Tests: Syntax highlighting visible in both themes, error lines clearly marked.

- [ ] **9.3.3** Update element inspector styling for dark theme. *(Ref: REQ-P9-005)*
  - Location: `src/dom/elementInspector.ts` and `src/dom/styles.css`
  - Glass panel background in Haunted theme.
  - Form inputs: themed with dark background, light text, proper contrast.
  - Labels and sections: organized visually with subtle separation.
  - Tests: Inspector readable in both themes, form inputs functional.

- [ ] **9.3.4** Update card list styling for dark theme. *(Ref: REQ-P9-005)*
  - Location: `src/dom/cardList.ts` and `src/dom/styles.css`
  - Glass panel background in Haunted theme.
  - Card list items: hover effect with subtle highlight.
  - Add/delete buttons: themed toolbar buttons with tooltips.
  - Tests: Card list readable, items selectable, buttons respond.

---

### Card and Mode Transition Animations

- [ ] **9.4.1** Implement card navigation animation (fade + optional flip). *(Ref: REQ-P9-006)*
  - Location: `src/dom/cardCanvas.ts`
  - When card changes (via go or card list click), fade out current card and fade in new card.
  - Transition duration: 200–250ms cubic-bezier(0.25, 0.46, 0.45, 0.94).
  - Ensure final card fully interactive upon completion.
  - Tests: Navigation transitions smoothly, card content updates correctly, clicks work after transition.

- [ ] **9.4.2** Implement Edit ↔ Run mode switch animation. *(Ref: REQ-P9-006)*
  - Location: `src/dom/app.ts` and `src/dom/runMode.ts`
  - Scale + fade transition when switching modes (150–200ms ease-out).
  - Run mode: card scales up to fill canvas area.
  - Edit mode: card scales down to editor size.
  - Tests: Mode transitions smooth, UI updates correctly, all elements visible post-transition.

- [ ] **9.4.3** Implement prefers-reduced-motion media query handling. *(Ref: REQ-P9-001, REQ-P9-006)*
  - Location: `src/dom/styles.css`
  - All animations and transitions set to 0s when prefers-reduced-motion is active.
  - Visual state changes still apply (colors, positions), just no animation duration.
  - Tests: Animations disabled when prefers-reduced-motion is set, layout/functionality unchanged.

- [ ] **9.4.4** Test animation interruption and completion edge cases. *(Ref: REQ-P9-006)*
  - Location: `tests/animation.test.ts`
  - Scenario: User clicks during card transition → verify final state reached, no stalling.
  - Scenario: Rapid mode switches → verify no animation queue buildup.
  - Tests: Animations interrupt gracefully, no race conditions.

---

### Start Screen and Styled Dialogs

- [ ] **9.5.1** Implement welcome screen for empty state. *(Ref: REQ-P9-009)*
  - Location: `src/dom/welcomeScreen.ts`
  - Display when app loads with no saved stack.
  - Show welcome message, brief description, feature list (cards, scripts, AI).
  - Buttons: "Create New Stack" and "Load Example Stack".
  - Transition: fade-in with theme colors.
  - Tests: Welcome screen displays on app start, buttons functional, creates/loads stack correctly.

- [ ] **9.5.2** Implement styled alert dialog replacing window.alert(). *(Ref: REQ-P9-010)*
  - Location: `src/dom/components/styledDialogs.ts`
  - Custom modal with title, message, and button.
  - Themed (Haunted or Classic).
  - Fade-in transition (100–150ms), fade-out on dismiss.
  - Tests: Alert displays with correct text, button triggers callback, themed correctly.

- [ ] **9.5.3** Implement styled confirm dialog replacing window.confirm(). *(Ref: REQ-P9-010)*
  - Location: `src/dom/components/styledDialogs.ts`
  - Custom modal with message and two buttons (e.g., "Delete" and "Cancel").
  - Returns boolean (true for confirm, false for cancel).
  - Themed (Haunted or Classic).
  - Tests: Confirm dialog displays, returns correct value on button click.

- [ ] **9.5.4** Implement styled text input (rename) dialog replacing window.prompt(). *(Ref: REQ-P9-010)*
  - Location: `src/dom/components/styledDialogs.ts`
  - Custom modal with text input, pre-filled with current value.
  - Buttons: "Save" and "Cancel".
  - Returns string or null.
  - Themed (Haunted or Classic).
  - Tests: Prompt dialog displays with pre-filled text, returns value or null.

- [ ] **9.5.5** Replace native prompt/confirm/alert calls throughout app with styled versions. *(Ref: REQ-P9-010)*
  - Location: `src/dom/app.ts`, `src/dom/runMode.ts`, and other components
  - Search for `window.alert()`, `window.confirm()`, `window.prompt()` calls.
  - Replace with styled dialog functions.
  - Tests: All dialogs use styled versions, no native dialogs appear.

- [ ] **9.5.6** Implement refined AI panel with diff preview and accept/reject flow. *(Ref: REQ-P9-008)*
  - Location: `src/dom/components/aiPanel.ts`
  - Text input for description, "Generate" button.
  - Diff preview: side-by-side old/new code with color-coded changes.
  - "Accept" and "Reject" buttons.
  - Themed (Haunted or Classic).
  - Tests: Panel displays, diff preview correct, accept/reject buttons work, transitions smooth.

---

### Contrast, Accessibility, and Testing

- [ ] **9.6.1** Verify WCAG AA contrast for all theme colors. *(Ref: REQ-P9-001, REQ-P9-013)*
  - Location: `tests/contrast.test.ts`
  - Test all text/background color combinations in both themes.
  - Verify normal text ≥ 4.5:1, large text ≥ 3:1, UI components ≥ 3:1.
  - Generate contrast report in test output or docs.
  - Tests: All combinations pass WCAG AA, report generated.

- [ ] **9.6.2** Test focus rings and keyboard navigation in both themes. *(Ref: REQ-P9-001, REQ-P9-013)*
  - Location: `tests/focus.test.ts`
  - Verify visible focus rings on all interactive elements (buttons, inputs, fields).
  - Verify focus ring contrast ≥ 3:1 (or better).
  - Test Tab navigation through UI elements in both themes.
  - Tests: Focus rings visible, Tab navigation works, focus order logical.

- [ ] **9.6.3** Test prefers-reduced-motion behavior. *(Ref: REQ-P9-001, REQ-P9-013)*
  - Location: `tests/reduced-motion.test.ts`
  - Simulate `prefers-reduced-motion: reduce` media query.
  - Verify animations disabled (transition duration 0s).
  - Verify visual state changes still apply (no broken layout).
  - Tests: Animations disabled, layout intact, functionality unchanged.

- [ ] **9.6.4** Test no external network requests and static resources only. *(Ref: REQ-P9-011)*
  - Location: `tests/network.test.ts`
  - Intercept fetch/XHR calls during app load and interaction.
  - Verify no requests to Google Fonts, CDNs, analytics, etc.
  - Allow only explicitly configured model provider endpoints (e.g., Claude API).
  - Tests: No external requests detected (except model provider if configured).

- [ ] **9.6.5** Verify bundle size (CSS + JS + fonts gzipped ≤ 40 kB). *(Ref: REQ-P9-012)*
  - Location: Build output and `npm run size` command
  - Run `npm run build` and measure gzipped size.
  - Break down by file (CSS, JS, fonts).
  - Report in build output and docs/PERFORMANCE.md.
  - Tests: Total size ≤ 40 kB, report generated and committed.

- [ ] **9.6.6** Test theme persistence across page reload. *(Ref: REQ-P9-003)*
  - Location: `tests/theme-persistence.test.ts`
  - Set theme to Haunted → simulate page reload → verify Haunted theme loads.
  - Set theme to Classic → simulate page reload → verify Classic theme loads.
  - Tests: Theme persisted correctly, localStorage working.

- [ ] **9.6.7** Test class name and data-attribute compatibility with Phase 8 tests. *(Ref: REQ-P9-013)*
  - Location: `tests/backwards-compat.test.ts`
  - Verify existing test selectors (e.g., `.card-canvas`, `[data-button-id]`) still work.
  - Verify no class/attribute renames or removals.
  - Run full test suite; ensure all old tests pass.
  - Tests: All Phase 8 tests pass unchanged.

