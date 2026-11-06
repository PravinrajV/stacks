# Cross-Browser Testing Checklist

This document provides a manual testing checklist for verifying Stacks functionality across browsers.

**Note**: Automated tests cover happy-dom only (a lightweight DOM simulation). Production deployment requires manual verification in real browsers.

## Test Environment

- Stacks Live: https://stacks-6go.pages.dev
- Local Dev: `npm run dev` → http://localhost:5173

## Browsers to Test

- ✅ **Chrome** (primary development browser)
- ⚠️ **Firefox** (not yet tested)
- ⚠️ **Safari** (not yet tested)
- ⚠️ **Edge** (not yet tested)

> ⚠️ = Not yet tested. Results below are templates for testers to fill in.

---

## Test Checklist

### 1. Load and Basic Rendering

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Page loads without errors | ✅ | ⚠️ | ⚠️ | ⚠️ |
| Haunted theme displays correctly | ✅ | ⚠️ | ⚠️ | ⚠️ |
| Classic theme displays correctly | ✅ | ⚠️ | ⚠️ | ⚠️ |
| All text is readable (contrast) | ✅ | ⚠️ | ⚠️ | ⚠️ |
| SVG icons render | ✅ | ⚠️ | ⚠️ | ⚠️ |
| Fonts load correctly | ✅ | ⚠️ | ⚠️ | ⚠️ |

### 2. Welcome Screen

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Welcome screen shows on first visit | ✅ | ⚠️ | ⚠️ | ⚠️ |
| "Create New Stack" button works | ✅ | ⚠️ | ⚠️ | ⚠️ |
| "Load Example Stack" button works | ✅ | ⚠️ | ⚠️ | ⚠️ |
| Modal is centered and readable | ✅ | ⚠️ | ⚠️ | ⚠️ |

### 3. Theme Toggle

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Theme toggle button visible | ✅ | ⚠️ | ⚠️ | ⚠️ |
| Switching to Classic theme works | ✅ | ⚠️ | ⚠️ | ⚠️ |
| Switching to Haunted theme works | ✅ | ⚠️ | ⚠️ | ⚠️ |
| Theme persists after page reload | ✅ | ⚠️ | ⚠️ | ⚠️ |
| Transition is smooth | ✅ | ⚠️ | ⚠️ | ⚠️ |

### 4. Add Button

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| +Button button visible in canvas | ✅ | ⚠️ | ⚠️ | ⚠️ |
| Click creates new button | ✅ | ⚠️ | ⚠️ | ⚠️ |
| New button is selectable | ✅ | ⚠️ | ⚠️ | ⚠️ |
| Button has unique name | ✅ | ⚠️ | ⚠️ | ⚠️ |
| Inspector shows button properties | ✅ | ⚠️ | ⚠️ | ⚠️ |

### 5. Add Field

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| +Field button visible in canvas | ✅ | ⚠️ | ⚠️ | ⚠️ |
| Click creates new field | ✅ | ⚠️ | ⚠️ | ⚠️ |
| New field is selectable | ✅ | ⚠️ | ⚠️ | ⚠️ |
| Field has unique name | ✅ | ⚠️ | ⚠️ | ⚠️ |
| Inspector shows field properties | ✅ | ⚠️ | ⚠️ | ⚠️ |

### 6. Script Editor Spacing

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Script editor is readable | ✅ | ⚠️ | ⚠️ | ⚠️ |
| Line numbers align with text | ✅ | ⚠️ | ⚠️ | ⚠️ |
| Syntax highlighting is visible | ✅ | ⚠️ | ⚠️ | ⚠️ |
| Keywords are colored correctly | ✅ | ⚠️ | ⚠️ | ⚠️ |
| Strings are colored correctly | ✅ | ⚠️ | ⚠️ | ⚠️ |
| Text wraps properly | ✅ | ⚠️ | ⚠️ | ⚠️ |

### 7. Run Mode

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| "Run" button switches to run mode | ✅ | ⚠️ | ⚠️ | ⚠️ |
| Card displays in run mode | ✅ | ⚠️ | ⚠️ | ⚠️ |
| Buttons are clickable | ✅ | ⚠️ | ⚠️ | ⚠️ |
| Fields are editable | ✅ | ⚠️ | ⚠️ | ⚠️ |
| "Exit Run Mode" button works | ✅ | ⚠️ | ⚠️ | ⚠️ |

### 8. Answer Dialog

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| `answer` command shows dialog | ✅ | ⚠️ | ⚠️ | ⚠️ |
| Dialog message displays | ✅ | ⚠️ | ⚠️ | ⚠️ |
| Buttons are clickable | ✅ | ⚠️ | ⚠️ | ⚠️ |
| Correct button index is returned | ✅ | ⚠️ | ⚠️ | ⚠️ |
| Dialog is properly focused | ✅ | ⚠️ | ⚠️ | ⚠️ |
| Dialog can be closed | ✅ | ⚠️ | ⚠️ | ⚠️ |

### 9. Card Flip

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| `go to card` navigates | ✅ | ⚠️ | ⚠️ | ⚠️ |
| Card list updates | ✅ | ⚠️ | ⚠️ | ⚠️ |
| Card content changes | ✅ | ⚠️ | ⚠️ | ⚠️ |
| Navigation animation plays | ✅ | ⚠️ | ⚠️ | ⚠️ |
| No rendering glitches | ✅ | ⚠️ | ⚠️ | ⚠️ |

### 10. AI Drawer

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| AI panel button visible | ✅ | ⚠️ | ⚠️ | ⚠️ |
| AI panel opens | ✅ | ⚠️ | ⚠️ | ⚠️ |
| Description input works | ✅ | ⚠️ | ⚠️ | ⚠️ |
| "Generate" button works | ✅ | ⚠️ | ⚠️ | ⚠️ |
| Mock provider generates code | ✅ | ⚠️ | ⚠️ | ⚠️ |
| Diff preview displays | ✅ | ⚠️ | ⚠️ | ⚠️ |
| "Accept" inserts code | ✅ | ⚠️ | ⚠️ | ⚠️ |
| "Reject" cancels insertion | ✅ | ⚠️ | ⚠️ | ⚠️ |

### 11. Export/Import

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| "Export" button visible | ✅ | ⚠️ | ⚠️ | ⚠️ |
| Export downloads JSON file | ✅ | ⚠️ | ⚠️ | ⚠️ |
| JSON file is valid | ✅ | ⚠️ | ⚠️ | ⚠️ |
| "Import" button visible | ✅ | ⚠️ | ⚠️ | ⚠️ |
| Import opens file picker | ✅ | ⚠️ | ⚠️ | ⚠️ |
| Imported stack loads correctly | ✅ | ⚠️ | ⚠️ | ⚠️ |
| All stack data preserved | ✅ | ⚠️ | ⚠️ | ⚠️ |

### 12. Reduced Motion

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Animations disabled when set | ✅ | ⚠️ | ⚠️ | ⚠️ |
| Layout remains intact | ✅ | ⚠️ | ⚠️ | ⚠️ |
| Interactions still work | ✅ | ⚠️ | ⚠️ | ⚠️ |
| No visual glitches | ✅ | ⚠️ | ⚠️ | ⚠️ |

---

## Known Issues

### Chrome ✅
- No known issues (primary development platform)

### Firefox ⚠️
- To be tested

### Safari ⚠️
- To be tested

### Edge ⚠️
- To be tested

---

## Testing Notes

### Running Locally

```bash
# Install dependencies
npm ci

# Start dev server
npm run dev

# Then open http://localhost:5173 in the browser
```

### Testing Workflow

1. **Load page** in browser
2. **Check welcome screen** (first visit)
3. **Test theme toggle** and persistence
4. **Create sample stack** (buttons, fields)
5. **Write script** (syntax highlight check)
6. **Switch to run mode** (interaction tests)
7. **Test navigation** (card flip)
8. **Test dialogs** (answer command)
9. **Export/import** to verify data integrity
10. **Check performance** (responsiveness, no lag)

### Accessibility Checks

For each browser:
- [ ] Use keyboard only (Tab, Enter, Escape)
- [ ] Test focus indicators (visible on all interactive elements)
- [ ] Enable "prefers-reduced-motion" via browser DevTools and retest
- [ ] Verify text contrast using browser color picker

### Performance Checks

- [ ] Page load time < 2s (on 3G, 6x CPU throttle)
- [ ] Interaction latency < 100ms (button clicks, field edits)
- [ ] Memory usage stable (no leaks over 10 min of use)
- [ ] No console errors or warnings

---

## Submission Checklist

When all browsers have been tested:

- [ ] All checklist items above completed
- [ ] Issues documented (see "Known Issues" section)
- [ ] Performance is acceptable
- [ ] No critical bugs found
- [ ] Ready for production deployment

---

## References

- MDN: Browser Compatibility: https://developer.mozilla.org/en-US/docs/MDN/Writing_guidelines/Writing_style_guide/Compatibility_tables
- WCAG Testing: https://www.w3.org/WAI/test-evaluate/
- Web.dev: Debugging: https://web.dev/debug/

## Automated coverage (as of Nov 6, 2026, America/New_York)

Headless Chromium (Playwright) smoke against local preview and previously against https://stacks-6go.pages.dev:

- Welcome once, edit canvas, Run mode, AI drawer docking at 1280/1440
- Answer dialog, rename/delete card, last-card guard
- Toolbar SVG icons present; `:focus-visible` outline 2px accent measured
- Hover/press toolbar screenshots captured under `/workspace/kiroween/submission/smoke/p12-*.png`
- No console errors; no external network requests in those runs

**Not covered by automation (Pravinraj must still check in real GUI browsers):**

| Check | Chrome (GUI) | Firefox | Safari | Edge |
|-------|--------------|---------|--------|------|
| First-load welcome + dismiss | ☐ | ☐ | ☐ | ☐ |
| Toolbar icons crisp / not clipped | ☐ | ☐ | ☐ | ☐ |
| Brand mark visible in header tab + favicon | ☐ | ☐ | ☐ | ☐ |
| Focus rings when Tabbing | ☐ | ☐ | ☐ | ☐ |
| Hover + press feedback on toolbar | ☐ | ☐ | ☐ | ☐ |
| Card glow looks intentional (not clipped) | ☐ | ☐ | ☐ | ☐ |
| AI drawer docks beside inspector ≥1100px | ☐ | ☐ | ☐ | ☐ |
| Edit ↔ Run fade; card change fade | ☐ | ☐ | ☐ | ☐ |
| Classic theme + each palette (Navy/Ink/Graphite) | ☐ | ☐ | ☐ | ☐ |
| Import/Export/Save round-trip | ☐ | ☐ | ☐ | ☐ |
| BYOK settings panel opens (no key required for demo) | ☐ | ☐ | ☐ | ☐ |
| Reduced motion: OS setting disables fades | ☐ | ☐ | ☐ | ☐ |
| Mobile/narrow width (<1100): drawer overlays, inspector usable | ☐ | ☐ | ☐ | ☐ |

Safari especially: Web Animations API, `color-mix`, and SVG currentColor. Firefox: focus-visible. Edge: Chromium-parity but still confirm.

