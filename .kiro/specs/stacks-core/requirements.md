# Stacks Core: Requirements

## Overview

This document defines the functional requirements for the core Stacks engine: the card model, HyperTalk interpreter, and AI-assisted script writer. Requirements are expressed as user stories with EARS-format acceptance criteria.

---

## Card Engine

### REQ-CE-001: Stack and Card Navigation

**User Story**
As a creator, I want to organize information into a stack of cards so that I can create multi-screen interactive experiences.

**Acceptance Criteria**
- WHEN a stack is created, THE SYSTEM SHALL initialize with at least one background and one card.
- WHEN the user navigates via go statement or UI button, THE SYSTEM SHALL display the target card and fire openCard handlers.
- WHEN a card is displayed, THE SYSTEM SHALL render all fields, buttons, and background elements in the correct z-order.
- IF the target card does not exist, THE SYSTEM SHALL emit a runtime error with the card ID and halt execution.

---

### REQ-CE-002: Cards, Fields, and Buttons

**User Story**
As a creator, I want to populate cards with interactive elements (fields for text, buttons for actions) so that users can input data and trigger behaviors.

**Acceptance Criteria**
- WHEN a field is created, THE SYSTEM SHALL assign a unique ID, store its text content, and track its rect, font, and text style (bold, italic, underline).
- WHEN a button is created, THE SYSTEM SHALL assign a unique ID, store its label, rect, style, and attached scripts.
- WHEN a field is edited by the user, THE SYSTEM SHALL update the field's text content in the card model and trigger change handlers.
- IF a button or field ID is invalid (not found on the current card or background), THE SYSTEM SHALL raise a runtime error.

---

### REQ-CE-003: Backgrounds and Shared Elements

**User Story**
As a creator, I want to define backgrounds with buttons and fields that appear on all cards so that I can reuse navigation and common UI elements.

**Acceptance Criteria**
- WHEN a background is added to a stack, THE SYSTEM SHALL store it as a reusable container for buttons and fields.
- WHEN a card is displayed, THE SYSTEM SHALL composite the background's elements underneath the card's own elements.
- WHEN a background element is modified, THE SYSTEM SHALL propagate changes to all cards using that background.
- IF handlers on background and card elements conflict (both have mouseUp on the same element), THE SYSTEM SHALL prioritize card-level handlers.

---

### REQ-CE-004: Serialization to JSON

**User Story**
As a developer, I want to save and load stacks as canonical JSON so that stacks are portable, version-controllable, and human-readable.

**Acceptance Criteria**
- WHEN a stack is serialized, THE SYSTEM SHALL produce valid JSON with schema: { stack: { id, name, backgrounds: [...], cards: [...] }, version: "1.0" }.
- WHEN JSON is deserialized, THE SYSTEM SHALL restore all stacks, cards, buttons, fields, and scripts without loss of fidelity.
- WHEN serialization encounters unsupported types (functions, circular refs), THE SYSTEM SHALL sanitize or reject with a clear error.
- IF a JSON document is malformed, THE SYSTEM SHALL report the error line and column.

---

### REQ-CE-005: Shareable URLs and Persistence

**User Story**
As a creator, I want to publish a stack as a shareable link so that anyone can view and interact with it without a login.

**Acceptance Criteria**
- WHEN a stack is published, THE SYSTEM SHALL compress the JSON and generate a URL-safe ID (e.g., `stacks.example.com/#/stack/abc123`).
- WHEN the user opens a shared link, THE SYSTEM SHALL fetch and decompress the stack, then render it immediately.
- WHEN a shared stack is viewed, THE SYSTEM SHALL allow interaction (clicking buttons, editing fields, navigating) but prevent saving without explicit export.
- IF the stack ID is invalid or missing, THE SYSTEM SHALL display a friendly 404 message.

---

## HyperTalk-Style Interpreter

### REQ-HT-001: Tokenization and Lexical Analysis

**User Story**
As a script author, I want to write plain English-like commands so that syntax is forgiving and natural.

**Acceptance Criteria**
- WHEN HyperTalk source is tokenized, THE SYSTEM SHALL recognize keywords (if, repeat, put, get, go, answer, on, end, etc.), identifiers, strings, numbers, and operators.
- WHEN a string is encountered, THE SYSTEM SHALL handle both double and single quotes, and escape sequences (\n, \\, \", etc.).
- WHEN an unknown token is found, THE SYSTEM SHALL track its position (line, column) for error reporting.
- IF a string is unclosed, THE SYSTEM SHALL report "unterminated string at line X, column Y".

---

### REQ-HT-002: Parser and Abstract Syntax Tree (AST)

**User Story**
As a runtime, I want to parse HyperTalk into a safe AST so that I can execute it without eval.

**Acceptance Criteria**
- WHEN source is parsed, THE SYSTEM SHALL produce an AST with nodes for statements (if, repeat, put, go, answer, handler definition).
- WHEN an expression is parsed, THE SYSTEM SHALL respect operator precedence (arithmetic, logical, comparison).
- WHEN a handler (on mouseUp, on openCard) is encountered, THE SYSTEM SHALL parse its body as a sequence of statements.
- IF the syntax is invalid (e.g., mismatched if/end), THE SYSTEM SHALL report a parse error with line and column.

---

### REQ-HT-003: Tree-Walking Evaluator

**User Story**
As a script author, I want scripts to execute safely in a sandbox so that they cannot access the network or break the application.

**Acceptance Criteria**
- WHEN a script is executed, THE SYSTEM SHALL evaluate the AST in a restricted environment with no access to fetch, eval, require, or window.location changes.
- WHEN a variable is accessed, THE SYSTEM SHALL look it up in the local scope, then card scope, then stack scope, in that order.
- WHEN an error occurs during execution (division by zero, undefined variable), THE SYSTEM SHALL catch it, log it, and emit a user-facing error message without crashing.
- IF execution exceeds a time limit (5 seconds) or step limit (100,000 steps), THE SYSTEM SHALL halt with a timeout error.

---

### REQ-HT-004: Handler Execution and Message Passing

**User Story**
As a creator, I want to attach scripts to buttons and fields so that clicking or opening triggers behavior, with messages propagating through the stack hierarchy.

**Acceptance Criteria**
- WHEN a button is clicked, THE SYSTEM SHALL send a mouseUp message to the button, then to its card, then to its background, then to the stack (unless stopped by a script).
- WHEN a card opens, THE SYSTEM SHALL send an openCard message to the card, then to its background.
- WHEN a handler calls answer, put, or get, THE SYSTEM SHALL execute the built-in safely with the current context.
- IF a handler is not found, THE SYSTEM SHALL pass the message up the hierarchy; if no handler exists, execution completes silently.

---

### REQ-HT-005: Built-in Commands and Functions

**User Story**
As a script author, I want access to safe, useful operations so that I can build interactive experiences without writing complex code.

**Acceptance Criteria**
- WHEN put is used, THE SYSTEM SHALL update a target (field, variable) with a value.
- WHEN get is used, THE SYSTEM SHALL retrieve a value from a field or variable.
- WHEN go is used, THE SYSTEM SHALL navigate to a card (e.g., go to card 5, go to next card).
- WHEN answer is used, THE SYSTEM SHALL display a modal dialog with a message and buttons.
- WHEN if, repeat, while are used, THE SYSTEM SHALL evaluate conditions and control flow correctly.
- WHEN mathematical functions (add, subtract, multiply, divide, sqrt, random) are called, THE SYSTEM SHALL compute and return results.
- WHEN string functions (concat, length, contains, split, uppercase, lowercase) are called, THE SYSTEM SHALL manipulate strings safely.

---

### REQ-HT-006: Variable Scoping

**User Story**
As a script author, I want variables at different scopes (local, card, stack) so that I can manage state across cards and within handlers.

**Acceptance Criteria**
- WHEN a variable is declared in a handler, THE SYSTEM SHALL treat it as local to that handler.
- WHEN a variable is prefixed with card (e.g., card myVar), THE SYSTEM SHALL store it in the card's state, persisting across handlers on that card.
- WHEN a variable is prefixed with stack (e.g., stack counter), THE SYSTEM SHALL store it in the stack's state, persisting across all cards.
- IF a variable is accessed without a prefix, THE SYSTEM SHALL search local, then card, then stack scope in order.

---

## Script Generation (AI-Assisted)

### REQ-SG-001: English-to-HyperTalk Conversion

**User Story**
As a creator, I want to describe a behavior in English so that AI generates editable HyperTalk code without me needing to learn the syntax.

**Acceptance Criteria**
- WHEN I provide a description (e.g., "When the user clicks, show an alert with the card's title"), THE SYSTEM SHALL send it to a configured model provider (Claude API or local LLM).
- WHEN the model responds, THE SYSTEM SHALL extract the HyperTalk code from the response.
- WHEN the generated code is received, THE SYSTEM SHALL validate it by parsing with the HyperTalk parser before showing to the user.
- IF the generated code is invalid, THE SYSTEM SHALL report the parse error and prompt the user to rephrase or provide a better description.

---

### REQ-SG-002: Model Provider Abstraction

**User Story**
As a developer, I want to plug in different model providers (Claude, Ollama, local GGML) so that the script generator works offline or online as needed.

**Acceptance Criteria**
- WHEN a model provider is configured, THE SYSTEM SHALL abstract HTTP calls or local execution behind a common interface.
- WHEN the provider is unavailable (network error, model not running), THE SYSTEM SHALL emit a clear error message: "Model provider unreachable. Check configuration."
- WHEN multiple providers are available, THE SYSTEM SHALL allow the user to select or auto-fallback.

---

### REQ-SG-003: Output Validation and Preview

**User Story**
As a creator, I want to review generated code before it is inserted into a script so that I can ensure it matches my intent and is human-readable.

**Acceptance Criteria**
- WHEN code is generated, THE SYSTEM SHALL display a diff showing what will be added/changed.
- WHEN the user reviews the diff, THE SYSTEM SHALL highlight the new code in a visual diff viewer.
- WHEN the user confirms, THE SYSTEM SHALL insert the code and parse it to ensure no runtime errors.
- IF the user rejects the code, THE SYSTEM SHALL discard it and allow a new description to be entered.

---

### REQ-SG-004: Human-Readable Output

**User Story**
As a creator, I want generated code to be clear and editable so that I can understand and modify it myself.

**Acceptance Criteria**
- WHEN code is generated, THE SYSTEM SHALL ensure it follows consistent formatting (2-space indent, clear variable names, helpful comments).
- WHEN the code is displayed, THE SYSTEM SHALL highlight keywords and syntax for readability.
- IF a line of code is unclear, THE SYSTEM SHALL allow inline comments or explanations via hover tooltips.

---

## Error Handling and Constraints

### REQ-EH-001: Parse Error Reporting

**User Story**
As a script author, I want clear error messages with line numbers so that I can quickly fix syntax errors.

**Acceptance Criteria**
- WHEN a parse error occurs, THE SYSTEM SHALL report: "Error at line X, column Y: <message>".
- WHEN the script editor is active, THE SYSTEM SHALL highlight the error line in red.
- IF multiple errors exist, THE SYSTEM SHALL report the first and allow navigation to the next.

---

### REQ-EH-002: Runtime Error Handling

**User Story**
As a user, I want scripts to fail gracefully so that one broken script doesn't crash the entire stack.

**Acceptance Criteria**
- WHEN a runtime error occurs (undefined variable, type error, division by zero), THE SYSTEM SHALL catch it, log it, and emit a user-facing error notification.
- WHEN an error is caught, THE SYSTEM SHALL allow the user to continue interacting with the stack.
- IF a handler calls another handler that fails, THE SYSTEM SHALL propagate the error up the call stack.

---

### REQ-EH-003: Sandbox Enforcement

**User Story**
As a security consideration, I want to prevent scripts from accessing the network or breaking the application.

**Acceptance Criteria**
- WHEN a script attempts fetch, require, eval, or modifies window.location, THE SYSTEM SHALL block it with an error: "Operation not allowed in scripts".
- WHEN a script attempts to access restricted globals (document, XMLHttpRequest), THE SYSTEM SHALL raise a sandbox violation error.
- WHEN a time limit (5 seconds) or step limit (100,000 steps) is exceeded, THE SYSTEM SHALL halt execution with: "Execution timeout".

---

## Testing Strategy

### REQ-TEST-001: Property-Based Tests

**User Story**
As a developer, I want property-based tests so that I can verify parser correctness across a large input space.

**Acceptance Criteria**
- WHEN property-based tests run, THE SYSTEM SHALL generate random valid HyperTalk programs and verify they parse and execute without crashing.
- WHEN a property test fails, THE SYSTEM SHALL report the failing input as a minimal reproduction case.
- WHEN field values are tested, THE SYSTEM SHALL verify they serialize and deserialize correctly.

---

### REQ-TEST-002: Unit Tests for Core Modules

**User Story**
As a developer, I want unit tests for the model, parser, and runtime so that I can catch regressions early.

**Acceptance Criteria**
- WHEN a test runs, THE SYSTEM SHALL validate specific behaviors (e.g., "put 5 into x" sets x to 5).
- WHEN a test fails, THE SYSTEM SHALL report the expected vs. actual value.
- WHEN a handler execution test runs, THE SYSTEM SHALL verify scoping, message passing, and handler lookup work correctly.

