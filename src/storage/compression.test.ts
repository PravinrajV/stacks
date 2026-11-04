import { describe, it, expect } from 'vitest'
import { compressStack, decompressStack } from './compression'

describe('Stack compression', () => {
  it('compresses and decompresses JSON', () => {
    const json = JSON.stringify({
      version: '1.0',
      stack: {
        id: 'test123',
        name: 'Test Stack',
        cards: [],
        backgrounds: []
      }
    })

    const compressed = compressStack(json)
    const decompressed = decompressStack(compressed)
    expect(decompressed).toBe(json)
  })

  it('compression reduces size', () => {
    const json = JSON.stringify({
      version: '1.0',
      stack: {
        id: 'test123',
        name: 'Test Stack',
        cards: Array(50).fill({
          id: 'card1',
          name: 'Card 1',
          backgroundId: null,
          buttons: [],
          fields: [],
          scripts: {},
          variables: {}
        }),
        backgrounds: []
      }
    })

    const compressed = compressStack(json)
    expect(compressed.length).toBeLessThan(json.length)
  })

  it('produces URL-safe base64', () => {
    const json = JSON.stringify({ test: 'data' })
    const compressed = compressStack(json)
    // Base64 URL-safe check: should only contain alphanumeric, +, /, =
    expect(/^[A-Za-z0-9+/=]+$/.test(compressed)).toBe(true)
  })

  it('round-trip preserves complex JSON', () => {
    const original = JSON.stringify({
      version: '1.0',
      stack: {
        id: 'complex-stack-id',
        name: 'Complex Stack with Special Chars: @#$%^&*()',
        cards: [
          {
            id: 'card1',
            name: 'Card with "quotes" and \\backslashes\\',
            backgroundId: null,
            buttons: [],
            fields: [],
            scripts: {
              openCard: 'put "hello\\nworld" into field "text"'
            },
            variables: {}
          }
        ],
        backgrounds: []
      }
    })

    const compressed = compressStack(original)
    const decompressed = decompressStack(compressed)
    expect(decompressed).toBe(original)
  })

  it('rejects invalid compressed data', () => {
    expect(() => decompressStack('not-valid-base64-or-gzip!')).toThrow()
  })

  it('handles empty JSON', () => {
    const json = JSON.stringify({})
    const compressed = compressStack(json)
    const decompressed = decompressStack(compressed)
    expect(decompressed).toBe(json)
  })
})
