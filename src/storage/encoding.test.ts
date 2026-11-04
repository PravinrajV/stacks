import { describe, it, expect } from 'vitest'
import { generateStackId, encodeStackId, decodeStackId } from './encoding'

// Helper to access private functions for testing
const bytesToBase32 = (bytes: Uint8Array): string => {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz234567'
  let result = ''
  let bits = 0
  let value = 0

  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i]
    bits += 8

    while (bits >= 5) {
      bits -= 5
      result += alphabet[(value >> bits) & 31]
    }
  }

  if (bits > 0) {
    result += alphabet[(value << (5 - bits)) & 31]
  }

  return result
}

const base32ToBytes = (encoded: string): Uint8Array => {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz234567'
  const bytes: number[] = []
  let bits = 0
  let value = 0

  for (let i = 0; i < encoded.length; i++) {
    const index = alphabet.indexOf(encoded[i])
    if (index === -1) {
      throw new Error(`Invalid base32 character: ${encoded[i]}`)
    }
    value = (value << 5) | index
    bits += 5

    if (bits >= 8) {
      bits -= 8
      bytes.push((value >> bits) & 255)
    }
  }

  return new Uint8Array(bytes)
}

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

  describe('bytesToBase32 and base32ToBytes', () => {
    it('converts empty byte array to base32', () => {
      const bytes = new Uint8Array([])
      const encoded = bytesToBase32(bytes)
      expect(encoded).toBe('')
    })

    it('converts single byte to base32', () => {
      const bytes = new Uint8Array([0])
      const encoded = bytesToBase32(bytes)
      expect(encoded).toBeDefined()
      expect(/^[a-z0-9]*$/.test(encoded)).toBe(true)
    })

    it('converts multiple bytes to base32 and back', () => {
      const original = new Uint8Array([72, 101, 108, 108, 111]) // "Hello"
      const encoded = bytesToBase32(original)
      const decoded = base32ToBytes(encoded)
      expect(decoded).toEqual(original)
    })

    it('handles all byte values (0-255)', () => {
      for (let i = 0; i < 256; i++) {
        const bytes = new Uint8Array([i])
        const encoded = bytesToBase32(bytes)
        const decoded = base32ToBytes(encoded)
        expect(decoded[0]).toBe(i)
      }
    })

    it('round-trips random byte sequences', () => {
      for (let len = 1; len <= 20; len++) {
        const original = new Uint8Array(len)
        for (let i = 0; i < len; i++) {
          original[i] = Math.floor(Math.random() * 256)
        }
        const encoded = bytesToBase32(original)
        const decoded = base32ToBytes(encoded)
        expect(decoded).toEqual(original)
      }
    })

    it('rejects invalid base32 characters', () => {
      expect(() => base32ToBytes('invalid!')).toThrow()
      expect(() => base32ToBytes('has-dash')).toThrow()
      expect(() => base32ToBytes('UPPERCASE')).toThrow() // base32 should be lowercase
    })
  })
})
