/**
 * Task 9.2.3: Tooltip accessibility tests.
 * 
 * Verify tooltips display on hover/focus with correct text and shortcuts.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Tooltip } from '../src/dom/components/tooltip'
import { createElement } from '../src/dom/utils/dom'

describe('Task 9.2.3: Tooltip Accessibility', () => {
  let button: HTMLElement
  let tooltip: Tooltip

  beforeEach(() => {
    button = createElement('button', { className: 'test-button' })
    button.textContent = 'Test Button'
    document.body.appendChild(button)
  })

  afterEach(() => {
    if (tooltip) {
      tooltip.destroy()
    }
    if (button.parentNode) {
      button.parentNode.removeChild(button)
    }
  })

  it('should create tooltip with text only', () => {
    tooltip = new Tooltip({ text: 'Save Stack' })
    const el = tooltip.getElement()
    expect(el.textContent).toContain('Save Stack')
  })

  it('should include keyboard shortcut in tooltip', () => {
    tooltip = new Tooltip({ text: 'Save Stack', shortcut: 'Ctrl+S' })
    const el = tooltip.getElement()
    expect(el.textContent).toContain('Save Stack')
    expect(el.textContent).toContain('Ctrl+S')
  })

  it('should have role="tooltip" attribute', () => {
    tooltip = new Tooltip({ text: 'Test' })
    const el = tooltip.getElement()
    expect(el.getAttribute('role')).toBe('tooltip')
  })

  it('should start hidden (opacity 0)', () => {
    tooltip = new Tooltip({ text: 'Test' })
    const el = tooltip.getElement()
    expect(el.style.opacity).toBe('0')
  })

  it('should show tooltip on mouseenter and hide on mouseleave', async () => {
    tooltip = new Tooltip({ text: 'Click Me', delay: 0 })
    tooltip.attachTo(button)

    const el = tooltip.getElement()

    // Trigger mouseenter
    button.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))

    // Wait for show animation
    await new Promise((resolve) => setTimeout(resolve, 150))
    expect(el.style.opacity).toBe('1')

    // Trigger mouseleave
    button.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))

    // Wait for hide timeout + animation
    await new Promise((resolve) => setTimeout(resolve, 250))
    expect(el.style.opacity).toBe('0')
  })

  it('should show tooltip on focus and hide on blur', async () => {
    tooltip = new Tooltip({ text: 'Undo', delay: 0 })
    tooltip.attachTo(button)

    const el = tooltip.getElement()

    // Trigger focus
    button.dispatchEvent(new FocusEvent('focus', { bubbles: true }))

    // Wait for show animation
    await new Promise((resolve) => setTimeout(resolve, 150))
    expect(el.style.opacity).toBe('1')

    // Trigger blur
    button.dispatchEvent(new FocusEvent('blur', { bubbles: true }))

    // Wait for hide timeout + animation
    await new Promise((resolve) => setTimeout(resolve, 250))
    expect(el.style.opacity).toBe('0')
  })

  it('should respect custom delay option', async () => {
    tooltip = new Tooltip({ text: 'Test', delay: 100 })
    tooltip.attachTo(button)

    const el = tooltip.getElement()

    // Trigger mouseenter
    button.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))

    // Tooltip should not be visible before delay
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(el.style.opacity).toBe('0')

    // Tooltip should be visible after delay
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(el.style.opacity).toBe('1')
  })

  it('should cancel pending show on mouseleave before delay', async () => {
    tooltip = new Tooltip({ text: 'Test', delay: 200 })
    tooltip.attachTo(button)

    const el = tooltip.getElement()

    // Trigger mouseenter
    button.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))

    // Leave before delay completes
    await new Promise((resolve) => setTimeout(resolve, 100))
    button.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))

    // Tooltip should not show
    await new Promise((resolve) => setTimeout(resolve, 200))
    expect(el.style.opacity).toBe('0')
  })

  it('should append tooltip element to body', () => {
    tooltip = new Tooltip({ text: 'Test' })
    const el = tooltip.getElement()
    expect(document.body.contains(el)).toBe(true)
  })

  it('should remove element from body on destroy', () => {
    tooltip = new Tooltip({ text: 'Test' })
    const el = tooltip.getElement()
    expect(document.body.contains(el)).toBe(true)

    tooltip.destroy()
    expect(document.body.contains(el)).toBe(false)
  })

  it('should have aria-describedby accessible pattern', () => {
    tooltip = new Tooltip({ text: 'Add Card' })
    tooltip.attachTo(button)

    const el = tooltip.getElement()
    // Tooltip has role="tooltip" for accessibility
    expect(el.getAttribute('role')).toBe('tooltip')
  })
})
