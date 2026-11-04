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

---

## UI Layer: Stack Editor and Card Viewer

### REQ-UI-001: Stack Editor (Card List and Management)

**User Story**
As a creator, I want a visual editor where I can see a list of cards in a stack, add new cards, reorder them, and delete cards so that I can organize my content.

**Acceptance Criteria**
- WHEN the app loads, THE SYSTEM SHALL display a left sidebar with a card list showing all cards in the current stack.
- WHEN a card in the list is clicked, THE SYSTEM SHALL highlight it and display its content in the main editor view.
- WHEN the "Add Card" button is clicked, THE SYSTEM SHALL create a new card, add it to the stack, and display it in the editor.
- WHEN a card in the list is right-clicked (or "Delete" button pressed), THE SYSTEM SHALL prompt for confirmation and remove the card.
- WHEN a card is deleted, THE SYSTEM SHALL update the card list and navigate to the previous or next card if applicable.
- IF the stack has no cards, THE SYSTEM SHALL show a "Create First Card" message and allow creation via button click.

---

### REQ-UI-002: Card View and Element Placement

**User Story**
As a creator, I want to place buttons and fields on a card using a visual editor so that I can design the layout and appearance.

**Acceptance Criteria**
- WHEN a card is displayed, THE SYSTEM SHALL render all buttons and fields at their specified rect positions and sizes.
- WHEN the "Add Button" or "Add Field" button is clicked in the editor, THE SYSTEM SHALL create a new element with default size/position and allow drag/resize.
- WHEN an element is selected, THE SYSTEM SHALL show a bounding box and resize handles for repositioning.
- WHEN an element is dragged, THE SYSTEM SHALL update its rect position in real-time and reflect in the model.
- WHEN an element is resized, THE SYSTEM SHALL update its rect dimensions and reflect in the model.
- WHEN an element is double-clicked, THE SYSTEM SHALL show an inspector panel with properties (label, font, style, editable, scripts).
- WHEN a property is changed in the inspector, THE SYSTEM SHALL update the element and re-render immediately.

---

### REQ-UI-003: Button and Field Editor

**User Story**
As a creator, I want to edit button labels, field text, and attach scripts to buttons and fields so that I can define interactivity.

**Acceptance Criteria**
- WHEN a button is selected, THE SYSTEM SHALL show its label in the inspector and allow editing.
- WHEN a button's label is changed, THE SYSTEM SHALL update the button's display immediately.
- WHEN a button is selected, THE SYSTEM SHALL show a "mouseUp" script field in the inspector.
- WHEN a field is selected, THE SYSTEM SHALL show its name, current content, font, font size, and text style (bold, italic, underline) in the inspector.
- WHEN a field's properties are edited, THE SYSTEM SHALL update the field and re-render.
- WHEN a field is marked as editable, THE SYSTEM SHALL allow the user to type into it during card view.
- IF a field is not editable, THE SYSTEM SHALL display it as read-only text.

---

### REQ-UI-004: Card Run Mode and Interactivity

**User Story**
As a user, I want to interact with a card (click buttons, type in fields) and see the results of attached scripts in real-time.

**Acceptance Criteria**
- WHEN the editor switches to "Run Mode" (or a Play button is clicked), THE SYSTEM SHALL render the card as if a user is viewing it.
- WHEN a button is clicked in Run Mode, THE SYSTEM SHALL fire its mouseUp handler and execute any attached script.
- WHEN a script updates a field (e.g., `put "result" into field X`), THE SYSTEM SHALL update that field's content in real-time.
- WHEN a script calls `answer`, THE SYSTEM SHALL show a modal dialog with the message and buttons.
- WHEN a script calls `go`, THE SYSTEM SHALL navigate to the target card and fire its openCard handler.
- IF a script has a parse or runtime error, THE SYSTEM SHALL display an error message in the UI without crashing.
- WHEN Run Mode is exited, THE SYSTEM SHALL revert to Edit Mode and restore element selection/editing capabilities.

---

### REQ-UI-005: HyperTalk Script Editor

**User Story**
As a creator, I want a dedicated script editor where I can write HyperTalk code with syntax highlighting, error reporting, and live preview so that I can debug scripts quickly.

**Acceptance Criteria**
- WHEN a button or field is selected and its script is opened, THE SYSTEM SHALL display the script editor with syntax highlighting.
- WHEN HyperTalk keywords are typed, THE SYSTEM SHALL highlight them (if, put, get, go, answer, on, end, etc.) in a distinct color.
- WHEN the script is modified, THE SYSTEM SHALL parse it in real-time and display errors on the error line (underlined in red).
- WHEN an error is found, THE SYSTEM SHALL show the error message (e.g., "Expected 'end if' at line 3") in the editor.
- WHEN the script is valid, THE SYSTEM SHALL display a green checkmark or "valid script" indicator.
- WHEN a "Preview" or "Run" button is clicked, THE SYSTEM SHALL execute the script in a test context (e.g., simulating a button click) and show the result.
- IF the script generates output (field updates, dialog), THE SYSTEM SHALL display it in the preview pane.

---

### REQ-UI-006: Save and Load Stacks

**User Story**
As a creator, I want to save my stack to localStorage so that it persists between sessions, and export it as JSON so that I can share or version-control it.

**Acceptance Criteria**
- WHEN "Save" (Cmd+S or button) is pressed, THE SYSTEM SHALL serialize the current stack to JSON and store it in localStorage with an auto-generated ID.
- WHEN the app loads, THE SYSTEM SHALL check localStorage and restore the last-saved stack automatically.
- WHEN "Export" is clicked, THE SYSTEM SHALL download the stack as a `.json` file (e.g., `stack-name.json`).
- WHEN "Import" (or drag-drop a JSON file) is used, THE SYSTEM SHALL parse the JSON, validate it, and load the stack into the editor.
- IF the JSON is invalid, THE SYSTEM SHALL display an error message with the line and column of the error.
- WHEN a stack is exported and re-imported, THE SYSTEM SHALL preserve all cards, buttons, fields, scripts, and variables exactly.

---

### REQ-UI-007: App Layout and Navigation

**User Story**
As a user, I want a clear, intuitive app layout where I can see the card list, editor canvas, inspector, and script editor all at once so that I can work efficiently.

**Acceptance Criteria**
- WHEN the app loads, THE SYSTEM SHALL display a layout with:
  - Left sidebar: card list with add/delete buttons.
  - Center: card editor canvas showing the current card with buttons and fields.
  - Right sidebar: element inspector with properties (label, position, size, scripts).
  - Bottom (or pop-out): script editor when a script is selected.
- WHEN the window is resized, THE SYSTEM SHALL adjust layout responsively (no layout breaks).
- WHEN a sidebar is collapsed, THE SYSTEM SHALL expand the center canvas to fill available space.
- WHEN a card is large or zoomed, THE SYSTEM SHALL allow scrolling/panning in the canvas.

---

### REQ-UI-008: Undo/Redo and Draft Preservation

**User Story**
As a creator, I want undo/redo so that I can quickly revert changes, and drafts should be preserved across sessions.

**Acceptance Criteria**
- WHEN an element is added, deleted, moved, or resized, THE SYSTEM SHALL record the action in an undo stack.
- WHEN "Undo" (Cmd+Z) is pressed, THE SYSTEM SHALL revert to the previous state.
- WHEN "Redo" (Cmd+Shift+Z) is pressed, THE SYSTEM SHALL restore the next state in the redo stack.
- WHEN the app closes, THE SYSTEM SHALL save the current stack and undo/redo state to localStorage.
- WHEN the app reopens, THE SYSTEM SHALL restore the stack and undo/redo history.

---

## Error Handling for UI

### REQ-UI-EH-001: Parse Error Display in Script Editor

**User Story**
As a script author, I want parse errors to be highlighted in the script editor with line/column info so that I can quickly identify and fix syntax mistakes.

**Acceptance Criteria**
- WHEN a parse error occurs, THE SYSTEM SHALL underline the error line in red.
- WHEN the error line is hovered, THE SYSTEM SHALL show a tooltip with the error message (e.g., "Expected 'end if' at line 3, column 5").
- WHEN multiple errors exist, THE SYSTEM SHALL highlight all of them and allow navigation between errors.

---

### REQ-UI-EH-002: Runtime Error Display

**User Story**
As a user, I want runtime errors to be displayed in a non-intrusive way so that I know what went wrong without the app crashing.

**Acceptance Criteria**
- WHEN a runtime error occurs during script execution, THE SYSTEM SHALL display an error toast or modal with the error message.
- WHEN the error is dismissed, THE SYSTEM SHALL allow continued interaction with the app.
- WHEN an error occurs, THE SYSTEM SHALL log it to console for debugging.

---

### REQ-UI-EH-003: Invalid JSON on Import

**User Story**
As a user, I want clear error messages when importing an invalid JSON file so that I can fix it or try a different file.

**Acceptance Criteria**
- WHEN JSON import fails, THE SYSTEM SHALL display: "Invalid stack JSON at line X, column Y: <message>".
- WHEN the import dialog is open, THE SYSTEM SHALL allow the user to select a different file or cancel.

---

## Constraints for UI Layer

### REQ-UI-CONST-001: No External DOM Frameworks

**User Story**
As a developer, I want to build the UI using vanilla DOM and TypeScript only so that bundle size stays small and complexity is minimized.

**Acceptance Criteria**
- WHEN the UI is built, THE SYSTEM SHALL use only standard DOM APIs (document.createElement, addEventListener, innerHTML, etc.).
- THE SYSTEM SHALL NOT use React, Vue, Svelte, or similar frameworks.
- THE SYSTEM SHALL use CSS for styling (no Tailwind, Material UI, or CSS-in-JS frameworks).
- WHEN CSS is written, IT SHALL be plain CSS (possibly with CSS variables for theming).

---

### REQ-UI-CONST-002: 1-Bit Aesthetic

**User Story**
As a designer, I want the UI to match the System 7 / 1-bit Mac aesthetic so that it feels nostalgic and cohesive.

**Acceptance Criteria**
- WHEN the app is rendered, THE SYSTEM SHALL use only black, white, and gray colors.
- WHEN UI elements are drawn, THE SYSTEM SHALL use simple borders, no gradients.
- WHEN fonts are chosen, THE SYSTEM SHALL prefer monospace (e.g., Monaco) or system fonts (Chicago, Geneva on Mac).
- THE SYSTEM SHALL use pixel-art-friendly imagery (1-bit icon set, if used).

---

### REQ-UI-CONST-003: No Runtime Eval or Dynamic Code Execution

**User Story**
As a security constraint, I want the UI layer to never use eval or new Function so that user-generated scripts cannot escape the sandbox.

**Acceptance Criteria**
- THE SYSTEM SHALL NOT use eval(), Function(), setTimeout(string), or any form of dynamic code evaluation.
- WHEN scripts are executed, THE SYSTEM SHALL use the HyperTalk interpreter (parser + runtime) only.
- IF a user writes a custom script, IT SHALL be parsed and validated before execution.

