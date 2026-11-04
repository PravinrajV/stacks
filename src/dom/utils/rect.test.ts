import { describe, it, expect } from 'vitest'
import {
  rectWidth,
  rectHeight,
  rectCenter,
  pointInRect,
  rectsIntersect,
  rectIntersection,
  rectContains,
  rectDistance,
  createRect,
  offsetRect,
  constrainRect,
} from './rect'
import type { Rect } from '../../model/types'

describe('Rectangle utilities', () => {
  const rect1: Rect = { left: 0, top: 0, right: 100, bottom: 100 }
  const rect2: Rect = { left: 50, top: 50, right: 150, bottom: 150 }
  const rect3: Rect = { left: 200, top: 200, right: 300, bottom: 300 }

  describe('rectWidth', () => {
    it('calculates width correctly', () => {
      expect(rectWidth(rect1)).toBe(100)
      expect(rectWidth(rect2)).toBe(100)
    })

    it('calculates width for edge cases', () => {
      expect(rectWidth({ left: 0, top: 0, right: 0, bottom: 0 })).toBe(0)
      expect(rectWidth({ left: 10, top: 10, right: 20, bottom: 20 })).toBe(10)
    })
  })

  describe('rectHeight', () => {
    it('calculates height correctly', () => {
      expect(rectHeight(rect1)).toBe(100)
      expect(rectHeight(rect2)).toBe(100)
    })

    it('calculates height for edge cases', () => {
      expect(rectHeight({ left: 0, top: 0, right: 0, bottom: 0 })).toBe(0)
      expect(rectHeight({ left: 10, top: 10, right: 20, bottom: 20 })).toBe(10)
    })
  })

  describe('rectCenter', () => {
    it('calculates center of rectangle', () => {
      const center = rectCenter(rect1)
      expect(center.x).toBe(50)
      expect(center.y).toBe(50)
    })

    it('calculates center correctly for offset rectangles', () => {
      const center = rectCenter(rect2)
      expect(center.x).toBe(100)
      expect(center.y).toBe(100)
    })
  })

  describe('pointInRect', () => {
    it('detects point inside rectangle', () => {
      expect(pointInRect(50, 50, rect1)).toBe(true)
      expect(pointInRect(0, 0, rect1)).toBe(true)
      expect(pointInRect(100, 100, rect1)).toBe(true)
    })

    it('detects point outside rectangle', () => {
      expect(pointInRect(150, 150, rect1)).toBe(false)
      expect(pointInRect(-1, 50, rect1)).toBe(false)
      expect(pointInRect(50, -1, rect1)).toBe(false)
    })

    it('handles edge cases (point on boundary)', () => {
      expect(pointInRect(0, 0, rect1)).toBe(true)
      expect(pointInRect(100, 100, rect1)).toBe(true)
      expect(pointInRect(0, 100, rect1)).toBe(true)
    })
  })

  describe('rectsIntersect', () => {
    it('detects overlapping rectangles', () => {
      expect(rectsIntersect(rect1, rect2)).toBe(true)
      expect(rectsIntersect(rect2, rect1)).toBe(true)
    })

    it('detects non-overlapping rectangles', () => {
      expect(rectsIntersect(rect1, rect3)).toBe(false)
      expect(rectsIntersect(rect3, rect1)).toBe(false)
    })

    it('detects touching rectangles', () => {
      const touching: Rect = { left: 100, top: 0, right: 200, bottom: 100 }
      expect(rectsIntersect(rect1, touching)).toBe(true)
    })

    it('handles identical rectangles', () => {
      expect(rectsIntersect(rect1, rect1)).toBe(true)
    })
  })

  describe('rectIntersection', () => {
    it('calculates intersection of overlapping rectangles', () => {
      const intersection = rectIntersection(rect1, rect2)
      expect(intersection).toEqual({ left: 50, top: 50, right: 100, bottom: 100 })
    })

    it('returns null for non-overlapping rectangles', () => {
      const intersection = rectIntersection(rect1, rect3)
      expect(intersection).toBeNull()
    })

    it('handles identical rectangles', () => {
      const intersection = rectIntersection(rect1, rect1)
      expect(intersection).toEqual(rect1)
    })

    it('handles partial overlap', () => {
      const partial1: Rect = { left: 75, top: 75, right: 125, bottom: 125 }
      const intersection = rectIntersection(rect1, partial1)
      expect(intersection).toEqual({ left: 75, top: 75, right: 100, bottom: 100 })
    })
  })

  describe('rectContains', () => {
    it('detects rectangle containing another', () => {
      const small: Rect = { left: 10, top: 10, right: 90, bottom: 90 }
      expect(rectContains(rect1, small)).toBe(true)
    })

    it('detects identical rectangles as contained', () => {
      expect(rectContains(rect1, rect1)).toBe(true)
    })

    it('detects rectangle not containing another', () => {
      expect(rectContains(rect1, rect2)).toBe(false)
      expect(rectContains(rect1, rect3)).toBe(false)
    })

    it('detects partial overlap as not containing', () => {
      const partial: Rect = { left: 50, top: 50, right: 150, bottom: 150 }
      expect(rectContains(rect1, partial)).toBe(false)
    })
  })

  describe('rectDistance', () => {
    it('calculates zero distance for overlapping rectangles', () => {
      expect(rectDistance(rect1, rect2)).toBe(0)
      expect(rectDistance(rect1, rect1)).toBe(0)
    })

    it('calculates non-zero distance for non-overlapping rectangles', () => {
      const dist = rectDistance(rect1, rect3)
      expect(dist).toBeGreaterThan(0)
      // Distance from (100, 100) to (200, 200) is sqrt((100)^2 + (100)^2) = 141.42...
      expect(Math.abs(dist - Math.sqrt(20000))).toBeLessThan(0.01)
    })

    it('calculates zero distance for touching rectangles', () => {
      const touching: Rect = { left: 100, top: 0, right: 200, bottom: 100 }
      expect(rectDistance(rect1, touching)).toBe(0)
    })

    it('handles vertical separation', () => {
      const below: Rect = { left: 0, top: 100, right: 100, bottom: 200 }
      expect(rectDistance(rect1, below)).toBe(0)
    })
  })

  describe('createRect', () => {
    it('creates rectangle from position and size', () => {
      const rect = createRect(10, 20, 30, 40)
      expect(rect).toEqual({ left: 10, top: 20, right: 40, bottom: 60 })
    })

    it('creates zero-sized rectangle', () => {
      const rect = createRect(0, 0, 0, 0)
      expect(rect).toEqual({ left: 0, top: 0, right: 0, bottom: 0 })
    })

    it('creates negative-positioned rectangle', () => {
      const rect = createRect(-10, -20, 50, 60)
      expect(rect).toEqual({ left: -10, top: -20, right: 40, bottom: 40 })
    })
  })

  describe('offsetRect', () => {
    it('offsets rectangle by dx, dy', () => {
      const offset = offsetRect(rect1, 10, 20)
      expect(offset).toEqual({ left: 10, top: 20, right: 110, bottom: 120 })
    })

    it('offsets by negative values', () => {
      const offset = offsetRect(rect1, -10, -20)
      expect(offset).toEqual({ left: -10, top: -20, right: 90, bottom: 80 })
    })

    it('offsets by zero', () => {
      const offset = offsetRect(rect1, 0, 0)
      expect(offset).toEqual(rect1)
    })

    it('preserves dimensions after offset', () => {
      const offset = offsetRect(rect1, 50, 100)
      expect(rectWidth(offset)).toBe(rectWidth(rect1))
      expect(rectHeight(offset)).toBe(rectHeight(rect1))
    })
  })

  describe('constrainRect', () => {
    const bounds: Rect = { left: 0, top: 0, right: 200, bottom: 200 }

    it('does not move rectangle within bounds', () => {
      const constrained = constrainRect(rect1, bounds)
      expect(constrained).toEqual(rect1)
    })

    it('constrains rectangle exceeding right boundary', () => {
      const rect: Rect = { left: 150, top: 0, right: 250, bottom: 100 }
      const constrained = constrainRect(rect, bounds)
      expect(constrained).toEqual({ left: 100, top: 0, right: 200, bottom: 100 })
    })

    it('constrains rectangle exceeding bottom boundary', () => {
      const rect: Rect = { left: 0, top: 150, right: 100, bottom: 250 }
      const constrained = constrainRect(rect, bounds)
      expect(constrained).toEqual({ left: 0, top: 100, right: 100, bottom: 200 })
    })

    it('constrains rectangle exceeding left boundary', () => {
      const rect: Rect = { left: -50, top: 0, right: 50, bottom: 100 }
      const constrained = constrainRect(rect, bounds)
      expect(constrained).toEqual({ left: 0, top: 0, right: 100, bottom: 100 })
    })

    it('constrains rectangle exceeding top boundary', () => {
      const rect: Rect = { left: 0, top: -50, right: 100, bottom: 50 }
      const constrained = constrainRect(rect, bounds)
      expect(constrained).toEqual({ left: 0, top: 0, right: 100, bottom: 100 })
    })

    it('constrains rectangle larger than bounds to fit bounds', () => {
      const rect: Rect = { left: -50, top: -50, right: 250, bottom: 250 }
      const constrained = constrainRect(rect, bounds)
      // When rect is larger than bounds, we can only constrain the position,
      // not the size (to preserve aspect ratio)
      // So it stays at -50, -50 but clipped to origin
      expect(constrained.left).toBe(0)
      expect(constrained.top).toBe(0)
      expect(rectWidth(constrained)).toBe(rectWidth(rect))
      expect(rectHeight(constrained)).toBe(rectHeight(rect))
    })

    it('preserves dimensions when constraining', () => {
      const rect: Rect = { left: 150, top: 0, right: 250, bottom: 100 }
      const constrained = constrainRect(rect, bounds)
      expect(rectWidth(constrained)).toBe(rectWidth(rect))
      expect(rectHeight(constrained)).toBe(rectHeight(rect))
    })
  })
})
