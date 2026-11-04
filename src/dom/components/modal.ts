/**
 * Task 7.12 & 8.4: Modal dialog component with accessibility.
 * 
 * Features:
 * - ARIA attributes: role=dialog, aria-modal=true
 * - Accessible classes: .answer-dialog, .answer-ok (for answer command)
 * - Keyboard support: Tab between buttons, Enter/Space to confirm, Escape to close
 * - Focus management: OK button focused on open, focus restored on close
 * - Focus trap: keyboard navigation stays within modal
 */

import { createElement, setTextContent, removeAllChildren, addEventListener } from '../utils/dom'

export class ModalComponent {
  private backdrop: HTMLElement
  private modal: HTMLElement
  private resolve: ((value: number) => void) | null = null
  private title: string = ''
  private content: HTMLElement | null = null
  private buttons: HTMLButtonElement[] = []
  private previousFocusedElement: HTMLElement | null = null

  /**
   * Create a modal. Can be initialized with custom content.
   * @param title Title text for the modal header
   * @param customContent Optional custom element to display in modal body
   */
  constructor(title?: string, customContent?: HTMLElement) {
    this.backdrop = createElement('div', { className: 'modal-backdrop' })
    this.backdrop.style.display = 'none'
    this.backdrop.setAttribute('aria-hidden', 'true')

    this.modal = createElement('div', { className: 'modal' })
    // REQ-P8-004: ARIA accessibility attributes
    this.modal.setAttribute('role', 'dialog')
    this.modal.setAttribute('aria-modal', 'true')
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

    // Close on Escape key; prevent propagation
    addEventListener(this.backdrop, 'keydown', (e: Event) => {
      const keyEvent = e as KeyboardEvent
      if (keyEvent.key === 'Escape') {
        keyEvent.preventDefault()
        keyEvent.stopPropagation()
        this.close(-1)
      }
      // Tab within modal: trap focus to button list
      if (keyEvent.key === 'Tab') {
        this.handleTabKey(keyEvent)
      }
    })

    document.body.appendChild(this.backdrop)
  }

  /**
   * Handle Tab key to trap focus within modal buttons.
   */
  private handleTabKey(e: KeyboardEvent): void {
    if (this.buttons.length === 0) return

    const currentIndex = this.buttons.indexOf(document.activeElement as HTMLButtonElement)
    let nextIndex = currentIndex

    if (e.shiftKey) {
      // Shift+Tab: previous button
      nextIndex = currentIndex <= 0 ? this.buttons.length - 1 : currentIndex - 1
    } else {
      // Tab: next button
      nextIndex = currentIndex >= this.buttons.length - 1 ? 0 : currentIndex + 1
    }

    e.preventDefault()
    e.stopPropagation()
    this.buttons[nextIndex].focus()
  }

  /**
   * Show modal with message and buttons (legacy simple dialog).
   * REQ-P8-004: Show accessible modal for answer command
   */
  show(message?: string, buttons: string[] = ['OK']): Promise<number> {
    if (!message && !this.content) {
      return Promise.resolve(-1)
    }

    return new Promise((resolve) => {
      this.resolve = resolve
      
      // Store previously focused element to restore on close
      this.previousFocusedElement = document.activeElement as HTMLElement

      removeAllChildren(this.modal)
      this.buttons = []

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
          className: 'modal-message answer-dialog'
        })
        messageEl.setAttribute('role', 'alert')
        messageEl.setAttribute('aria-live', 'assertive')
        messageEl.setAttribute('aria-atomic', 'true')
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
          className: i === 0 ? 'button answer-ok' : 'button'
        }) as HTMLButtonElement
        setTextContent(btn, buttons[i])
        
        // Store button reference for focus management
        this.buttons.push(btn)
        
        // Click handler
        addEventListener(btn, 'click', () => this.close(i))
        
        // Enter/Space to confirm
        addEventListener(btn, 'keydown', (e: Event) => {
          const keyEvent = e as KeyboardEvent
          if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
            keyEvent.preventDefault()
            keyEvent.stopPropagation()
            this.close(i)
          }
        })
        
        buttonsContainer.appendChild(btn)
      }

      this.modal.appendChild(buttonsContainer)
      this.backdrop.style.display = 'flex'
      this.backdrop.setAttribute('aria-hidden', 'false')

      // Focus first button (OK button or first button)
      // REQ-P8-004: First button is focused
      if (this.buttons.length > 0) {
        this.buttons[0].focus()
      }
    })
  }

  /**
   * Close modal and restore focus.
   * REQ-P8-004: Focus restored after dialog closes
   */
  close(value: number = -1): void {
    this.backdrop.style.display = 'none'
    this.backdrop.setAttribute('aria-hidden', 'true')
    
    // Restore focus to previously focused element
    if (this.previousFocusedElement && document.body.contains(this.previousFocusedElement)) {
      this.previousFocusedElement.focus()
    }
    
    if (this.resolve) {
      this.resolve(value)
      this.resolve = null
    }
  }

  getElement(): HTMLElement {
    return this.backdrop
  }
}
