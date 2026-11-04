import { compressSync, decompressSync } from 'fflate'

/**
 * Compress JSON string using gzip (via fflate) and encode to base64 for URL embedding.
 */
export function compressStack(json: string): string {
  const encoder = new TextEncoder()
  const data = encoder.encode(json)
  
  try {
    const compressed = compressSync(data)
    // Convert to base64 for URL-safe representation
    return btoa(String.fromCharCode(...compressed))
  } catch (err) {
    throw new Error(`Compression failed: ${err instanceof Error ? err.message : String(err)}`)
  }
}

/**
 * Decompress base64-encoded gzip data back to JSON string.
 */
export function decompressStack(compressed: string): string {
  try {
    const binary = atob(compressed)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    
    const decompressed = decompressSync(bytes)
    const decoder = new TextDecoder()
    return decoder.decode(decompressed)
  } catch (err) {
    throw new Error(`Decompression failed: ${err instanceof Error ? err.message : String(err)}`)
  }
}
