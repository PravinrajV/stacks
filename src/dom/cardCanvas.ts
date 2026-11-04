/**
 * Task 7.3: CardCanvas editor component with drag/resize.
 * 
 * Renders card elements and handles interaction.
 */

import { createElement, setAttributes, setStyles, removeAllChildren, addEventListener } from './utils/dom'
import { offsetRect, createRect, rectWidth, rectHeight } from './utils/rect'
import type { Card, Button, Field, Background } from '../model/stack'
import type { Rect } from '../model/types'

export class CardCanvas {
  private element: HTMLElement
  private cardView: HTMLElement
  private selectedElementId: string | null = null
  private dragState: {
    elementId: string
    startX: number
    startY: number
    startRect: Rect
    mode: 'move' | 'resize'
  } | null = null
  private onElementClick: ((elementId: string) => void) | null = null
  private onElementMove: ((elementId: string, rect: Rect) => void) | null = null
  private onElementResize: ((elementId: string, rect: Rect) => void) | null = null

  constructor() {
    this.element = createElement('div', {
      className: 'card-canvas'
    })

    this.cardView = createElement('div', {
      className: 'card-view'
    })
    this.element.appendChild(this.cardView)

    addEventListener(this.element, 'mousemove', (e) => this.handleMouseMove(e as MouseEvent))
    addEventListener(this.element, 'mouseup', () => this.handleMouseUp())
  }

  getElement(): HTMLElement {
    return this.element
  }

  render(card: Card, background: Background | null): void {
    removeAllChildren(this.cardView)

    // Render background elements first
    if (background) {
      for (const field of background.fields) {
        this.renderField(field, 'background')
      }
      for (const button of background.buttons) {
        this.renderButton(button, 'background')
      }
    }

    // Render card elements on top
    for (const field of card.fields) {
      this.renderField(field, 'card')
    }
    for (const button of card.buttons) {
      this.renderButton(button, 'card')
    }
  }

  private renderField(field: Field, scope: string): void {
    const el = this.createElementView(
      'field',
      field.id,
      field.rect,
      field.name,
      field.content
    )
    this.cardView.appendChild(el)
  }

  private renderButton(button: Button, scope: string): void {
    const el = this.createElementView(
      'button',
      button.id,
      button.rect,
      button.label,
      button.label
    )
    this.cardView.appendChild(el)
  }

  private createElementView(
    type: 'button' | 'field',
    id: string,
    rect: Rect,
    label: string,
    content: string
  ): HTMLElement {
    const el = createElement('div', {
      className: `card-element card-${type}` + (this.selectedElementId === id ? ' selected' : '')
    })

    setAttributes(el, {
      'data-element-id': id,
      'data-element-type': type
    })

    setStyles(el, {
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rectWidth(rect)}px`,
      height: `${rectHeight(rect)}px`
    })

    // Truncate text content
    const displayText = content.length > 20 ? content.substring(0, 17) + '...' : content
    el.textContent = displayText

    addEventListener(el, 'mousedown', (e) => this.handleMouseDown(e as MouseEvent, id, rect))

    // Add resize handle for selected elements
    if (this.selectedElementId === id) {
      const handle = createElement('div', { className: 'resize-handle' })
      el.appendChild(handle)
    }

    return el
  }

  private handleMouseDown(e: MouseEvent, elementId: string, rect: Rect): void {
    e.preventDefault()

    this.selectElement(elementId)

    // Determine if dragging or resizing
    const handle = (e.target as HTMLElement).classList.contains('resize-handle')
    const mode: 'move' | 'resize' = handle ? 'resize' : 'move'

    this.dragState = {
      elementId,
      startX: e.clientX,
      startY: e.clientY,
      startRect: rect,
      mode
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.dragState) return

    const dx = e.clientX - this.dragState.startX
    const dy = e.clientY - this.dragState.startY
    const { startRect, mode, elementId } = this.dragState

    let newRect: Rect

    if (mode === 'move') {
      newRect = offsetRect(startRect, dx, dy)
    } else {
      // Resize
      newRect = {
        left: startRect.left,
        top: startRect.top,
        right: startRect.right + dx,
        bottom: startRect.bottom + dy
      }
    }

    // Update display
    const el = this.cardView.querySelector(`[data-element-id="${elementId}"]`) as HTMLElement
    if (el) {
      setStyles(el, {
        left: `${newRect.left}px`,
        top: `${newRect.top}px`,
        width: `${rectWidth(newRect)}px`,
        height: `${rectHeight(newRect)}px`
      })
    }

    // Callback
    if (mode === 'move') {
      this.onElementMove?.(elementId, newRect)
    } else {
      this.onElementResize?.(elementId, newRect)
    }
  }

  private handleMouseUp(): void {
    this.dragState = null
  }

  selectElement(elementId: string): void {
    // Clear previous selection
    const prevSelected = this.cardView.querySelector('.card-element.selected')
    if (prevSelected) {
      prevSelected.classList.remove('selected')
      // Remove resize handle
      const handle = prevSelected.querySelector('.resize-handle')
      if (handle) {
        prevSelected.removeChild(handle)
      }
    }

    // Select new
    this.selectedElementId = elementId
    const selected = this.cardView.querySelector(`[data-element-id="${elementId}"]`) as HTMLElement
    if (selected) {
      selected.classList.add('selected')

      // Add resize handle
      const handle = createElement('div', { className: 'resize-handle' })
      selected.appendChild(handle)
    }
  }

  getSelectedElement(): string | null {
    return this.selectedElementId
  }

  onElementClicked(handler: (elementId: string) => void): void {
    this.onElementClick = handler
  }

  onElementMoved(handler: (elementId: string, rect: Rect) => void): void {
    this.onElementMove = handler
  }

  onElementResized(handler: (elementId: string, rect: Rect) => void): void {
    this.onElementResize = handler
  }
}
