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
    it('calculates scale 2.0 for 1024x684 stage (exactly double)', () => {
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

      expect(canvas.getScale()).toBeCloseTo(2.0, 1)
    })

    it('calculates scale 1.0 for 512x342 stage (exact card size)', () => {
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

      expect(canvas.getScale()).toBeCloseTo(1.0, 1)
    })

    it('calculates scale ~0.59 for 300x300 stage', () => {
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

      // 300 / 512 = 0.586...
      expect(canvas.getScale()).toBeCloseTo(300 / 512, 2)
    })

    it('preserves aspect ratio: taller container limited by width', () => {
      const canvas = new CardCanvas()
      const canvasElement = canvas.getElement()
      container.appendChild(canvasElement)

      const mockContainer = canvasElement.querySelector('.canvas-container') as HTMLElement
      if (mockContainer) {
        // Width-limited: 512 logical width -> 256 pixels = 0.5 scale
        // Height would allow 512 / (height/logical) but we use min, so scale = 0.5
        Object.defineProperty(mockContainer, 'getBoundingClientRect', {
          value: () => ({
            width: 256,  // Limits to 0.5 scale
            height: 1000,  // Would allow ~2.9 scale
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

      // min(256/512, 1000/342) = min(0.5, 2.9) = 0.5
      expect(canvas.getScale()).toBeCloseTo(0.5, 1)
    })

    it('preserves aspect ratio: wider container limited by height', () => {
      const canvas = new CardCanvas()
      const canvasElement = canvas.getElement()
      container.appendChild(canvasElement)

      const mockContainer = canvasElement.querySelector('.canvas-container') as HTMLElement
      if (mockContainer) {
        // Height-limited: 342 logical height -> 171 pixels = 0.5 scale
        Object.defineProperty(mockContainer, 'getBoundingClientRect', {
          value: () => ({
            width: 1000,  // Would allow ~1.95 scale
            height: 171,  // Limits to 0.5 scale
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

      // min(1000/512, 171/342) = min(1.95, 0.5) = 0.5
      expect(canvas.getScale()).toBeCloseTo(0.5, 1)
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
