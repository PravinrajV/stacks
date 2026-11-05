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

### 11.3 Type Scale & Spacing Rhythm Tokens

**Requirement:** Establish a consistent design system with font sizes and spacing.

- **Font Sizes (CSS custom properties):**
  - `--fs-11`: 11px (captions, hints)
  - `--fs-12`: 12px (labels, small text)
  - `--fs-13`: 13px (body, default)
  - `--fs-15`: 15px (subheadings)
  - `--fs-18`: 18px (headings)
  - `--fs-24`: 24px (page title, major heading)

- **Spacing Grid (4px base):**
  - `--sp-4`: 4px
  - `--sp-8`: 8px (derived)
  - `--sp-12`: 12px
  - `--sp-16`: 16px
  - `--sp-20`: 20px
  - `--sp-24`: 24px
  - Scale in multiples of 4px

- **Application:**
  - All text sizing uses one of the `--fs-*` tokens
  - All margins, padding, gaps use the 4px spacing grid
  - Section labels, captions, input heights, gaps all respect the rhythm
  - Consistent across all UI panels (inspector, editor, toolbar, etc.)

- **Testing:**
  - Audit CSS: all font-size values reference `--fs-*` tokens
  - Audit CSS: all spacing (margin, padding, gap) is divisible by 4px
  - Visual test: hierarchy is clear and consistent

---

### 11.4 Inline SVG Icon Set & States

**Requirement:** Replace button text/generic icons with a cohesive, accessible inline SVG icon set.

- **Icon Set (16px base, 1.5px stroke):**
  - **Run**: play symbol
  - **Edit**: pencil symbol
  - **Add Button**: plus symbol
  - **Add Field**: text field symbol
  - **Export**: download arrow
  - **Import**: upload arrow
  - **Save**: floppy disk (or checkmark)
  - **AI Settings**: gear/cog
  - **Theme**: moon or sun symbol

- **Technical Requirements:**
  - Inline SVG (no `<img>`, no icon fonts, no external files)
  - `currentColor` to inherit button text color
  - 16×16px viewBox (square)
  - Stroke width 1.5px (consistent weight)
  - Filled or stroked style (consistent with 1-bit aesthetic)

- **Button States:**
  - **Default**: icon + text or icon only (if space allows)
  - **Hover**: subtle background color shift (already in existing code)
  - **Press**: `transform: translateY(1px)` and light shadow reduction
  - **Disabled**: opacity 0.5, cursor not-allowed
  - **Focus-visible**: 2px accent-colored ring with 2px offset from button edge on surface color

- **Testing:**
  - SVG renders crisply (no blur, no scaling artifacts)
  - Icons visible at all zoom levels
  - Focus ring appears on Tab navigation
  - Press state feedback visible

---

### 11.5 Card Canvas Depth & Polish

**Requirement:** Enhance the card visual hierarchy with layered depth and refined empty states.

- **Card Appearance:**
  - Subtle layered shadow (e.g., `box-shadow: 0 2px 8px rgba(0,0,0,0.1), 0 1px 1px rgba(0,0,0,0.05)`)
  - 1px hairline border (inner) around the card perimeter (color: `--text-1` at low opacity)
  - Faint vignette on the canvas background area (darker edges, lighter center)

- **Card List Refinements:**
  - Empty state when no cards match search or single card exists:
    - Centered text: "No cards found" or "Add a card to get started"
    - Muted color, larger spacing
  - Card list items: polished hover/selection states, consistent spacing, clear typography

- **Canvas Background:**
  - Faint vignette gradient (radial gradient from center, subtle darkening at edges)
  - Provides visual "focus" on the card

- **Testing:**
  - Visual test: layered shadow and hairline render correctly
  - Empty state appears when expected
  - Card list items are clearly readable and hover states work

---

### 11.6 Script Editor Polish

**Requirement:** Refine the script editor for a polished, professional appearance.

- **Gutter (Line Numbers):**
  - Line numbers in left gutter
  - Color: `--text-3` (muted, low contrast)
  - Font size: `--fs-12`
  - Right-aligned in gutter space
  - Active line highlight: subtle background color (e.g., `--surface-2`)

- **Syntax Highlighting:**
  - Navy-harmonised colors (fits 1-bit aesthetic):
    - Keywords: navy or dark blue
    - Strings: teal or green
    - Numbers: navy
    - Comments: gray
  - Minimum AA contrast ratio (4.5:1) against editor background
  - Test with contrast checker

- **Editor Appearance:**
  - Monospace font (Monaco, Courier New, etc.)
  - Line height 1.5 for readability
  - Consistent padding and margins
  - Border or shadow to define editor bounds

- **Testing:**
  - Syntax colors render correctly for all token types
  - Line numbers visible and aligned
  - Active line highlight present
  - Contrast ratio ≥ 4.5:1 (WCAG AA)

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

### 11.8 Inspector: Crafted Properties Panel

**Requirement:** Elevate the properties inspector to a polished, well-structured component.

- **Layout & Grouping:**
  - Organized into collapsible sections:
    - **Identity**: id, name, type
    - **Content**: text (for fields), script
    - **Typography**: font size, font family, bold, italic, align
    - **Position & Size**: left, top, width, height
  - Section headers styled with `--fs-11` labels, navy or accent color

- **Inputs & Controls:**
  - All input fields: height 30px (consistency with existing buttons)
  - Position & Size: two-column grid layout
    - Left column: "left" and "top" inputs
    - Right column: "width" and "height" inputs
  - Checkbox toggle for boolean properties (bold, italic, etc.)
  - Styled checkbox: custom appearance (not default browser)
  - Number inputs: right-aligned text, clear increment arrows

- **Spacing & Alignment:**
  - Section gap: `--sp-12`
  - Input gap within sections: `--sp-8`
  - Consistent padding within inspector panel
  - Labels and inputs clearly associated (grid or flexbox layout)

- **Styling:**
  - Background: `--surface-1`
  - Section header color: `--text-2` (slightly muted)
  - Input border: `--text-2` or `--border-color`
  - Focus-visible: 2px accent ring (consistent with buttons)
  - Hover states on inputs

- **Testing:**
  - Layout test: sections collapse/expand without layout jump
  - Input heights are 30px
  - Position & Size grid aligns inputs correctly
  - Focus ring appears on Tab navigation
  - Checkbox toggle appears (not default browser checkbox)

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
✓ All text/spacing uses design tokens  
✓ Icons render inline, states provide feedback  
✓ Card canvas has depth and polish  
✓ Script editor is refined and accessible  
✓ Brand mark and favicon implemented  
✓ Inspector is crafted and organized  
✓ Bundle size maintained  
✓ WCAG AA compliance verified  

