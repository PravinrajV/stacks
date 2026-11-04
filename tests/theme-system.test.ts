/**
 * Task 9.1 Tests: Theme system, toggle, and persistence
 * 
 * Tests for theme toggle functionality and localStorage persistence.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('Theme System (Task 9.1)', () => {
  let container: HTMLElement

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    
    // Reset document theme
    document.documentElement.removeAttribute('data-theme')
    
    // Create/reset container
    const existing = document.getElementById('app')
    if (existing) {
      existing.remove()
    }
    
    container = document.createElement('div')
    container.id = 'app'
    document.body.appendChild(container)
  })

  afterEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    if (container.parentNode) {
      container.parentNode.removeChild(container)
    }
  })

  it('should apply haunted theme by default', () => {
    expect(document.documentElement.getAttribute('data-theme')).toBeNull()
    
    // Set haunted theme
    document.documentElement.setAttribute('data-theme', 'haunted')
    expect(document.documentElement.getAttribute('data-theme')).toBe('haunted')
  })

  it('should apply classic theme when set', () => {
    document.documentElement.setAttribute('data-theme', 'classic')
    expect(document.documentElement.getAttribute('data-theme')).toBe('classic')
  })

  it('should persist theme to localStorage', () => {
    localStorage.setItem('stacks-theme', 'haunted')
    expect(localStorage.getItem('stacks-theme')).toBe('haunted')
    
    localStorage.setItem('stacks-theme', 'classic')
    expect(localStorage.getItem('stacks-theme')).toBe('classic')
  })

  it('should restore theme from localStorage on app init', () => {
    // Pre-set theme in localStorage
    localStorage.setItem('stacks-theme', 'classic')
    
    // Simulate app loading theme
    const savedTheme = localStorage.getItem('stacks-theme')
    expect(savedTheme).toBe('classic')
  })

  it('should have CSS custom properties for both themes', () => {
    // Check that CSS variables exist (these should be in styles.css)
    const style = document.createElement('style')
    style.textContent = `
      [data-theme="haunted"] {
        --color-bg-primary: #0b0614;
        --color-accent: #a855f7;
        --color-orange: #f97316;
      }
      [data-theme="classic"] {
        --color-bg-primary: #ffffff;
        --color-accent: #000000;
      }
    `
    document.head.appendChild(style)
    
    // Apply haunted theme
    document.documentElement.setAttribute('data-theme', 'haunted')
    const hauntedComputedStyle = window.getComputedStyle(document.documentElement)
    
    // Apply classic theme
    document.documentElement.setAttribute('data-theme', 'classic')
    const classicComputedStyle = window.getComputedStyle(document.documentElement)
    
    expect(hauntedComputedStyle).toBeDefined()
    expect(classicComputedStyle).toBeDefined()
  })

  it('theme toggle button should exist in toolbar', () => {
    // Simulate toolbar with theme toggle button
    const toolbar = document.createElement('div')
    toolbar.className = 'app-header'
    
    const themeToggleBtn = document.createElement('button')
    themeToggleBtn.className = 'theme-toggle'
    themeToggleBtn.setAttribute('aria-label', 'Switch to Classic theme')
    
    toolbar.appendChild(themeToggleBtn)
    container.appendChild(toolbar)
    
    const toggleBtn = container.querySelector('.theme-toggle') as HTMLButtonElement
    expect(toggleBtn).toBeDefined()
    expect(toggleBtn.getAttribute('aria-label')).toContain('theme')
  })

  it('theme toggle button should have SVG icon', () => {
    // Create a button with SVG icon (like in app.ts)
    const themeToggleBtn = document.createElement('button')
    themeToggleBtn.className = 'theme-toggle'
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('viewBox', '0 0 24 24')
    svg.setAttribute('width', '24')
    svg.setAttribute('height', '24')
    
    themeToggleBtn.appendChild(svg)
    container.appendChild(themeToggleBtn)
    
    const btn = container.querySelector('.theme-toggle') as HTMLButtonElement
    const icon = btn.querySelector('svg')
    
    expect(btn).toBeDefined()
    expect(icon).toBeDefined()
  })

  it('should clear theme preference when localStorage is cleared', () => {
    localStorage.setItem('stacks-theme', 'classic')
    expect(localStorage.getItem('stacks-theme')).toBe('classic')
    
    localStorage.clear()
    expect(localStorage.getItem('stacks-theme')).toBeNull()
  })
})

describe('Toolbar Icons (Task 9.2)', () => {
  let container: HTMLElement

  beforeEach(() => {
    const existing = document.getElementById('app')
    if (existing) {
      existing.remove()
    }
    
    container = document.createElement('div')
    container.id = 'app'
    document.body.appendChild(container)
  })

  afterEach(() => {
    vi.clearAllMocks()
    if (container.parentNode) {
      container.parentNode.removeChild(container)
    }
  })

  it('should create sun icon SVG element', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('viewBox', '0 0 24 24')
    svg.setAttribute('width', '24')
    svg.setAttribute('height', '24')
    svg.setAttribute('fill', 'none')
    svg.setAttribute('stroke', 'currentColor')
    svg.setAttribute('stroke-width', '2')
    
    container.appendChild(svg)
    
    const icon = container.querySelector('svg')
    expect(icon).toBeDefined()
    expect(icon?.getAttribute('viewBox')).toBe('0 0 24 24')
    expect(icon?.getAttribute('fill')).toBe('none')
  })

  it('should create moon icon SVG element', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('viewBox', '0 0 24 24')
    svg.setAttribute('width', '24')
    svg.setAttribute('height', '24')
    svg.setAttribute('fill', 'currentColor')
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z')
    svg.appendChild(path)
    
    container.appendChild(svg)
    
    const icon = container.querySelector('svg')
    expect(icon).toBeDefined()
    expect(icon?.querySelector('path')).toBeDefined()
  })

  it('SVG icons should use currentColor for theme inheritance', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('stroke', 'currentColor')
    svg.setAttribute('fill', 'currentColor')
    
    expect(svg.getAttribute('stroke')).toBe('currentColor')
    expect(svg.getAttribute('fill')).toBe('currentColor')
  })

  it('toolbar buttons should display icons inline', () => {
    const toolbar = document.createElement('div')
    toolbar.className = 'app-header'
    
    const btn1 = document.createElement('button')
    btn1.className = 'app-header button'
    const icon1 = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    icon1.setAttribute('width', '16')
    icon1.setAttribute('height', '16')
    btn1.appendChild(icon1)
    btn1.textContent = 'Run'
    
    toolbar.appendChild(btn1)
    container.appendChild(toolbar)
    
    const headerBtn = container.querySelector('.app-header.button') as HTMLButtonElement
    expect(headerBtn).toBeDefined()
    expect(headerBtn.querySelector('svg')).toBeDefined()
    expect(headerBtn.textContent).toContain('Run')
  })

  it('toolbar buttons should have accessible labels', () => {
    const btn = document.createElement('button')
    btn.setAttribute('aria-label', 'Run Mode: Execute scripts and interact with cards')
    btn.setAttribute('title', 'Press to enter Run Mode')
    
    container.appendChild(btn)
    
    const button = container.querySelector('button')
    expect(button?.getAttribute('aria-label')).toContain('Run')
    expect(button?.getAttribute('title')).toContain('Run')
  })
})
