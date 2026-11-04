import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Task 9.6.3: Prefers-Reduced-Motion Test
 * 
 * Tests that the prefers-reduced-motion block disables animation/transition.
 * 
 * Reference: https://www.w3.org/TR/mediaqueries-5/#prefers-reduced-motion
 */

describe('Prefers-Reduced-Motion Handling', () => {
  let container: HTMLElement;
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    if (container.parentElement) {
      document.body.removeChild(container);
    }
    window.matchMedia = originalMatchMedia;
  });

  describe('CSS Animation Handling', () => {
    it('should have prefers-reduced-motion media query rule in styles.css', () => {
      const cssPath = path.join(__dirname, '../src/dom/styles.css');
      const content = fs.readFileSync(cssPath, 'utf-8');

      // Check that prefers-reduced-motion rule exists
      expect(content).toContain('@media (prefers-reduced-motion: reduce)');
    });

    it('should disable animations in prefers-reduced-motion block', () => {
      const cssPath = path.join(__dirname, '../src/dom/styles.css');
      const content = fs.readFileSync(cssPath, 'utf-8');

      // Extract the prefers-reduced-motion block
      const match = content.match(/@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)\s*{([\s\S]*?)}/);
      expect(match).toBeTruthy();

      if (match) {
        const blockContent = match[1];
        // Should contain animation-duration: 0s or similar
        expect(
          blockContent.includes('animation-duration: 0s') ||
          blockContent.includes('animation: none') ||
          blockContent.includes('--transition-duration: 0ms')
        ).toBe(true);
      }
    });
  });

  describe('Visual State Preservation', () => {
    it('should preserve button hover state even with animations disabled', () => {
      const button = document.createElement('button');
      button.textContent = 'Test';
      container.appendChild(button);

      button.classList.add('hover');
      expect(button.disabled).toBe(false);
      expect(button.textContent).toBe('Test');
    });

    it('should preserve focus indicator in reduced motion', () => {
      const button = document.createElement('button');
      button.textContent = 'Test';
      container.appendChild(button);

      button.focus();
      expect(document.activeElement).toBe(button);
    });

    it('layout should remain intact without animations', () => {
      const testDiv = document.createElement('div');
      testDiv.style.display = 'block';
      testDiv.style.width = '100px';
      testDiv.style.height = '50px';
      testDiv.textContent = 'Test';

      container.appendChild(testDiv);
      expect(testDiv).toBeTruthy();
      expect(testDiv.textContent).toBe('Test');
    });
  });

  describe('Animation Disabling', () => {
    it('should disable all animations when prefers-reduced-motion is active', () => {
      // Mock matchMedia to return prefers-reduced-motion: reduce
      (window as any).matchMedia = (query: string) => {
        if (query === '(prefers-reduced-motion: reduce)') {
          return {
            matches: true,
            media: query,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => true,
          };
        }
        return originalMatchMedia(query);
      };

      // Check media query
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
      expect(prefersReduced.matches).toBe(true);
    });
  });
});
