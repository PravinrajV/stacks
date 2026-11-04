import { describe, it, expect } from 'vitest'
import { Rect, width, height, center, intersect, containsPoint } from './types'

describe('Rect utilities', () => {
  const rect: Rect = { left: 10, top: 20, right: 50, bottom: 60 }

  it('calculates width correctly', () => {
    expect(width(rect)).toBe(40)
  })

  it('calculates height correctly', () => {
    expect(height(rect)).toBe(40)
  })

  it('calculates center correctly', () => {
    const [x, y] = center(rect)
    expect(x).toBe(30)
    expect(y).toBe(40)
  })

  it('detects intersecting rectangles', () => {
    const rect2: Rect = { left: 30, top: 40, right: 70, bottom: 80 }
    expect(intersect(rect, rect2)).toBe(true)
  })

  it('detects non-intersecting rectangles', () => {
    const rect2: Rect = { left: 60, top: 70, right: 100, bottom: 110 }
    expect(intersect(rect, rect2)).toBe(false)
  })

  it('detects point inside rectangle', () => {
    expect(containsPoint(rect, 30, 40)).toBe(true)
  })

  it('detects point outside rectangle', () => {
    expect(containsPoint(rect, 60, 70)).toBe(false)
  })

  it('handles edge case: point on boundary', () => {
    expect(containsPoint(rect, 10, 20)).toBe(true)
    expect(containsPoint(rect, 50, 60)).toBe(true)
  })
})
