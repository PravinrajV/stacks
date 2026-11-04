/**
 * Tests for OllamaProvider (Task 4.3).
 * 
 * Tests:
 * - Request URL, headers, body shape
 * - Response parsing
 * - Graceful fallback when Ollama not running
 * - Model configuration
 * - Base URL configuration
 * - Timeout handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OllamaProvider } from './ollamaProvider'

const originalFetch = global.fetch
const mockFetch = vi.fn()

beforeEach(() => {
  global.fetch = mockFetch as any
})

afterEach(() => {
  global.fetch = originalFetch
  vi.clearAllMocks()
})

describe('Task 4.3: OllamaProvider', () => {
  describe('Initialization', () => {
    it('should have correct name', () => {
      const provider = new OllamaProvider()
      expect(provider.name).toBe('Ollama (Local)')
    })

    it('should have default base URL', () => {
      const provider = new OllamaProvider()
      expect(provider.getBaseUrl()).toBe('http://localhost:11434')
    })

    it('should have default model', () => {
      const provider = new OllamaProvider()
      expect(provider.getModel()).toBe('mistral')
    })
  })

  describe('Configuration', () => {
    it('should allow setting base URL', () => {
      const provider = new OllamaProvider()
      provider.setBaseUrl('http://192.168.1.100:11434')
      
      expect(provider.getBaseUrl()).toBe('http://192.168.1.100:11434')
    })

    it('should allow setting model', () => {
      const provider = new OllamaProvider()
      provider.setModel('neural-chat')
      
      expect(provider.getModel()).toBe('neural-chat')
    })
  })

  describe('Availability Check', () => {
    it('should check Ollama tags endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true
      })

      const provider = new OllamaProvider()
      await provider.isAvailable()
      
      expect(mockFetch).toHaveBeenCalledOnce()
      expect(mockFetch.mock.calls[0][0]).toBe('http://localhost:11434/api/tags')
    })

    it('should return true if Ollama is running', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true
      })

      const provider = new OllamaProvider()
      const available = await provider.isAvailable()
      
      expect(available).toBe(true)
    })

    it('should return false if Ollama is not running', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'))

      const provider = new OllamaProvider()
      const available = await provider.isAvailable()
      
      expect(available).toBe(false)
    })

    it('should return false on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      })

      const provider = new OllamaProvider()
      const available = await provider.isAvailable()
      
      expect(available).toBe(false)
    })

    it('should use custom base URL for availability check', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true
      })

      const provider = new OllamaProvider()
      provider.setBaseUrl('http://custom-host:11434')
      await provider.isAvailable()
      
      expect(mockFetch.mock.calls[0][0]).toBe('http://custom-host:11434/api/tags')
    })
  })

  describe('Script Generation', () => {
    it('should make POST request to /api/generate', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: 'on mouseUp\n  answer "test"\nend mouseUp'
        })
      })

      const provider = new OllamaProvider()
      await provider.generate({
        description: 'Show alert',
        context: {}
      })
      
      expect(mockFetch).toHaveBeenCalledOnce()
      const [url] = mockFetch.mock.calls[0]
      expect(url).toBe('http://localhost:11434/api/generate')
    })

    it('should send correct request structure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: 'on mouseUp\nend mouseUp'
        })
      })

      const provider = new OllamaProvider()
      provider.setModel('mistral')
      
      await provider.generate({
        description: 'test',
        context: {}
      })
      
      const [, options] = mockFetch.mock.calls[0]
      expect(options.method).toBe('POST')
      expect(options.headers['content-type']).toBe('application/json')
      
      const body = JSON.parse(options.body) as Record<string, any>
      expect(body.model).toBe('mistral')
      expect(body.stream).toBe(false)
      expect(body.raw).toBe(true)
      expect(body.prompt).toBeDefined()
    })

    it('should parse response with text', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: 'on mouseUp\n  answer "Clicked!"\nend mouseUp'
        })
      })

      const provider = new OllamaProvider()
      const response = await provider.generate({
        description: 'test',
        context: {}
      })
      
      expect(response.code).toContain('on mouseUp')
      expect(response.code).toContain('answer')
      expect(response.explanation).toContain('Ollama')
      expect(response.confidence).toBeDefined()
    })

    it('should include description in prompt', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: 'on mouseUp\nend mouseUp'
        })
      })

      const provider = new OllamaProvider()
      await provider.generate({
        description: 'Show an alert when button is clicked',
        context: {}
      })
      
      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.prompt).toContain('Show an alert when button is clicked')
    })

    it('should include context in prompt', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: 'on mouseUp\nend mouseUp'
        })
      })

      const provider = new OllamaProvider()
      await provider.generate({
        description: 'test',
        context: {
          cardName: 'Game',
          fieldNames: ['score', 'level'],
          buttonLabels: ['Next']
        }
      })
      
      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.prompt).toContain('Game')
      expect(body.prompt).toContain('score')
      expect(body.prompt).toContain('level')
      expect(body.prompt).toContain('Next')
    })

    it('should use custom base URL for generation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: 'on mouseUp\nend mouseUp'
        })
      })

      const provider = new OllamaProvider()
      provider.setBaseUrl('http://remote-host:11434')
      
      await provider.generate({
        description: 'test',
        context: {}
      })
      
      const [url] = mockFetch.mock.calls[0]
      expect(url).toBe('http://remote-host:11434/api/generate')
    })

    it('should use configured model', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: 'on mouseUp\nend mouseUp'
        })
      })

      const provider = new OllamaProvider()
      provider.setModel('neural-chat')
      
      await provider.generate({
        description: 'test',
        context: {}
      })
      
      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.model).toBe('neural-chat')
    })
  })

  describe('Error Handling', () => {
    it('should throw error if model not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      })

      const provider = new OllamaProvider()
      provider.setModel('non-existent-model')
      
      await expect(
        provider.generate({
          description: 'test',
          context: {}
        })
      ).rejects.toThrow('not found')
    })

    it('should throw error on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      })

      const provider = new OllamaProvider()
      
      await expect(
        provider.generate({
          description: 'test',
          context: {}
        })
      ).rejects.toThrow('HTTP')
    })

    it('should throw error on empty response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: ''
        })
      })

      const provider = new OllamaProvider()
      
      await expect(
        provider.generate({
          description: 'test',
          context: {}
        })
      ).rejects.toThrow('empty')
    })

    it('should throw timeout error on abort', async () => {
      const abortError = new Error('Aborted')
      abortError.name = 'AbortError'
      mockFetch.mockRejectedValueOnce(abortError)

      const provider = new OllamaProvider()
      
      await expect(
        provider.generate({
          description: 'test',
          context: {}
        })
      ).rejects.toThrow('timeout')
    })

    it('should throw error when Ollama not running', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))

      const provider = new OllamaProvider()
      
      await expect(
        provider.generate({
          description: 'test',
          context: {}
        })
      ).rejects.toThrow('not running')
    })
  })

  describe('Fallback Behavior', () => {
    it('should gracefully handle unavailable Ollama during generation', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'))

      const provider = new OllamaProvider()
      
      await expect(
        provider.generate({
          description: 'test',
          context: {}
        })
      ).rejects.toBeDefined()
    })
  })
})
