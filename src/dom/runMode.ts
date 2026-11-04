/**
 * Task 7.6: RunModeViewer for card execution.
 * 
 * Interactive card viewer where buttons can be clicked and scripts executed.
 */

import { createElement, setTextContent, setStyles, removeAllChildren, addEventListener } from './utils/dom'
import { rectWidth, rectHeight } from './utils/rect'
import type { Card, Button, Field, Background } from '../model/stack'
import type { Stack } from '../model/stack'
import { ModalComponent } from './components/modal'
import { send } from '../interpreter/dispatcher'
import { createExecutionContext } from '../interpreter/runtime'

export class RunModeViewer {
  private element: HTMLElement
  private cardView: HTMLElement
  private modal: ModalComponent
  private stack: Stack | null = null
  private currentCard: Card | null = null
  private onNavigate: ((cardId: string) => void) | null = null
  private onExit: (() => void) | null = null

  constructor() {
    this.element = createElement('div', {
      className: 'run-mode-viewer'
    })

    const header = createElement('div', { className: 'editor-header' })
    const title = createElement('div', { className: 'editor-title' })
    setTextContent(title, 'Run Mode')
    header.appendChild(title)

    const exitBtn = createElement('button', { className: 'button' })
    setTextContent(exitBtn, 'Exit')
    addEventListener(exitBtn, 'click', () => this.onExit?.())
    header.appendChild(exitBtn)

    this.element.appendChild(header)

    this.cardView = createElement('div', {
      className: 'run-mode-card'
    })
    this.element.appendChild(this.cardView)

    this.modal = new ModalComponent()
    this.element.appendChild(this.modal.getElement())
  }

  getElement(): HTMLElement {
    return this.element
  }

  render(stack: Stack, card: Card, background: Background | null): void {
    this.stack = stack
    this.currentCard = card

    removeAllChildren(this.cardView)

    // Render background elements
    if (background) {
      for (const field of background.fields) {
        this.renderField(field)
      }
      for (const button of background.buttons) {
        this.renderButton(button)
      }
    }

    // Render card elements
    for (const field of card.fields) {
      this.renderField(field)
    }
    for (const button of card.buttons) {
      this.renderButton(button)
    }
  }

  private renderField(field: Field): void {
    const el = createElement('div', {
      className: `run-field ${field.editable ? 'run-field-editable' : 'run-field-readonly'}`
    })

    setAttributes(el, {
      'data-field-id': field.id
    })

    setStyles(el, {
      position: 'absolute',
      left: `${field.rect.left}px`,
      top: `${field.rect.top}px`,
      width: `${rectWidth(field.rect)}px`,
      height: `${rectHeight(field.rect)}px`
    })

    setTextContent(el, field.content)

    if (field.editable) {
      // Make editable
      el.contentEditable = 'true'
      addEventListener(el, 'blur', () => {
        field.content = el.textContent || ''
      })
    }

    this.cardView.appendChild(el)
  }

  private renderButton(button: Button): void {
    const el = createElement('button', {
      className: 'run-button'
    })

    setAttributes(el, {
      'data-button-id': button.id
    })

    setStyles(el, {
      position: 'absolute',
      left: `${button.rect.left}px`,
      top: `${button.rect.top}px`,
      width: `${rectWidth(button.rect)}px`,
      height: `${rectHeight(button.rect)}px`
    })

    setTextContent(el, button.label)

    addEventListener(el, 'click', async () => {
      await this.onButtonClick(button)
    })

    this.cardView.appendChild(el)
  }

  private async onButtonClick(button: Button): Promise<void> {
    if (!this.stack || !this.currentCard) return

    try {
      const context = createExecutionContext(this.stack, this.currentCard)
      const result = await send('mouseUp', button, context, this)
      if (!result.success && result.error) {
        await this.modal.show(`Error: ${result.error.message || String(result.error)}`)
      } else {
        // Re-render all fields after successful script execution to reflect model changes
        this.reRenderAllFields()
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      await this.modal.show(`Error: ${msg}`)
    }
  }

  private reRenderAllFields(): void {
    if (!this.currentCard) return
    for (const field of this.currentCard.fields) {
      this.updateFieldContent(field)
    }
  }

  async showAnswer(message: string, buttons: string[]): Promise<number> {
    return await this.modal.show(message, buttons)
  }

  updateFieldContent(field: Field): void {
    const el = this.cardView.querySelector(`[data-field-id="${field.id}"]`) as HTMLElement
    if (el) {
      setTextContent(el, field.content)
    }
  }

  onNavigateCard(handler: (cardId: string) => void): void {
    this.onNavigate = handler
  }

  onExitRunMode(handler: () => void): void {
    this.onExit = handler
  }

  handleNavigation(cardId: string): void {
    this.onNavigate?.(cardId)
  }
}

function setAttributes(el: HTMLElement, attrs: Record<string, string>): void {
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value)
  }
}
