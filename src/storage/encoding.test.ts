import { describe, it, expect } from 'vitest'
import { generateStackId, encodeStackId, decodeStackId } from './encoding'

describe('Stack ID encoding', () => {
  it('generates a valid stack ID', () => {
    const id = generateStackId()
    expect(id).toHaveLength(16)
    expect(/^[a-z0-9]+$/.test(id)).toBe(true)
  })

  it('generates different IDs each time', () => {
    const id1 = generateStackId()
    const id2 = generateStackId()
    expect(id1).not.toBe(id2)
  })

  it('encodes and decodes stack ID', () => {
    const id = generateStackId()
    const encoded = encodeStackId(id)
    const decoded = decodeStackId(encoded)
    expect(decoded).toBe(id)
  })

  it('rejects invalid stack IDs', () => {
    expect(() => encodeStackId('invalid-with-dash')).toThrow()
    expect(() => encodeStackId('invalid with space')).toThrow()
    expect(() => decodeStackId('also@invalid')).toThrow()
  })

  it('generated IDs are URL-safe', () => {
    for (let i = 0; i < 20; i++) {
      const id = generateStackId()
      const encoded = encodeURIComponent(id)
      expect(encoded).toBe(id) // URL-safe means no encoding needed
    }
  })
})
