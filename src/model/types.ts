/**
 * Rect interface represents a rectangular region with left, top, right, bottom.
 */
export interface Rect {
  left: number
  top: number
  right: number
  bottom: number
}

/**
 * Calculate the width of a rectangle.
 */
export function width(rect: Rect): number {
  return rect.right - rect.left
}

/**
 * Calculate the height of a rectangle.
 */
export function height(rect: Rect): number {
  return rect.bottom - rect.top
}

/**
 * Calculate the center point of a rectangle.
 */
export function center(rect: Rect): [number, number] {
  return [
    rect.left + width(rect) / 2,
    rect.top + height(rect) / 2
  ]
}

/**
 * Check if two rectangles intersect.
 */
export function intersect(rect1: Rect, rect2: Rect): boolean {
  return !(
    rect1.right < rect2.left ||
    rect1.left > rect2.right ||
    rect1.bottom < rect2.top ||
    rect1.top > rect2.bottom
  )
}

/**
 * Check if a point is inside a rectangle.
 */
export function containsPoint(rect: Rect, x: number, y: number): boolean {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
}
