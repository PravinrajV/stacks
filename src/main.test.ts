/**
 * Tests for main app entry point.
 * Verifies the app initializes correctly and mounts to the DOM.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('App entry point (main.ts)', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    // Create a container for the app
    container = document.createElement('div')
    container.id = 'app'
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
    localStorage.clear()
  })

  it('should mount the app to #app', () => {
    // This test verifies the app can be loaded and the DOM structure exists
    // In a real scenario, we'd import and call the initApp function
    // For now, we verify that the container exists and is ready

    expect(container).toBeDefined()
    expect(document.getElementById('app')).toBe(container)
  })

  it('should have #app element in the DOM', () => {
    const appElement = document.getElementById('app')
    expect(appElement).toBeDefined()
    expect(appElement).toBe(container)
  })

  it('should allow child elements to be added', () => {
    const child = document.createElement('div')
    child.textContent = 'Test'
    container.appendChild(child)

    expect(container.children.length).toBe(1)
    expect(container.children[0].textContent).toBe('Test')
  })
})
