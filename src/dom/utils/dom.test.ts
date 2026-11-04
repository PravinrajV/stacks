import { describe, it, expect, beforeEach } from 'vitest'
import { createElement, setClasses } from './dom'

describe('dom utilities', () => {
  describe('createElement', () => {
    it('should split space-separated class names in string', () => {
      const el = createElement('div', { className: 'a b c' })
      expect(el.classList.contains('a')).toBe(true)
      expect(el.classList.contains('b')).toBe(true)
      expect(el.classList.contains('c')).toBe(true)
    })

    it('should split space-separated class names in array elements', () => {
      const el = createElement('div', { className: ['a b', 'c'] })
      expect(el.classList.contains('a')).toBe(true)
      expect(el.classList.contains('b')).toBe(true)
      expect(el.classList.contains('c')).toBe(true)
    })

    it('should handle mixed spaces and tabs', () => {
      const el = createElement('div', { className: 'a  b\tc' })
      expect(el.classList.contains('a')).toBe(true)
      expect(el.classList.contains('b')).toBe(true)
      expect(el.classList.contains('c')).toBe(true)
    })

    it('should filter out empty strings', () => {
      const el = createElement('div', { className: ['a', '', 'b'] })
      expect(el.classList.contains('a')).toBe(true)
      expect(el.classList.contains('b')).toBe(true)
      expect(el.classList.length).toBe(2)
    })

    it('should filter empty strings from space-separated classNames', () => {
      const el = createElement('div', { className: '' })
      expect(el.classList.length).toBe(0)
    })

    it('should handle regression case: multi-word strings are now properly split', () => {
      // This is the production bug case: "btn primary" should become ['btn', 'primary']
      const el = createElement('div', { className: 'btn primary' })
      expect(el.classList.contains('btn')).toBe(true)
      expect(el.classList.contains('primary')).toBe(true)
      expect(el.classList.length).toBe(2)
    })
  })

  describe('setClasses', () => {
    let el: HTMLElement

    beforeEach(() => {
      el = document.createElement('div')
    })

    it('should add classes with boolean true', () => {
      setClasses(el, { 'btn primary': true })
      expect(el.classList.contains('btn')).toBe(true)
      expect(el.classList.contains('primary')).toBe(true)
    })

    it('should remove classes with boolean false', () => {
      el.classList.add('btn')
      el.classList.add('primary')
      setClasses(el, { 'btn primary': false })
      expect(el.classList.contains('btn')).toBe(false)
      expect(el.classList.contains('primary')).toBe(false)
    })

    it('should handle mixed space-separated tokens', () => {
      setClasses(el, { 'btn': true, 'primary secondary': true })
      expect(el.classList.contains('btn')).toBe(true)
      expect(el.classList.contains('primary')).toBe(true)
      expect(el.classList.contains('secondary')).toBe(true)
    })
  })
})

