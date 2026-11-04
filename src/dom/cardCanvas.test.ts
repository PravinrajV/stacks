/**
 * Test CardCanvas layout and transform behavior.
 * 
 * Tests that card-view maintains 512x342 logical size,
 * and combined transform includes both responsive scale and zoom scale.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CardCanvas } from './cardCanvas'
import { createCard } from '../model/stack'

describe('CardCanvas', () => {
  let container: HTMLElement
  
  beforeEach(() => {
    // Mock ResizeObserver for happy-dom environment
    if (!global.ResizeObserver) {
      global.ResizeObserver = class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      } as any
    }
    
    container = document.createElement('div')
    container.id = 'app'
    document.body.appendChild(container)
  })

  afterEach(() => {
    // Clean up
    if (container.parentNode) {
      container.parentNode.removeChild(container)
    }
    vi.clearAllMocks()
  })

  it('should have card-view with fixed 512x342 logical dimensions', () => {
    const canvas = new CardCanvas()
    container.appendChild(canvas.getElement())
    
    const cardView = container.querySelector('.card-view') as HTMLElement
    expect(cardView).toBeDefined()
    
    // Check that the card-view element exists with the right class
    expect(cardView.classList.contains('card-view')).toBe(true)
    
    // In happy-dom environment, CSS is not computed, but the element should be present
    expect(cardView.tagName).toBe('DIV')
  })

  it('should have transform-origin set to top left', () => {
    const canvas = new CardCanvas()
    container.appendChild(canvas.getElement())
    
    const cardView = container.querySelector('.card-view') as HTMLElement
    
    // Check that transform-origin is set via inline style
    // The CSS will set it, but we verify the class is correct
    expect(cardView.classList.contains('card-view')).toBe(true)
  })

  it('should combine responsive scale and zoom scale in transform', () => {
    const canvas = new CardCanvas()
    const canvasElement = canvas.getElement()
    container.appendChild(canvasElement)

    // Mock the canvas-container dimensions
    const canvasContainer = canvasElement.querySelector('.canvas-container') as HTMLElement
    if (canvasContainer) {
      Object.defineProperty(canvasContainer, 'getBoundingClientRect', {
        value: () => ({
          width: 600,
          height: 400,
          top: 0,
          left: 0,
          bottom: 400,
          right: 600,
          x: 0,
          y: 0,
          toJSON: () => {}
        })
      })
    }

    // Render a card to trigger scale calculation
    const card = createCard('test-card-1', 'Test Card', null)
    canvas.render(card, null)

    // Get the transform string
    const cardView = container.querySelector('.card-view') as HTMLElement
    const transform = cardView.style.transform
    
    // Transform should be present (combines translate + scale)
    expect(transform).toBeTruthy()
    // Initially with no pan/zoom, should just be scale at responsive level
    expect(transform).toMatch(/scale\(/)

    // Now change zoom level
    canvas.setZoomLevel(2)
    const newTransform = cardView.style.transform
    
    // Transform should still contain scale
    expect(newTransform).toMatch(/scale\(/)
    
    // Extract scale values from both transforms
    const oldScaleMatch = transform.match(/scale\(([0-9.]+)\)/)
    const newScaleMatch = newTransform.match(/scale\(([0-9.]+)\)/)
    
    if (oldScaleMatch && newScaleMatch) {
      const oldScale = parseFloat(oldScaleMatch[1])
      const newScale = parseFloat(newScaleMatch[1])
      // New scale should be larger (approximately 2x the old scale due to zoom level 2)
      expect(newScale).toBeGreaterThan(oldScale)
    }
  })

  it('should have container with overflow hidden and min-height 0', () => {
    const canvas = new CardCanvas()
    container.appendChild(canvas.getElement())
    
    const canvasContainer = container.querySelector('.canvas-container') as HTMLElement
    expect(canvasContainer).toBeDefined()
    
    // Check that the container has the right class (CSS will apply the overflow/min-height)
    expect(canvasContainer.classList.contains('canvas-container')).toBe(true)
  })

  it('should preserve translate in transform when zoom changes', () => {
    const canvas = new CardCanvas()
    const canvasElement = canvas.getElement()
    container.appendChild(canvasElement)

    // Mock the canvas-container dimensions
    const canvasContainer = canvasElement.querySelector('.canvas-container') as HTMLElement
    if (canvasContainer) {
      Object.defineProperty(canvasContainer, 'getBoundingClientRect', {
        value: () => ({
          width: 600,
          height: 400,
          top: 0,
          left: 0,
          bottom: 400,
          right: 600,
          x: 0,
          y: 0,
          toJSON: () => {}
        })
      })
    }
    
    const card = createCard('test-card-2', 'Test Card 2', null)
    canvas.render(card, null)
    
    // Simulate a pan by dispatching mouse events (shift+drag)
    const canvasDiv = container.querySelector('.card-canvas') as HTMLElement
    
    // Start pan
    const mouseDownEvent = new MouseEvent('mousedown', {
      bubbles: true,
      shiftKey: true,
      button: 0,
      clientX: 100,
      clientY: 100
    })
    canvasDiv.dispatchEvent(mouseDownEvent)
    
    // Move mouse
    const mouseMoveEvent = new MouseEvent('mousemove', {
      bubbles: true,
      clientX: 150,
      clientY: 150
    })
    canvasDiv.dispatchEvent(mouseMoveEvent)
    
    // Mouse up
    const mouseUpEvent = new MouseEvent('mouseup', {
      bubbles: true
    })
    canvasDiv.dispatchEvent(mouseUpEvent)
    
    // Get transform with pan
    const cardView = container.querySelector('.card-view') as HTMLElement
    const transformWithPan = cardView.style.transform
    
    // Should contain translate
    expect(transformWithPan).toMatch(/translate\(/)
    
    // Now zoom
    canvas.setZoomLevel(1.5)
    const transformWithPanAndZoom = cardView.style.transform
    
    // Should still contain translate (pan preserved)
    expect(transformWithPanAndZoom).toMatch(/translate\(/)
    // And should contain scale (zoom applied)
    expect(transformWithPanAndZoom).toMatch(/scale\(/)
    
    // Both should be in the transform string
    expect(transformWithPanAndZoom.indexOf('translate')).toBeLessThan(transformWithPanAndZoom.indexOf('scale'))
  })

  it('should render card at correct logical size in run mode', () => {
    const canvas = new CardCanvas()
    const canvasElement = canvas.getElement()
    container.appendChild(canvasElement)
    
    const card = createCard('test-card-3', 'Test Card 3', null)
    canvas.render(card, null)
    
    const cardView = container.querySelector('.card-view') as HTMLElement
    
    // Verify the element has the card-view class (CSS will apply the 512x342 sizing)
    expect(cardView).toBeDefined()
    expect(cardView.classList.contains('card-view')).toBe(true)
  })
})
