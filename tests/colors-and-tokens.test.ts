import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Phase 10: CSS Colors and Tokens', () => {
  it('should not contain hardcoded purple colors in styles.css', () => {
    const cssPath = resolve(__dirname, '../src/dom/styles.css');
    const css = readFileSync(cssPath, 'utf-8');
    
    // Check for hardcoded purple colors used in old glows
    const purplePatterns = [
      /168,\s*85,\s*247/,  // rgba(168, 85, 247, ...)
      /#a855f7/i,          // hex purple
    ];
    
    for (const pattern of purplePatterns) {
      expect(css).not.toMatch(pattern);
    }
  });

  it('should not contain hardcoded orange neon colors in styles.css', () => {
    const cssPath = resolve(__dirname, '../src/dom/styles.css');
    const css = readFileSync(cssPath, 'utf-8');
    
    // Check for hardcoded orange neon colors
    const orangePatterns = [
      /249,\s*115,\s*22/,  // rgba(249, 115, 22, ...)
      /#f97316/i,          // hex orange
      /#fdba74/i,          // hex orange lighter
    ];
    
    for (const pattern of orangePatterns) {
      expect(css).not.toMatch(pattern);
    }
  });

  it('should not contain old purple surface background #1a1a2e in UI styles', () => {
    const cssPath = resolve(__dirname, '../src/dom/styles.css');
    const css = readFileSync(cssPath, 'utf-8');
    
    // Allow in comments/variables, but check it's not used in actual property values
    // This regex looks for it after : or in rgba context
    const badUsage = /(?:background-color|background|border-.*color|box-shadow|color):\s*(?:.*)?#1a1a2e/gim;
    const matches = css.match(badUsage);
    
    if (matches) {
      // Filter out variable definitions (--surface-1: #1a1a2e is OK)
      const problematic = matches.filter(m => !m.includes('--surface'));
      expect(problematic.length).toBe(0);
    }
  });

  it('should not contain #120a1f (old dark background) outside token definitions', () => {
    const cssPath = resolve(__dirname, '../src/dom/styles.css');
    const css = readFileSync(cssPath, 'utf-8');
    
    // #120a1f should only appear in token/variable context or comments, not as property values
    const lines = css.split('\n');
    const problemLines = lines.filter(line => {
      if (line.includes('#120a1f') && !line.includes('--') && !line.includes('/*')) {
        return true;
      }
      return false;
    });
    
    expect(problemLines.length).toBe(0);
  });

  it('Ink palette should define near-black neutral surfaces', () => {
    const cssPath = resolve(__dirname, '../src/dom/styles.css');
    const css = readFileSync(cssPath, 'utf-8');
    
    const inkPaletteMatch = css.match(
      /html\[data-palette="ink"\][^}]*--surface-0:\s*#([0-9a-f]{6})/i
    );
    expect(inkPaletteMatch).toBeTruthy();
    
    if (inkPaletteMatch) {
      const color = inkPaletteMatch[1].toLowerCase();
      // Should be near-black: #0b0b0c or similar
      expect(['0b0b0c', '0a0a0b']).toContain(color);
    }
  });

  it('Navy palette should define deep navy neutral surfaces', () => {
    const cssPath = resolve(__dirname, '../src/dom/styles.css');
    const css = readFileSync(cssPath, 'utf-8');
    
    // Navy palette should have dark blue surfaces
    const navyMatch = css.match(
      /html\[data-palette="navy"\][^}]*--surface-0:\s*#([0-9a-f]{6})/i
    );
    expect(navyMatch).toBeTruthy();
    
    if (navyMatch) {
      const color = navyMatch[1].toLowerCase();
      // Should be deep navy: #0a1020 or similar
      expect(['0a1020', '0b1220']).toContain(color);
    }
  });

  it('Graphite palette should define warm graphite neutral surfaces', () => {
    const cssPath = resolve(__dirname, '../src/dom/styles.css');
    const css = readFileSync(cssPath, 'utf-8');
    
    // Graphite palette should have warm neutral surfaces
    const graphiteMatch = css.match(
      /html\[data-palette="graphite"\][^}]*--surface-0:\s*#([0-9a-f]{6})/i
    );
    expect(graphiteMatch).toBeTruthy();
    
    if (graphiteMatch) {
      const color = graphiteMatch[1].toLowerCase();
      // Should be warm graphite: #161412 or similar
      expect(['161412', '1a1816']).toContain(color);
    }
  });

  it('should use var(--shadow-*) tokens instead of colored glows', () => {
    const cssPath = resolve(__dirname, '../src/dom/styles.css');
    const css = readFileSync(cssPath, 'utf-8');
    
    // Count uses of shadow tokens vs. colored box-shadows
    const shadowTokenUses = (css.match(/var\(--shadow-/g) || []).length;
    
    // Should have multiple uses of shadow tokens
    expect(shadowTokenUses).toBeGreaterThan(5);
    
    // Should not have glowing colored shadows (accent glows in shadows)
    const coloredGlowShadows = (css.match(/box-shadow:[^;]*color-mix[^;]*rgba\(/g) || []).length;
    expect(coloredGlowShadows).toBeLessThan(3); // Allow a few, but discourage
  });

  it('should use color-mix instead of rgba for accent transparency', () => {
    const cssPath = resolve(__dirname, '../src/dom/styles.css');
    const css = readFileSync(cssPath, 'utf-8');
    
    // Modern approach: color-mix(in srgb, var(--accent) X%, transparent)
    const colorMixUses = (css.match(/color-mix\s*\(\s*in\s+srgb/g) || []).length;
    
    // Should use color-mix for palette-aware colors
    expect(colorMixUses).toBeGreaterThan(5);
  });
});
