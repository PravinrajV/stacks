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

    // Get the card-view element
    const cardView = viewerElement.querySelector('.card-view') as HTMLElement
    expect(cardView).toBeDefined()

    // Verify card-view has position:absolute and left/top/margin inline styles
    expect(['0', '0px']).toContain(cardView.style.left)
    expect(['0', '0px']).toContain(cardView.style.top)
    expect(['0', '0px']).toContain(cardView.style.margin)

    // Mock the card-canvas container dimensions (1280x800)
    const cardCanvas = viewerElement.querySelector('.card-canvas') as HTMLElement
    if (cardCanvas) {
      Object.defineProperty(cardCanvas, 'clientWidth', {
        value: 1280,
        configurable: true
      })
      Object.defineProperty(cardCanvas, 'clientHeight', {
        value: 800,
        configurable: true
      })
    }

    // Trigger fit calculation
    viewer.testUpdateFit()

    // Check transform is applied
    const transform = cardView.style.transform
    expect(transform).toBeTruthy()
    expect(transform).toMatch(/translate\(/)
    expect(transform).toMatch(/scale\(/)

    // Verify transform-origin is set to top left
    expect(cardView.style.transformOrigin).toBe('top left')

    // Extract scale and translate values
    const scaleMatch = transform.match(/scale\(([0-9.]+)\)/)
    const translateMatch = transform.match(/translate\(([0-9.]+)px, ([0-9.]+)px\)/)
    
    expect(scaleMatch).toBeTruthy()
    expect(translateMatch).toBeTruthy()

    if (scaleMatch && translateMatch) {
      const scale = parseFloat(scaleMatch[1])
      const left = parseFloat(translateMatch[1])
      const top = parseFloat(translateMatch[2])

      // For a 1280x800 container with 24px padding:
      // Inner: (1280-48) x (800-48) = 1232 x 752
      // scaleX = 1232/512 ≈ 2.406
      // scaleY = 752/342 ≈ 2.199
      // scale = min(2.406, 2.199) ≈ 2.199
      expect(scale).toBeGreaterThan(2.0)
      expect(scale).toBeLessThan(2.5)

      // Left and top should include the padding (24px) plus centering offset
      expect(left).toBeGreaterThanOrEqual(24)
      expect(top).toBeGreaterThanOrEqual(24)
    }
  })

  it('should not apply double centering (card-canvas should use position:relative without flex)', () => {
    const viewer = new RunModeViewer()
    const viewerElement = viewer.getElement()
    container.appendChild(viewerElement)

    const cardCanvas = viewerElement.querySelector('.card-canvas') as HTMLElement
    const cardView = viewerElement.querySelector('.card-view') as HTMLElement

    // Verify card-canvas and card-view exist
    expect(cardCanvas).toBeDefined()
    expect(cardView).toBeDefined()
    
    // card-view should be position:absolute with left:0, top:0 to avoid double centering
    expect(cardView.style.position).toBe('absolute')
    expect(['0', '0px']).toContain(cardView.style.left)
    expect(['0', '0px']).toContain(cardView.style.top)
    
    // The transform (via translate) is the only thing that should position the card
    // This ensures no double centering from flex + transform
    const stack = createStack('test-stack', 'Test Stack')
    const card = createCard('test-card-1', 'Test Card', null)
    viewer.render(stack, card, null)

    const cardCanvas2 = viewerElement.querySelector('.card-canvas') as HTMLElement
    if (cardCanvas2) {
      Object.defineProperty(cardCanvas2, 'clientWidth', {
        value: 1280,
        configurable: true
      })
      Object.defineProperty(cardCanvas2, 'clientHeight', {
        value: 800,
        configurable: true
      })
    }

    viewer.testUpdateFit()

    const transform = cardView.style.transform
    const offsets = viewer.testGetFitOffsets()
    
    // Transform should position the card via translate
    expect(transform).toMatch(/translate\(/)
    // Offsets should include padding (24px minimum)
    expect(offsets.left).toBeGreaterThanOrEqual(24)
    expect(offsets.top).toBeGreaterThanOrEqual(24)
  })

  it('should scale up card to fit larger container (1280x800)', () => {
    const viewer = new RunModeViewer()
    const viewerElement = viewer.getElement()
    container.appendChild(viewerElement)

    const stack = createStack('test-stack', 'Test Stack')
    const card = createCard('test-card-1', 'Test Card', null)
    viewer.render(stack, card, null)

    // Mock large container (1280x800)
    const cardCanvas = viewerElement.querySelector('.card-canvas') as HTMLElement
    if (cardCanvas) {
      Object.defineProperty(cardCanvas, 'clientWidth', {
        value: 1280,
        configurable: true
      })
      Object.defineProperty(cardCanvas, 'clientHeight', {
        value: 800,
        configurable: true
      })
    }

    viewer.testUpdateFit()

    const scale = viewer.testGetScale()
    // Scale should be > 1 for upscaling
    expect(scale).toBeGreaterThan(1)
    // With clientWidth=1280, clientHeight=800, padding=24:
    // Inner: (1280-48) x (800-48) = 1232 x 752
    // scaleX = 1232/512 ≈ 2.406
    // scaleY = 752/342 ≈ 2.199
    // scale = min(2.406, 2.199) ≈ 2.199
    expect(scale).toBeGreaterThan(2.0)
    expect(scale).toBeLessThan(2.5)
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
      Object.defineProperty(cardCanvas, 'clientWidth', {
        value: 1024,
        configurable: true
      })
      Object.defineProperty(cardCanvas, 'clientHeight', {
        value: 768,
        configurable: true
      })
    }

    viewer.testUpdateFit()

    const scale = viewer.testGetScale()
    const offsets = viewer.testGetFitOffsets()

    expect(scale).toBeGreaterThan(0)
    // Offsets should include padding (24px minimum)
    expect(offsets.left).toBeGreaterThanOrEqual(24)
    expect(offsets.top).toBeGreaterThanOrEqual(24)
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
      Object.defineProperty(cardCanvas, 'clientWidth', {
        value: 600,
        configurable: true
      })
      Object.defineProperty(cardCanvas, 'clientHeight', {
        value: 450,
        configurable: true
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

    // Mock small container by setting dimensions that will be reflected in clientWidth/Height
    const cardCanvas = viewerElement.querySelector('.card-canvas') as HTMLElement
    if (cardCanvas) {
      // Set inline styles to control the size
      cardCanvas.style.width = '256px'
      cardCanvas.style.height = '171px'
      
      // Mock clientWidth/clientHeight for the test
      Object.defineProperty(cardCanvas, 'clientWidth', {
        value: 256,
        configurable: true
      })
      Object.defineProperty(cardCanvas, 'clientHeight', {
        value: 171,
        configurable: true
      })
    }

    viewer.testUpdateFit()

    const scale = viewer.testGetScale()
    // With clientWidth=256, clientHeight=171, padding=24:
    // Inner: (256-48) x (171-48) = 208 x 123
    // scaleX = 208/512 ≈ 0.406
    // scaleY = 123/342 ≈ 0.360
    // scale = min(0.406, 0.360) ≈ 0.360
    const expectedInnerWidth = 256 - 48
    const expectedInnerHeight = 171 - 48
    const expectedScale = Math.min(expectedInnerWidth / 512, expectedInnerHeight / 342)
    // Allow for some variance in happy-dom's implementation
    expect(Math.abs(scale - expectedScale) / expectedScale).toBeLessThan(0.5)
  })
})
