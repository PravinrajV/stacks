/**
 * Generate a random stack ID using base32 encoding.
 * Stack IDs are URL-safe and compact.
 */
export function generateStackId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz234567'
  let id = ''
  for (let i = 0; i < 16; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return id
}

/**
 * Encode a stack ID (already URL-safe base32).
 */
export function encodeStackId(id: string): string {
  // Stack IDs are already URL-safe, just validate and return
  if (!/^[a-z0-9]+$/.test(id)) {
    throw new Error('Invalid stack ID format')
  }
  return id
}

/**
 * Decode a stack ID (already URL-safe base32).
 */
export function decodeStackId(encoded: string): string {
  // Stack IDs are already URL-safe, just validate and return
  if (!/^[a-z0-9]+$/.test(encoded)) {
    throw new Error('Invalid encoded stack ID format')
  }
  return encoded
}

/**
 * Convert a byte array to base32url encoding.
 */
function bytesToBase32(bytes: Uint8Array): string {
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

/**
 * Convert base32url encoding to byte array.
 */
function base32ToBytes(encoded: string): Uint8Array {
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
