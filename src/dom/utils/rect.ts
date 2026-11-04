/**
 * Rectangle utilities for UI layout and hit testing.
 */

import type { Rect } from '../../model/types'

/**
 * Calculate width of rectangle.
 */
export function rectWidth(rect: Rect): number {
  return rect.right - rect.left
}

/**
 * Calculate height of rectangle.
 */
export function rectHeight(rect: Rect): number {
  return rect.bottom - rect.top
}

/**
 * Get center point of rectangle.
 */
export function rectCenter(rect: Rect): { x: number; y: number } {
  return {
    x: (rect.left + rect.right) / 2,
    y: (rect.top + rect.bottom) / 2
  }
}

/**
 * Check if point is inside rectangle.
 */
export function pointInRect(x: number, y: number, rect: Rect): boolean {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
}

/**
 * Check if rectangles intersect.
 */
export function rectsIntersect(a: Rect, b: Rect): boolean {
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom)
}

/**
 * Calculate intersection of two rectangles.
 */
export function rectIntersection(a: Rect, b: Rect): Rect | null {
  if (!rectsIntersect(a, b)) {
    return null
  }
  return {
    left: Math.max(a.left, b.left),
    top: Math.max(a.top, b.top),
    right: Math.min(a.right, b.right),
    bottom: Math.min(a.bottom, b.bottom)
  }
}

/**
 * Check if rect a contains rect b.
 */
export function rectContains(a: Rect, b: Rect): boolean {
  return a.left <= b.left && a.top <= b.top && a.right >= b.right && a.bottom >= b.bottom
}

/**
 * Calculate distance between two rectangles (0 if overlapping).
 */
export function rectDistance(a: Rect, b: Rect): number {
  const dx = Math.max(0, Math.max(a.left, b.left) - Math.min(a.right, b.right))
  const dy = Math.max(0, Math.max(a.top, b.top) - Math.min(a.bottom, b.bottom))
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Create rect from position and size.
 */
export function createRect(left: number, top: number, width: number, height: number): Rect {
  return {
    left,
    top,
    right: left + width,
    bottom: top + height
  }
}

/**
 * Offset rectangle by dx, dy.
 */
export function offsetRect(rect: Rect, dx: number, dy: number): Rect {
  return {
    left: rect.left + dx,
    top: rect.top + dy,
    right: rect.right + dx,
    bottom: rect.bottom + dy
  }
}

/**
 * Constrain rectangle within bounds.
 */
export function constrainRect(rect: Rect, bounds: Rect): Rect {
  const width = rectWidth(rect)
  const height = rectHeight(rect)

  let left = Math.max(bounds.left, Math.min(rect.left, bounds.right - width))
  let top = Math.max(bounds.top, Math.min(rect.top, bounds.bottom - height))

  return createRect(left, top, width, height)
}
