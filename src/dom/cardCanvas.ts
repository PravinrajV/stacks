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
  private panState: {
    isPanning: boolean
    startX: number
    startY: number
    offsetX: number
    offsetY: number
  } = {
    isPanning: false,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0
  }
  private zoomLevel: number = 1
  private minZoom: number = 0.25
  private maxZoom: number = 4
  private onElementClick: ((elementId: string) => void) | null = null
  private onElementMove: ((elementId: string, rect: Rect) => void) | null = null
  private onElementResize: ((elementId: string, rect: Rect) => void) | null = null

  constructor() {
    // Create outer container (scrollable, positioned)
    this.element = createElement('div', {
      className: 'card-canvas'
    })
    this.element.setAttribute('aria-label', 'Card canvas - click elements to select, drag to move. Use Ctrl+scroll to zoom, Shift+drag to pan, arrow keys to nudge selected elements')
    this.element.setAttribute('role', 'region')

    // Create inner container (scrollable content area)
    const containerDiv = createElement('div', {
      className: 'canvas-container'
    })

    this.cardView = createElement('div', {
      className: 'card-view'
    })
    this.cardView.setAttribute('role', 'img')
    this.cardView.setAttribute('aria-label', 'Card editing canvas')
    
    containerDiv.appendChild(this.cardView)
    this.element.appendChild(containerDiv)

    addEventListener(this.element, 'mousemove', (e) => this.handleMouseMove(e as MouseEvent))
    addEventListener(this.element, 'mouseup', () => this.handleMouseUp())
    addEventListener(this.element, 'mousedown', (e) => this.handleCanvasMouseDown(e as MouseEvent))
    addEventListener(this.element, 'wheel', (e) => this.handleWheel(e as WheelEvent), { passive: false })
    addEventListener(this.element, 'keydown', (e) => this.handleKeyDown(e as KeyboardEvent))
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
      'data-element-type': type,
      'role': type === 'button' ? 'button' : 'textbox',
      'aria-label': `${type === 'button' ? 'Button' : 'Field'}: ${label || 'untitled'}`,
      'tabindex': '0'
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

  deselectElement(): void {
    this.selectedElementId = null
  }

  getZoomLevel(): number {
    return this.zoomLevel
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

  private handleCanvasMouseDown(e: MouseEvent): void {
    // Only pan if middle-mouse button or Shift+Left-click
    const isMiddleClick = e.button === 1
    const isShiftClick = e.shiftKey && e.button === 0
    
    if (!isMiddleClick && !isShiftClick) return

    // Don't pan if clicking on an element
    const target = e.target as HTMLElement
    if (target.closest('.card-element')) return

    e.preventDefault()
    this.panState.isPanning = true
    this.panState.startX = e.clientX
    this.panState.startY = e.clientY
  }

  private handleWheel(e: WheelEvent): void {
    // Only zoom if Ctrl (or Cmd on Mac) is pressed
    if (!(e.ctrlKey || e.metaKey)) return

    e.preventDefault()

    // Zoom based on wheel direction
    const delta = e.deltaY < 0 ? 1.1 : 0.9
    const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoomLevel * delta))
    
    if (newZoom !== this.zoomLevel) {
      this.zoomLevel = newZoom
      this.updateCanvasTransform()
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    // If element is selected, arrow keys nudge it; otherwise pan canvas
    if (this.selectedElementId) {
      this.handleArrowKeyNudge(e)
    } else {
      this.handleArrowKeyPan(e)
    }
  }

  private handleArrowKeyNudge(e: KeyboardEvent): void {
    // Arrow keys nudge selected element
    const nudgeStep = e.shiftKey ? 10 : 1
    let moved = false
    let dx = 0
    let dy = 0

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      dy = -nudgeStep
      moved = true
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      dy = nudgeStep
      moved = true
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      dx = -nudgeStep
      moved = true
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      dx = nudgeStep
      moved = true
    }

    if (moved && this.selectedElementId) {
      // Get current element position
      const el = this.cardView.querySelector(`[data-element-id="${this.selectedElementId}"]`) as HTMLElement
      if (el) {
        const left = parseInt(el.style.left) || 0
        const top = parseInt(el.style.top) || 0
        const width = parseInt(el.style.width) || 0
        const height = parseInt(el.style.height) || 0

        const newRect: Rect = {
          left: left + dx,
          top: top + dy,
          right: left + dx + width,
          bottom: top + dy + height
        }

        // Update display
        setStyles(el, {
          left: `${newRect.left}px`,
          top: `${newRect.top}px`
        })

        // Notify listeners
        this.onElementMove?.(this.selectedElementId, newRect)
      }
    }
  }

  private handleArrowKeyPan(e: KeyboardEvent): void {
    // Arrow keys pan canvas
    const panStep = 20
    let moved = false

    if (e.key === 'ArrowUp' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault()
      this.panState.offsetY += panStep
      moved = true
    } else if (e.key === 'ArrowDown' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault()
      this.panState.offsetY -= panStep
      moved = true
    } else if (e.key === 'ArrowLeft' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault()
      this.panState.offsetX += panStep
      moved = true
    } else if (e.key === 'ArrowRight' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault()
      this.panState.offsetX -= panStep
      moved = true
    }

    if (moved) {
      this.updateCanvasTransform()
    }
  }

  private updateCanvasTransform(): void {
    const transform = `translate(${this.panState.offsetX}px, ${this.panState.offsetY}px) scale(${this.zoomLevel})`
    this.cardView.style.transform = transform
    this.cardView.style.transformOrigin = 'top left'
  }

  private handleMouseMove(e: MouseEvent): void {
    if (this.panState.isPanning) {
      const dx = e.clientX - this.panState.startX
      const dy = e.clientY - this.panState.startY
      this.panState.offsetX += dx
      this.panState.offsetY += dy
      this.panState.startX = e.clientX
      this.panState.startY = e.clientY
      this.updateCanvasTransform()
      return
    }

    if (!this.dragState) return

    const dx = (e.clientX - this.dragState.startX) / this.zoomLevel
    const dy = (e.clientY - this.dragState.startY) / this.zoomLevel
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
    this.panState.isPanning = false
    this.dragState = null
  }
}
