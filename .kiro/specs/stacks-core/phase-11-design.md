# Phase 11: Premium Finishing — Design

## Design Goals

Transform Stacks from a functional prototype into a polished, production-ready application by:
1. Establishing a cohesive design system (typography, spacing, colors)
2. Ensuring responsive layouts that adapt gracefully across viewports
3. Providing fluid, delightful micro-interactions
4. Crafting intentional visual hierarchy and depth
5. Building a recognizable, ownable brand identity

---

## Design System

### Color Palette (1-bit Aesthetic)

The existing color system uses CSS custom properties organized in three tiers:

- **Surfaces:** `--surface-0` (background), `--surface-1` (default), `--surface-2` (hover/active)
- **Text:** `--text-0` (inverse/highlight), `--text-1` (primary), `--text-2` (secondary), `--text-3` (tertiary/muted)
- **Accent:** `--accent-color` (navy or deep blue for interactive states)
- **Semantic:** `--error-color`, `--success-color` (if needed)

**Phase 11 Addition:** Ensure consistent usage across all new components; no arbitrary color values.

### Typography System

**Font Stack:**
```css
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
.monospace { font-family: "Monaco", "Courier New", monospace; }
```

**Font Sizes (CSS Custom Properties):**
- `--fs-11`: 11px (minimum for accessibility in captions)
- `--fs-12`: 12px (labels, hints, gutter)
- `--fs-13`: 13px (body text, default)
- `--fs-15`: 15px (subheadings, section titles)
- `--fs-18`: 18px (headings, card title area)
- `--fs-24`: 24px (page title, major branding)

**Line Heights:**
- Body: 1.5
- Headings: 1.2
- Monospace (code): 1.5

**Font Weights:**
- Regular: 400
- Medium: 500 (section headers, strong emphasis)
- Bold: 700 (headings, primary CTAs)

### Spacing Rhythm (4px Grid)

All spacing derives from a 4px base unit:
```css
--sp-4: 4px;
--sp-8: 8px;   /* 4 × 2 */
--sp-12: 12px; /* 4 × 3 */
--sp-16: 16px; /* 4 × 4 */
--sp-20: 20px; /* 4 × 5 */
--sp-24: 24px; /* 4 × 6 */
```

**Application:**
- Margins, padding, gaps, border-radius all use `--sp-*` tokens
- Dialog padding: `--sp-16` or `--sp-20`
- Input height: 30px (7px × 4 + 2px border adjustment, or strict 30px)
- Button height: 32px (8px × 4)
- Section gaps: `--sp-12` to `--sp-16`

### Shadow System

**Depth Layers:**
1. **Flat (no shadow):** inputs, labels
2. **Card depth:** `0 2px 8px rgba(0,0,0,0.1), 0 1px 1px rgba(0,0,0,0.05)` (canvas card)
3. **Floating:** `0 4px 16px rgba(0,0,0,0.12)` (modals, drawers, dropdowns)
4. **Pressed:** `0 1px 3px rgba(0,0,0,0.08)` (button active)

---

## Layout Architecture

### App Grid (Desktop >= 1100px)

With AI drawer docked:
```
┌─────────────────────────────────────────────────────────────┐
│ Header (logo, toolbar, theme toggle)                        │
├──────────────────┬──────────────────┬──────────────────────┤
│                  │                  │                      │
│ Card List        │ Canvas           │ AI Drawer            │
│ (240px)          │ (flex, shrink)   │ (280–320px, fixed)   │
│                  │                  │                      │
├──────────────────┴──────────────────┴──────────────────────┤
│ Script Editor / Footer                                      │
└─────────────────────────────────────────────────────────────┘

With Inspector visible (added to drawer or side panel):
┌─────────────────────────────────────────────────────────────┐
│ Header                                                      │
├──────────────────┬──────────────────┬────────┬─────────────┤
│                  │                  │        │             │
│ Card List        │ Canvas           │ AI     │ Inspector   │
│ (240px)          │ (flex, shrink)   │Drawer │ (240px)     │
│                  │                  │        │             │
├──────────────────┴──────────────────┴────────┴─────────────┤
│ Script Editor                                               │
└─────────────────────────────────────────────────────────────┘
```

**Design Choice:** AI Drawer docks as a dedicated column when open (>= 1100px). Inspector remains as a separate side panel or integrates into the drawer's tabbed layout.

**Rationale:**
- Canvas scales automatically via existing `computeFit()` logic
- Inspector visibility preserved without overlay
- Grid reflow is clear and predictable
- Consistent with professional editor layouts (VS Code, Figma)

### Mobile Layout (< 1100px)

```
┌──────────────────────────┐
│ Header                   │
├──────────────────────────┤
│                          │
│ Canvas                   │
│ (full width, scaled)     │
│                          │
├──────────────────────────┤
│ Script Editor / Tabs     │
├──────────────────────────┤
│ Card List (collapsible)  │
└──────────────────────────┘
```

- AI Drawer overlays (modal-like) with close button
- Inspector is a tabbed panel or separate view
- Touch-friendly sizing (larger buttons, more spacing)

---

## Component Design

### Header & Toolbar

- **Brand Mark** (24px SVG): Left side, link to home or settings
- **Toolbar Buttons:**
  - Run / Edit toggle (left)
  - Add Button, Add Field (center-left)
  - Export, Import, Save (center-right)
  - AI Settings (opens AI panel config)
  - Theme Toggle (moon/sun icon)
- **All Buttons:** 32px height, icon + optional label, press state `translateY(1px)`

### Card Canvas

- **Card Element:**
  - Layered shadow: `box-shadow: 0 2px 8px rgba(0,0,0,0.1), 0 1px 1px rgba(0,0,0,0.05)`
  - 1px hairline inner border (e.g., `border: 1px inset rgba(0,0,0,0.05)`)
  - Border-radius: `--sp-4` (4px, gentle corners)
  - Background: white (`--surface-1`)

- **Canvas Background:**
  - Faint vignette: radial gradient from center (light) to edges (darker)
  - Example: `radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(200,200,200,0.08) 100%)`
  - Provides visual "pull" toward the card

### Card List

- **Items:** 
  - Padding: `--sp-8` (vertical), `--sp-12` (horizontal)
  - Hover: background `--surface-2`
  - Selected: border-left `3px` accent color
  - Typography: `--fs-13`, `--text-1`

- **Empty State:**
  - Centered text, `--fs-15`, `--text-3` (muted)
  - Padding: `--sp-24`
  - Message: "No cards found" or "Add a card to get started"

### Script Editor

- **Gutter:**
  - Width: 40–50px (depends on line count width)
  - Background: `--surface-0` (darker than editor)
  - Line numbers: `--fs-12`, `--text-3` (muted), right-aligned
  - Padding-right: `--sp-8`

- **Active Line Highlight:**
  - Background: `--surface-2`
  - Spans gutter + editor width
  - Subtle, not distracting

- **Syntax Highlighting (Navy-Harmonised):**
  - Keywords: `#000080` (navy)
  - Strings: `#006666` (teal)
  - Numbers: `#000080` (navy)
  - Comments: `#666666` (gray)
  - Contrast ratio ≥ 4.5:1 (WCAG AA)

- **Editor Styling:**
  - Font: monospace, `--fs-13`
  - Line-height: 1.5
  - Padding: `--sp-12` all sides
  - Border: 1px `--text-2`
  - Background: `--surface-0`

### Inspector (Properties Panel)

**Structure:**
```
┌─────────────────────────────┐
│ Inspector                   │
├─────────────────────────────┤
│ IDENTITY                    │ ← --fs-11, medium weight, navy
│ ├ Name:     [_________]     │
│ ├ Type:     [_________]     │
│ └ ID:       [_________]     │
│                             │
│ CONTENT                     │
│ ├ Text:     [_________]     │
│ └ Script:   [________]      │
│             [________]      │
│             [________]      │
│                             │
│ TYPOGRAPHY                  │
│ ├ Font Size: [___] ▼        │
│ ├ Font:      [___] ▼        │
│ ├ Bold:      [☐]            │ ← custom checkbox
│ └ Italic:    [☐]            │
│                             │
│ POSITION & SIZE             │
│ ├ Left: [___] | Top: [___]  │ ← 2-column grid
│ └ Width:[___] | Height:[__] │
└─────────────────────────────┘
```

**Details:**
- Section headers: `--fs-11`, `--text-2` (muted), uppercase letter-spacing
- Labels: `--fs-12`, `--text-2`
- Input fields: height 30px, border 1px `--text-2`, padding `--sp-8`
- Focus-visible: 2px accent ring with 2px offset
- Checkbox: custom styled (navy square with checkmark), no browser default

### AI Drawer

**When Docked (>= 1100px):**
- Column width: 280–320px
- Title: "AI Assistant"
- Close button (top-right, if needed, or toggle via toolbar)
- Content: chat-like interface (existing implementation)
- No overlap with inspector

**When Overlaid (< 1100px):**
- Position: fixed, bottom-right or center
- Width: 90vw or max 400px
- Height: 60vh or max 500px
- Close button (always visible, top-right)
- Z-index: above canvas, below modals

**Colors:**
- Background: `--surface-1`
- Border: 1px `--text-2`
- Shadow: floating level (depth layer 3)

---

## Transitions & Motion

### Card Flip (Go Next/Previous)

**Timeline:**
```
0ms    ├─ Current card: opacity 1 → opacity 0
       ├─ Next card: opacity 0 → opacity 1
       └─ Duration: 250ms (cubic-bezier(0.4, 0, 0.2, 1))
250ms  ├─ Transition complete
```

**CSS:**
```css
.card {
  transition: opacity 250ms cubic-bezier(0.4, 0, 0.2, 1);
}

.card.exiting { opacity: 0; }
.card.entering { opacity: 0; }
.card.current { opacity: 1; }
```

**No Layout Changes:** Canvas and other elements remain stable.

### Edit ↔ Run Mode

**Timeline:**
```
0ms    ├─ Edit mode: script editor visible (opacity 1)
       ├─ Run mode: script editor opacity 1 → 0, transform slideOut
       └─ Duration: 250ms
250ms  ├─ Transition complete, editor hidden
```

**CSS:**
```css
.scriptEditor {
  transition: opacity 250ms, transform 250ms;
}

.scriptEditor.hidden {
  opacity: 0;
  transform: translateY(100%); /* or translateX(-100%) */
}
```

**Alternative:** Crossfade without slide (simpler, equally effective).

### Button Press State

**Timeline:**
```
0ms    ├─ Mouse down: transform translateY(1px)
       └─ Duration: 100ms
100ms  ├─ State held until mouse up
```

**CSS:**
```css
button:active {
  transform: translateY(1px);
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  transition: 100ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

### Prefers Reduced Motion

**All transitions disabled:**
```css
@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; animation: none !important; }
}
```

No transitions, instant state changes.

---

## Icon Design (16×16px, 1.5px Stroke)

**Icon Specifications (all inline SVG, viewBox="0 0 16 16"):**

1. **Run (Play):** Triangle pointing right, centered
2. **Edit (Pencil):** Angled pencil, tip at bottom-right
3. **Add Button (Plus):** Centered plus symbol, clean lines
4. **Add Field (Text Field):** Rectangle with three horizontal lines (text)
5. **Export (Download):** Down arrow with line below
6. **Import (Upload):** Up arrow with line above
7. **Save (Disk):** Classic floppy disk outline
8. **AI Settings (Gear):** Gear/cog with teeth
9. **Theme (Moon/Sun):** Crescent moon or radiating sun

**Common Properties:**
- Stroke width: 1.5px
- Fill: `currentColor` (inherits button color)
- Viewbox: `0 0 16 16`
- Centering: paths use `2–14px` range

---

## Brand Identity

### Brand Mark (Stylised Stack of Cards)

**SVG Design:**
```
Three overlapping cards at 45° rotation, slightly offset:
- Bottom card: navy rectangle (3×3px each offset +1)
- Middle card: navy rectangle (offset +1)
- Top card: navy rectangle (offset +1)
- Optional: subtle shadow or layering effect
- Result: 3D "stacked" appearance
```

**Usage:**
- Header logo (24px)
- Welcome screen (32–48px)
- Favicon (16×16px)

### Page Title

- `<title>Stacks — HyperCard, resurrected</title>`
- Appears in browser tab and search results

### Favicon

- Format: SVG data URI or `public/favicon.svg`
- Size: 16×16px (auto-scaled by browser)
- Design: simplified stack-of-cards mark
- Monochrome (fits 1-bit aesthetic)

### Welcome Screen

- Brand mark centered (48px)
- Title: "Stacks" (--fs-24, bold)
- Subtitle: "HyperCard, resurrected" (--fs-15, --text-2)
- CTAs: "Create a Stack" and "Load Example" (buttons, full width)
- Example cards carousel (optional)

---

## Accessibility Considerations

### Color & Contrast

- All text-on-surface: ≥ 4.5:1 (WCAG AA, normal text) or ≥ 3:1 (large text)
- Focus indicators: 2px ring, 2px offset, accent color on surface
- States not distinguished by color alone (icon, text, or shape also differs)

### Keyboard Navigation

- Tab order: natural reading order (header → canvas → editor → footer)
- All interactive elements focusable
- Focus indicator always visible (no outline: none)
- Escape key closes overlays (drawer, modals)

### Motion

- `prefers-reduced-motion: reduce` → all transitions instant
- No auto-playing animations
- Pause button on any carousel or timer

### Semantic HTML

- Proper heading hierarchy (h1, h2, h3)
- Form labels associated with inputs
- Buttons and links semantically correct
- ARIA labels where needed (e.g., icon buttons: `aria-label="Run script"`)

---

## Design Tokens Summary

| Token | Value | Usage |
|-------|-------|-------|
| `--fs-11` | 11px | Captions, section labels |
| `--fs-12` | 12px | Labels, gutter, hints |
| `--fs-13` | 13px | Body text (default) |
| `--fs-15` | 15px | Subheadings, card titles |
| `--fs-18` | 18px | Headings, major sections |
| `--fs-24` | 24px | Page title, brand |
| `--sp-4` | 4px | Base unit, tight spacing |
| `--sp-8` | 8px | List items, button gaps |
| `--sp-12` | 12px | Section spacing, padding |
| `--sp-16` | 16px | Dialog padding, large gaps |
| `--sp-20` | 20px | Container padding |
| `--sp-24` | 24px | Major sections |

---

## Quality Checklist

- [ ] All text uses `--fs-*` tokens
- [ ] All spacing uses `--sp-*` tokens or derives from 4px grid
- [ ] Shadows match depth system (flat, card, floating, pressed)
- [ ] Focus indicators visible on all interactive elements
- [ ] Icons render crisply, 16×16px, 1.5px stroke
- [ ] Color contrast ≥ 4.5:1 (tested with tools)
- [ ] Transitions smooth, 200–300ms, GPU-friendly (transform/opacity)
- [ ] Drawer docks at ≥1100px, no overlap with inspector
- [ ] Brand mark appears consistently
- [ ] Favicon renders in tab
- [ ] Inspector organized into sections, inputs 30px height
- [ ] Script editor syntax colors accessible, gutter clear
- [ ] Canvas has depth (shadow + hairline + vignette)
- [ ] Bundle size < 8 kB CSS gz, < 32 kB JS gz
- [ ] No external requests (fonts, icons, analytics)

