/**
 * Task 9.2.3: Tooltip system for toolbar buttons.
 * 
 * On button hover, show tooltip with action name and keyboard shortcut.
 * Tooltip positioned above button, themed (glass morphism in Haunted).
 * Fade in/out (100ms) with slight delay (300ms) on hover.
 */

import { createElement, setTextContent, setStyles, addEventListener } from '../utils/dom'

export interface TooltipOptions {
  text: string
  shortcut?: string
  delay?: number
  duration?: number
}

export class Tooltip {
  private element: HTMLElement
  private timeout: number | null = null
  private hideTimeout: number | null = null
  private readonly delay: number
  private readonly duration: number

  constructor(options: TooltipOptions) {
    this.delay = options.delay ?? 300
    this.duration = options.duration ?? 100

    this.element = createElement('div', {
      className: 'tooltip'
    })
    this.element.setAttribute('role', 'tooltip')

    const content = options.shortcut ? `${options.text} (${options.shortcut})` : options.text
    setTextContent(this.element, content)

    // Hidden by default
    setStyles(this.element, {
      opacity: '0',
      pointerEvents: 'none',
      transition: `opacity ${this.duration}ms ease-out`,
      position: 'absolute',
      zIndex: '10000',
      bottom: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      marginBottom: '8px',
      whiteSpace: 'nowrap'
    })

    document.body.appendChild(this.element)
  }

  /**
   * Attach tooltip to a button element. Shows on hover/focus, hides on blur/mouseleave.
   */
  attachTo(button: HTMLElement): void {
    addEventListener(button, 'mouseenter', () => {
      if (this.hideTimeout !== null) {
        clearTimeout(this.hideTimeout)
        this.hideTimeout = null
      }

      if (this.timeout === null) {
        this.timeout = window.setTimeout(() => {
          this.show(button)
          this.timeout = null
        }, this.delay)
      }
    })

    addEventListener(button, 'mouseleave', () => {
      if (this.timeout !== null) {
        clearTimeout(this.timeout)
        this.timeout = null
      }
      this.hideWithDelay()
    })

    addEventListener(button, 'focus', () => {
      if (this.hideTimeout !== null) {
        clearTimeout(this.hideTimeout)
        this.hideTimeout = null
      }

      if (this.timeout === null) {
        this.timeout = window.setTimeout(() => {
          this.show(button)
          this.timeout = null
        }, this.delay)
      }
    })

    addEventListener(button, 'blur', () => {
      if (this.timeout !== null) {
        clearTimeout(this.timeout)
        this.timeout = null
      }
      this.hideWithDelay()
    })
  }

  private show(button: HTMLElement): void {
    const buttonRect = button.getBoundingClientRect()
    const tooltipRect = this.element.getBoundingClientRect()

    // Position tooltip above button, centered
    this.element.style.left = `${buttonRect.left + buttonRect.width / 2}px`
    this.element.style.top = `${buttonRect.top - 8}px`

    // Ensure tooltip stays within viewport horizontally
    const tooltipWidth = tooltipRect.width
    const leftEdge = buttonRect.left + buttonRect.width / 2 - tooltipWidth / 2
    if (leftEdge < 0) {
      this.element.style.left = `8px`
    } else if (leftEdge + tooltipWidth > window.innerWidth) {
      this.element.style.left = `${window.innerWidth - tooltipWidth - 8}px`
    }

    setStyles(this.element, {
      opacity: '1',
      pointerEvents: 'auto'
    })
  }

  private hideWithDelay(): void {
    if (this.hideTimeout !== null) {
      clearTimeout(this.hideTimeout)
    }

    this.hideTimeout = window.setTimeout(() => {
      setStyles(this.element, {
        opacity: '0',
        pointerEvents: 'none'
      })
      this.hideTimeout = null
    }, this.duration)
  }

  destroy(): void {
    if (this.timeout !== null) clearTimeout(this.timeout)
    if (this.hideTimeout !== null) clearTimeout(this.hideTimeout)
    if (this.element.parentNode) {
      this.element.parentNode.removeChild(this.element)
    }
  }

  getElement(): HTMLElement {
    return this.element
  }
}
