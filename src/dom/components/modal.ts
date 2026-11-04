/**
 * Task 7.12: Modal dialog component.
 */

import { createElement, setTextContent, removeAllChildren, addEventListener } from '../utils/dom'

export class ModalComponent {
  private backdrop: HTMLElement
  private modal: HTMLElement
  private resolve: ((value: number) => void) | null = null

  constructor() {
    this.backdrop = createElement('div', { className: 'modal-backdrop' })
    this.backdrop.style.display = 'none'

    this.modal = createElement('div', { className: 'modal' })
    this.backdrop.appendChild(this.modal)

    // Close on backdrop click (but not on modal itself)
    addEventListener(this.backdrop, 'click', (e) => {
      if (e.target === this.backdrop) {
        this.close(-1)
      }
    })

    document.body.appendChild(this.backdrop)
  }

  show(message: string, buttons: string[] = ['OK']): Promise<number> {
    return new Promise((resolve) => {
      this.resolve = resolve

      removeAllChildren(this.modal)

      const messageEl = createElement('div', {
        className: 'modal-message'
      })
      messageEl.setAttribute('role', 'alert')
      setTextContent(messageEl, message)
      this.modal.appendChild(messageEl)

      const buttonsContainer = createElement('div', {
        className: 'modal-buttons'
      })

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

  close(value: number): void {
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
