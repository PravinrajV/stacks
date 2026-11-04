/**
 * Test that verifies the main JS bundle does not exceed 500KB gzipped.
 * 
 * Bundle size is a key constraint for web apps (cold start, mobile networks).
 * This test runs after build to ensure we stay within limits.
 * 
 * Run with: npm run build && npm test -- bundle-size
 */

import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import zlib from 'zlib'

describe('Bundle size constraint', () => {
  it('main JS bundle gzipped should not exceed 500KB', () => {
    const distDir = path.join(process.cwd(), 'dist')
    const assetsDir = path.join(distDir, 'assets')
    
    // Find the main JS bundle in dist/assets/
    let jsFiles: string[] = []
    
    if (fs.existsSync(assetsDir)) {
      const files = fs.readdirSync(assetsDir)
      jsFiles = files.filter(f => f.endsWith('.js') && f.startsWith('index'))
    } else {
      // Fallback: look directly in dist
      const files = fs.readdirSync(distDir)
      jsFiles = files.filter(f => f.endsWith('.js') && f.startsWith('index'))
    }
    
    expect(jsFiles.length).toBeGreaterThan(0)
    
    const bundleFile = jsFiles[0]
    const bundlePath = fs.existsSync(assetsDir) 
      ? path.join(assetsDir, bundleFile)
      : path.join(distDir, bundleFile)
    
    const rawContent = fs.readFileSync(bundlePath)
    const gzipped = zlib.gzipSync(rawContent, {})
    
    const sizeKB = gzipped.length / 1024
    const sizeMB = gzipped.length / (1024 * 1024)
    
    console.log(`Bundle: ${bundleFile}`)
    console.log(`Raw size: ${(rawContent.length / 1024).toFixed(2)} KB`)
    console.log(`Gzipped size: ${sizeKB.toFixed(2)} KB (${sizeMB.toFixed(3)} MB)`)
    console.log(`Limit: 500 KB`)
    
    expect(gzipped.length).toBeLessThanOrEqual(512000)
    if (gzipped.length > 512000) {
      throw new Error(`Bundle size ${sizeKB.toFixed(2)}KB exceeds 500KB limit`)
    }
  })
})
