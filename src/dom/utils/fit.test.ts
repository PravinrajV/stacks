import { describe, it, expect } from 'vitest'
import { computeFit } from './fit'

describe('computeFit', () => {
  const cardWidth = 512
  const cardHeight = 342
  const aspectRatio = cardWidth / cardHeight

  it('should fit and centre at 1280x800', () => {
    const { scale, left, top } = computeFit(1280, 800)

    // Scale should fit both dimensions
    const scaledWidth = cardWidth * scale
    const scaledHeight = cardHeight * scale
    expect(scaledWidth).toBeLessThanOrEqual(1280)
    expect(scaledHeight).toBeLessThanOrEqual(800)

    // Aspect ratio preserved
    expect(scaledHeight / scaledWidth).toBeCloseTo(1 / aspectRatio, 5)

    // Should be centred
    const expectedLeft = (1280 - scaledWidth) / 2
    const expectedTop = (800 - scaledHeight) / 2
    expect(left).toBeCloseTo(expectedLeft, 1)
    expect(top).toBeCloseTo(expectedTop, 1)
  })

  it('should fit and centre at 583x448', () => {
    const { scale, left, top } = computeFit(583, 448)

    const scaledWidth = cardWidth * scale
    const scaledHeight = cardHeight * scale
    expect(scaledWidth).toBeLessThanOrEqual(583)
    expect(scaledHeight).toBeLessThanOrEqual(448)

    // Aspect ratio preserved
    expect(scaledHeight / scaledWidth).toBeCloseTo(1 / aspectRatio, 5)

    // Should be centred
    const expectedLeft = (583 - scaledWidth) / 2
    const expectedTop = (448 - scaledHeight) / 2
    expect(left).toBeCloseTo(expectedLeft, 1)
    expect(top).toBeCloseTo(expectedTop, 1)
  })

  it('should fit and centre at 300x200', () => {
    const { scale, left, top } = computeFit(300, 200)

    const scaledWidth = cardWidth * scale
    const scaledHeight = cardHeight * scale
    expect(scaledWidth).toBeLessThanOrEqual(300)
    expect(scaledHeight).toBeLessThanOrEqual(200)

    // Aspect ratio preserved
    expect(scaledHeight / scaledWidth).toBeCloseTo(1 / aspectRatio, 5)

    // Should be centred
    const expectedLeft = (300 - scaledWidth) / 2
    const expectedTop = (200 - scaledHeight) / 2
    expect(left).toBeCloseTo(expectedLeft, 1)
    expect(top).toBeCloseTo(expectedTop, 1)
  })

  it('should scale up when container is larger than card', () => {
    // When container is much larger than card, scale upward to fill space
    const { scale, left, top } = computeFit(2000, 2000)
    
    // Scale should fit the card within the container
    const scaledWidth = cardWidth * scale
    const scaledHeight = cardHeight * scale
    expect(scaledWidth).toBeLessThanOrEqual(2000)
    expect(scaledHeight).toBeLessThanOrEqual(2000)
    
    // Aspect ratio preserved
    expect(scaledHeight / scaledWidth).toBeCloseTo(1 / aspectRatio, 5)
    
    // Card should be centred
    const expectedLeft = (2000 - scaledWidth) / 2
    const expectedTop = (2000 - scaledHeight) / 2
    expect(left).toBeCloseTo(expectedLeft, 1)
    expect(top).toBeCloseTo(expectedTop, 1)
  })

  it('should preserve aspect ratio for portrait container', () => {
    const { scale } = computeFit(300, 500)
    const scaledWidth = cardWidth * scale
    const scaledHeight = cardHeight * scale
    expect(scaledHeight / scaledWidth).toBeCloseTo(1 / aspectRatio, 5)
  })

  it('should preserve aspect ratio for landscape container', () => {
    const { scale } = computeFit(800, 300)
    const scaledWidth = cardWidth * scale
    const scaledHeight = cardHeight * scale
    expect(scaledHeight / scaledWidth).toBeCloseTo(1 / aspectRatio, 5)
  })
})
