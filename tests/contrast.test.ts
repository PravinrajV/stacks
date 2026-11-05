import { describe, it, expect, beforeAll } from 'vitest';

/**
 * Task 9.6.1: WCAG AA Contrast Ratio Test
 * 
 * Tests that all text/background token pairs in Haunted and Classic themes
 * meet the WCAG AA contrast requirement: >= 4.5:1 for body text.
 * 
 * Reference: https://www.w3.org/TR/WCAG21/#contrast-minimum
 */

interface ColorToken {
  name: string;
  value: string;
}

interface TokenPair {
  text: ColorToken;
  background: ColorToken;
}

/**
 * Parse color value to RGB. Handles hex colors only.
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculate relative luminance per WCAG formula.
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
function getRelativeLuminance(rgb: { r: number; g: number; b: number }): number {
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.05) / 1.05, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate contrast ratio between two colors per WCAG formula.
 * https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 */
function getContrastRatio(color1: string, color2: string): number | null {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return null;

  const lum1 = getRelativeLuminance(rgb1);
  const lum2 = getRelativeLuminance(rgb2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

describe('Theme Contrast Ratios (WCAG AA)', () => {
  // Classic theme colors
  const classicTheme = {
    bg_primary: '#ffffff',
    bg_secondary: '#f0f0f0',
    bg_tertiary: '#cccccc',
    text_primary: '#000000',
    text_secondary: '#666666',
    text_tertiary: '#999999',
    border: '#000000',
    accent_contrast: '#ffffff',
  };

  // Ink palette (default Haunted)
  const inkTheme = {
    bg_primary: '#0b0b0c',
    bg_secondary: '#121214',
    bg_tertiary: '#18181b',
    text_primary: '#e8e8f0',
    text_secondary: '#a8a8c8',
    text_tertiary: '#808090',
    accent: '#d4b98c',
    accent_contrast: '#000000',
  };

  // Navy palette
  const navyTheme = {
    bg_primary: '#0a1020',
    bg_secondary: '#0f172a',
    bg_tertiary: '#141e33',
    text_primary: '#e8f0f8',
    text_secondary: '#a8c8e8',
    text_tertiary: '#8090a8',
    accent: '#a9c7e8',
    accent_contrast: '#000000',
  };

  // Graphite palette
  const graphiteTheme = {
    bg_primary: '#161412',
    bg_secondary: '#1d1a17',
    bg_tertiary: '#24201c',
    text_primary: '#f0ede8',
    text_secondary: '#c8b8a8',
    text_tertiary: '#a0908a',
    accent: '#c8875a',
    accent_contrast: '#1d1a17',
  };

  describe('Classic Theme', () => {
    const pairs: TokenPair[] = [
      // Body text on primary
      {
        text: { name: 'text_primary', value: classicTheme.text_primary },
        background: { name: 'bg_primary', value: classicTheme.bg_primary },
      },
      // Body text on secondary
      {
        text: { name: 'text_primary', value: classicTheme.text_primary },
        background: { name: 'bg_secondary', value: classicTheme.bg_secondary },
      },
      // Body text on tertiary
      {
        text: { name: 'text_primary', value: classicTheme.text_primary },
        background: { name: 'bg_tertiary', value: classicTheme.bg_tertiary },
      },
      // Secondary text on primary
      {
        text: { name: 'text_secondary', value: classicTheme.text_secondary },
        background: { name: 'bg_primary', value: classicTheme.bg_primary },
      },
      // Secondary text on secondary
      {
        text: { name: 'text_secondary', value: classicTheme.text_secondary },
        background: { name: 'bg_secondary', value: classicTheme.bg_secondary },
      },
      // Border on primary
      {
        text: { name: 'border', value: classicTheme.border },
        background: { name: 'bg_primary', value: classicTheme.bg_primary },
      },
    ];

    pairs.forEach((pair) => {
      it(`${pair.text.name} on ${pair.background.name} >= 4.5:1`, () => {
        const ratio = getContrastRatio(pair.text.value, pair.background.value);
        expect(ratio).not.toBeNull();
        if (ratio !== null) {
          expect(ratio).toBeGreaterThanOrEqual(
            4.5,
            `Contrast ${ratio.toFixed(2)}:1 is below 4.5:1 minimum. ` +
              `Text: ${pair.text.value} on ${pair.background.value}`
          );
        }
      });
    });
  });

  describe('Haunted Theme - Ink Palette', () => {
    const pairs: TokenPair[] = [
      // Body text on surfaces
      {
        text: { name: 'text_primary', value: inkTheme.text_primary },
        background: { name: 'bg_primary', value: inkTheme.bg_primary },
      },
      {
        text: { name: 'text_primary', value: inkTheme.text_primary },
        background: { name: 'bg_secondary', value: inkTheme.bg_secondary },
      },
      {
        text: { name: 'text_primary', value: inkTheme.text_primary },
        background: { name: 'bg_tertiary', value: inkTheme.bg_tertiary },
      },
      // Secondary text on surfaces
      {
        text: { name: 'text_secondary', value: inkTheme.text_secondary },
        background: { name: 'bg_primary', value: inkTheme.bg_primary },
      },
      {
        text: { name: 'text_secondary', value: inkTheme.text_secondary },
        background: { name: 'bg_secondary', value: inkTheme.bg_secondary },
      },
      // Accent text on accent background (button)
      {
        text: { name: 'accent_contrast', value: inkTheme.accent_contrast },
        background: { name: 'accent', value: inkTheme.accent },
      },
    ];

    pairs.forEach((pair) => {
      it(`${pair.text.name} on ${pair.background.name} >= 4.5:1`, () => {
        const ratio = getContrastRatio(pair.text.value, pair.background.value);
        expect(ratio).not.toBeNull();
        if (ratio !== null) {
          expect(ratio).toBeGreaterThanOrEqual(
            4.5,
            `Contrast ${ratio.toFixed(2)}:1 is below 4.5:1 minimum. ` +
              `Text: ${pair.text.value} on ${pair.background.value}`
          );
        }
      });
    });
  });

  describe('Haunted Theme - Navy Palette', () => {
    const pairs: TokenPair[] = [
      {
        text: { name: 'text_primary', value: navyTheme.text_primary },
        background: { name: 'bg_primary', value: navyTheme.bg_primary },
      },
      {
        text: { name: 'text_primary', value: navyTheme.text_primary },
        background: { name: 'bg_secondary', value: navyTheme.bg_secondary },
      },
      {
        text: { name: 'text_secondary', value: navyTheme.text_secondary },
        background: { name: 'bg_primary', value: navyTheme.bg_primary },
      },
      {
        text: { name: 'accent_contrast', value: navyTheme.accent_contrast },
        background: { name: 'accent', value: navyTheme.accent },
      },
    ];

    pairs.forEach((pair) => {
      it(`${pair.text.name} on ${pair.background.name} >= 4.5:1`, () => {
        const ratio = getContrastRatio(pair.text.value, pair.background.value);
        expect(ratio).not.toBeNull();
        if (ratio !== null) {
          expect(ratio).toBeGreaterThanOrEqual(
            4.5,
            `Contrast ${ratio.toFixed(2)}:1 is below 4.5:1 minimum. ` +
              `Text: ${pair.text.value} on ${pair.background.value}`
          );
        }
      });
    });
  });

  describe('Haunted Theme - Graphite Palette', () => {
    const pairs: TokenPair[] = [
      {
        text: { name: 'text_primary', value: graphiteTheme.text_primary },
        background: { name: 'bg_primary', value: graphiteTheme.bg_primary },
      },
      {
        text: { name: 'text_primary', value: graphiteTheme.text_primary },
        background: { name: 'bg_secondary', value: graphiteTheme.bg_secondary },
      },
      {
        text: { name: 'text_secondary', value: graphiteTheme.text_secondary },
        background: { name: 'bg_primary', value: graphiteTheme.bg_primary },
      },
      {
        text: { name: 'accent_contrast', value: graphiteTheme.accent_contrast },
        background: { name: 'accent', value: graphiteTheme.accent },
      },
    ];

    pairs.forEach((pair) => {
      it(`${pair.text.name} on ${pair.background.name} >= 4.5:1`, () => {
        const ratio = getContrastRatio(pair.text.value, pair.background.value);
        expect(ratio).not.toBeNull();
        if (ratio !== null) {
          expect(ratio).toBeGreaterThanOrEqual(
            4.5,
            `Contrast ${ratio.toFixed(2)}:1 is below 4.5:1 minimum. ` +
              `Text: ${pair.text.value} on ${pair.background.value}`
          );
        }
      });
    });
  });
});
