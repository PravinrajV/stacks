/**
 * Task 9.2: Inline SVG icon library.
 * 
 * Simple SVG icons used in the toolbar and UI.
 * Each function returns an SVGElement with currentColor to inherit theme colors.
 */

export function createHandIcon(): SVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('width', '24')
  svg.setAttribute('height', '24')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', '2')
  svg.setAttribute('stroke-linecap', 'round')
  svg.setAttribute('stroke-linejoin', 'round')
  
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', 'M3 12h4m8 0h4M3 8v8c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8')
  svg.appendChild(path)
  
  return svg
}

export function createPlayIcon(): SVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('width', '24')
  svg.setAttribute('height', '24')
  svg.setAttribute('fill', 'currentColor')
  
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', 'M8 5v14l11-7z')
  svg.appendChild(path)
  
  return svg
}

export function createPlusIcon(): SVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('width', '24')
  svg.setAttribute('height', '24')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', '2')
  svg.setAttribute('stroke-linecap', 'round')
  svg.setAttribute('stroke-linejoin', 'round')
  
  const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  line1.setAttribute('x1', '12')
  line1.setAttribute('y1', '5')
  line1.setAttribute('x2', '12')
  line1.setAttribute('y2', '19')
  svg.appendChild(line1)
  
  const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  line2.setAttribute('x1', '5')
  line2.setAttribute('y1', '12')
  line2.setAttribute('x2', '19')
  line2.setAttribute('y2', '12')
  svg.appendChild(line2)
  
  return svg
}

export function createTrashIcon(): SVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('width', '24')
  svg.setAttribute('height', '24')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', '2')
  svg.setAttribute('stroke-linecap', 'round')
  svg.setAttribute('stroke-linejoin', 'round')
  
  const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline')
  polyline.setAttribute('points', '3 6 5 6 21 6')
  svg.appendChild(polyline)
  
  const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path1.setAttribute('d', 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2')
  svg.appendChild(path1)
  
  const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  line1.setAttribute('x1', '10')
  line1.setAttribute('y1', '11')
  line1.setAttribute('x2', '10')
  line1.setAttribute('y2', '17')
  svg.appendChild(line1)
  
  const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  line2.setAttribute('x1', '14')
  line2.setAttribute('y1', '11')
  line2.setAttribute('x2', '14')
  line2.setAttribute('y2', '17')
  svg.appendChild(line2)
  
  return svg
}

export function createUndoIcon(): SVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('width', '24')
  svg.setAttribute('height', '24')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', '2')
  svg.setAttribute('stroke-linecap', 'round')
  svg.setAttribute('stroke-linejoin', 'round')
  
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', 'M3 7v6h6M21 17v-6h-6')
  svg.appendChild(path)
  
  const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline')
  polyline.setAttribute('points', '9 6 3 12 9 18')
  svg.appendChild(polyline)
  
  return svg
}

export function createRedoIcon(): SVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('width', '24')
  svg.setAttribute('height', '24')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', '2')
  svg.setAttribute('stroke-linecap', 'round')
  svg.setAttribute('stroke-linejoin', 'round')
  
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', 'M21 7v6h-6M3 17v-6h6')
  svg.appendChild(path)
  
  const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline')
  polyline.setAttribute('points', '15 6 21 12 15 18')
  svg.appendChild(polyline)
  
  return svg
}

export function createSaveIcon(): SVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('width', '24')
  svg.setAttribute('height', '24')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', '2')
  svg.setAttribute('stroke-linecap', 'round')
  svg.setAttribute('stroke-linejoin', 'round')
  
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', 'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z')
  svg.appendChild(path)
  
  const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline')
  polyline.setAttribute('points', '17 21 17 13 7 13 7 21')
  svg.appendChild(polyline)
  
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  line.setAttribute('x1', '7')
  line.setAttribute('y1', '5')
  line.setAttribute('x2', '17')
  line.setAttribute('y2', '5')
  svg.appendChild(line)
  
  return svg
}

export function createDownloadIcon(): SVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('width', '24')
  svg.setAttribute('height', '24')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', '2')
  svg.setAttribute('stroke-linecap', 'round')
  svg.setAttribute('stroke-linejoin', 'round')
  
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4')
  svg.appendChild(path)
  
  const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline')
  polyline.setAttribute('points', '7 10 12 15 17 10')
  svg.appendChild(polyline)
  
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  line.setAttribute('x1', '12')
  line.setAttribute('y1', '15')
  line.setAttribute('x2', '12')
  line.setAttribute('y2', '3')
  svg.appendChild(line)
  
  return svg
}

export function createUploadIcon(): SVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('width', '24')
  svg.setAttribute('height', '24')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', '2')
  svg.setAttribute('stroke-linecap', 'round')
  svg.setAttribute('stroke-linejoin', 'round')
  
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4')
  svg.appendChild(path)
  
  const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline')
  polyline.setAttribute('points', '17 8 12 3 7 8')
  svg.appendChild(polyline)
  
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  line.setAttribute('x1', '12')
  line.setAttribute('y1', '3')
  line.setAttribute('x2', '12')
  line.setAttribute('y2', '15')
  svg.appendChild(line)
  
  return svg
}

export function createSettingsIcon(): SVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('width', '24')
  svg.setAttribute('height', '24')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', '2')
  svg.setAttribute('stroke-linecap', 'round')
  svg.setAttribute('stroke-linejoin', 'round')
  
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
  circle.setAttribute('cx', '12')
  circle.setAttribute('cy', '12')
  circle.setAttribute('r', '3')
  svg.appendChild(circle)
  
  const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path1.setAttribute('d', 'M12 1v6m0 6v6')
  svg.appendChild(path1)
  
  const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path2.setAttribute('d', 'M4.22 4.22l4.24 4.24m5.08 5.08l4.24 4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m5.08-5.08l4.24-4.24')
  svg.appendChild(path2)
  
  return svg
}

export function createMoonIcon(): SVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('width', '24')
  svg.setAttribute('height', '24')
  svg.setAttribute('fill', 'currentColor')
  
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z')
  svg.appendChild(path)
  
  return svg
}

export function createSunIcon(): SVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('width', '24')
  svg.setAttribute('height', '24')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', '2')
  svg.setAttribute('stroke-linecap', 'round')
  svg.setAttribute('stroke-linejoin', 'round')
  
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
  circle.setAttribute('cx', '12')
  circle.setAttribute('cy', '12')
  circle.setAttribute('r', '5')
  svg.appendChild(circle)
  
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', 'M12 1v6m0 6v6M4.22 4.22l4.24 4.24m5.08 5.08l4.24 4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m5.08-5.08l4.24-4.24')
  svg.appendChild(path)
  
  return svg
}

export function createPencilIcon(): SVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('width', '24')
  svg.setAttribute('height', '24')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', '1.5')
  svg.setAttribute('stroke-linecap', 'round')
  svg.setAttribute('stroke-linejoin', 'round')
  
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', 'M3 17.25V21h3.75L17.81 9.94m-10.86-3.87l2.83-2.83a2 2 0 0 1 2.83 0l2.83 2.83a2 2 0 0 1 0 2.83l-2.83 2.83')
  svg.appendChild(path)
  
  return svg
}

export function createFieldIcon(): SVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('width', '24')
  svg.setAttribute('height', '24')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', '1.5')
  svg.setAttribute('stroke-linecap', 'round')
  svg.setAttribute('stroke-linejoin', 'round')
  
  // Text field rectangle
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  rect.setAttribute('x', '4')
  rect.setAttribute('y', '6')
  rect.setAttribute('width', '16')
  rect.setAttribute('height', '12')
  rect.setAttribute('rx', '1.5')
  svg.appendChild(rect)
  
  // Lines to indicate text
  const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  line1.setAttribute('x1', '8')
  line1.setAttribute('y1', '10')
  line1.setAttribute('x2', '16')
  line1.setAttribute('y2', '10')
  svg.appendChild(line1)
  
  const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  line2.setAttribute('x1', '8')
  line2.setAttribute('y1', '14')
  line2.setAttribute('x2', '16')
  line2.setAttribute('y2', '14')
  svg.appendChild(line2)
  
  return svg
}

export function createGhostIcon(): SVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('width', '24')
  svg.setAttribute('height', '24')
  svg.setAttribute('fill', 'currentColor')
  
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z')
  svg.appendChild(path)
  
  return svg
}

/**
 * Task 11.1: Brand mark - stylized stack of three overlapping cards.
 * Inline SVG (viewBox 0 0 24 24, currentColor strokes 1.5px, subtle fill on front card).
 * Three stacked, offset rounded rectangles (cards) with the front card highlighted.
 * Used in header logo, welcome screen, and running pill.
 */
export function createBrandMark(): SVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', '1.5')
  svg.setAttribute('stroke-linecap', 'round')
  svg.setAttribute('stroke-linejoin', 'round')
  
  // Back card (full stroke, minimal opacity)
  const rect1 = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  rect1.setAttribute('x', '2')
  rect1.setAttribute('y', '10')
  rect1.setAttribute('width', '10')
  rect1.setAttribute('height', '10')
  rect1.setAttribute('rx', '2')
  rect1.setAttribute('opacity', '0.7')
  svg.appendChild(rect1)
  
  // Middle card
  const rect2 = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  rect2.setAttribute('x', '7')
  rect2.setAttribute('y', '7')
  rect2.setAttribute('width', '10')
  rect2.setAttribute('height', '10')
  rect2.setAttribute('rx', '2')
  rect2.setAttribute('opacity', '0.9')
  svg.appendChild(rect2)
  
  // Front card (brightest - subtle fill at ~0.15 opacity for accent)
  const rect3 = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  rect3.setAttribute('x', '12')
  rect3.setAttribute('y', '4')
  rect3.setAttribute('width', '10')
  rect3.setAttribute('height', '10')
  rect3.setAttribute('rx', '2')
  rect3.setAttribute('fill', 'currentColor')
  rect3.setAttribute('fill-opacity', '0.15')
  svg.appendChild(rect3)
  
  return svg
}
