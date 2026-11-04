/**
 * Task 7.12: Modal dialog component.
 */

import { createElement, setTextContent, removeAllChildren, addEventListener } from '../utils/dom'

export class ModalComponent {
  private backdrop: HTMLElement
  private modal: HTMLElement
  private resolve: ((value: number) => void) | null = null
  private title: string = ''
  private content: HTMLElement | null = null

  /**
   * Create a modal. Can be initialized with custom content.
   * @param title Title text for the modal header
   * @param customContent Optional custom element to display in modal body
   */
  constructor(title?: string, customContent?: HTMLElement) {
    this.backdrop = createElement('div', { className: 'modal-backdrop' })
    this.backdrop.style.display = 'none'

    this.modal = createElement('div', { className: 'modal' })
    this.backdrop.appendChild(this.modal)

    if (title) {
      this.title = title
    }
    if (customContent) {
      this.content = customContent
    }

    // Close on backdrop click (but not on modal itself)
    addEventListener(this.backdrop, 'click', (e) => {
      if (e.target === this.backdrop) {
        this.close(-1)
      }
    })

    // Close on Escape key
    addEventListener(this.backdrop, 'keydown', (e: Event) => {
      const keyEvent = e as KeyboardEvent
      if (keyEvent.key === 'Escape') {
        this.close(-1)
      }
    })

    document.body.appendChild(this.backdrop)
  }

  /**
   * Show modal with message and buttons (legacy simple dialog).
   */
  show(message?: string, buttons: string[] = ['OK']): Promise<number> {
    if (!message && !this.content) {
      return Promise.resolve(-1)
    }

    return new Promise((resolve) => {
      this.resolve = resolve

      removeAllChildren(this.modal)

      // Add title if available
      if (this.title) {
        const titleEl = createElement('div')
        titleEl.style.fontWeight = 'bold'
        titleEl.style.marginBottom = '12px'
        titleEl.style.fontSize = '14px'
        setTextContent(titleEl, this.title)
        this.modal.appendChild(titleEl)
      }

      // Add message (if provided)
      if (message) {
        const messageEl = createElement('div', {
          className: 'modal-message'
        })
        messageEl.setAttribute('role', 'alert')
        setTextContent(messageEl, message)
        messageEl.style.marginBottom = '12px'
        this.modal.appendChild(messageEl)
      }

      // Add custom content (if provided)
      if (this.content) {
        const contentWrapper = createElement('div')
        contentWrapper.style.marginBottom = '12px'
        contentWrapper.appendChild(this.content)
        this.modal.appendChild(contentWrapper)
      }

      // Add buttons
      const buttonsContainer = createElement('div', {
        className: 'modal-buttons'
      })
      buttonsContainer.style.display = 'flex'
      buttonsContainer.style.gap = '8px'
      buttonsContainer.style.justifyContent = 'flex-end'

      for (let i = 0; i < buttons.length; i++) {
        const btn = createElement('button', {
          className: 'button'
        })
        setTextContent(btn, buttons[i])
        addEventListener(btn, 'click', () => this.close(i))
        buttonsContainer.appendChild(btn)
      }

      this.modal.appendChild(buttonsContainer)
      this.backdrop.style.display = 'flex'

      // Focus first button
      const firstBtn = this.modal.querySelector('button') as HTMLButtonElement
      if (firstBtn) {
        firstBtn.focus()
      }
    })
  }

  close(value: number = -1): void {
    this.backdrop.style.display = 'none'
    if (this.resolve) {
      this.resolve(value)
      this.resolve = null
    }
  }

  getElement(): HTMLElement {
    return this.backdrop
  }
}
