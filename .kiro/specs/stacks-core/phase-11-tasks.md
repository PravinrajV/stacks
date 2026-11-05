# Phase 11: Premium Finishing — Tasks

## Overview

Implement the design system, responsive layouts, smooth transitions, and polished UI components to bring Stacks to production quality. Tasks are sequenced to build foundational tokens first, then apply them systematically across the codebase.

---

## 11.1 AI Drawer Responsive Docking

**Description:** Implement responsive grid layout so AI drawer docks at ≥1100px without overlapping the inspector, and adapts to overlay mode on narrow screens.

**Subtasks:**

- **11.1.1** Review existing grid layout in `app.ts` and identify breakpoint logic
- **11.1.2** Define CSS media query at 1100px breakpoint
- **11.1.3** Refactor app grid layout:
  - Desktop (≥1100px): grid-template-columns with canvas, drawer, and inspector columns
  - Mobile (<1100px): stack layout or drawer overlay
- **11.1.4** Update app state to track drawer width (280–320px)
- **11.1.5** Implement canvas scaling via existing `computeFit()` when drawer appears
- **11.1.6** Add close button to drawer for mobile mode
- **11.1.7** Write layout test: drawer and inspector bounding boxes do not overlap at ≥1100px
- **11.1.8** Write layout test: inspector inputs remain visible on narrow screens even when drawer open

**Definition of Done:**
- Grid layout responsive and working at both breakpoints
- No visual overlap of drawer and inspector
- Tests pass
- Canvas scales smoothly when drawer docks

---

## 11.2 Smooth Transitions

**Description:** Implement fluid transitions for card flip, mode switching, and button states using GPU-friendly transforms.

**Subtasks:**

- **11.2.1** Define transition CSS variables: `--transition-duration: 250ms`, `--transition-easing: cubic-bezier(0.4, 0, 0.2, 1)`
- **11.2.2** Implement card flip transition in `cardCanvas.ts`:
  - On navigation, previous card: `opacity 0` in 250ms
  - Next card: starts at `opacity 0`, transitions to `opacity 1` in 250ms
  - No double-card rendering
- **11.2.3** Implement Edit ↔ Run mode transition:
  - Script editor hidden: `opacity 0` + optional `transform: translateY(100%)`
  - Smooth 250ms transition
- **11.2.4** Add button press state animation: `transform: translateY(1px)` on active
- **11.2.5** Implement `prefers-reduced-motion` media query:
  - All transitions disabled (transition: none)
  - Instant state changes
- **11.2.6** Write visual regression test: card flip (no blank frames)
- **11.2.7** Write visual regression test: mode switch (no layout jump)
- **11.2.8** Verify GPU acceleration (use DevTools performance profiler)

**Definition of Done:**
- Card flip smooth, no visual artifacts
- Mode switch fluid, canvas stable
- Button press feedback clear
- Motion-reduced mode instant
- Tests pass

---

## 11.3 Type Scale & Spacing Rhythm Tokens

**Description:** Define and apply design tokens for typography and spacing across all UI.

**Subtasks:**

- **11.3.1** Add font-size tokens to `styles.css`:
  ```css
  --fs-11: 11px;
  --fs-12: 12px;
  --fs-13: 13px;
  --fs-15: 15px;
  --fs-18: 18px;
  --fs-24: 24px;
  ```

- **11.3.2** Add spacing tokens to `styles.css`:
  ```css
  --sp-4: 4px;
  --sp-8: 8px;
  --sp-12: 12px;
  --sp-16: 16px;
  --sp-20: 20px;
  --sp-24: 24px;
  ```

- **11.3.3** Audit existing CSS and replace all hardcoded values:
  - `font-size: 12px` → `font-size: var(--fs-12)`
  - `padding: 8px 12px` → `padding: var(--sp-8) var(--sp-12)`
  - `margin: 16px` → `margin: var(--sp-16)`

- **11.3.4** Apply tokens to major components:
  - Header (logo size, toolbar gaps)
  - Card list (item padding, gaps)
  - Script editor (padding, gutter width, line-height)
  - Inspector (section gaps, input height 30px)
  - Dialogs (padding, gaps)

- **11.3.5** Write CSS audit script (or manual check) to verify all spacing/text uses tokens
- **11.3.6** Update component comments to reference token usage

**Definition of Done:**
- All hardcoded font sizes replaced with `--fs-*` tokens
- All hardcoded spacing replaced with `--sp-*` tokens
- Audit passes (no hardcoded values remain)
- Visual hierarchy consistent

---

## 11.4 Inline SVG Icon Set & States

**Description:** Create and implement an inline SVG icon set with hover/press states for toolbar buttons.

**Subtasks:**

- **11.4.1** Design 9 SVG icons (16×16px viewBox, 1.5px stroke):
  - Play (Run), Pencil (Edit), Plus (Add Button), Text Field (Add Field)
  - Download (Export), Upload (Import), Disk (Save), Gear (AI Settings), Moon/Sun (Theme)
  - Store as constants or functions in `icons.ts`

- **11.4.2** Define icon rendering function:
  ```typescript
  function createIcon(name: 'run' | 'edit' | ..., attrs?: object): SVGElement
  ```

- **11.4.3** Update toolbar buttons to use inline icons:
  - Replace text/generic icons with SVG
  - Maintain button text labels (if space)
  - Icons inherit `currentColor`

- **11.4.4** Implement button states in CSS:
  - Default: icon visible
  - Hover: background shift (existing)
  - **Press:** `transform: translateY(1px)`, shadow reduced
  - Focus-visible: 2px accent ring, 2px offset
  - Disabled: `opacity: 0.5`, `cursor: not-allowed`

- **11.4.5** Define focus-visible ring style:
  ```css
  button:focus-visible {
    outline: 2px solid var(--accent-color);
    outline-offset: 2px;
  }
  ```

- **11.4.6** Write component test: icons render (SVG present, correct viewBox)
- **11.4.7** Write interaction test: press state feedback (transform applied)
- **11.4.8** Write a11y test: focus ring visible on Tab

**Definition of Done:**
- All 9 icons inline, crisply rendered
- Button states provide clear feedback
- Focus ring visible and accessible
- No icon font or external files
- Tests pass

---

## 11.5 Card Canvas Depth & Polish

**Description:** Add layered shadows, hairline borders, vignette effect, and polish card list empty states.

**Subtasks:**

- **11.5.1** Update card element shadow in `cardCanvas.ts`:
  ```css
  box-shadow: 0 2px 8px rgba(0,0,0,0.1), 0 1px 1px rgba(0,0,0,0.05);
  ```

- **11.5.2** Add 1px hairline inner border:
  ```css
  border: 1px inset rgba(0,0,0,0.05);
  border-radius: var(--sp-4);
  ```

- **11.5.3** Implement canvas vignette background:
  ```css
  canvas-background: radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(200,200,200,0.08) 100%);
  ```

- **11.5.4** Refine card list empty state in `cardList.ts`:
  - When no cards: show centered message
  - Typography: `--fs-15`, `--text-3` (muted)
  - Padding: `--sp-24`
  - Message: "No cards found" or "Add a card to get started"

- **11.5.5** Polish card list items:
  - Hover state: background `--surface-2`
  - Selected state: left border `3px` accent color
  - Padding: `--sp-8` vertical, `--sp-12` horizontal
  - Typography: `--fs-13`, `--text-1`

- **11.5.6** Write visual test: shadow and border render correctly
- **11.5.7** Write visual test: vignette gradient visible
- **11.5.8** Write interaction test: empty state appears when expected

**Definition of Done:**
- Card has depth (shadow + border + vignette)
- Empty state polished and functional
- Card list items refined
- Tests pass

---

## 11.6 Script Editor Polish

**Description:** Implement polished line number gutter, active line highlight, and navy-harmonised syntax highlighting.

**Subtasks:**

- **11.6.1** Review existing syntax highlighting in `scriptEditor.ts`
- **11.6.2** Implement gutter with line numbers:
  - Gutter width: 40–50px (depends on line count)
  - Line number color: `--text-3` (muted)
  - Font size: `--fs-12`
  - Right-aligned with `--sp-8` padding
  - Background: `--surface-0` (darker than editor)

- **11.6.3** Implement active line highlight:
  - When cursor on line, background: `--surface-2`
  - Spans gutter + editor
  - Subtle, not distracting

- **11.6.4** Define navy-harmonised syntax colors:
  - Keywords: navy (`#000080`)
  - Strings: teal (`#006666`)
  - Numbers: navy (`#000080`)
  - Comments: gray (`#666666`)
  - Test contrast ratio ≥ 4.5:1

- **11.6.5** Apply colors to lexer token types in parser
- **11.6.6** Write contrast test: all syntax colors pass WCAG AA
- **11.6.7** Write visual test: syntax colors render correctly
- **11.6.8** Write visual test: line numbers and active line appear

**Definition of Done:**
- Line numbers visible and aligned
- Active line highlighted
- Syntax colors navy-harmonised and accessible
- Tests pass

---

## 11.7 Brand & Identity

**Description:** Implement brand mark SVG, favicon, page title, and refine welcome screen.

**Subtasks:**

- **11.7.1** Design stylised stack-of-cards SVG mark:
  - Three overlapping cards in 45° rotation
  - Navy/black, subtle shadows
  - Scalable (no hardcoded dimensions)
  - Store as constant in `icons.ts` or new `brand.ts`

- **11.7.2** Update header logo:
  - Replace generic user icon with brand mark
  - Size: 24px
  - Click to open home/settings (or link to welcome)

- **11.7.3** Update welcome dialog:
  - Add brand mark (32–48px)
  - Use refined typography (`--fs-*` tokens)
  - Polished copy

- **11.7.4** Set page title:
  - HTML `<title>Stacks — HyperCard, resurrected</title>`

- **11.7.5** Create favicon (SVG data URI or `public/favicon.svg`):
  - 16×16px simplified stack-of-cards
  - Embed in HTML or reference via link tag

- **11.7.6** Write visual test: brand mark renders correctly at multiple sizes
- **11.7.7** Write visual test: favicon appears in browser tab (manual verification)

**Definition of Done:**
- Brand mark appears in header and welcome
- Favicon visible in browser tab
- Page title correct
- Welcome screen polished
- Tests pass

---

## 11.8 Inspector: Crafted Properties Panel

**Description:** Reorganize properties inspector into clearly grouped sections with refined inputs and layout.

**Subtasks:**

- **11.8.1** Review existing inspector implementation in `elementInspector.ts`
- **11.8.2** Reorganize inspector into four sections:
  - **Identity**: id, name, type
  - **Content**: text (fields), script
  - **Typography**: font size, font family, bold, italic, align
  - **Position & Size**: left, top, width, height

- **11.8.3** Implement collapsible sections:
  - Section header: `--fs-11`, uppercase, navy/accent color, medium weight
  - Toggle arrow on click
  - Body visible/hidden with smooth transition

- **11.8.4** Implement Position & Size grid layout:
  - Two-column grid
  - Left column: "Left" and "Top" inputs
  - Right column: "Width" and "Height" inputs
  - All inputs: height 30px

- **11.8.5** Style inputs consistently:
  - Height: 30px
  - Border: 1px `--text-2`
  - Padding: `--sp-8`
  - Font-size: `--fs-12`
  - Focus-visible: 2px accent ring, 2px offset

- **11.8.6** Implement styled checkbox toggle:
  - For boolean properties (bold, italic, etc.)
  - Custom appearance (not browser default)
  - Navy square with checkmark
  - Hover/press states

- **11.8.7** Spacing:
  - Section gaps: `--sp-12`
  - Input gaps: `--sp-8`
  - Panel padding: `--sp-16` or `--sp-20`
  - Labels: `--sp-4` below section header

- **11.8.8** Write layout test: Position & Size grid aligns correctly
- **11.8.9** Write interaction test: sections collapse/expand
- **11.8.10** Write a11y test: focus ring visible, inputs reachable by Tab

**Definition of Done:**
- Inspector organized into clear sections
- Position & Size grid layout correct
- Inputs all 30px height
- Checkbox styled
- Spacing rhythm consistent
- Tests pass

---

## Task Execution Order

**Phase A: Foundations (Tokens & System)**
1. 11.3 Type Scale & Spacing Tokens (affects all subsequent work)

**Phase B: Layout & Structure**
2. 11.1 AI Drawer Responsive Docking

**Phase C: Polish & Refinement**
3. 11.2 Smooth Transitions
4. 11.4 Inline SVG Icon Set
5. 11.5 Card Canvas Depth & Polish
6. 11.6 Script Editor Polish

**Phase D: Brand & Components**
7. 11.7 Brand & Identity
8. 11.8 Inspector Crafted Properties

---

## Testing Strategy

### Layout Tests
- Drawer/inspector bounding boxes (no overlap)
- Grid reflow on breakpoints
- Position & Size grid alignment
- Empty states rendering

### Interaction Tests
- Button press state feedback
- Section collapse/expand
- Card flip transition
- Mode switch transition

### Accessibility Tests
- Focus ring visible
- Keyboard navigation (Tab order)
- Contrast ratio (WCAG AA)
- Motion-reduced mode

### Visual Tests
- Shadow/border rendering
- Icon rendering (16px, crisp)
- Syntax colors
- Brand mark
- Empty states
- Component refinements

### Performance Tests
- Bundle size (CSS < 8 kB gz, JS < 32 kB gz)
- Transition frame rate (60fps, no jank)
- No memory leaks

---

## Bundle Size Targets

- **CSS:** < 8 kB gzipped
  - Design tokens and base styles
  - Component styles
  - Media queries

- **JS:** < 32 kB gzipped
  - App logic, DOM manipulation
  - No external libraries for design system

---

## Quality Assurance Checklist

- [ ] All text uses `--fs-*` tokens
- [ ] All spacing uses `--sp-*` tokens
- [ ] Grid layout responsive at 1100px breakpoint
- [ ] Drawer docks without overlap
- [ ] Card flip smooth, no blank frames
- [ ] Mode switch smooth, no layout jump
- [ ] All icons inline, crisp
- [ ] Button states provide feedback
- [ ] Focus ring visible on all interactive elements
- [ ] Canvas has depth (shadow + border + vignette)
- [ ] Empty states polished
- [ ] Script editor gutter and highlighting refined
- [ ] Syntax colors accessible (AA contrast)
- [ ] Brand mark present and polished
- [ ] Favicon appears in tab
- [ ] Inspector organized and inputs 30px
- [ ] No hardcoded colors/spacing
- [ ] CSS < 8 kB gz
- [ ] JS < 32 kB gz
- [ ] WCAG AA compliance verified
- [ ] No external requests

