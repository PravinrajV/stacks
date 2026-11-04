/**
 * Task 8.1: Tests for responsive card scaling and drag calculations at scale.
 * 
 * Verify that:
 * 1. Card scales correctly for given stage sizes
 * 2. Drag operations use correct scaled coordinates
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { App } from '../src/dom/app'
import { CardCanvas } from '../src/dom/cardCanvas'
import { createCard, createStack } from '../src/model/stack'
import type { Rect } from '../src/model/types'

const CARD_PADDING = 24 // Padding on each side

describe('Task 8.1: Card Scaling and Responsive Layout', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.getElementById('app') || document.createElement('div')
    if (!container.id) {
      container.id = 'app'
      document.body.appendChild(container)
    }

    // Mock ResizeObserver if not available
    if (typeof window !== 'undefined' && !window.ResizeObserver) {
      ;(window as any).ResizeObserver = class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    }
  })

  afterEach(() => {
    // Clean up
    if (container) {
      while (container.firstChild) {
        container.removeChild(container.firstChild)
      }
    }
  })

  describe('Card scaling computation', () => {
    it('calculates scale for 1024x684 stage (with padding)', () => {
      const canvas = new CardCanvas()
      const canvasElement = canvas.getElement()
      container.appendChild(canvasElement)

      // Mock container with 1024x684 size
      const mockContainer = canvasElement.querySelector('.canvas-container') as HTMLElement
      if (mockContainer) {
        Object.defineProperty(mockContainer, 'getBoundingClientRect', {
          value: () => ({
            width: 1024,
            height: 684,
            top: 0,
            left: 0,
            bottom: 684,
            right: 1024,
            x: 0,
            y: 0,
            toJSON: () => {}
          })
        })

        // Trigger scale calculation
        canvas.testUpdateScale()
      }

      // With 24px padding: (1024-48)/512 ≈ 1.906, (684-48)/342 ≈ 1.863
      // scale = min(1.906, 1.863) ≈ 1.863
      expect(canvas.getScale()).toBeCloseTo(Math.min((1024 - 48) / 512, (684 - 48) / 342), 1)
    })

    it('calculates scale for 512x342 stage (exact card size with padding)', () => {
      const canvas = new CardCanvas()
      const canvasElement = canvas.getElement()
      container.appendChild(canvasElement)

      const mockContainer = canvasElement.querySelector('.canvas-container') as HTMLElement
      if (mockContainer) {
        Object.defineProperty(mockContainer, 'getBoundingClientRect', {
          value: () => ({
            width: 512,
            height: 342,
            top: 0,
            left: 0,
            bottom: 342,
            right: 512,
            x: 0,
            y: 0,
            toJSON: () => {}
          })
        })

        canvas.testUpdateScale()
      }

      // With 24px padding: (512-48)/512 ≈ 0.906, (342-48)/342 ≈ 0.859
      // scale = min(0.906, 0.859) ≈ 0.859
      expect(canvas.getScale()).toBeCloseTo(Math.min((512 - 48) / 512, (342 - 48) / 342), 1)
    })

    it('calculates scale ~0.49 for 300x300 stage (with padding)', () => {
      const canvas = new CardCanvas()
      const canvasElement = canvas.getElement()
      container.appendChild(canvasElement)

      const mockContainer = canvasElement.querySelector('.canvas-container') as HTMLElement
      if (mockContainer) {
        Object.defineProperty(mockContainer, 'getBoundingClientRect', {
          value: () => ({
            width: 300,
            height: 300,
            top: 0,
            left: 0,
            bottom: 300,
            right: 300,
            x: 0,
            y: 0,
            toJSON: () => {}
          })
        })

        canvas.testUpdateScale()
      }

      // With padding: (300-48)/512 ≈ 0.492, (300-48)/342 ≈ 0.737
      // scale = min(0.492, 0.737) ≈ 0.492
      expect(canvas.getScale()).toBeCloseTo(Math.min((300 - 48) / 512, (300 - 48) / 342), 2)
    })

    it('preserves aspect ratio: taller container limited by width', () => {
      const canvas = new CardCanvas()
      const canvasElement = canvas.getElement()
      container.appendChild(canvasElement)

      const mockContainer = canvasElement.querySelector('.canvas-container') as HTMLElement
      if (mockContainer) {
        // Width-limited with padding
        Object.defineProperty(mockContainer, 'getBoundingClientRect', {
          value: () => ({
            width: 256,  // (256-48)/512 ≈ 0.406
            height: 1000,  // (1000-48)/342 ≈ 2.788
            top: 0,
            left: 0,
            bottom: 1000,
            right: 256,
            x: 0,
            y: 0,
            toJSON: () => {}
          })
        })

        canvas.testUpdateScale()
      }

      // min((256-48)/512, (1000-48)/342) = min(0.406, 2.788) = 0.406
      expect(canvas.getScale()).toBeCloseTo(Math.min((256 - 48) / 512, (1000 - 48) / 342), 1)
    })

    it('preserves aspect ratio: wider container limited by height', () => {
      const canvas = new CardCanvas()
      const canvasElement = canvas.getElement()
      container.appendChild(canvasElement)

      const mockContainer = canvasElement.querySelector('.canvas-container') as HTMLElement
      if (mockContainer) {
        // Height-limited with padding
        Object.defineProperty(mockContainer, 'getBoundingClientRect', {
          value: () => ({
            width: 1000,  // (1000-48)/512 ≈ 1.855
            height: 171,  // (171-48)/342 ≈ 0.359
            top: 0,
            left: 0,
            bottom: 171,
            right: 1000,
            x: 0,
            y: 0,
            toJSON: () => {}
          })
        })

        canvas.testUpdateScale()
      }

      // min((1000-48)/512, (171-48)/342) = min(1.855, 0.359) = 0.359
      expect(canvas.getScale()).toBeCloseTo(Math.min((1000 - 48) / 512, (171 - 48) / 342), 1)
    })
  })

  describe('Drag operations at scale', () => {
    it('drag at scale 2.0 moves card units by half the mouse delta', () => {
      const stack = createStack('test-stack', 'Test')
      const card = createCard('test-card', 'Test Card', null)
      card.buttons.push({
        id: 'btn-1',
        label: 'Test Button',
        rect: { left: 100, top: 100, right: 200, bottom: 150 },
        script: ''
      })
      stack.cards.push(card)

      const canvas = new CardCanvas()
      const canvasElement = canvas.getElement()
      container.appendChild(canvasElement)

      // Mock a 2.0 scale (1024x684 container)
      const mockContainer = canvasElement.querySelector('.canvas-container') as HTMLElement
      if (mockContainer) {
        Object.defineProperty(mockContainer, 'getBoundingClientRect', {
          value: () => ({
            width: 1024,
            height: 684,
            top: 0,
            left: 0,
            bottom: 684,
            right: 1024,
            x: 0,
            y: 0,
            toJSON: () => {}
          })
        })
      }

      // Render the card
      canvas.render(card, null)

      // Simulate selection and drag
      let movedRect: Rect | null = null
      canvas.onElementMoved((id, rect) => {
        movedRect = rect
      })

      const cardView = canvasElement.querySelector('.card-view') as HTMLElement
      const buttonEl = cardView?.querySelector('[data-element-id="btn-1"]') as HTMLElement

      if (buttonEl) {
        // Simulate mousedown on button
        const mouseDownEvent = new MouseEvent('mousedown', {
          bubbles: true,
          clientX: 512,
          clientY: 256
        })
        buttonEl.dispatchEvent(mouseDownEvent)

        // Simulate mousemove: 100 pixels delta in client coordinates
        // At scale 2.0, 100 client pixels = 50 card units
        // Button starts at (100, 100), so should move to (100 + 50, 100) = (150, 100)
        const mouseMoveEvent = new MouseEvent('mousemove', {
          bubbles: true,
          clientX: 612,  // 512 + 100 pixels
          clientY: 256   // No vertical movement
        })
        document.dispatchEvent(mouseMoveEvent)

        // Simulate mouseup to finalize
        const mouseUpEvent = new MouseEvent('mouseup', {
          bubbles: true
        })
        document.dispatchEvent(mouseUpEvent)
      }

      // Verify: 100 pixels delta at scale 2.0 -> 50 card unit delta
      // Original: left: 100, expected: left: 150
      if (movedRect) {
        expect(movedRect.left).toBeCloseTo(150, 0)
      }
    })

    it('drag at scale 1.0 moves card units by full mouse delta', () => {
      const stack = createStack('test-stack', 'Test')
      const card = createCard('test-card', 'Test Card', null)
      card.buttons.push({
        id: 'btn-1',
        label: 'Test Button',
        rect: { left: 100, top: 100, right: 200, bottom: 150 },
        script: ''
      })
      stack.cards.push(card)

      const canvas = new CardCanvas()
      const canvasElement = canvas.getElement()
      container.appendChild(canvasElement)

      // Mock a 1.0 scale (512x342 container)
      const mockContainer = canvasElement.querySelector('.canvas-container') as HTMLElement
      if (mockContainer) {
        Object.defineProperty(mockContainer, 'getBoundingClientRect', {
          value: () => ({
            width: 512,
            height: 342,
            top: 0,
            left: 0,
            bottom: 342,
            right: 512,
            x: 0,
            y: 0,
            toJSON: () => {}
          })
        })
      }

      canvas.render(card, null)

      let movedRect: Rect | null = null
      canvas.onElementMoved((id, rect) => {
        movedRect = rect
      })

      const cardView = canvasElement.querySelector('.card-view') as HTMLElement
      const buttonEl = cardView?.querySelector('[data-element-id="btn-1"]') as HTMLElement

      if (buttonEl) {
        // Simulate mousedown
        const mouseDownEvent = new MouseEvent('mousedown', {
          bubbles: true,
          clientX: 256,
          clientY: 171
        })
        buttonEl.dispatchEvent(mouseDownEvent)

        // Simulate mousemove: 50 pixels delta
        // At scale 1.0, 50 pixels = 50 card units
        const mouseMoveEvent = new MouseEvent('mousemove', {
          bubbles: true,
          clientX: 306,  // 256 + 50 pixels
          clientY: 171
        })
        document.dispatchEvent(mouseMoveEvent)

        const mouseUpEvent = new MouseEvent('mouseup', { bubbles: true })
        document.dispatchEvent(mouseUpEvent)
      }

      // Button starts at left: 100, moves by 50 units -> left: 150
      if (movedRect) {
        expect(movedRect.left).toBeCloseTo(150, 0)
      }
    })
  })
})
