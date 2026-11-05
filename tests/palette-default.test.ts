import { describe, it, expect, beforeEach } from 'vitest'
import { loadPalette } from '../src/dom/storage'

describe('palette default', () => {
  beforeEach(() => { localStorage.clear(); (window as any).happyDOM.setURL('http://localhost/') })
  it('defaults to navy with nothing saved', () => { expect(loadPalette()).toBe('navy') })
  it('keeps a saved palette', () => { localStorage.setItem('stacks-palette', 'graphite'); expect(loadPalette()).toBe('graphite') })
  it('ignores an invalid saved value', () => { localStorage.setItem('stacks-palette', 'purple'); expect(loadPalette()).toBe('navy') })
  it('URL override wins and is validated', () => {
    ;(window as any).happyDOM.setURL('http://localhost/?palette=ink'); expect(loadPalette()).toBe('ink');
    ;(window as any).happyDOM.setURL('http://localhost/?palette=evil'); expect(loadPalette()).toBe('navy')
  })
})
