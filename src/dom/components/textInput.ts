/**
 * Task 7.11: Styled text input component.
 */

import { createElement, addEventListener } from '../utils/dom'

export class TextInputComponent {
  private element: HTMLInputElement | HTMLTextAreaElement
  private type: 'input' | 'textarea'

  constructor(type: 'input' | 'textarea' = 'input', options: { placeholder?: string; value?: string } = {}) {
    this.type = type

    if (type === 'textarea') {
      this.element = createElement('textarea', {
        attributes: {
          placeholder: options.placeholder || '',
          rows: '5'
        }
      }) as HTMLTextAreaElement
    } else {
      this.element = createElement('input', {
        attributes: {
          type: 'text',
          placeholder: options.placeholder || ''
        }
      }) as HTMLInputElement
    }

    if (options.value) {
      this.element.value = options.value
    }
  }

  getElement(): HTMLInputElement | HTMLTextAreaElement {
    return this.element
  }

  getValue(): string {
    return this.element.value
  }

  setValue(value: string): void {
    this.element.value = value
  }

  setPlaceholder(text: string): void {
    this.element.placeholder = text
  }

  onInput(handler: (value: string) => void): void {
    addEventListener(this.element, 'input', () => {
      handler(this.element.value)
    })
  }

  onChange(handler: (value: string) => void): void {
    addEventListener(this.element, 'change', () => {
      handler(this.element.value)
    })
  }

  focus(): void {
    this.element.focus()
  }
}
