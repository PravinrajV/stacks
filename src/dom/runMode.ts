/**
 * Task 7.6: RunModeViewer for card execution.
 * 
 * Interactive card viewer where buttons can be clicked and scripts executed.
 */

import { createElement, setTextContent, setStyles, removeAllChildren, addEventListener } from './utils/dom'
import { rectWidth, rectHeight } from './utils/rect'
import { computeFit } from './utils/fit'
import { createBrandMark } from './icons'
import type { Card, Button, Field, Background } from '../model/stack'
import type { Stack } from '../model/stack'
import { ModalComponent } from './components/modal'
import { send } from '../interpreter/dispatcher'
import { createExecutionContext } from '../interpreter/runtime'

export class RunModeViewer {
  private element: HTMLElement
  private cardCanvas: HTMLElement
  private cardView: HTMLElement
  private modal: ModalComponent
  private stack: Stack | null = null
  private currentCard: Card | null = null
  private onNavigate: ((cardId: string) => void) | null = null
  private onExit: (() => void) | null = null
  private scale: number = 1  // Responsive scale factor
  private lastCardId: string | null = null
  private fitLeft: number = 0  // Centering offset
  private fitTop: number = 0   // Centering offset
  private resizeObserver: ResizeObserver | null = null

  constructor() {
    this.element = createElement('div', {
      className: 'run-mode-viewer'
    })

    // Create floating glass header pill
    const header = createElement('div', { className: 'run-mode-header' })
    
    // Brand mark icon
    const brandMark = createBrandMark()
    brandMark.setAttribute('width', '20')
    brandMark.setAttribute('height', '20')
    brandMark.classList.add('run-mode-header-ghost')
    header.appendChild(brandMark)

    const label = createElement('div', { className: 'run-mode-header-label' })
    setTextContent(label, 'Running')
    header.appendChild(label)

    const exitBtn = createElement('button', { className: 'run-mode-header-exit' })
    setTextContent(exitBtn, 'Exit')
    addEventListener(exitBtn, 'click', () => this.onExit?.())
    header.appendChild(exitBtn)

    this.element.appendChild(header)

    // Create card canvas container (matches edit mode structure)
    this.cardCanvas = createElement('div', {
      className: 'card-canvas'
    })
    this.cardCanvas.setAttribute('aria-label', 'Card viewer')
    this.cardCanvas.setAttribute('role', 'region')

    // Create card view container
    this.cardView = createElement('div', {
      className: 'card-view'
    })
    this.cardView.setAttribute('role', 'img')
    this.cardView.setAttribute('aria-label', 'Card')

    setStyles(this.cardView, {
      position: 'absolute',
      left: '0',
      top: '0',
      margin: '0'
    })

    this.cardCanvas.appendChild(this.cardView)
    this.element.appendChild(this.cardCanvas)

    this.modal = new ModalComponent()
    this.element.appendChild(this.modal.getElement())

    // Set up ResizeObserver to recompute scale when container resizes
    this.resizeObserver = new ResizeObserver(() => {
      this.updateCardFit()
    })
    this.resizeObserver.observe(this.cardCanvas)
  }

  getElement(): HTMLElement {
    return this.element
  }

  /**
   * Calculate responsive scale and centering to fit card in container.
   */
  private updateCardFit(): void {
    const cardCanvas = this.cardCanvas as HTMLElement
    const containerWidth = cardCanvas.clientWidth
    const containerHeight = cardCanvas.clientHeight

    if (containerWidth <= 0 || containerHeight <= 0) {
      // Container not yet laid out, skip update
      return
    }

    // Subtract padding to get inner size for computeFit
    const PADDING = 24
    const innerWidth = Math.max(0, containerWidth - PADDING * 2)
    const innerHeight = Math.max(0, containerHeight - PADDING * 2)

    // Compute fit for inner size
    const { scale, left, top } = computeFit(innerWidth, innerHeight)
    this.scale = Math.max(0.1, scale)
    
    // Add padding to the offsets to position the card within the padded container
    this.fitLeft = left + PADDING
    this.fitTop = top + PADDING

    // Apply transform to card view
    this.updateCardTransform()
  }

  /**
   * Apply transform to center and scale the card.
   */
  private updateCardTransform(): void {
    const transform = `translate(${this.fitLeft}px, ${this.fitTop}px) scale(${this.scale})`
    this.cardView.style.transform = transform
    this.cardView.style.transformOrigin = 'top left'
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

    // HAND EDIT (Phase 11.2): fit synchronously so the new card never paints
    // unscaled at the top-left for a frame, then re-check after layout.
    this.updateCardFit()
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => this.updateCardFit())
    }

    // Card change: opacity-only fade (never touches the fit transform).
    const changed = this.lastCardId !== null && this.lastCardId !== card.id
    this.lastCardId = card.id
    const reduce = typeof window !== 'undefined' && typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (changed && !reduce && typeof this.cardView.animate === 'function') {
      this.cardView.animate([{ opacity: 0.25 }, { opacity: 1 }], { duration: 220, easing: 'cubic-bezier(.2,.7,.2,1)' })
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
      height: `${rectHeight(field.rect)}px`,
      fontSize: `${field.fontSize || 12}px`,
      fontFamily: field.font || 'inherit',
      fontWeight: field.textStyle?.bold ? 'bold' : 'normal',
      fontStyle: field.textStyle?.italic ? 'italic' : 'normal',
      textDecoration: field.textStyle?.underline ? 'underline' : 'none'
    })

    setTextContent(el, field.content)

    if (field.editable) {
      // Make editable
      el.contentEditable = 'true'
      addEventListener(el, 'blur', () => {
        // Persist changes back to the field model
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

    // Handle Enter and Space key presses when button is focused
    addEventListener(el, 'keydown', async (e: Event) => {
      const keyEvent = e as KeyboardEvent
      if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
        keyEvent.preventDefault()
        await this.onButtonClick(button)
      }
    })

    this.cardView.appendChild(el)
  }

  private async onButtonClick(button: Button): Promise<void> {
    if (!this.stack || !this.currentCard) return

    try {
      const context = createExecutionContext(this.stack, this.currentCard)
      // Pass this RunModeViewer as the uiResponder so navigation can work
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

  async showAnswer(message: string, buttons: string[] = ['OK']): Promise<number> {
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

  /**
   * Called by runtime when a "go" command is executed.
   * This is invoked from the execution context's uiResponder.
   */
  handleNavigation(cardId: string): void {
    this.onNavigate?.(cardId)
  }

  /**
   * For testing: recalculate fit based on current container size.
   * Normally called automatically by ResizeObserver.
   */
  testUpdateFit(): void {
    this.updateCardFit()
  }

  /**
   * For testing: get current scale factor.
   */
  testGetScale(): number {
    return this.scale
  }

  /**
   * For testing: get current fit offsets.
   */
  testGetFitOffsets(): { left: number; top: number } {
    return { left: this.fitLeft, top: this.fitTop }
  }
}

function setAttributes(el: HTMLElement, attrs: Record<string, string>): void {
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value)
  }
}
