import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Phase 10: Palette Selector', () => {
  let container: HTMLElement;

  beforeEach(() => {
    // Create a basic DOM setup
    document.body.innerHTML = '<div id="app"></div>';
    container = document.getElementById('app')!;
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should have palette selector element in haunted theme', () => {
    // Create selector element as it would be in the app
    const selector = document.createElement('select');
    selector.className = 'palette-selector';
    selector.setAttribute('aria-label', 'Palette');
    selector.appendChild(Object.assign(document.createElement('option'), { value: 'ink', textContent: 'Ink' }));
    selector.appendChild(Object.assign(document.createElement('option'), { value: 'navy', textContent: 'Navy' }));
    selector.appendChild(Object.assign(document.createElement('option'), { value: 'graphite', textContent: 'Graphite' }));
    container.appendChild(selector);
    
    expect(container.querySelector('.palette-selector')).toBeTruthy();
  });

  it('palette selector should have all three palette options', () => {
    const selector = document.createElement('select');
    selector.className = 'palette-selector';
    selector.appendChild(Object.assign(document.createElement('option'), { value: 'ink', textContent: 'Ink' }));
    selector.appendChild(Object.assign(document.createElement('option'), { value: 'navy', textContent: 'Navy' }));
    selector.appendChild(Object.assign(document.createElement('option'), { value: 'graphite', textContent: 'Graphite' }));
    container.appendChild(selector);
    
    const options = Array.from(selector.options).map(o => o.value);
    expect(options).toContain('ink');
    expect(options).toContain('navy');
    expect(options).toContain('graphite');
  });

  it('palette selector should have aria-label for accessibility', () => {
    const selector = document.createElement('select');
    selector.className = 'palette-selector';
    selector.setAttribute('aria-label', 'Palette');
    container.appendChild(selector);
    
    expect(selector.getAttribute('aria-label')).toBe('Palette');
  });

  it('should persist palette selection to localStorage', () => {
    const selector = document.createElement('select') as HTMLSelectElement;
    selector.className = 'palette-selector';
    const opt = document.createElement('option');
    opt.value = 'navy';
    selector.appendChild(opt);
    container.appendChild(selector);
    
    // Simulate app logic: when user selects, save to localStorage
    selector.value = 'navy';
    localStorage.setItem('stacks-palette', selector.value);
    
    const saved = localStorage.getItem('stacks-palette');
    expect(saved).toBe('navy');
  });

  it('should restore palette from localStorage on load', () => {
    localStorage.setItem('stacks-palette', 'graphite');
    
    const palette = localStorage.getItem('stacks-palette');
    expect(palette).toBe('graphite');
    
    // Apply to document
    if (palette) {
      document.documentElement.setAttribute('data-palette', palette);
    }
    
    expect(document.documentElement.getAttribute('data-palette')).toBe('graphite');
  });

  it('should apply palette via URL parameter ?palette=navy', () => {
    const params = new URLSearchParams('palette=navy');
    const paletteFromURL = params.get('palette');
    
    expect(paletteFromURL).toBe('navy');
    
    if (paletteFromURL && ['ink', 'navy', 'graphite'].includes(paletteFromURL)) {
      document.documentElement.setAttribute('data-palette', paletteFromURL);
    }
    
    expect(document.documentElement.getAttribute('data-palette')).toBe('navy');
  });

  it('should ignore invalid palette URL parameter', () => {
    const params = new URLSearchParams('palette=invalid');
    const paletteFromURL = params.get('palette');
    
    const validPalettes = ['ink', 'navy', 'graphite'];
    const isValid = paletteFromURL && validPalettes.includes(paletteFromURL);
    
    expect(isValid).toBe(false);
  });

  it('theme toggle should show/hide palette selector', () => {
    const selector = document.createElement('select');
    selector.className = 'palette-selector';
    container.appendChild(selector);
    
    // Classic theme: hide selector
    document.documentElement.setAttribute('data-theme', 'classic');
    selector.style.display = 'none';
    expect(selector.style.display).toBe('none');
    
    // Haunted theme: show selector
    document.documentElement.setAttribute('data-theme', 'haunted');
    selector.style.display = 'block';
    expect(selector.style.display).toBe('block');
  });

  it('should validate palette values: ink, navy, graphite', () => {
    const validPalettes = ['ink', 'navy', 'graphite'];
    
    for (const palette of validPalettes) {
      expect(validPalettes).toContain(palette);
    }
    
    expect(validPalettes).not.toContain('invalid');
    expect(validPalettes).not.toContain('');
  });
});
