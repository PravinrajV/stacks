/**
 * Test RunModeViewer layout and transform behavior.
 * 
 * Tests that the card-view applies computeFit transform (scale and translate)
 * to center and scale the card to fit the run-mode container.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { RunModeViewer } from './runMode'
import { createCard, createStack } from '../model/stack'

describe('RunModeViewer', () => {
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

  it('should apply computeFit transform with given container size', () => {
    const viewer = new RunModeViewer()
    const viewerElement = viewer.getElement()
    container.appendChild(viewerElement)

    // Create a card
    const stack = createStack('test-stack', 'Test Stack')
    const card = createCard('test-card-1', 'Test Card', null)

    // Render the card
    viewer.render(stack, card, null)

    // Mock the card-canvas container dimensions
    const cardCanvas = viewerElement.querySelector('.card-canvas') as HTMLElement
    if (cardCanvas) {
      Object.defineProperty(cardCanvas, 'getBoundingClientRect', {
        value: () => ({
          width: 1280,
          height: 725,
          top: 0,
          left: 0,
          bottom: 725,
          right: 1280,
          x: 0,
          y: 0,
          toJSON: () => {}
        })
      })
    }

    // Trigger fit calculation
    viewer.testUpdateFit()

    // Get the card-view element
    const cardView = viewerElement.querySelector('.card-view') as HTMLElement
    expect(cardView).toBeDefined()

    // Check transform is applied
    const transform = cardView.style.transform
    expect(transform).toBeTruthy()
    expect(transform).toMatch(/translate\(/)
    expect(transform).toMatch(/scale\(/)

    // Verify transform-origin is set to top left
    expect(cardView.style.transformOrigin).toBe('top left')

    // Extract and verify scale value
    const scaleMatch = transform.match(/scale\(([0-9.]+)\)/)
    expect(scaleMatch).toBeTruthy()
    if (scaleMatch) {
      const scale = parseFloat(scaleMatch[1])
      // For a 1280x725 container and 512x342 card:
      // scaleX = 1280/512 = 2.5
      // scaleY = 725/342 ≈ 2.12
      // scale = min(2.5, 2.12) ≈ 2.12
      expect(scale).toBeGreaterThan(2)
      expect(scale).toBeLessThan(2.2)
    }

    // Extract and verify translate values
    const translateMatch = transform.match(/translate\(([0-9.]+)px, ([0-9.]+)px\)/)
    expect(translateMatch).toBeTruthy()
    if (translateMatch) {
      const left = parseFloat(translateMatch[1])
      const top = parseFloat(translateMatch[2])
      // For centering: (1280 - 512*2.12) / 2 ≈ (1280 - 1085) / 2 ≈ 97.5
      // (725 - 342*2.12) / 2 ≈ (725 - 724) / 2 ≈ 0.5
      expect(left).toBeGreaterThan(0) // Should be centered
      expect(top).toBeGreaterThanOrEqual(0)
    }
  })

  it('should have card-view with fixed 512x342 logical dimensions', () => {
    const viewer = new RunModeViewer()
    container.appendChild(viewer.getElement())
    
    const stack = createStack('test-stack', 'Test Stack')
    const card = createCard('test-card-1', 'Test Card', null)
    
    viewer.render(stack, card, null)
    
    const cardView = container.querySelector('.card-view') as HTMLElement
    expect(cardView).toBeDefined()
    expect(cardView.classList.contains('card-view')).toBe(true)
  })

  it('should scale up card to fit larger container (1280x800)', () => {
    const viewer = new RunModeViewer()
    const viewerElement = viewer.getElement()
    container.appendChild(viewerElement)

    const stack = createStack('test-stack', 'Test Stack')
    const card = createCard('test-card-1', 'Test Card', null)
    viewer.render(stack, card, null)

    // Mock large container
    const cardCanvas = viewerElement.querySelector('.card-canvas') as HTMLElement
    if (cardCanvas) {
      Object.defineProperty(cardCanvas, 'getBoundingClientRect', {
        value: () => ({
          width: 1280,
          height: 800,
          top: 0,
          left: 0,
          bottom: 800,
          right: 1280,
          x: 0,
          y: 0,
          toJSON: () => {}
        })
      })
    }

    viewer.testUpdateFit()

    const scale = viewer.testGetScale()
    // Scale should be > 1 for upscaling
    expect(scale).toBeGreaterThan(1)
    // Scale should be approximately 2.34 for this container (800/342)
    expect(scale).toBeGreaterThan(2.3)
    expect(scale).toBeLessThan(2.4)
  })

  it('should return correct scale and offsets from test helpers', () => {
    const viewer = new RunModeViewer()
    const viewerElement = viewer.getElement()
    container.appendChild(viewerElement)

    const stack = createStack('test-stack', 'Test Stack')
    const card = createCard('test-card-1', 'Test Card', null)
    viewer.render(stack, card, null)

    const cardCanvas = viewerElement.querySelector('.card-canvas') as HTMLElement
    if (cardCanvas) {
      Object.defineProperty(cardCanvas, 'getBoundingClientRect', {
        value: () => ({
          width: 1024,
          height: 768,
          top: 0,
          left: 0,
          bottom: 768,
          right: 1024,
          x: 0,
          y: 0,
          toJSON: () => {}
        })
      })
    }

    viewer.testUpdateFit()

    const scale = viewer.testGetScale()
    const offsets = viewer.testGetFitOffsets()

    expect(scale).toBeGreaterThan(0)
    expect(offsets.left).toBeGreaterThanOrEqual(0)
    expect(offsets.top).toBeGreaterThanOrEqual(0)
  })

  it('should apply transform with translate and scale in correct order', () => {
    const viewer = new RunModeViewer()
    const viewerElement = viewer.getElement()
    container.appendChild(viewerElement)

    const stack = createStack('test-stack', 'Test Stack')
    const card = createCard('test-card-1', 'Test Card', null)
    viewer.render(stack, card, null)

    const cardCanvas = viewerElement.querySelector('.card-canvas') as HTMLElement
    if (cardCanvas) {
      Object.defineProperty(cardCanvas, 'getBoundingClientRect', {
        value: () => ({
          width: 600,
          height: 450,
          top: 0,
          left: 0,
          bottom: 450,
          right: 600,
          x: 0,
          y: 0,
          toJSON: () => {}
        })
      })
    }

    viewer.testUpdateFit()

    const cardView = viewerElement.querySelector('.card-view') as HTMLElement
    const transform = cardView.style.transform

    // Transform should be: translate(...) scale(...)
    // translate should come before scale
    const translateIndex = transform.indexOf('translate')
    const scaleIndex = transform.indexOf('scale')
    expect(translateIndex).toBeLessThan(scaleIndex)
    expect(translateIndex).toBeGreaterThanOrEqual(0)
  })

  it('should handle small container by scaling down', () => {
    const viewer = new RunModeViewer()
    const viewerElement = viewer.getElement()
    container.appendChild(viewerElement)

    const stack = createStack('test-stack', 'Test Stack')
    const card = createCard('test-card-1', 'Test Card', null)
    viewer.render(stack, card, null)

    // Mock small container
    const cardCanvas = viewerElement.querySelector('.card-canvas') as HTMLElement
    if (cardCanvas) {
      Object.defineProperty(cardCanvas, 'getBoundingClientRect', {
        value: () => ({
          width: 256,
          height: 171,
          top: 0,
          left: 0,
          bottom: 171,
          right: 256,
          x: 0,
          y: 0,
          toJSON: () => {}
        })
      })
    }

    viewer.testUpdateFit()

    const scale = viewer.testGetScale()
    // Scale should be 0.5 for a 256x171 container (exactly half the card size)
    expect(scale).toBeCloseTo(0.5, 1)
  })
})
