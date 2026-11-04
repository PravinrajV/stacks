/**
 * Task 7.9: DOM utility functions.
 * 
 * Centralized DOM manipulation helpers to prevent direct innerHTML use with user content.
 * Prevents XSS vulnerabilities.
 */

export interface CreateElementOptions {
  id?: string
  className?: string | string[]
  attributes?: Record<string, string>
  children?: (HTMLElement | Text)[]
}

/**
 * Create element with options, safely avoiding innerHTML with untrusted content.
 */
export function createElement(
  tag: string,
  options: CreateElementOptions = {}
): HTMLElement {
  const element = document.createElement(tag)

  if (options.id) {
    element.id = options.id
  }

  if (options.className) {
    const classArray = Array.isArray(options.className) ? options.className : [options.className]
    const classes = classArray
      .flatMap(c => c.split(/\s+/))
      .filter(c => c.length > 0)
    if (classes.length > 0) {
      element.classList.add(...classes)
    }
  }

  if (options.attributes) {
    for (const [key, value] of Object.entries(options.attributes)) {
      element.setAttribute(key, value)
    }
  }

  if (options.children) {
    for (const child of options.children) {
      element.appendChild(child)
    }
  }

  return element
}

/**
 * Set multiple attributes on an element.
 */
export function setAttributes(element: HTMLElement, attrs: Record<string, string>): void {
  for (const [key, value] of Object.entries(attrs)) {
    element.setAttribute(key, value)
  }
}

/**
 * Add event listener with automatic cleanup support.
 */
export function addEventListener(
  element: HTMLElement,
  event: string,
  handler: EventListener,
  options?: boolean | AddEventListenerOptions
): () => void {
  element.addEventListener(event, handler, options)
  return () => element.removeEventListener(event, handler, options)
}

/**
 * Remove all child nodes from element.
 */
export function removeAllChildren(element: HTMLElement): void {
  while (element.firstChild) {
    element.removeChild(element.firstChild)
  }
}

/**
 * Create text node (safe for user content).
 */
export function createTextNode(text: string): Text {
  return document.createTextNode(text)
}

/**
 * Set element's text content (safe for user content).
 */
export function setTextContent(element: HTMLElement, text: string): void {
  element.textContent = text
}

/**
 * Set element's CSS classes.
 */
export function setClasses(element: HTMLElement, classes: Record<string, boolean>): void {
  for (const [className, shouldAdd] of Object.entries(classes)) {
    // Split class names on whitespace and filter empties
    const tokens = className.split(/\s+/).filter(c => c.length > 0)
    for (const token of tokens) {
      if (shouldAdd) {
        element.classList.add(token)
      } else {
        element.classList.remove(token)
      }
    }
  }
}

/**
 * Set element's inline styles.
 */
export function setStyles(element: HTMLElement, styles: Partial<CSSStyleDeclaration>): void {
  for (const [key, value] of Object.entries(styles)) {
    if (value !== undefined && value !== null) {
      ;(element.style as Record<string, any>)[key] = value
    }
  }
}

/**
 * Get element's rect (position and size).
 */
export function getElementRect(element: HTMLElement): DOMRect {
  return element.getBoundingClientRect()
}

/**
 * Check if element is visible in viewport.
 */
export function isVisible(element: HTMLElement): boolean {
  const rect = getElementRect(element)
  return (
    rect.top < window.innerHeight &&
    rect.bottom > 0 &&
    rect.left < window.innerWidth &&
    rect.right > 0
  )
}

/**
 * Find first ancestor matching selector.
 */
export function findAncestor(
  element: HTMLElement,
  selector: string
): HTMLElement | null {
  let current: HTMLElement | null = element.parentElement
  while (current) {
    if (current.matches(selector)) {
      return current
    }
    current = current.parentElement
  }
  return null
}

/**
 * Delegate event handler to matching children.
 */
export function delegateEvent(
  parent: HTMLElement,
  selector: string,
  event: string,
  handler: (target: HTMLElement, event: Event) => void
): () => void {
  const listener = (e: Event) => {
    const target = e.target as HTMLElement
    if (target && target.matches(selector)) {
      handler(target, e)
    }
  }
  parent.addEventListener(event, listener)
  return () => parent.removeEventListener(event, listener)
}
