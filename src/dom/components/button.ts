/**
 * Task 7.10: Styled button wrapper component.
 */

import { createElement, setTextContent, setClasses, addEventListener } from '../utils/dom'

export class ButtonComponent {
  private element: HTMLButtonElement

  constructor(text: string, onClick?: () => void) {
    this.element = createElement('button', {
      className: 'button'
    }) as HTMLButtonElement

    setTextContent(this.element, text)

    if (onClick) {
      addEventListener(this.element, 'click', () => onClick())
    }
  }

  getElement(): HTMLButtonElement {
    return this.element
  }

  setText(text: string): void {
    setTextContent(this.element, text)
  }

  setDisabled(disabled: boolean): void {
    this.element.disabled = disabled
  }

  onClick(handler: () => void): void {
    addEventListener(this.element, 'click', () => handler())
  }
}
