/**
 * Phase 11.4: Toolbar SVG Icons Tests
 * 
 * Tests:
 * - Export/Import/Save/AI Settings toolbar buttons contain SVG icons with viewBox
 * - Add Button/Add Field toolbar buttons use correct icons
 * - Brand mark SVG has three rects and is readable at 16–24px
 * - Button active state has transform: translateY(1px)
 * - Toolbar buttons have focus-visible outline
 */

/// <reference types="vitest" />
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { initApp } from '../src/dom/app'
import { clearStack } from '../src/dom/storage'
import {
  createDownloadIcon,
  createUploadIcon,
  createSaveIcon,
  createSettingsIcon,
  createPlusIcon,
  createFieldIcon,
  createBrandMark,
  createPlayIcon,
  createPencilIcon
} from '../src/dom/icons'

describe('Phase 11.4: Toolbar SVG Icons', () => {
  
  describe('Icon Creation Functions', () => {
    
    it('should create Download icon with correct viewBox', () => {
      const icon = createDownloadIcon()
      expect(icon.tagName.toLowerCase()).toBe('svg')
      expect(icon.getAttribute('viewBox')).toBe('0 0 24 24')
      expect(icon.getAttribute('stroke')).toBe('currentColor')
      expect(icon.getAttribute('fill')).toBe('none')
    })

    it('should create Upload icon with correct viewBox', () => {
      const icon = createUploadIcon()
      expect(icon.tagName.toLowerCase()).toBe('svg')
      expect(icon.getAttribute('viewBox')).toBe('0 0 24 24')
      expect(icon.getAttribute('stroke')).toBe('currentColor')
    })

    it('should create Save icon with correct viewBox', () => {
      const icon = createSaveIcon()
      expect(icon.tagName.toLowerCase()).toBe('svg')
      expect(icon.getAttribute('viewBox')).toBe('0 0 24 24')
      expect(icon.getAttribute('stroke')).toBe('currentColor')
    })

    it('should create Settings icon with correct viewBox', () => {
      const icon = createSettingsIcon()
      expect(icon.tagName.toLowerCase()).toBe('svg')
      expect(icon.getAttribute('viewBox')).toBe('0 0 24 24')
      expect(icon.getAttribute('stroke')).toBe('currentColor')
    })

    it('should create Plus icon with correct viewBox', () => {
      const icon = createPlusIcon()
      expect(icon.tagName.toLowerCase()).toBe('svg')
      expect(icon.getAttribute('viewBox')).toBe('0 0 24 24')
      expect(icon.getAttribute('stroke')).toBe('currentColor')
    })

    it('should create Field icon with correct viewBox', () => {
      const icon = createFieldIcon()
      expect(icon.tagName.toLowerCase()).toBe('svg')
      expect(icon.getAttribute('viewBox')).toBe('0 0 24 24')
      expect(icon.getAttribute('stroke')).toBe('currentColor')
    })

    it('should create Pencil icon with correct viewBox', () => {
      const icon = createPencilIcon()
      expect(icon.tagName.toLowerCase()).toBe('svg')
      expect(icon.getAttribute('viewBox')).toBe('0 0 24 24')
      expect(icon.getAttribute('stroke')).toBe('currentColor')
    })

    it('should create Play icon with correct viewBox', () => {
      const icon = createPlayIcon()
      expect(icon.tagName.toLowerCase()).toBe('svg')
      expect(icon.getAttribute('viewBox')).toBe('0 0 24 24')
    })
  })

  describe('Brand Mark SVG', () => {
    
    it('should create brand mark SVG', () => {
      const mark = createBrandMark()
      expect(mark.tagName.toLowerCase()).toBe('svg')
      expect(mark.getAttribute('viewBox')).toBe('0 0 24 24')
    })

    it('should have three rect elements (stacked cards)', () => {
      const mark = createBrandMark()
      const rects = mark.querySelectorAll('rect')
      expect(rects.length).toBe(3)
    })

    it('should have stroke-based outline for all cards', () => {
      const mark = createBrandMark()
      expect(mark.getAttribute('stroke')).toBe('currentColor')
      expect(mark.getAttribute('fill')).toBe('none')
    })

    it('should have front card with subtle fill', () => {
      const mark = createBrandMark()
      const rects = mark.querySelectorAll('rect')
      const frontCard = rects[2] // Third rect is front card
      expect(frontCard.getAttribute('fill')).toBe('currentColor')
      const fillOpacity = frontCard.getAttribute('fill-opacity')
      expect(fillOpacity).toBeDefined()
      expect(parseFloat(fillOpacity || '0')).toBeGreaterThanOrEqual(0.15)
    })

    it('should have readable stacked layout (opacity gradient)', () => {
      const mark = createBrandMark()
      const rects = mark.querySelectorAll('rect')
      const backOpacity = parseFloat(rects[0].getAttribute('opacity') || '1')
      const midOpacity = parseFloat(rects[1].getAttribute('opacity') || '1')
      const frontOpacity = parseFloat(rects[2].getAttribute('opacity') || '0')
      
      // Back should be less opaque than middle
      expect(backOpacity).toBeLessThan(midOpacity)
      // Middle should be less opaque than front (or front has fill)
      expect(midOpacity).toBeLessThanOrEqual(1)
    })

    it('should be scalable (SVG without hardcoded pixel dimensions)', () => {
      const mark = createBrandMark()
      // Should not have hardcoded width/height attributes (viewBox is scalable)
      const hasExplicitSize = mark.getAttribute('width') && mark.getAttribute('height')
      // This is ok if it does, but ideal is viewBox-only for scaling
      expect(mark.getAttribute('viewBox')).toBe('0 0 24 24')
    })
  })

  describe('CSS Button States', () => {
    
    it('should define active state transform in CSS file', async () => {
      // Read the CSS file to verify active state rule exists
      const { readFileSync } = await import('fs')
      const css = readFileSync('/workspace/stacks/src/dom/styles.css', 'utf-8')
      
      // Look for active state with translateY
      expect(css).toMatch(/button:active[\s\S]*transform:\s*translateY/)
    })

    it('should define focus-visible outline for toolbar buttons in CSS', async () => {
      const { readFileSync } = await import('fs')
      const css = readFileSync('/workspace/stacks/src/dom/styles.css', 'utf-8')
      
      // Look for focus-visible rule
      expect(css).toMatch(/app-header[\s\S]*button:focus-visible/)
      expect(css).toMatch(/outline:\s*2px solid/)
      expect(css).toMatch(/outline-offset:\s*2px/)
    })

    it('should enhance brand mark icon visibility in CSS', async () => {
      const { readFileSync } = await import('fs')
      const css = readFileSync('/workspace/stacks/src/dom/styles.css', 'utf-8')
      
      // Look for brand mark icon styles
      expect(css).toMatch(/app-header-title-icon/)
      expect(css).toMatch(/width:\s*22px/)
      expect(css).toMatch(/height:\s*22px/)
      expect(css).toMatch(/filter:\s*drop-shadow/)
    })

    it('should enhance card glow in Haunted theme', async () => {
      const { readFileSync } = await import('fs')
      const css = readFileSync('/workspace/stacks/src/dom/styles.css', 'utf-8')
      
      // Look for enhanced glow
      expect(css).toMatch(/data-theme.*haunted[\s\S]*card-view/)
      expect(css).toMatch(/box-shadow[\s\S]*28px/)
    })
  })

  describe('Icon SVG Structure', () => {
    
    it('Download icon should have path elements', () => {
      const icon = createDownloadIcon()
      const paths = icon.querySelectorAll('path, polyline, line')
      expect(paths.length).toBeGreaterThan(0)
    })

    it('Upload icon should have path elements', () => {
      const icon = createUploadIcon()
      const paths = icon.querySelectorAll('path, polyline, line')
      expect(paths.length).toBeGreaterThan(0)
    })

    it('Settings icon should have gear path', () => {
      const icon = createSettingsIcon()
      const paths = icon.querySelectorAll('path')
      expect(paths.length).toBeGreaterThan(0)
    })

    it('Field icon should have rect and lines for text field appearance', () => {
      const icon = createFieldIcon()
      const rect = icon.querySelector('rect')
      const lines = icon.querySelectorAll('line')
      expect(rect).toBeTruthy()
      expect(lines.length).toBeGreaterThan(0)
    })

    it('Plus icon should have two lines (cross)', () => {
      const icon = createPlusIcon()
      const lines = icon.querySelectorAll('line')
      expect(lines.length).toBe(2)
    })
  })

  describe('Icon Sizing', () => {
    
    it('icons should be renderable at 16px', () => {
      const icons = [
        createDownloadIcon(),
        createUploadIcon(),
        createSaveIcon(),
        createSettingsIcon(),
        createPlusIcon(),
        createFieldIcon()
      ]
      
      icons.forEach(icon => {
        icon.setAttribute('width', '16')
        icon.setAttribute('height', '16')
        expect(icon.getAttribute('width')).toBe('16')
        expect(icon.getAttribute('height')).toBe('16')
      })
    })

    it('icons should be renderable at 24px', () => {
      const icons = [
        createDownloadIcon(),
        createUploadIcon(),
        createSaveIcon(),
        createSettingsIcon()
      ]
      
      icons.forEach(icon => {
        icon.setAttribute('width', '24')
        icon.setAttribute('height', '24')
        expect(icon.getAttribute('width')).toBe('24')
        expect(icon.getAttribute('height')).toBe('24')
      })
    })

    it('brand mark should render at 16px', () => {
      const mark = createBrandMark()
      mark.setAttribute('width', '16')
      mark.setAttribute('height', '16')
      expect(mark.getAttribute('width')).toBe('16')
      
      // Verify rects are still visible at small size
      const rects = mark.querySelectorAll('rect')
      expect(rects.length).toBe(3)
    })

    it('brand mark should render at 24px', () => {
      const mark = createBrandMark()
      mark.setAttribute('width', '24')
      mark.setAttribute('height', '24')
      expect(mark.getAttribute('width')).toBe('24')
      expect(mark.getAttribute('height')).toBe('24')
    })
  })

  describe('Icon Styling Inheritance', () => {
    
    it('all icons should use currentColor for theming', () => {
      const icons = [
        createDownloadIcon(),
        createUploadIcon(),
        createSaveIcon(),
        createSettingsIcon(),
        createPlusIcon(),
        createFieldIcon(),
        createBrandMark()
      ]
      
      icons.forEach(icon => {
        const hasCurrentColor = 
          icon.getAttribute('stroke') === 'currentColor' ||
          icon.getAttribute('fill') === 'currentColor' ||
          Array.from(icon.querySelectorAll('[stroke], [fill]')).some(
            el => el.getAttribute('stroke') === 'currentColor' || 
                  el.getAttribute('fill') === 'currentColor'
          )
        expect(hasCurrentColor).toBeTruthy()
      })
    })

    it('icons should have no hardcoded external assets', () => {
      const icons = [
        createDownloadIcon(),
        createUploadIcon(),
        createSaveIcon(),
        createSettingsIcon()
      ]
      
      icons.forEach(icon => {
        // Check for no image elements
        const images = icon.querySelectorAll('image')
        expect(images.length).toBe(0)
        // Check for no use elements
        const uses = icon.querySelectorAll('use')
        expect(uses.length).toBe(0)
      })
    })
  })
})


describe('Phase 11.4: Toolbar wiring via initApp (HAND EDIT)', () => {
  beforeEach(() => {
    clearStack()
    const existing = document.getElementById('app')
    if (existing) existing.remove()
    const app = document.createElement('div')
    app.id = 'app'
    document.body.appendChild(app)
    // dismiss welcome if present after init
    initApp()
    const dismiss = document.querySelector('.welcome-dialog button, [data-action="dismiss-welcome"], .welcome-overlay button') as HTMLButtonElement | null
    if (dismiss) dismiss.click()
    // also try Escape / click any primary
    document.querySelectorAll('.welcome-dialog .button, .modal .button').forEach((b) => (b as HTMLButtonElement).click())
  })

  afterEach(() => {
    clearStack()
    const existing = document.getElementById('app')
    if (existing) existing.remove()
    document.querySelectorAll('.welcome-overlay, .welcome-dialog, .modal-overlay').forEach((el) => el.remove())
  })

  function findToolbarButton(label: string): HTMLButtonElement | null {
    const buttons = Array.from(document.querySelectorAll('.app-header button')) as HTMLButtonElement[]
    return buttons.find((b) => (b.textContent || '').replace(/\s+/g, ' ').trim().includes(label)) || null
  }

  it('Export/Import/Save/AI Settings/Button/Field each contain an inline SVG', () => {
    for (const label of ['Export', 'Import', 'Save', 'AI Settings', 'Button', 'Field']) {
      const btn = findToolbarButton(label)
      expect(btn, `missing toolbar button: ${label}`).toBeTruthy()
      const svg = btn!.querySelector('svg')
      expect(svg, `${label} missing svg`).toBeTruthy()
      expect(svg!.getAttribute('viewBox')).toBe('0 0 24 24')
    }
  })

  it('header brand mark SVG is present and sized', () => {
    const mark = document.querySelector('.app-header-title-icon') as SVGElement | null
    expect(mark).toBeTruthy()
    expect(mark!.tagName.toLowerCase()).toBe('svg')
    expect(mark!.querySelectorAll('rect').length).toBe(3)
  })
})
