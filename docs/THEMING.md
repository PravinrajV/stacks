# Theming Guide

Stacks ships with a theme system (Classic / Haunted) and three premium palettes with palette-specific neutral surfaces and accents.

## Themes

### Haunted (Dark, Default)

Modern dark theme with accent colors on neutral surfaces. Available in three palettes (Ink, Navy, Graphite).

**Glass Effects**: Semi-transparent background with 8px blur backdrop filter and soft dark shadows.

### Classic (1-Bit)

Pure black, white, and gray. Authentic System 7 Macintosh aesthetic. No glass effects, hard edges, soft dark shadows.

## Palettes (Haunted Theme Only)

Each palette defines neutral surfaces and a unique accent color:

### Ink Palette (Default)

Champagne gold accents on deep neutral blacks.

- **Surface Colors**: `#0b0b0c` → `#202024` (near-black neutrals)
- **Text**: `#e8e8f0` (off-white), `#a8a8c8` (muted), `#808090` (tertiary)
- **Accent**: `#d4b98c` (champagne gold)
- **Accent Contrast**: `#000000` (dark text on accent)

### Navy Palette

Ice blue accents on deep navy surfaces.

- **Surface Colors**: `#0a1020` → `#1b2740` (deep navy neutrals)
- **Text**: `#e8f0f8` (light ice), `#a8c8e8` (muted blue), `#8090a8` (tertiary)
- **Accent**: `#a9c7e8` (ice blue)
- **Accent Contrast**: `#000000` (dark text on accent)

### Graphite Palette

Copper accents on warm graphite surfaces.

- **Surface Colors**: `#161412` → `#2c2722` (warm graphite neutrals)
- **Text**: `#f0ede8` (warm white), `#c8b8a8` (warm muted), `#a0908a` (tertiary)
- **Accent**: `#c8875a` (copper)
- **Accent Contrast**: `#1d1a17` (dark text on accent for contrast)

### Classic Theme

- **Surface Colors**: `#ffffff` → `#a0a0a0` (white to medium gray)
- **Text**: `#000000` (black), `#666666` (dark gray), `#999999` (light gray)
- **No accents** (monochromatic 1-bit)

## CSS Token System

All color, spacing, and visual tokens are defined as CSS custom properties (variables) in `src/dom/styles.css`.

### Color Tokens (Palette-Aware)

```css
/* Surfaces: theme and palette-specific */
--surface-0     /* Darkest surface (neutral) */
--surface-1     /* Primary panel background */
--surface-2     /* Secondary UI surface */
--surface-3     /* Tertiary/accent surface */

/* Text */
--text-1        /* Primary body text */
--text-2        /* Secondary/muted text */
--text-3        /* Tertiary/disabled text */

/* Accents (palette-specific) */
--accent
--accent-hover
--accent-active
--accent-contrast   /* Text on accent for buttons */

/* Borders and focus */
--hairline-color
--border-color
--glass-bg
--glass-backdrop
--glass-border
--glass-shadow
--glass-radius
```

### Typography Tokens

```css
--font-ui: system-ui, -apple-system, sans-serif     /* UI chrome */
--font-mono: 'JetBrains Mono', 'SF Mono', monospace /* Code/scripts */
```

### Shadow Tokens (Soft Dark Only)

```css
--shadow-sm:  0 2px 4px rgba(0, 0, 0, 0.3)
--shadow-md:  0 4px 12px rgba(0, 0, 0, 0.4)
--shadow-lg:  0 12px 24px rgba(0, 0, 0, 0.5)
```

No colored/glowing shadows—all neutral dark for consistent elegance.

### Radius Tokens

```css
--radius-sm: 6px    /* Buttons, small components */
--radius-md: 10px   /* Panels, cards */
--radius-lg: 14px   /* Modals, dialogs */
```

## Switching Themes and Palettes

Themes and palettes are controlled via attributes on the document root:

```javascript
// Switch theme (affects entire app, controls palette visibility)
document.documentElement.setAttribute('data-theme', 'classic');
document.documentElement.setAttribute('data-theme', 'haunted');

// Switch palette (Haunted only; ignored in Classic)
document.documentElement.setAttribute('data-palette', 'ink');
document.documentElement.setAttribute('data-palette', 'navy');
document.documentElement.setAttribute('data-palette', 'graphite');

// Get current theme/palette
const theme = document.documentElement.getAttribute('data-theme');
const palette = document.documentElement.getAttribute('data-palette');
```

Theme and palette preferences are automatically persisted to localStorage:
- Theme key: `stacks-theme` (default: `'haunted'`)
- Palette key: `stacks-palette` (default: `'ink'`, ignored in Classic theme)

**Palette selector visibility**: The palette selector is hidden/disabled in Classic theme and visible in Haunted theme.

### URL Parameter Override

Palettes can be overridden via URL parameter `?palette=ink|navy|graphite`:

```
https://stacks.example.com/?palette=navy     → Applies Navy palette
https://stacks.example.com/?palette=invalid  → Ignored, uses saved palette
```

Invalid palette values are rejected and the saved or default palette is used instead.

## Creating a Custom Theme

To add a new theme, define a new set of CSS custom properties:

1. **Add CSS variables** in `src/dom/styles.css`:

```css
[data-theme="midnight"],
[data-theme="midnight"] * {
  --color-bg-primary: #0a0e27;
  --color-bg-secondary: #141829;
  --color-bg-tertiary: #1e2540;
  --color-text-primary: #d4d8f1;
  --color-text-secondary: #a0a8c8;
  --color-text-tertiary: #6b7490;
  --color-border: rgba(100, 116, 200, 0.3);
  --color-accent: #6474c8;
  --color-accent-hover: #7a86e0;
  --color-accent-active: #5568b0;
  --color-focus: #6474c8;
  --color-shadow: rgba(100, 116, 200, 0.2);

  --glass-bg: rgba(20, 24, 41, 0.8);
  --glass-backdrop: blur(8px);
  --glass-border: 1px solid rgba(100, 116, 200, 0.2);
  --glass-shadow: 0 8px 32px rgba(100, 116, 200, 0.15);
  --glass-radius: 12px;

  --border-width: 1px;
  --border-style: solid;
  --border-color: rgba(100, 116, 200, 0.3);

  --token-keyword-color: #6474c8;
  --token-string-color: #ffc857;
  --token-number-color: #2ec4b6;
  --token-comment-color: #6b7490;
  --token-keyword-weight: bold;

  --transition-duration: 150ms;
}
```

2. **Update the App** to expose the new theme in the theme switcher (in `src/dom/app.ts`):

```typescript
const AVAILABLE_THEMES = ['classic', 'haunted', 'midnight'];

// Then in the theme toggle handler:
const themeIndex = AVAILABLE_THEMES.indexOf(currentTheme);
const nextTheme = AVAILABLE_THEMES[(themeIndex + 1) % AVAILABLE_THEMES.length];
```

3. **Test contrast** to ensure all text/background pairs meet WCAG AA (4.5:1 minimum).

```bash
npm run test -- tests/contrast.test.ts
```

## Accessibility Requirements

All themes and palettes must meet these accessibility standards:

- **Text Contrast**: ≥ 4.5:1 for body text (WCAG AA)
  - Primary text on primary/secondary surfaces
  - Secondary text on surfaces
  - Accent-contrast text on accent backgrounds (buttons)
- **Large Text Contrast**: ≥ 3:1 (WCAG AA)
- **Focus Indicators**: Visible outline (2–3px) with ≥ 3:1 contrast
- **Motion**: Respect `prefers-reduced-motion` media query (all transitions duration 0s)

Automated validation:
- `tests/contrast.test.ts`: Contrast ratios for all palettes and Classic theme
- `tests/reduced-motion.test.ts`: Motion preference handling
- `tests/focus-visible.test.ts`: Focus ring visibility

Run all accessibility tests:
```bash
npm run test -- tests/contrast.test.ts tests/reduced-motion.test.ts tests/focus-visible.test.ts
```

## Typography System

Stacks uses two font families:

### System UI (UI Chrome)

Used for all UI elements: toolbar buttons, panel headers, labels, inputs, dialogs.

```css
font-family: system-ui, -apple-system, sans-serif;
font-size: 13px;          /* Body */
font-size: 11px;          /* Labels, uppercase with 0.08em letter-spacing */
font-size: 15px;          /* Panel titles, semibold */
```

### Monospace (Code)

Used for script editor, code previews, diffs, and card content.

```css
font-family: 'JetBrains Mono', 'SF Mono', monospace;
font-size: 12px;
line-height: 1.5;
```

This separation improves readability: UI feels modern and accessible, code remains clear and monospaced.

## Component Styling Reference

### Buttons

```css
button {
  background-color: var(--color-bg-tertiary);
  border: 2px solid var(--color-border);
  color: var(--color-text-primary);
  border-radius: var(--glass-radius);
}

button:hover {
  background-color: rgba(168, 85, 247, 0.2);
  border-color: var(--color-accent);
}

button:focus {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}
```

### Text Inputs

```css
input, textarea {
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  font-family: var(--font-mono);
}

input:focus, textarea:focus {
  outline: 2px solid var(--color-focus);
  border-color: var(--color-accent);
}
```

### Panels and Containers

```css
.panel {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-backdrop);
  border: var(--glass-border);
  box-shadow: var(--glass-shadow);
  border-radius: var(--glass-radius);
}
```

### Cards (Logical Elements)

```css
.card-view {
  background-color: #ebe7de;
  border: 3px solid #000000;
  box-shadow: var(--glass-shadow);
}
```

## Performance

All theme switching is instantaneous via CSS custom properties. No JavaScript animation or layout recalculation is required—the browser applies new colors immediately.

The theme preference is stored in `localStorage` and survives page reloads.

## Reducing Motion

When the user has set `prefers-reduced-motion: reduce`, all animations and transitions are disabled:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
  }

  :root {
    --transition-duration: 0ms !important;
  }
}
```

Visual state changes (colors, positions, etc.) still apply; only the animation duration is removed.

## References

- WCAG 2.1 Contrast (Minimum): https://www.w3.org/TR/WCAG21/#contrast-minimum
- CSS Custom Properties: https://developer.mozilla.org/en-US/docs/Web/CSS/--*
- prefers-reduced-motion: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
