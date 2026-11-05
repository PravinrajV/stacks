/**
 * Vitest setup file to patch DOMTokenList to match real browser behavior.
 * Throws InvalidCharacterError for empty or whitespace-containing tokens,
 * just like real browsers do.
 * 
 * Also mock matchMedia to provide consistent behavior in tests.
 * By default, prefers-reduced-motion returns false (animations enabled).
 * Tests can override this by setting (window as any).__TEST_REDUCE_MOTION__ = true
 */

import { beforeAll } from 'vitest'

beforeAll(() => {
  // Only patch if DOMTokenList exists (it will in happy-dom)
  if (typeof DOMTokenList !== 'undefined') {
    // Store original methods
    const originalAdd = DOMTokenList.prototype.add
    const originalRemove = DOMTokenList.prototype.remove
    const originalToggle = DOMTokenList.prototype.toggle

    // Helper to validate tokens
    function validateToken(token: string): void {
      if (token === '') {
        throw new DOMException(
          'Failed to execute on \'DOMTokenList\': The token provided must not be empty.',
          'InvalidCharacterError'
        )
      }
      if (/\s/.test(token)) {
        throw new DOMException(
          'Failed to execute on \'DOMTokenList\': The token provided contains HTML space characters.',
          'InvalidCharacterError'
        )
      }
    }

    // Patch add
    DOMTokenList.prototype.add = function (...tokens: string[]): void {
      for (const token of tokens) {
        validateToken(token)
      }
      return originalAdd.apply(this, tokens as any)
    }

    // Patch remove
    DOMTokenList.prototype.remove = function (...tokens: string[]): void {
      for (const token of tokens) {
        validateToken(token)
      }
      return originalRemove.apply(this, tokens as any)
    }

    // Patch toggle
    DOMTokenList.prototype.toggle = function (token: string, force?: boolean): boolean {
      validateToken(token)
      return originalToggle.call(this, token, force)
    }
  }

  // Mock matchMedia to provide consistent behavior in tests
  window.matchMedia = (query: string) => {
    const testReducedMotion = (window as any).__TEST_REDUCE_MOTION__ || false
    const isReducedMotion = query === '(prefers-reduced-motion: reduce)' && testReducedMotion
    return {
      matches: isReducedMotion,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => true
    } as MediaQueryList
  }
})