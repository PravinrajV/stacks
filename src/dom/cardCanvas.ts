/**
 * Task 7.3: CardCanvas editor component with drag/resize.
 * 
 * Renders card elements and handles interaction.
 */

import { createElement, setAttributes, setStyles, removeAllChildren, addEventListener } from './utils/dom'
import { offsetRect, createRect, rectWidth, rectHeight } from './utils/rect'
import { computeFit } from './utils/fit'
import type { Card, Button, Field, Background } from '../model/stack'
import type { Rect } from '../model/types'

export class CardCanvas {
  private element: HTMLElement
  private container: HTMLElement
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
  private scale: number = 1  // Responsive scale factor
  private fitLeft: number = 0  // Centering offset
  private fitTop: number = 0   // Centering offset
  private resizeObserver: ResizeObserver | null = null
  private cardLogicalWidth: number = 512  // Fixed logical card dimensions
  private cardLogicalHeight: number = 342
  private onElementClick: ((elementId: string) => void) | null = null
  private onElementMove: ((elementId: string, rect: Rect) => void) | null = null
  private onElementResize: ((elementId: string, rect: Rect) => void) | null = null
  private lastCardId: string | null = null
  private isAnimating: boolean = false
  private fadeCompleteTimeout: ReturnType<typeof setTimeout> | null = null

  constructor() {
    // Create outer container (scrollable, positioned)
    this.element = createElement('div', {
      className: 'card-canvas'
    })
    this.element.setAttribute('aria-label', 'Card canvas - click elements to select, drag to move. Use Ctrl+scroll to zoom, Shift+drag to pan, arrow keys to nudge selected elements')
    this.element.setAttribute('role', 'region')

    // Create inner container (scrollable content area)
    this.container = createElement('div', {
      className: 'canvas-container'
    })

    this.cardView = createElement('div', {
      className: 'card-view'
    })
    this.cardView.setAttribute('role', 'img')
    this.cardView.setAttribute('aria-label', 'Card editing canvas')
    
    this.container.appendChild(this.cardView)
    this.element.appendChild(this.container)

    // Set up ResizeObserver to recompute scale when container resizes
    this.resizeObserver = new ResizeObserver(() => {
      this.updateCardScale()
    })
    this.resizeObserver.observe(this.container)

    addEventListener(this.element, 'mousemove', (e) => this.handleMouseMove(e as MouseEvent))
    addEventListener(this.element, 'mouseup', () => this.handleMouseUp())
    addEventListener(this.element, 'mousedown', (e) => this.handleCanvasMouseDown(e as MouseEvent))
    addEventListener(this.element, 'wheel', (e) => this.handleWheel(e as WheelEvent), { passive: false })
    addEventListener(this.element, 'keydown', (e) => this.handleKeyDown(e as KeyboardEvent))
  }

  getElement(): HTMLElement {
    return this.element
  }

  /**
   * Calculate responsive scale factor to fit card in container while preserving aspect ratio.
   * The card has fixed logical dimensions (512×342) and scales to fit available space.
   */
  private updateCardScale(): void {
    const containerRect = this.container.getBoundingClientRect()
    const containerWidth = containerRect.width
    const containerHeight = containerRect.height

    if (containerWidth <= 0 || containerHeight <= 0) {
      // Container not yet laid out, skip update
      return
    }

    // Get actual client dimensions (excluding any padding/borders)
    // HAND EDIT (Phase 11.1): the card is laid out at the container's content
    // edge, so fit inside the content box (excluding CSS padding) to avoid a double offset.
    const cs = getComputedStyle(this.container)
    const padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0)
    const padY = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0)
    const availWidth = containerWidth - padX
    const availHeight = containerHeight - padY

    // Compute fit and centering parameters
    const { scale, left, top } = computeFit(availWidth, availHeight)
    this.scale = Math.max(0.1, scale)
    this.fitLeft = left
    this.fitTop = top

    // Update the combined transform with new scale and position
    this.updateCanvasTransform()
  }

  getScale(): number {
    return this.scale
  }

  /**
   * For testing: recalculate scale based on current container size.
   * Normally called automatically by ResizeObserver.
   */
  testUpdateScale(): void {
    this.updateCardScale()
  }

  render(card: Card, background: Background | null): void {
    const cardChanged = this.lastCardId !== card.id && this.lastCardId !== null
    this.lastCardId = card.id

    // Remove any active animations before starting new ones
    this.cardView.classList.remove('card-flip-in', 'card-flip-out', 'card-fade-in', 'card-fade-out')

    if (cardChanged && !this.isAnimating) {
      // Trigger fade-out animation on card change
      this.isAnimating = true
      this.cardView.classList.add('card-fade-out')

      // When fade-out completes, render new card and fade in
      const transitionDuration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 320
      this.fadeCompleteTimeout = setTimeout(() => {
        // Check if animation was interrupted
        if (this.isAnimating) {
          this.renderCardContent(card, background)
          this.cardView.classList.remove('card-fade-out')
          this.cardView.classList.add('card-fade-in')

          // Clear animation state when fade-in completes
          setTimeout(() => {
            this.cardView.classList.remove('card-fade-in')
            this.isAnimating = false
          }, transitionDuration)
        }
      }, transitionDuration)
    } else {
      // No animation for first card or if already animating
      this.renderCardContent(card, background)
    }
  }

  private renderCardContent(card: Card, background: Background | null): void {
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

    // Show empty state message if no elements (Phase 10.4)
    if (card.buttons.length === 0 && card.fields.length === 0 && (!background || (background.buttons.length === 0 && background.fields.length === 0))) {
      const emptyState = createElement('div', {
        className: 'empty-state-message'
      })
      emptyState.setAttribute('aria-label', 'Empty card. Use the toolbar to add buttons and fields.')
      
      const message = createElement('div', { className: 'empty-state-text' })
      message.textContent = 'This card is empty'
      emptyState.appendChild(message)
      
      const hint = createElement('div', { className: 'empty-state-hint' })
      hint.textContent = 'Use the toolbar to add buttons and fields'
      emptyState.appendChild(hint)
      
      this.cardView.appendChild(emptyState)
    }

    // Recompute scale after rendering
    this.updateCardScale()
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

    el.textContent = content

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

  setZoomLevel(zoom: number): void {
    this.zoomLevel = Math.max(this.minZoom, Math.min(this.maxZoom, zoom))
    this.updateCanvasTransform()
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
    // Combine pan translate, centering offset, and zoom scale into a single transform
    // Order: translate for centering + pan, then scale (combined responsive + zoom)
    const combinedScale = this.scale * this.zoomLevel
    const totalX = this.fitLeft + this.panState.offsetX
    const totalY = this.fitTop + this.panState.offsetY
    const transform = `translate(${totalX}px, ${totalY}px) scale(${combinedScale})`
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

    // Divide by combined scale and zoom to convert client pixels to card units
    const dx = (e.clientX - this.dragState.startX) / (this.scale * this.zoomLevel)
    const dy = (e.clientY - this.dragState.startY) / (this.scale * this.zoomLevel)
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

  destroy(): void {
    // Clean up any pending animation timeouts
    if (this.fadeCompleteTimeout !== null) {
      clearTimeout(this.fadeCompleteTimeout)
      this.fadeCompleteTimeout = null
    }

    // Stop ResizeObserver
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
    }

    // Remove from DOM
    if (this.element.parentNode) {
      this.element.parentNode.removeChild(this.element)
    }
  }
}
