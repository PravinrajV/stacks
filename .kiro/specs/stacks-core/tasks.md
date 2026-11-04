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

- [ ] **4.2** Implement `CloudModelProvider` for Claude API. *(Ref: REQ-SG-002)*
  - Location: `src/ai/cloudModelProvider.ts`
  - Initialize with API key, construct prompts, make HTTP requests, parse responses.
  - Tests: Mock API calls, verify requests well-formed, responses parsed correctly.

- [ ] **4.3** Implement `OllamaProvider` for local Ollama instance (optional, can defer). *(Ref: REQ-SG-002)*
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

- [ ] **4.8** Implement model provider fallback and error handling. *(Ref: REQ-SG-002)*
  - Location: `src/ai/scriptGen.ts`
  - If primary provider unavailable, try fallback. If all fail, emit clear error.
  - Tests: Error message: "Model provider unreachable. Check configuration."

### Integration with UI (Script Editor)

- [ ] **4.9** Integrate script generator with script editor UI. *(Ref: REQ-SG-001, REQ-SG-003, REQ-SG-004)*
  - Location: `src/dom/editor.ts` (or new `src/dom/scriptGenPanel.ts`)
  - UI: Text input for description, "Generate" button, diff preview, "Accept" / "Reject" buttons.
  - On "Accept": insert code and re-parse handler.
  - Tests: UI flows correctly, generated code inserted and parsed successfully.

---

## Phase 5: Integration and Testing

### Unit Tests (Colocated)

- [ ] **5.1** Write comprehensive unit tests for `src/model/stack.ts`. *(Ref: REQ-TEST-002)*
  - Location: `src/model/stack.test.ts`
  - Coverage: Field/Button/Card/Background/Stack creation, lookup, serialization, variable scoping.
  - Target: 95%+ line coverage.

- [ ] **5.2** Write comprehensive unit tests for lexer. *(Ref: REQ-TEST-001, REQ-TEST-002)*
  - Location: `src/interpreter/lexer.test.ts`
  - Coverage: All token types, keywords, escape sequences, error cases.
  - Target: 95%+ line coverage.

- [ ] **5.3** Write comprehensive unit tests for parser. *(Ref: REQ-TEST-001, REQ-TEST-002)*
  - Location: `src/interpreter/parser.test.ts`
  - Coverage: All statement types, expressions, operator precedence, error cases, handler definitions.
  - Target: 90%+ line coverage.
  - Include property-based tests for random valid token sequences.

- [ ] **5.4** Write comprehensive unit tests for runtime. *(Ref: REQ-TEST-001, REQ-TEST-002)*
  - Location: `src/interpreter/runtime.test.ts`
  - Coverage: Built-in commands, functions, scoping, message passing, timeout, sandbox.
  - Target: 85%+ line coverage.

- [ ] **5.5** Write unit tests for serialization round-trip. *(Ref: REQ-TEST-002)*
  - Location: `src/model/serialization.test.ts`
  - Coverage: Stack → JSON → Stack equivalence, invalid JSON rejection.
  - Target: 100% coverage.

- [ ] **5.6** Write unit tests for script generation and validation. *(Ref: REQ-TEST-002)*
  - Location: `src/ai/scriptGen.test.ts`
  - Coverage: Prompt building, response parsing, validation, error handling.
  - Mock model provider for testing.
  - Target: 70%+ coverage.

### Integration Tests

- [ ] **5.7** Test end-to-end stack creation, serialization, navigation. *(Ref: REQ-CE-001, REQ-CE-004, REQ-CE-005)*
  - Location: `tests/integration.test.ts` or new file
  - Scenario: Create stack with cards, add fields/buttons, serialize to JSON, load from JSON, navigate, verify data intact.

- [ ] **5.8** Test end-to-end script execution (handler firing on button click, field update). *(Ref: REQ-HT-004, REQ-HT-005)*
  - Location: `tests/integration.test.ts`
  - Scenario: Create card with button, attach mouseUp handler with `put "clicked" into field X`, click button, verify field updated.

- [ ] **5.9** Test script generation workflow (describe → generate → validate → preview → insert). *(Ref: REQ-SG-001, REQ-SG-003)*
  - Location: `tests/integration.test.ts`
  - Scenario: Request script generation, verify code generated, diff shown, insertion succeeds.

- [ ] **5.10** Test error handling and recovery (invalid script, parse error, runtime error, timeout). *(Ref: REQ-EH-001, REQ-EH-002, REQ-EH-003)*
  - Location: `tests/integration.test.ts`
  - Scenarios: Load invalid JSON → error reported; execute script with undefined var → error caught, continue; timeout → halted.

### Bundle Size and Performance

- [ ] **5.11** Measure bundle size (target: <500KB gzipped). *(Ref: Tech constraints)*
  - Run: `npm run build` and check dist/ size.
  - If over budget, identify and optimize largest modules.

- [ ] **5.12** Profile runtime performance (ensure handler execution is fast). *(Ref: Tech constraints)*
  - Benchmark: Parse and execute 100 stacks with 50 cards each.
  - Target: <1s total for typical stack operations.

---

## Phase 6: Polish and Documentation

- [ ] **6.1** Add code comments and docstrings to all public interfaces. *(Ref: Documentation)*
  - Location: All `src/` modules.
  - Ensure TypeScript JSDoc comments for all exported functions.

- [ ] **6.2** Create module-level README for interpreter, model, and AI components. *(Ref: Documentation)*
  - Location: `src/interpreter/README.md`, `src/model/README.md`, `src/ai/README.md`

- [ ] **6.3** Add syntax highlighting and error underline to script editor. *(Ref: REQ-EH-001)*
  - Location: `src/dom/editor.ts`
  - Highlight keywords, strings, numbers; underline parse errors in red.

- [ ] **6.4** Add keyboard shortcuts for common actions (Cmd+Enter to submit script, Ctrl+/ for comment). *(Ref: UX polish)*
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

## Execution Notes

- **Commit Strategy**: Commit after each task or small group of related tasks.
- **Testing**: Run `npm run test` after each task to catch regressions.
- **Code Review**: Use peer review for major components (parser, runtime, serialization).
- **Documentation**: Update as you code; don't leave it to the end.

