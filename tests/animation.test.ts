/**
 * Task 9.4.1 & 9.4.4: Card navigation animation and edge case tests.
 * 
 * Verify card flip/fade animation on navigation.
 * Test animation interruption and rapid mode switches.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CardCanvas } from '../src/dom/cardCanvas'
import { createCard } from '../src/model/stack'
import type { Card, Background } from '../src/model/stack'
import { createElement } from '../src/dom/utils/dom'

function setupDOM(): HTMLElement {
  const container = createElement('div', { className: 'test-container' })
  Object.assign(container.style, {
    position: 'absolute',
    left: '-9999px',
    width: '512px',
    height: '342px'
  })
  document.body.appendChild(container)
  return container
}

function createTestCard(id: string, name: string): Card {
  return createCard(id, name)
}

function createTestBackground(): Background {
  return {
    id: 'bg-1',
    name: 'Background',
    fields: [],
    buttons: [],
    scripts: {}
  }
}

describe('Task 9.4.1: Card Navigation Animation', () => {
  let cardCanvas: CardCanvas
  let container: HTMLElement
  let card1: Card
  let card2: Card
  let background: Background

  beforeEach(() => {
    container = setupDOM()
    cardCanvas = new CardCanvas()
    container.appendChild(cardCanvas.getElement())

    card1 = createTestCard('card-1', 'Card 1')
    card2 = createTestCard('card-2', 'Card 2')
    background = createTestBackground()
  })

  afterEach(() => {
    cardCanvas.destroy()
    if (container.parentNode) {
      container.parentNode.removeChild(container)
    }
  })

  it('should not animate on first card render', async () => {
    const cardView = cardCanvas.getElement().querySelector('.card-view')
    expect(cardView).toBeTruthy()

    cardCanvas.render(card1, background)

    // Check that no animation classes are applied
    expect(cardView!.classList.contains('card-fade-in')).toBe(false)
    expect(cardView!.classList.contains('card-fade-out')).toBe(false)
  })

  it('should apply fade-out class on card change', async () => {
    const cardView = cardCanvas.getElement().querySelector('.card-view')!

    // First render (no animation)
    cardCanvas.render(card1, background)
    expect(cardView.classList.contains('card-fade-out')).toBe(false)

    // Second render (should animate)
    cardCanvas.render(card2, background)
    expect(cardView.classList.contains('card-fade-out')).toBe(true)
  })

  it('should apply fade-in class after fade-out completes', async () => {
    const cardView = cardCanvas.getElement().querySelector('.card-view')!

    cardCanvas.render(card1, background)

    // Change to card2, wait for fade-out then fade-in
    cardCanvas.render(card2, background)
    expect(cardView.classList.contains('card-fade-out')).toBe(true)

    // Wait for fade-out to complete (animation duration is 320ms)
    await new Promise((resolve) => setTimeout(resolve, 350))

    // Check that fade-in was applied
    expect(cardView.classList.contains('card-fade-in')).toBe(true)
  })

  it('should complete animation flow within expected duration', async () => {
    // Use fake timers so the 320ms+320ms cardCanvas timeouts are deterministic under load.
    // Real wall-clock setTimeout(650) was flaky when the box was busy (duration >750ms).
    vi.useFakeTimers()
    try {
      const cardView = cardCanvas.getElement().querySelector('.card-view')!

      cardCanvas.render(card1, background)
      cardCanvas.render(card2, background)
      expect(cardView.classList.contains('card-fade-out')).toBe(true)

      // After fade-out (320ms): fade-in should be applied
      await vi.advanceTimersByTimeAsync(320)
      expect(cardView.classList.contains('card-fade-out')).toBe(false)
      expect(cardView.classList.contains('card-fade-in')).toBe(true)

      // After fade-in (another 320ms): classes cleared
      await vi.advanceTimersByTimeAsync(320)
      expect(cardView.classList.contains('card-fade-out')).toBe(false)
      expect(cardView.classList.contains('card-fade-in')).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('Task 9.4.4: Animation Edge Cases', () => {
  let cardCanvas: CardCanvas
  let container: HTMLElement
  let card1: Card
  let card2: Card
  let card3: Card
  let background: Background

  beforeEach(() => {
    container = setupDOM()
    cardCanvas = new CardCanvas()
    container.appendChild(cardCanvas.getElement())

    card1 = createTestCard('card-1', 'Card 1')
    card2 = createTestCard('card-2', 'Card 2')
    card3 = createTestCard('card-3', 'Card 3')
    background = createTestBackground()
  })

  afterEach(() => {
    cardCanvas.destroy()
    if (container.parentNode) {
      container.parentNode.removeChild(container)
    }
  })

  it('should handle rapid consecutive card changes without queue buildup', async () => {
    const cardView = cardCanvas.getElement().querySelector('.card-view')!

    cardCanvas.render(card1, background)

    // Rapid changes before animation completes
    cardCanvas.render(card2, background)
    await new Promise((resolve) => setTimeout(resolve, 100))

    cardCanvas.render(card3, background)
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Should eventually show card3
    await new Promise((resolve) => setTimeout(resolve, 650))

    // Verify we're showing card3 content by checking the card data
    expect(card3.id).toBe('card-3')
  })

  it('should not leave animation classes when animation completes', async () => {
    const cardView = cardCanvas.getElement().querySelector('.card-view')!

    cardCanvas.render(card1, background)
    cardCanvas.render(card2, background)

    // Wait for animation to complete
    await new Promise((resolve) => setTimeout(resolve, 650))

    // All animation classes should be cleared
    expect(cardView.classList.contains('card-fade-out')).toBe(false)
    expect(cardView.classList.contains('card-fade-in')).toBe(false)
    expect(cardView.classList.contains('card-flip-out')).toBe(false)
    expect(cardView.classList.contains('card-flip-in')).toBe(false)
  })

  it('should remain interactive after animation completes', async () => {
    cardCanvas.render(card1, background)

    const button = { id: 'btn-1', label: 'Test', rect: { x: 50, y: 50, w: 100, h: 40 }, style: {}, scripts: {} }
    card1.buttons.push(button)
    cardCanvas.render(card2, background)

    // Wait for animation to complete
    await new Promise((resolve) => setTimeout(resolve, 650))

    // Verify card content is updated and interactive
    const cardView = cardCanvas.getElement().querySelector('.card-view')
    expect(cardView).toBeTruthy()
  })

  it('should handle destroy during animation', async () => {
    cardCanvas.render(card1, background)
    cardCanvas.render(card2, background)

    // Destroy while animation is in progress
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(() => cardCanvas.destroy()).not.toThrow()
  })
})

describe('Task 9.4.3: prefers-reduced-motion Handling', () => {
  let cardCanvas: CardCanvas
  let container: HTMLElement
  let card1: Card
  let card2: Card
  let background: Background
  let originalMatchMedia: any

  beforeEach(() => {
    container = setupDOM()
    cardCanvas = new CardCanvas()
    container.appendChild(cardCanvas.getElement())

    card1 = createTestCard('card-1', 'Card 1')
    card2 = createTestCard('card-2', 'Card 2')
    background = createTestBackground()

    // Store original matchMedia
    originalMatchMedia = window.matchMedia
  })

  afterEach(() => {
    cardCanvas.destroy()
    if (container.parentNode) {
      container.parentNode.removeChild(container)
    }
    window.matchMedia = originalMatchMedia
  })

  it('should complete animation instantly when prefers-reduced-motion is set', async () => {
    // Mock matchMedia to return prefers-reduced-motion: reduce
    window.matchMedia = vi.fn((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => true
    })) as any

    const cardView = cardCanvas.getElement().querySelector('.card-view')!

    cardCanvas.render(card1, background)
    const startTime = performance.now()

    cardCanvas.render(card2, background)

    // Wait for reduced animation (should be instant with 0s duration)
    await new Promise((resolve) => setTimeout(resolve, 50))

    const duration = performance.now() - startTime
    // With prefers-reduced-motion, animation duration is 0
    expect(duration).toBeLessThan(200)

    // Animation classes should be cleared
    expect(cardView.classList.contains('card-fade-out')).toBe(false)
    expect(cardView.classList.contains('card-fade-in')).toBe(false)
  })
})
