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

---

## Phase 8: Demo Readiness

### REQ-P8-001: Layout and Viewport

**User Story**
As a user, I want the card editor and run mode to fill the window with a fixed card size centered and scaled, so that the interface feels polished and the card always fits without clipping.

**Acceptance Criteria**
- WHEN the app loads in edit or run mode, THE SYSTEM SHALL render the card at a fixed logical size of 512×342 pixels (classic HyperCard dimensions).
- WHEN the viewport is resized, THE SYSTEM SHALL scale the card proportionally (maintaining aspect ratio) to fit the available area without clipping.
- WHEN the card is scaled, ALL elements (buttons, fields, text) SHALL scale proportionally so the layout remains intact.
- IF the viewport is too small, THE SYSTEM SHALL show scrollbars rather than clipping content.
- WHEN in edit mode, THE SYSTEM SHALL allow drag/resize of elements in logical coordinates, updating the model correctly.

---

### REQ-P8-002: In-UI Stack Authoring

**User Story**
As a creator, I want to build stacks from scratch using in-UI tools so that I never need to touch JSON or external editors.

**Acceptance Criteria**
- WHEN the app loads with no saved stack, THE SYSTEM SHALL display the starter stack from `examples/haunted-house.json` as the default stack.
- WHEN the "Add Card" button is clicked, THE SYSTEM SHALL create a new card with a unique ID, name ("Card X"), and no elements.
- WHEN the "Add Button" button is clicked, THE SYSTEM SHALL create a button with default position (100, 100) and size (100, 30), label "Button X", and add it to the current card.
- WHEN the "Add Field" button is clicked, THE SYSTEM SHALL create a field with default position (100, 150), size (300, 60), name "field_X", content "", and add it to the current card.
- WHEN an element (card, button, or field) is right-clicked or a "Delete" button is pressed, THE SYSTEM SHALL prompt for confirmation and remove it.
- WHEN an element is double-clicked or a "Rename" button is pressed, THE SYSTEM SHALL show an inline rename dialog, allow text entry, and update the element's name/label on confirm.
- WHEN a card is selected in the card list, THE SYSTEM SHALL display a context menu or action buttons for: rename card, delete card.
- WHEN changes are made, THE SYSTEM SHALL auto-save to localStorage.
- IF the starter stack is not found, THE SYSTEM SHALL display an empty stack instead and allow creation from scratch.

---

### REQ-P8-003: 1-Bit Visual Design

**User Story**
As a designer, I want the app to embody the classic System 7 / 1-bit Mac aesthetic so that it feels nostalgic, cohesive, and visually distinct.

**Acceptance Criteria**
- WHEN the app is rendered, THE SYSTEM SHALL use only black, white, and shades of gray (#000, #fff, #ccc, #999, #666).
- WHEN UI elements (buttons, borders, panels) are drawn, THE SYSTEM SHALL use 1–2px solid borders with no rounded corners or shadows.
- WHEN interactive elements are hovered/focused, THE SYSTEM SHALL show a clear visual indicator (e.g., inverted colors, thicker border).
- WHEN text is rendered, THE SYSTEM SHALL use a monospace or system font (Monaco, Courier New, or system-ui fallback).
- WHEN backgrounds need patterning, THE SYSTEM MAY use dithered or checker patterns (pixels/SVG) to simulate 1-bit graphics.
- WHEN a menu bar is present, IT SHALL mimic classic Mac menu styling (horizontal, black text on white background).
- WHEN focus is on an interactive element, THE SYSTEM SHALL show a visible focus indicator (outline or border change) that meets WCAG contrast requirements.
- WHEN contrast is checked, ALL text SHALL have a contrast ratio of at least 4.5:1 (WCAG AA standard for normal text).

---

### REQ-P8-004: Answer Modal Dialog

**User Story**
As a script author, I want the `answer` command to display a real, accessible modal dialog in run mode so that users can see and interact with it.

**Acceptance Criteria**
- WHEN a script calls `answer "message" with button "OK"` (or multiple buttons), THE SYSTEM SHALL display a modal dialog with the message text.
- WHEN the modal is shown, THE SYSTEM SHALL render the buttons in a row at the bottom of the modal.
- WHEN a user clicks a button in the modal, THE SYSTEM SHALL close the modal and return the button index (0 for first button, 1 for second, etc.) to the script.
- WHEN the modal is open, THE SYSTEM SHALL prevent interaction with the card below (modal focus capture).
- WHEN the modal dialog is displayed, IT SHALL be keyboard accessible (Tab to navigate buttons, Enter to confirm).
- WHEN the modal is closed, script execution SHALL continue from the point after the `answer` call.

---

### REQ-P8-005: Script Editor Syntax Highlight Layer

**User Story**
As a script editor, I want syntax highlighting to render on top of the textarea without shifting text so that editing remains smooth and highlighting stays synchronized.

**Acceptance Criteria**
- WHEN the script editor is rendered, THE SYSTEM SHALL use a single `<textarea>` element for input and an overlay `<div>` with syntax-highlighted tokens.
- WHEN the textarea has focus, THE SYSTEM SHALL ensure the highlighted layer is positioned identically (same font, same metrics, same overflow behavior).
- WHEN the user types, THE SYSTEM SHALL synchronize scrolling between textarea and highlight layer (both scroll together).
- WHEN text in the textarea changes, THE SYSTEM SHALL update the highlight layer immediately (no lag).
- WHEN the textarea has CSS `white-space: pre`, THE SYSTEM SHALL apply the same to the highlight layer so line breaks are preserved exactly.
- WHEN the font/size/line-height change, THE SYSTEM SHALL ensure the highlight layer uses identical metrics (measured via JavaScript if necessary).
- WHEN testing in Chromium, THE SYSTEM SHALL verify no text drift or misalignment between textarea and highlights.

---

### REQ-P8-006: Offline Mock AI Provider

**User Story**
As a user without an AI API key, I want the script generator to offer sensible demo templates for common requests so that I can prototype interactivity without real AI.

**Acceptance Criteria**
- WHEN the user opens the "Generate Script" dialog, THE SYSTEM SHALL detect if no API key is configured.
- IF no API key is set, THE SYSTEM SHALL use the `MockProvider` to generate code.
- WHEN the MockProvider receives a request like "click" or "alert", THE SYSTEM SHALL return a template handler `on mouseUp: answer "Hello"`.
- WHEN the request contains "count" or "increment", THE SYSTEM SHALL return a template that increments a card variable.
- WHEN the request contains "next card" or "previous card", THE SYSTEM SHALL return a handler with `go next card` or `go previous card`.
- WHEN the request contains "show" or "hide", THE SYSTEM SHALL return a template handler (implementation depends on field/button visibility support).
- WHEN the request contains "put" or "text", THE SYSTEM SHALL return a template handler that updates a field.
- WHEN code is generated by MockProvider, THE SYSTEM SHALL label it: "Offline demo mode - add your own API key in AI Settings for real AI".
- WHEN a real API key is added in settings, THE SYSTEM SHALL switch to the real provider and remove the demo label.

---

### REQ-P8-007: Documentation: README and Cross-Browser Checklist

**User Story**
As a maintainer, I want accurate documentation so that users understand what is tested and what is expected to work.

**Acceptance Criteria**
- WHEN the README is read, IT SHALL clearly state: "This project is tested headless (Chromium only). Manual cross-browser testing required for production use."
- WHEN the README lists features, IT SHALL match the actual implementation (no promised features that are incomplete).
- WHEN the README describes the tech stack, IT SHALL accurately list: TypeScript, Vite, Vitest, happy-dom, no external UI frameworks.
- WHEN a cross-browser checklist exists, IT SHALL include: Chrome/Chromium, Firefox, Safari, Edge on desktop (and notes on mobile scope).
- WHEN the checklist is used, A TESTER SHALL verify: layout rendering, button/field interaction, script execution, localStorage persistence, modal dialogs, and error messages.
- IF bugs are found in specific browsers, THEY SHALL be documented with workarounds or noted as known limitations.



## Phase 9: Haunted Premium UI

### REQ-P9-001: Haunted Theme Foundation

**User Story**
As a user, I want the Stacks app to have a modern, Kiroween-themed dark aesthetic so that the experience feels polished, inviting, and thematically cohesive with the HyperCard revival concept.

**Acceptance Criteria**
- WHEN the app loads, THE SYSTEM SHALL render with a Haunted dark theme as the default (deep near-black/indigo background with subtle radial glow).
- WHEN Haunted theme colors are used, THE SYSTEM SHALL apply glowing purple (#a855f7-ish) and pumpkin-orange (#f97316-ish) accents throughout the UI.
- WHEN cards, panels, and buttons are rendered, THE SYSTEM SHALL use glass-morphism effects with soft shadows (no harsh outlines).
- WHEN text is rendered, THE SYSTEM SHALL ensure all text meets WCAG AA contrast requirements (4.5:1 for normal text).
- WHEN focus is applied to interactive elements, THE SYSTEM SHALL display visible focus rings that are compliant with WCAG AA.
- IF the user has `prefers-reduced-motion` enabled, THE SYSTEM SHALL disable all animations and transitions.

---

### REQ-P9-002: Typography and Fonts

**User Story**
As a designer, I want a cohesive typography system using system fonts and optionally an OFL-licensed font so that the UI feels refined without external CDN dependencies or copyright issues.

**Acceptance Criteria**
- WHEN display text (headings, card titles) is rendered, THE SYSTEM SHALL use a pixel/monospace typeface (e.g., system stacks like Monaco, or an OFL-licensed pixel font committed to the repository).
- WHEN UI text (buttons, labels, inspector) is rendered, THE SYSTEM SHALL use system-ui or a system font stack (e.g., -apple-system, BlinkMacSystemFont, Segoe UI fallback).
- WHEN fonts are loaded, THE SYSTEM SHALL NOT make network requests to CDNs (Google Fonts, Adobe Fonts, etc.).
- WHEN an OFL-licensed font is used, THE SYSTEM SHALL commit its license file to the repository and display attribution in the app footer or documentation.
- IF a font file is embedded, THE SYSTEM SHALL ensure the total CSS+JS+font-file gzipped size is within the 40 kB budget.

---

### REQ-P9-003: Theme Toggle and Persistence

**User Story**
As a creator, I want to toggle between Haunted (dark) and Classic (1-bit) themes so that I can choose my preferred aesthetic, with my choice persisted across sessions.

**Acceptance Criteria**
- WHEN the app loads, THE SYSTEM SHALL check localStorage for a saved theme preference.
- IF no preference is saved, THE SYSTEM SHALL default to Haunted theme.
- WHEN a theme toggle button is clicked, THE SYSTEM SHALL switch the active theme (Haunted ↔ Classic) and re-render the entire UI.
- WHEN the theme is changed, THE SYSTEM SHALL save the selection to localStorage and persist it across page reloads.
- WHEN Classic theme is active, THE SYSTEM SHALL restore the 1-bit card look (REQ-P8-003: black, white, gray only, no rounded corners or shadows).
- WHEN Haunted theme is active, THE SYSTEM SHALL apply dark theme colors, glass panels, and smooth transitions.

---

### REQ-P9-004: Polished Toolbar with Inline SVG Icons

**User Story**
As a user, I want a cohesive toolbar with polished inline SVG icons and tooltips so that the UI is discoverable and actions are clear.

**Acceptance Criteria**
- WHEN the app is rendered, THE SYSTEM SHALL display a toolbar with icon buttons (Add Card, Add Button, Add Field, Delete, Undo, Redo, Run Mode, Save, Export, Import, Theme Toggle).
- WHEN icons are rendered, THE SYSTEM SHALL use inline SVG (no icon font or external image files) so that icons scale smoothly and respect theme colors.
- WHEN an icon button is hovered, THE SYSTEM SHALL show a tooltip with the action name and keyboard shortcut (e.g., "Undo (Ctrl+Z)").
- WHEN an icon button is clicked, THE SYSTEM SHALL trigger its associated action and show visual feedback (highlight, invert, slight scale change).
- WHEN an icon button is disabled (e.g., undo when undo stack is empty), THE SYSTEM SHALL render it with reduced opacity and no hover effect.

---

### REQ-P9-005: Glass-Morphism Panels and Micro-Interactions

**User Story**
As a designer, I want cards, panels, and UI containers to use glass-morphism effects with soft shadows and smooth micro-interactions so that the interface feels modern and responsive.

**Acceptance Criteria**
- WHEN panels (card list, inspector, script editor) are rendered, THE SYSTEM SHALL apply a semi-transparent background with backdrop blur and a subtle box-shadow.
- WHEN an element (button, field, panel) is hovered, THE SYSTEM SHALL show a smooth scale or brightness transition (e.g., 3–5ms ease-out).
- WHEN an element is pressed/clicked, THE SYSTEM SHALL provide tactile feedback (slight scale down, color shift) that completes instantly (50–100ms).
- WHEN a dialog or modal appears, THE SYSTEM SHALL fade in with a subtle scale animation (100–150ms ease-out).
- WHEN animations are disabled (prefers-reduced-motion), THE SYSTEM SHALL skip all transitions but maintain visual state changes (colors, scale).

---

### REQ-P9-006: Animated Card Transitions

**User Story**
As a user, I want card navigation and mode switches to include subtle, polished animations so that the interface feels fluid and state changes are clear.

**Acceptance Criteria**
- WHEN a user navigates to a different card (via go statement or card list click), THE SYSTEM SHALL animate the transition with a fade or flip effect (200–300ms).
- WHEN switching between Edit Mode and Run Mode, THE SYSTEM SHALL fade or scale the card and refresh the UI (150–200ms).
- WHEN the animated transition completes, THE SYSTEM SHALL ensure the final card is fully rendered and interactive.
- WHEN prefers-reduced-motion is enabled, THE SYSTEM SHALL disable animations but still update the card instantly.
- IF a transition is interrupted (user clicks during animation), THE SYSTEM SHALL complete to the final state without stalling.

---

### REQ-P9-007: Dark Script Editor with Token Colors

**User Story**
As a script author, I want the script editor to use a dark theme with distinct token colors so that code is easy to read and syntax errors stand out.

**Acceptance Criteria**
- WHEN the script editor is rendered in Haunted theme, THE SYSTEM SHALL use a dark background (#1a1a2e or similar) with light text.
- WHEN syntax is highlighted, THE SYSTEM SHALL use distinct colors for keywords (purple), strings (orange), numbers (cyan), comments (gray), operators (light gray).
- WHEN a parse or runtime error occurs, THE SYSTEM SHALL highlight the error line with a subtle red tint or underline and display the error message prominently.
- WHEN the Classic theme is active, THE SYSTEM SHALL revert to 1-bit black-on-white highlighting.

---

### REQ-P9-008: Refined AI Panel

**User Story**
As a creator, I want an AI script generation panel that is polished and integrated seamlessly so that it guides me through generating and accepting code.

**Acceptance Criteria**
- WHEN the AI panel is displayed, THE SYSTEM SHALL show a text input for entering a description, a "Generate" button, and a preview area.
- WHEN code is generated, THE SYSTEM SHALL display a side-by-side diff showing the old and new code with color-coded additions/removals.
- WHEN a user accepts the generated code, THE SYSTEM SHALL transition smoothly (fade or slide) to update the editor and close the panel.
- WHEN a user rejects the code, THE SYSTEM SHALL clear the preview and allow a new description to be entered.
- WHEN the AI panel is active, THE SYSTEM SHALL maintain theme consistency (Haunted or Classic) throughout.

---

### REQ-P9-009: Welcoming Start/Empty State

**User Story**
As a new user, I want a welcoming, clear empty state when starting Stacks so that I understand the purpose and know how to get started.

**Acceptance Criteria**
- WHEN the app loads with no saved stack, THE SYSTEM SHALL display a welcome screen (not a blank canvas).
- WHEN the welcome screen is shown, THE SYSTEM SHALL include a brief welcome message, a preview of what Stacks is, and a "Create First Stack" or "Load Example" button.
- WHEN the user clicks a button, THE SYSTEM SHALL either create a new empty stack or load the haunted-house example.
- WHEN a stack is loaded, THE SYSTEM SHALL transition smoothly (fade-in) to the main editor.
- WHEN the welcome screen is displayed, IT SHALL maintain theme consistency and use polished styling.

---

### REQ-P9-010: Styled Dialogs Replacing Native Prompts

**User Story**
As a user, I want custom, styled dialogs for confirmations, renames, and user input so that all UI is cohesive and themed (no browser native prompts).

**Acceptance Criteria**
- WHEN the app needs confirmation (e.g., delete card), THE SYSTEM SHALL display a custom styled modal (not native window.confirm).
- WHEN the app needs text input (e.g., rename card), THE SYSTEM SHALL display a custom modal with a text input field (not native window.prompt).
- WHEN the `answer` command is used in a script, THE SYSTEM SHALL display a styled modal matching the current theme (not a native alert).
- WHEN any modal is displayed, THE SYSTEM SHALL apply the Haunted or Classic theme styling and include smooth transitions.
- WHEN a user clicks a button or presses Enter/Escape in a modal, THE SYSTEM SHALL close the modal and return the appropriate value.

---

### REQ-P9-011: No External Network Requests

**User Story**
As a developer, I want to ensure the app is fully self-contained and respects user privacy so that no external network requests are made for resources.

**Acceptance Criteria**
- WHEN the app loads, THE SYSTEM SHALL NOT make requests to CDNs, Google Fonts, analytics, or any external services (except when explicitly configured model providers like Claude API).
- WHEN fonts, icons, or stylesheets are needed, THE SYSTEM SHALL use only locally embedded or system-provided resources.
- WHEN a model provider is used (e.g., Claude API), THE SYSTEM SHALL only make requests if explicitly configured by the user and for that specific provider.
- IF an external request is attempted, THE SYSTEM SHALL log a warning and continue operation without blocking.

---

### REQ-P9-012: CSS and JS Gzipped Budget

**User Story**
As a developer, I want the UI to stay within performance targets so that the app loads quickly and remains lightweight.

**Acceptance Criteria**
- WHEN the app is built, THE SYSTEM SHALL ensure the total CSS + JS + embedded font files (gzipped) is below 40 kB.
- WHEN styles and icons are added, THE SYSTEM SHALL optimize and prioritize based on critical path rendering (fonts, core layout, theme).
- WHEN bundle size is measured, IT SHALL be reported in build output and documentation (docs/PERFORMANCE.md).
- IF bundle size exceeds 40 kB, THE SYSTEM SHALL identify and remove or defer non-critical features.

---

### REQ-P9-013: Test Coverage Constraints and Accessibility

**User Story**
As a maintainer, I want comprehensive tests for theme switching, animations, contrast, and accessibility so that the UI remains robust and inclusive.

**Acceptance Criteria**
- WHEN tests are run, THE SYSTEM SHALL verify that theme toggle persists to localStorage and loads on app startup.
- WHEN prefers-reduced-motion is detected, THE SYSTEM SHALL disable animations and verify layout/functionality is unaffected.
- WHEN contrast is checked, ALL text colors SHALL meet WCAG AA standards (4.5:1 for normal text, 3:1 for large text).
- WHEN focus rings are tested, THEY SHALL be visible on all interactive elements (buttons, inputs, fields) in both themes.
- WHEN a test removes a theme CSS variable or animation, THE SYSTEM SHALL fail (no silent fallback to broken state).
- WHEN existing tests run, THEY SHALL continue to pass (class names and data-attributes used by old tests remain unchanged).



---

## Phase 10: Premium Palettes

### REQ-P10-001: CSS Custom Properties (Token Refactor)

**User Story**
As a designer, I want to move all hardcoded colors in CSS and inline styles to semantic CSS custom properties so that themes can be swapped cleanly without touching HTML/JS.

**Acceptance Criteria**
- WHEN styles are parsed, THE SYSTEM SHALL find zero hardcoded color hex values or rgba/rgb functions in `src/dom/styles.css` or `src/dom/**/*.ts`.
- WHEN a color is needed, THE SYSTEM SHALL use a CSS custom property (e.g., `var(--accent)`, `var(--surface-0)`, `var(--text-1)`).
- WHEN a semantic token is used, THE SYSTEM SHALL document its purpose (accent color, surface background, text color, border, shadow, etc.).
- WHEN the Classic theme is active, THE SYSTEM SHALL define all tokens to match the existing 1-bit black/white/gray palette.
- WHEN a new theme is activated, THE SYSTEM SHALL redefine all tokens without requiring any JavaScript theme-switching logic (pure CSS).

### REQ-P10-002: Three Premium Palettes for Dark Theme

**User Story**
As a user, I want to choose between three refined, restrained luxury palettes ("Ink", "Navy", "Graphite") that replace the purple/orange neon aesthetic with sophisticated, muted tones.

**Acceptance Criteria**
- WHEN the app loads in dark mode, THE SYSTEM SHALL support three palettes via a `[data-palette="ink|navy|graphite"]` attribute on the `<html>` element.
- WHEN the user selects a palette, THE SYSTEM SHALL apply it via the data attribute (no DOM manipulation required, pure CSS).
- WHEN "Ink" palette is active, THE SYSTEM SHALL render surfaces in ink black (#0a0a0b-ish), accents in champagne gold (~#d4b98c), and adjust all semantic tokens accordingly.
- WHEN "Navy" palette is active, THE SYSTEM SHALL render surfaces in midnight navy (#0b1220-ish), accents in ice blue/silver (~#a9c7e8 / #c9d1db), and adjust all semantic tokens.
- WHEN "Graphite" palette is active, THE SYSTEM SHALL render surfaces in warm graphite (#1a1816-ish), accents in copper (~#c8875a), and adjust all semantic tokens.
- WHEN a palette is selected, THE SYSTEM SHALL save the choice to localStorage under key `"stacks-palette"`.
- WHEN the app loads, THE SYSTEM SHALL restore the palette from localStorage (or use "ink" as default).
- WHEN a URL parameter `?palette=ink|navy|graphite` is present, THE SYSTEM SHALL override localStorage and apply the specified palette.
- WHEN an invalid palette is provided in the URL, THE SYSTEM SHALL ignore it and use the saved or default palette.

### REQ-P10-003: Semantic Color Tokens

**User Story**
As a designer, I want a complete set of semantic color tokens so that every color decision is intentional and consistent across all three palettes.

**Acceptance Criteria**
- WHEN tokens are defined, THE SYSTEM SHALL include:
  - `--accent`: Primary accent color (gold/ice-blue/copper)
  - `--accent-strong`: Stronger/darker variant for emphasis
  - `--accent-soft`: RGBA variant with transparency for backgrounds
  - `--accent-contrast`: Text color (white/black) for readable text on accent
  - `--surface-0`: Darkest background (panels, containers)
  - `--surface-1`: Slightly lighter (cards, dialog backgrounds)
  - `--surface-2`: Mid-tone (hover states)
  - `--surface-3`: Light surface for contrast
  - `--hairline`: Thin border color (subtle dividers)
  - `--hairline-strong`: Thicker border color (stronger dividers)
  - `--text-1`: Primary text color (body, labels)
  - `--text-2`: Secondary text color (hints, muted)
  - `--text-3`: Tertiary text color (disabled, very subtle)
  - `--shadow-sm`, `--shadow-md`, `--shadow-lg`: Shadow definitions (subtle, no colored glows)
  - `--radius-sm`, `--radius-md`, `--radius-lg`: Border radius values (6px, 10px, 14px)
  - `--glow`: Tiny glow for subtle focus/hover effects (minimal, not neon)
- WHEN each token is applied, ALL THREE PALETTES SHALL redefine it with appropriate values (no palette has conflicting definitions).

### REQ-P10-004: Premium Refinement

**User Story**
As a designer, I want the UI to feel luxurious and restrained with refined typography, subtle gradients, and crafted components so that the overall aesthetic matches "premium" rather than "neon".

**Acceptance Criteria**
- WHEN typography is rendered, THE SYSTEM SHALL use:
  - Titles/section labels: 11px uppercase with 2px letter-spacing, optional small-caps styling
  - Body text: consistent 13–14px with comfortable line-height
  - Monospace (script editor): 12px Monaco or system monospace
- WHEN surfaces need visual depth, THE SYSTEM SHALL apply very low-contrast surface gradients (e.g., 1–2% brightness shift from top to bottom) rather than flat colors.
- WHEN borders are used, THE SYSTEM SHALL use 1px hairline borders (via `--hairline` token) instead of thick outlines.
- WHEN rounded corners are needed, THE SYSTEM SHALL use consistent radius values: 6px (small buttons), 10px (cards/panels), 14px (modals/large containers).
- WHEN shadows are applied, THE SYSTEM SHALL use dark, soft shadows (no colored glows or bright box-shadows): `box-shadow: 0 2px 8px rgba(0,0,0,0.2)` style (no neon, no purple tint).
- WHEN the toolbar is rendered, THE SYSTEM SHALL group related buttons with hairline dividers and consistent icon+label styling.
- WHEN panel headers are rendered, THE SYSTEM SHALL use uppercase labels with consistent 11px + 2px letter-spacing.

### REQ-P10-005: Palette Selector UI

**User Story**
As a user, I want an accessible palette selector in the toolbar so that I can switch between palettes without visiting settings.

**Acceptance Criteria**
- WHEN the app is rendered, THE SYSTEM SHALL display a palette selector (segmented control or `<select>`) in the toolbar near the Classic/Haunted theme toggle.
- WHEN the palette selector is displayed, THE SYSTEM SHALL include options: "Ink", "Navy", "Graphite".
- WHEN a palette is selected, THE SYSTEM SHALL immediately apply it and save the choice to localStorage.
- WHEN the Classic theme is active, THE SYSTEM SHALL hide or disable the palette selector (only relevant for dark themes).
- WHEN Haunted theme is activated, THE SYSTEM SHALL re-enable and show the palette selector.
- WHEN the palette selector is rendered, IT SHALL include an `aria-label="Palette"` for screen readers.

### REQ-P10-006: Welcome and Empty State Refinement

**User Story**
As a new user, I want a refined welcome dialog and tasteful empty-state card so that the experience feels intentional and premium.

**Acceptance Criteria**
- WHEN the app loads with no saved stack, THE SYSTEM SHALL display a welcome dialog (not just a blank canvas).
- WHEN the welcome dialog is shown, IT SHALL include:
  - Elegant heading (e.g., "Welcome to Stacks")
  - Short tagline (1–2 lines, e.g., "HyperCard revival for the web")
  - A hairline-bordered card showing a preview or icon
  - A primary button using `--accent` color (gold/ice-blue/copper)
  - Optional "Load Example" button
- WHEN a card is empty (no elements), THE SYSTEM SHALL display a tasteful empty-state message with a hairline border and centered layout (not stark/blank).
- WHEN both dialog and empty state are rendered, THEY SHALL harmonize with the current palette and follow the premium refinement guidelines.

### REQ-P10-007: Syntax Highlight Color Harmonization

**User Story**
As a script author, I want syntax highlight colors in the editor to harmonize with the current palette so that code is readable and aesthetically consistent.

**Acceptance Criteria**
- WHEN the script editor renders syntax highlighting in Haunted mode, THE SYSTEM SHALL use muted, palette-aware colors (not bright/neon).
- WHEN highlighting is applied, EACH TOKEN TYPE SHALL use a color from the current palette's semantic tokens:
  - Keywords: use `--accent` or `--accent-strong`
  - Strings: use a muted variant of accent or secondary text color
  - Numbers: use `--text-1` or a subtle accent variant
  - Comments: use `--text-2` (muted)
  - Operators/punctuation: use `--text-1`
- WHEN the Classic theme is active, THE SYSTEM SHALL revert to 1-bit black/gray highlighting (no colored accents).

### REQ-P10-008: Reduced-Motion and Focus Compliance

**User Story**
As an accessibility-conscious user, I want the app to respect reduced-motion preferences and provide visible, compliant focus rings.

**Acceptance Criteria**
- WHEN `prefers-reduced-motion` is enabled, THE SYSTEM SHALL disable all transitions and animations (no state changes are skipped, only animation duration set to 0).
- WHEN an interactive element has focus, THE SYSTEM SHALL display a visible focus ring using `--accent` color with a 2–3px width.
- WHEN focus rings are checked, THEY SHALL have a contrast ratio of at least 3:1 against the background (WCAG AAA for focus indicators).
- WHEN focus is applied to text inputs, THE SYSTEM SHALL apply a focus ring (not just a color change inside the input).

### REQ-P10-009: Test Coverage for Palettes and Colors

**User Story**
As a maintainer, I want comprehensive tests for palette switching, color tokens, and contrast compliance so that the theme system remains robust.

**Acceptance Criteria**
- WHEN tests run, THE SYSTEM SHALL verify that palette selection persists to localStorage and loads on app startup.
- WHEN a palette is changed, THE SYSTEM SHALL verify that the `[data-palette]` attribute updates on `<html>` and CSS is re-evaluated (no forced refresh).
- WHEN contrast is checked, ALL text-on-surface and accent-contrast pairs SHALL meet WCAG AA (4.5:1) for all three palettes and Classic theme.
- WHEN a URL with `?palette=` parameter is loaded, THE SYSTEM SHALL validate and apply the specified palette (or reject invalid values).
- WHEN CSS is parsed, THE SYSTEM SHALL verify NO hardcoded hex colors or rgba functions remain in `src/dom/styles.css` (all via CSS custom properties).
- WHEN tests run, THEY SHALL verify that switching from Haunted → Classic removes palette selector, then back to Haunted re-enables it.
- WHEN an inline style in `src/dom/**/*.ts` uses color, IT SHALL fail the test (colors must come from computed styles or CSS classes, not inline style attributes).

### REQ-P10-010: Documentation: THEMING.md Update

**User Story**
As a developer, I want comprehensive theming documentation so that future contributors understand how to add themes or modify color tokens.

**Acceptance Criteria**
- WHEN docs/THEMING.md is read, IT SHALL include:
  - Overview of the three-tier theme system (Classic, Haunted, Palettes)
  - Complete semantic token glossary with purposes
  - Guide for defining a new palette (minimal: update 15 core tokens)
  - CSS custom property structure and naming conventions
  - URL parameter override documentation (`?palette=...`)
  - localStorage key (`stacks-palette`)
  - Browser DevTools tips for testing theme changes (Chrome/Firefox DevTools CSS variable overrides)
  - Contrast requirements and testing guidance
- WHEN the documentation is complete, IT SHALL be clear enough for a new contributor to add a fourth palette within 30 minutes.

### REQ-P10-011: No New Dependencies or Breaking Changes

**User Story**
As a maintainer, I want to refactor colors without adding dependencies or breaking existing tests so that the refactor is low-risk and focused.

**Acceptance Criteria**
- THE SYSTEM SHALL NOT add npm dependencies (CSS-in-JS, color libraries, theme managers).
- WHEN existing tests run, THEY SHALL continue to pass (test selectors by class/data-attribute, not by color or appearance).
- WHEN tests that relied on old purple/orange values are updated, ONLY THOSE TESTS SHALL BE MODIFIED (no unrelated tests touched).
- WHEN a test asserts color, IT SHALL be updated to reflect the new palette tokens (or removed if appearance-assertion is not critical).
- WHEN CSS is gzipped and bundled, THE SYSTEM SHALL verify size is under 8 kB (or report the actual size and flag if over).

### REQ-P10-012: Classic Theme Preservation

**User Story**
As a user of Classic theme, I want it to continue working exactly as before so that the palette refactor is transparent to Classic-only users.

**Acceptance Criteria**
- WHEN Classic theme is active (via toggle), THE SYSTEM SHALL render identically to before the refactor (black, white, gray, no rounded corners, no shadows, no gradients).
- WHEN CSS custom properties are evaluated in Classic mode, THEY SHALL resolve to the existing black/white/gray values.
- WHEN tests that target Classic theme run, THEY SHALL pass without modification (appearance must be unchanged).



---

# Phase 11: Premium Finishing — Requirements

## Overview

Polish the Stacks editor and runtime to production quality: responsive layouts, smooth transitions, refined visual hierarchy, cohesive design system, and crafted UX. All changes preserve bundle size (<8 kB CSS gz, <32 kB JS gz) and WCAG AA accessibility.

---

## Requirements

### 11.1 AI Drawer Responsive Docking

**Requirement:** The AI assistant drawer must adapt to viewport width to avoid covering the properties panel on larger screens.

- **Layout >= 1100px (wide screens):**
  - Drawer docks as a grid column when open
  - App grid reflows: the card canvas column shrinks, card scales automatically via `computeFit()`
  - Properties panel (inspector) remains visible and fully usable
  - No overlay; drawer takes dedicated column space
  - Drawer and inspector can coexist on screen

- **Layout < 1100px (narrow screens):**
  - Drawer may overlay the canvas or other UI
  - Drawer must be closable (close button visible)
  - Inspector inputs must remain reachable (not permanently blocked)
  - Drawer is modal-like but dismissible

- **Behavior:**
  - Drawer toggled via AI button in toolbar
  - Grid layout recalculation happens when drawer opens/closes
  - No layout shift or content reflow artifacts

- **Testing:**
  - Layout test verifies bounding boxes: drawer and inspector do not overlap at ≥1100px
  - Inspector inputs are not covered at any width
  - Close button is visible and functional on narrow screens

---

### 11.2 Smooth Transitions

**Requirement:** Visual transitions between states must be fluid, predictable, and performant.

- **Card Flip (Navigate to Next/Previous):**
  - Current card fades out (opacity 0) while next card fades in (opacity 1)
  - No blank frames, no double-card flash
  - 200–300ms duration
  - Uses `transform` and `opacity` only (GPU-friendly)
  - Disabled under `prefers-reduced-motion` (instant snap)

- **Edit ↔ Run Mode:**
  - Script editor slides/fades in or out smoothly
  - Canvas/buttons remain in place (no layout jump)
  - 200–300ms duration
  - Transform-based animation (no reflow)
  - Disabled under `prefers-reduced-motion`

- **Other Transitions:**
  - Drawer open/close (if not instant)
  - Hover/press states on buttons (200ms, subtle)
  - Removed from motion-reduced queries

- **Testing:**
  - Visual regression test: no blank frames during card flip
  - No double cards rendered simultaneously
  - Layout remains stable (no shift)
  - Motion disabled in `prefers-reduced-motion` test

---

### 11.7 Brand & Identity

**Requirement:** Establish visual brand identity with custom SVG mark, favicon, and refined messaging.

- **Brand Mark (Stylised Stack of Cards):**
  - Inline SVG (no external file)
  - 24×24px or 32×32px (scalable)
  - Three or more overlapping cards in 45° rotation
  - Navy/black with subtle shadows or layers
  - Replaces generic user icon in header
  - Appears in welcome dialog as well

- **Favicon:**
  - SVG favicon (data URI embedded in HTML or `public/favicon.svg`)
  - 16×16px minimum (auto-scaled by browser)
  - Recognizable stack-of-cards design
  - Monochrome (fits 1-bit aesthetic)

- **Page Title:**
  - HTML `<title>`: "Stacks — HyperCard, resurrected"
  - Appears in browser tab and search results

- **Welcome Screen Refinement:**
  - Brand mark prominently displayed
  - Clear call-to-action ("Create a Stack", "Load Example")
  - Refined typography (use `--fs-*` tokens)
  - Polish existing copy

- **Testing:**
  - Favicon appears in browser tab
  - Brand mark renders crisply on all backgrounds
  - Page title appears correctly

---

## Non-Functional Requirements

- **Bundle Size:**
  - CSS: < 8 kB gzipped
  - JS: < 32 kB gzipped
  - No external dependencies for icons or design system

- **Accessibility:**
  - WCAG AA compliance (contrast, keyboard nav, focus indicators)
  - All states distinguishable (not color-only)
  - Motion respect (`prefers-reduced-motion`)

- **No External Requests:**
  - No Google Fonts, no icon CDNs, no analytics
  - All assets bundled or embedded (data URIs)

- **Browser Support:**
  - Chrome, Firefox, Safari, Edge (latest versions)
  - Graceful degradation for older browsers

---

## Success Criteria

✓ Drawer docks at ≥1100px, inspector always visible  
✓ Card flip and mode transitions smooth, no blank frames  
✓ Brand mark and favicon implemented  
✓ Bundle size maintained  
✓ WCAG AA compliance verified  
