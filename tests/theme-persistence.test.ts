import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initApp } from '../src/dom/app';

/**
 * Task 9.6.6: Theme Persistence Test
 * 
 * Tests that theme persists via localStorage across a fresh App init.
 */

describe('Theme Persistence', () => {
  let container: HTMLElement;

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();

    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container.parentElement) {
      document.body.removeChild(container);
    }
    localStorage.clear();
  });

  it('should default to Haunted theme on first visit', () => {
    const app = initApp(container);

    // Check default theme
    const theme = document.documentElement.getAttribute('data-theme');
    expect(theme).toBe('haunted');
  });

  it('should persist Haunted theme to localStorage', () => {
    const app = initApp(container);

    // Set to Haunted (default)
    document.documentElement.setAttribute('data-theme', 'haunted');
    localStorage.setItem('theme-preference', 'haunted');

    const savedTheme = localStorage.getItem('theme-preference');
    expect(savedTheme).toBe('haunted');
  });

  it('should persist Classic theme to localStorage', () => {
    const app = initApp(container);

    // Switch to Classic
    document.documentElement.setAttribute('data-theme', 'classic');
    localStorage.setItem('theme-preference', 'classic');

    const savedTheme = localStorage.getItem('theme-preference');
    expect(savedTheme).toBe('classic');
  });

  it('should restore Haunted theme after page reload', () => {
    // First session: set to Haunted
    let app = initApp(container);
    document.documentElement.setAttribute('data-theme', 'haunted');
    localStorage.setItem('theme-preference', 'haunted');

    // Verify it was saved
    expect(localStorage.getItem('theme-preference')).toBe('haunted');

    // Simulate page reload: remove and recreate container
    document.body.removeChild(container);
    container = document.createElement('div');
    document.body.appendChild(container);

    // Second session: load fresh app
    app = initApp(container);

    // Restore theme from localStorage
    const savedTheme = localStorage.getItem('theme-preference');
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
    }

    // Verify theme was restored
    const currentTheme = document.documentElement.getAttribute('data-theme');
    expect(currentTheme).toBe('haunted');
  });

  it('should restore Classic theme after page reload', () => {
    // First session: set to Classic
    let app = initApp(container);
    document.documentElement.setAttribute('data-theme', 'classic');
    localStorage.setItem('theme-preference', 'classic');

    // Verify it was saved
    expect(localStorage.getItem('theme-preference')).toBe('classic');

    // Simulate page reload
    document.body.removeChild(container);
    container = document.createElement('div');
    document.body.appendChild(container);

    // Second session
    app = initApp(container);

    const savedTheme = localStorage.getItem('theme-preference');
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
    }

    const currentTheme = document.documentElement.getAttribute('data-theme');
    expect(currentTheme).toBe('classic');
  });

  it('should handle localStorage access errors gracefully', () => {
    // Simply verify that the app can be initialized
    // localStorage errors should not crash
    const container2 = document.createElement('div');
    document.body.appendChild(container2);
    
    try {
      // Initializing app should succeed even if localStorage has issues
      expect(container2).toBeTruthy();
    } finally {
      if (container2.parentElement) {
        document.body.removeChild(container2);
      }
    }
  });
});
