/**
 * Task 9.5.2-9.5.4: Styled dialogs replacing native prompts/confirms/alerts.
 * 
 * Custom modal dialogs for:
 * - Alert (styled alert replacing window.alert())
 * - Confirm (styled confirm replacing window.confirm())
 * - Prompt (styled text input dialog replacing window.prompt())
 * 
 * All themed (Haunted or Classic), with focus management, keyboard support.
 */

import { createElement, setTextContent, removeAllChildren, addEventListener } from '../utils/dom'

export class StyledAlert {
  private backdrop: HTMLElement
  private modal: HTMLElement
  private previousFocusedElement: HTMLElement | null = null

  constructor() {
    this.backdrop = createElement('div', { className: 'modal-backdrop' })
    this.backdrop.setAttribute('aria-hidden', 'true')
    this.backdrop.style.display = 'none'

    this.modal = createElement('div', { className: 'modal' })
    this.modal.setAttribute('role', 'alertdialog')
    this.modal.setAttribute('aria-modal', 'true')
    this.backdrop.appendChild(this.modal)

    // Close on backdrop click
    addEventListener(this.backdrop, 'click', (e) => {
      if (e.target === this.backdrop) {
        this.close()
      }
    })

    // Escape to close
    addEventListener(this.backdrop, 'keydown', (e: Event) => {
      const keyEvent = e as KeyboardEvent
      if (keyEvent.key === 'Escape') {
        keyEvent.preventDefault()
        this.close()
      }
    })

    document.body.appendChild(this.backdrop)
  }

  show(message: string, title: string = 'Alert'): Promise<void> {
    return new Promise((resolve) => {
      this.previousFocusedElement = document.activeElement as HTMLElement

      removeAllChildren(this.modal)

      // Title
      const titleEl = createElement('div', { className: 'modal-title' })
      titleEl.setAttribute('id', 'alert-title')
      setTextContent(titleEl, title)
      this.modal.appendChild(titleEl)

      // Message
      const messageEl = createElement('div', { className: 'modal-message' })
      messageEl.setAttribute('role', 'alert')
      messageEl.setAttribute('aria-live', 'assertive')
      setTextContent(messageEl, message)
      this.modal.appendChild(messageEl)

      // Button
      const buttonsContainer = createElement('div', { className: 'modal-buttons' })
      const okBtn = createElement('button', { className: 'button' }) as HTMLButtonElement
      setTextContent(okBtn, 'OK')

      addEventListener(okBtn, 'click', () => {
        this.close()
        resolve()
      })

      addEventListener(okBtn, 'keydown', (e: Event) => {
        const keyEvent = e as KeyboardEvent
        if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
          keyEvent.preventDefault()
          this.close()
          resolve()
        }
      })

      buttonsContainer.appendChild(okBtn)
      this.modal.appendChild(buttonsContainer)

      this.backdrop.style.display = 'flex'
      this.backdrop.setAttribute('aria-hidden', 'false')
      this.modal.setAttribute('aria-labelledby', 'alert-title')

      okBtn.focus()
    })
  }

  private close(): void {
    this.backdrop.style.display = 'none'
    this.backdrop.setAttribute('aria-hidden', 'true')

    if (this.previousFocusedElement && document.body.contains(this.previousFocusedElement)) {
      this.previousFocusedElement.focus()
    }
  }

  getElement(): HTMLElement {
    return this.backdrop
  }
}

export class StyledConfirm {
  private backdrop: HTMLElement
  private modal: HTMLElement
  private previousFocusedElement: HTMLElement | null = null

  constructor() {
    this.backdrop = createElement('div', { className: 'modal-backdrop' })
    this.backdrop.setAttribute('aria-hidden', 'true')
    this.backdrop.style.display = 'none'

    this.modal = createElement('div', { className: 'modal' })
    this.modal.setAttribute('role', 'alertdialog')
    this.modal.setAttribute('aria-modal', 'true')
    this.backdrop.appendChild(this.modal)

    // Close on backdrop click (defaults to false)
    addEventListener(this.backdrop, 'click', (e) => {
      if (e.target === this.backdrop) {
        this.close(false)
      }
    })

    // Escape closes with false
    addEventListener(this.backdrop, 'keydown', (e: Event) => {
      const keyEvent = e as KeyboardEvent
      if (keyEvent.key === 'Escape') {
        keyEvent.preventDefault()
        this.close(false)
      }
    })

    document.body.appendChild(this.backdrop)
  }

  show(message: string, title: string = 'Confirm', dangerMode: boolean = false): Promise<boolean> {
    return new Promise((resolve) => {
      this.previousFocusedElement = document.activeElement as HTMLElement

      removeAllChildren(this.modal)

      // Title
      const titleEl = createElement('div', { className: 'modal-title' })
      titleEl.setAttribute('id', 'confirm-title')
      setTextContent(titleEl, title)
      this.modal.appendChild(titleEl)

      // Message
      const messageEl = createElement('div', { className: 'modal-message' })
      setTextContent(messageEl, message)
      this.modal.appendChild(messageEl)

      // Buttons
      const buttonsContainer = createElement('div', { className: 'modal-buttons' })

      // Cancel button (secondary)
      const cancelBtn = createElement('button', { className: 'button' }) as HTMLButtonElement
      setTextContent(cancelBtn, 'Cancel')
      addEventListener(cancelBtn, 'click', () => {
        this.close(false)
        resolve(false)
      })
      addEventListener(cancelBtn, 'keydown', (e: Event) => {
        const keyEvent = e as KeyboardEvent
        if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
          keyEvent.preventDefault()
          this.close(false)
          resolve(false)
        }
      })
      buttonsContainer.appendChild(cancelBtn)

      // Confirm button (primary or danger)
      const confirmBtn = createElement('button', {
        className: dangerMode ? 'button button-danger' : 'button button-primary'
      }) as HTMLButtonElement
      setTextContent(confirmBtn, dangerMode ? 'Delete' : 'Confirm')

      addEventListener(confirmBtn, 'click', () => {
        this.close(true)
        resolve(true)
      })
      addEventListener(confirmBtn, 'keydown', (e: Event) => {
        const keyEvent = e as KeyboardEvent
        if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
          keyEvent.preventDefault()
          this.close(true)
          resolve(true)
        }
      })
      buttonsContainer.appendChild(confirmBtn)

      this.modal.appendChild(buttonsContainer)

      this.backdrop.style.display = 'flex'
      this.backdrop.setAttribute('aria-hidden', 'false')
      this.modal.setAttribute('aria-labelledby', 'confirm-title')

      // Focus cancel button by default (safer default)
      cancelBtn.focus()
    })
  }

  private close(value: boolean): void {
    this.backdrop.style.display = 'none'
    this.backdrop.setAttribute('aria-hidden', 'true')

    if (this.previousFocusedElement && document.body.contains(this.previousFocusedElement)) {
      this.previousFocusedElement.focus()
    }
  }

  getElement(): HTMLElement {
    return this.backdrop
  }
}

export class StyledPrompt {
  private backdrop: HTMLElement
  private modal: HTMLElement
  private previousFocusedElement: HTMLElement | null = null

  constructor() {
    this.backdrop = createElement('div', { className: 'modal-backdrop' })
    this.backdrop.setAttribute('aria-hidden', 'true')
    this.backdrop.style.display = 'none'

    this.modal = createElement('div', { className: 'modal' })
    this.modal.setAttribute('role', 'dialog')
    this.modal.setAttribute('aria-modal', 'true')
    this.backdrop.appendChild(this.modal)

    // Close on backdrop click (defaults to null)
    addEventListener(this.backdrop, 'click', (e) => {
      if (e.target === this.backdrop) {
        this.close(null)
      }
    })

    // Escape closes with null
    addEventListener(this.backdrop, 'keydown', (e: Event) => {
      const keyEvent = e as KeyboardEvent
      if (keyEvent.key === 'Escape') {
        keyEvent.preventDefault()
        this.close(null)
      }
    })

    document.body.appendChild(this.backdrop)
  }

  show(message: string, defaultValue: string = '', title: string = 'Input'): Promise<string | null> {
    return new Promise((resolve) => {
      this.previousFocusedElement = document.activeElement as HTMLElement

      removeAllChildren(this.modal)

      // Title
      const titleEl = createElement('div', { className: 'modal-title' })
      titleEl.setAttribute('id', 'prompt-title')
      setTextContent(titleEl, title)
      this.modal.appendChild(titleEl)

      // Message
      const messageEl = createElement('div', { className: 'modal-message' })
      setTextContent(messageEl, message)
      this.modal.appendChild(messageEl)

      // Input field
      const inputContainer = createElement('div', { className: 'prompt-input-container' })
      const input = createElement('input', {
        className: 'inspector-input'
      }) as HTMLInputElement
      input.type = 'text'
      input.value = defaultValue
      input.setAttribute('aria-label', message)

      // Submit on Enter
      addEventListener(input, 'keydown', (e: Event) => {
        const keyEvent = e as KeyboardEvent
        if (keyEvent.key === 'Enter') {
          keyEvent.preventDefault()
          this.close(input.value)
          resolve(input.value)
        }
      })

      inputContainer.appendChild(input)
      this.modal.appendChild(inputContainer)

      // Buttons
      const buttonsContainer = createElement('div', { className: 'modal-buttons' })

      // Cancel button
      const cancelBtn = createElement('button', { className: 'button' }) as HTMLButtonElement
      setTextContent(cancelBtn, 'Cancel')
      addEventListener(cancelBtn, 'click', () => {
        this.close(null)
        resolve(null)
      })
      addEventListener(cancelBtn, 'keydown', (e: Event) => {
        const keyEvent = e as KeyboardEvent
        if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
          keyEvent.preventDefault()
          this.close(null)
          resolve(null)
        }
      })
      buttonsContainer.appendChild(cancelBtn)

      // Save button
      const saveBtn = createElement('button', { className: 'button button-primary' }) as HTMLButtonElement
      setTextContent(saveBtn, 'Save')
      addEventListener(saveBtn, 'click', () => {
        this.close(input.value)
        resolve(input.value)
      })
      addEventListener(saveBtn, 'keydown', (e: Event) => {
        const keyEvent = e as KeyboardEvent
        if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
          keyEvent.preventDefault()
          this.close(input.value)
          resolve(input.value)
        }
      })
      buttonsContainer.appendChild(saveBtn)

      this.modal.appendChild(buttonsContainer)

      this.backdrop.style.display = 'flex'
      this.backdrop.setAttribute('aria-hidden', 'false')
      this.modal.setAttribute('aria-labelledby', 'prompt-title')

      // Focus input field
      input.focus()
      input.select()
    })
  }

  private close(value: string | null): void {
    this.backdrop.style.display = 'none'
    this.backdrop.setAttribute('aria-hidden', 'true')

    if (this.previousFocusedElement && document.body.contains(this.previousFocusedElement)) {
      this.previousFocusedElement.focus()
    }
  }

  getElement(): HTMLElement {
    return this.backdrop
  }
}
