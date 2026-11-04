/**
 * Task 7.10: Styled button wrapper component.
 */

import { createElement, setTextContent, setClasses, addEventListener } from '../utils/dom'

export class ButtonComponent {
  private element: HTMLButtonElement

  constructor(text: string, onClick?: () => void, icon?: SVGElement) {
    this.element = createElement('button', {
      className: 'button'
    }) as HTMLButtonElement

    // Add icon if provided
    if (icon) {
      icon.setAttribute('width', '16')
      icon.setAttribute('height', '16')
      this.element.appendChild(icon)
    }

    // Create text node
    const textSpan = createElement('span')
    setTextContent(textSpan, text)
    this.element.appendChild(textSpan)

    if (onClick) {
      addEventListener(this.element, 'click', () => onClick())
    }
  }

  getElement(): HTMLButtonElement {
    return this.element
  }

  setText(text: string): void {
    // Update text content in the span
    const span = this.element.querySelector('span')
    if (span) {
      setTextContent(span, text)
    } else {
      setTextContent(this.element, text)
    }
  }

  setDisabled(disabled: boolean): void {
    this.element.disabled = disabled
  }

  onClick(handler: () => void): void {
    addEventListener(this.element, 'click', () => handler())
  }
}
