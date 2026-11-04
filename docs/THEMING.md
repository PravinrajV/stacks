# Theming Guide

Stacks ships with two built-in themes and a CSS token system for easy customization.

## Themes

### Haunted (Dark, Default)

Purple and orange accents on a dark background. Inspired by classic Mac aesthetics with a modern dark twist.

- **Primary Background**: `#0b0614` (Deep purple-black)
- **Secondary Background**: `#1a1a2e` (Dark navy)
- **Text Primary**: `#e8e8f0` (Off-white)
- **Text Secondary**: `#a8a8c8` (Lavender)
- **Accent Color**: `#a855f7` (Purple)
- **Accent Hover**: `#c084fc` (Lighter purple)
- **Orange Accent**: `#f97316` (Bright orange)
- **Glass Effect**: Semi-transparent background with 8px blur backdrop filter

### Classic (1-Bit)

Pure black, white, and gray. Authentic System 7 Macintosh aesthetic.

- **Primary Background**: `#ffffff` (White)
- **Secondary Background**: `#f0f0f0` (Light gray)
- **Tertiary Background**: `#cccccc` (Medium gray)
- **Text Primary**: `#000000` (Black)
- **Text Secondary**: `#666666` (Dark gray)
- **Borders**: `#000000` (Black, 1px solid)
- **No glass effects**: Solid backgrounds and sharp borders

## CSS Token System

All color, spacing, and visual tokens are defined as CSS custom properties (variables) in `src/dom/styles.css`.

### Color Tokens

```css
/* Available in both themes */
--color-bg-primary
--color-bg-secondary
--color-bg-tertiary
--color-text-primary
--color-text-secondary
--color-text-tertiary
--color-border
--color-border-light
--color-accent
--color-accent-hover
--color-accent-active
--color-focus
--color-shadow
```

### Typography Tokens

```css
--font-ui: system-ui, -apple-system, sans-serif
--font-mono: 'JetBrains Mono', 'SF Mono', monospace
--font-display: 'JetBrains Mono', 'SF Mono', monospace
```

### Spacing Tokens

```css
--spacing-xs: 4px
--spacing-sm: 8px
--spacing-md: 12px
--spacing-lg: 16px
--spacing-xl: 24px
```

### Component-Specific Tokens

```css
/* Glass-morphism (Haunted only) */
--glass-bg
--glass-backdrop
--glass-border
--glass-shadow
--glass-radius

/* Syntax Highlighting */
--token-keyword-color
--token-string-color
--token-number-color
--token-comment-color
--token-keyword-weight
```

## Switching Themes

Themes are controlled via the `data-theme` attribute on the document root:

```javascript
// Switch to Classic
document.documentElement.setAttribute('data-theme', 'classic');

// Switch to Haunted
document.documentElement.setAttribute('data-theme', 'haunted');

// Get current theme
const theme = document.documentElement.getAttribute('data-theme');
```

Theme preference is automatically persisted to `localStorage` with the key `theme-preference`.

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

All themes must meet these accessibility standards:

- **Text Contrast**: ≥ 4.5:1 for body text (WCAG AA)
- **Large Text Contrast**: ≥ 3:1 (WCAG AA)
- **UI Component Contrast**: ≥ 3:1 (WCAG AA)
- **Focus Indicators**: Visible and ≥ 3:1 contrast
- **Motion**: Respect `prefers-reduced-motion` media query

See `tests/contrast.test.ts` and `tests/reduced-motion.test.ts` for automated validation.

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
