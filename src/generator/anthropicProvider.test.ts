/**
 * Tests for AnthropicProvider (Task 4.2).
 * 
 * Tests:
 * - Request URL, headers, body shape
 * - Response parsing
 * - HTTP error mapping (401, 429, 5xx)
 * - Network errors
 * - Timeout via AbortController
 * - API key storage (sessionStorage, never localStorage)
 * - Key not leaked in errors or console
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AnthropicProvider } from './anthropicProvider'

// Mock global fetch
const originalFetch = global.fetch
const mockFetch = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  mockFetch.mockClear()
  mockFetch.mockReset()
  global.fetch = mockFetch as any
  // Clear sessionStorage
  sessionStorage.clear()
})

afterEach(() => {
  global.fetch = originalFetch
  sessionStorage.clear()
  vi.clearAllMocks()
})

describe('Task 4.2: AnthropicProvider', () => {
  describe('Initialization', () => {
    it('should have correct name', () => {
      const provider = new AnthropicProvider()
      expect(provider.name).toBe('Anthropic Claude')
    })

    it('should have default model', () => {
      const provider = new AnthropicProvider()
      expect(provider.getModel()).toBe('claude-3-5-sonnet-20241022')
    })

    it('should have default API base URL', () => {
      const provider = new AnthropicProvider()
      expect(provider.getApiBaseUrl()).toBe('https://api.anthropic.com/v1/messages')
    })

    it('should load API key from sessionStorage on init', () => {
      sessionStorage.setItem('anthropic_api_key', 'sk-ant-test-key')
      const provider = new AnthropicProvider()
      expect(provider.getApiKey()).toBe('***')
    })

    it('should initialize without API key if not in sessionStorage', () => {
      const provider = new AnthropicProvider()
      expect(provider.getApiKey()).toBeNull()
    })
  })

  describe('API Key Management', () => {
    it('should set API key in memory and sessionStorage', () => {
      const provider = new AnthropicProvider()
      provider.setApiKey('sk-ant-test123')
      
      expect(provider.getApiKey()).toBe('***')
      expect(sessionStorage.getItem('anthropic_api_key')).toBe('sk-ant-test123')
    })

    it('should not leak key in getApiKey()', () => {
      const provider = new AnthropicProvider()
      provider.setApiKey('sk-ant-super-secret-key-12345')
      
      const keyStatus = provider.getApiKey()
      expect(keyStatus).not.toContain('secret')
      expect(keyStatus).not.toContain('super')
      expect(keyStatus).toBe('***')
    })

    it('should clear API key from memory and sessionStorage', () => {
      const provider = new AnthropicProvider()
      provider.setApiKey('sk-ant-test123')
      expect(sessionStorage.getItem('anthropic_api_key')).toBe('sk-ant-test123')
      
      provider.clearApiKey()
      
      expect(provider.getApiKey()).toBeNull()
      expect(sessionStorage.getItem('anthropic_api_key')).toBeNull()
    })

    it('should never store key in localStorage', () => {
      const provider = new AnthropicProvider()
      provider.setApiKey('sk-ant-test123')
      
      expect(localStorage.getItem('anthropic_api_key')).toBeNull()
    })
  })

  describe('Model Configuration', () => {
    it('should allow setting model name', () => {
      const provider = new AnthropicProvider()
      provider.setModel('claude-3-opus-20240229')
      
      expect(provider.getModel()).toBe('claude-3-opus-20240229')
    })

    it('should allow setting API base URL', () => {
      const provider = new AnthropicProvider()
      provider.setApiBaseUrl('https://custom-api.example.com/v1/messages')
      
      expect(provider.getApiBaseUrl()).toBe('https://custom-api.example.com/v1/messages')
    })
  })

  describe('Availability Check', () => {
    it('should return false if no API key', async () => {
      const provider = new AnthropicProvider()
      
      const available = await provider.isAvailable()
      
      expect(available).toBe(false)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should check only API key availability, no network call', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        ok: true
      })

      const provider = new AnthropicProvider()
      
      // Without key
      expect(await provider.isAvailable()).toBe(false)
      expect(mockFetch).not.toHaveBeenCalled()
      
      // With key
      provider.setApiKey('sk-ant-test123')
      expect(await provider.isAvailable()).toBe(true)
      
      // Still no fetch call
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should return false without API key', async () => {
      const provider = new AnthropicProvider()
      const available = await provider.isAvailable()
      expect(available).toBe(false)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should return true with API key (no network call made)', async () => {
      const provider = new AnthropicProvider()
      provider.setApiKey('sk-ant-test123')
      
      const available = await provider.isAvailable()
      
      expect(available).toBe(true)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should not make network call even on error config', async () => {
      // Setup mock as if network would fail
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const provider = new AnthropicProvider()
      provider.setApiKey('sk-ant-test123')
      
      // isAvailable should not call fetch
      const available = await provider.isAvailable()
      expect(available).toBe(true)
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('Script Generation', () => {
    it('should throw error if no API key', async () => {
      const provider = new AnthropicProvider()
      
      await expect(
        provider.generate({
          description: 'test',
          context: {}
        })
      ).rejects.toThrow('API key not configured')
    })

    it('should make POST request with correct structure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: 'on mouseUp\n  answer "test"\nend mouseUp' }]
        })
      })

      const provider = new AnthropicProvider()
      provider.setApiKey('sk-ant-test123')
      provider.setModel('claude-3-5-sonnet-20241022')
      
      await provider.generate({
        description: 'Show an alert',
        context: { cardName: 'Test Card' }
      })
      
      expect(mockFetch).toHaveBeenCalledOnce()
      const [url, options] = mockFetch.mock.calls[0]
      
      expect(url).toBe('https://api.anthropic.com/v1/messages')
      expect(options.method).toBe('POST')
      
      const headers = options.headers as Record<string, string>
      expect(headers['x-api-key']).toBe('sk-ant-test123')
      expect(headers['anthropic-version']).toBe('2023-06-01')
      expect(headers['anthropic-dangerous-direct-browser-access']).toBe('true')
      expect(headers['content-type']).toBe('application/json')
      
      const body = JSON.parse(options.body) as Record<string, any>
      expect(body.model).toBe('claude-3-5-sonnet-20241022')
      expect(body.max_tokens).toBe(1024)
      expect(body.system).toContain('HyperTalk')
      expect(body.messages).toBeDefined()
      expect(body.messages[0].role).toBe('user')
    })

    it('should parse response with text content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: 'on mouseUp\n  answer "Clicked!"\nend mouseUp' }]
        })
      })

      const provider = new AnthropicProvider()
      provider.setApiKey('sk-ant-test123')
      
      const response = await provider.generate({
        description: 'Handle click',
        context: {}
      })
      
      expect(response.code).toContain('on mouseUp')
      expect(response.code).toContain('answer')
      expect(response.explanation).toBeDefined()
      expect(response.confidence).toBeDefined()
    })

    it('should not include API key in generated response or logs', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: 'on mouseUp\n  answer "test"\nend mouseUp' }]
        })
      })

      const provider = new AnthropicProvider()
      provider.setApiKey('sk-ant-secret-key-123')
      
      const response = await provider.generate({
        description: 'test',
        context: {}
      })
      
      // Key should not appear in response
      expect(JSON.stringify(response)).not.toContain('sk-ant-secret-key-123')
      
      // Key should not be logged
      expect(consoleSpy.mock.calls.join('') + consoleWarnSpy.mock.calls.join('')).not.toContain('sk-ant-secret-key-123')
      
      consoleSpy.mockRestore()
      consoleWarnSpy.mockRestore()
    })
  })

  describe('HTTP Error Mapping', () => {
    it('should map 401 to clear error message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ error: { message: 'Unauthorized' } })
      })

      const provider = new AnthropicProvider()
      provider.setApiKey('sk-ant-invalid-key')
      
      const response = await provider.generate({
        description: 'test',
        context: {}
      })
      
      expect(response.code).toBe('')
      expect(response.explanation).toContain('invalid')
      expect(response.explanation).not.toContain('sk-ant')
    })

    it('should map 429 to rate limit message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => JSON.stringify({ error: { message: 'Rate limited' } })
      })

      const provider = new AnthropicProvider()
      provider.setApiKey('sk-ant-test123')
      
      const response = await provider.generate({
        description: 'test',
        context: {}
      })
      
      expect(response.code).toBe('')
      expect(response.explanation).toContain('Rate limited')
    })

    it('should map 5xx to server error message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: async () => JSON.stringify({ error: { message: 'Service unavailable' } })
      })

      const provider = new AnthropicProvider()
      provider.setApiKey('sk-ant-test123')
      
      const response = await provider.generate({
        description: 'test',
        context: {}
      })
      
      expect(response.code).toBe('')
      expect(response.explanation).toContain('server error')
    })
  })

  describe('Network Errors', () => {
    it('should handle timeout gracefully', async () => {
      const abortError = new Error('Aborted')
      abortError.name = 'AbortError'
      mockFetch.mockRejectedValueOnce(abortError)

      const provider = new AnthropicProvider()
      provider.setApiKey('sk-ant-test123')
      
      await expect(
        provider.generate({
          description: 'test',
          context: {}
        })
      ).rejects.toThrow('timeout')
    })

    it('should handle network unreachable', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))

      const provider = new AnthropicProvider()
      provider.setApiKey('sk-ant-test123')
      
      await expect(
        provider.generate({
          description: 'test',
          context: {}
        })
      ).rejects.toThrow('Network error')
    })
  })

  describe('Prompt Building', () => {
    it('should include description in prompt', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: 'on mouseUp\nend mouseUp' }]
        })
      })

      const provider = new AnthropicProvider()
      provider.setApiKey('sk-ant-test123')
      
      await provider.generate({
        description: 'Show an alert when clicked',
        context: {}
      })
      
      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.messages[0].content).toContain('Show an alert when clicked')
    })

    it('should include card name in prompt', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: 'on mouseUp\nend mouseUp' }]
        })
      })

      const provider = new AnthropicProvider()
      provider.setApiKey('sk-ant-test123')
      
      await provider.generate({
        description: 'test',
        context: { cardName: 'Home Card' }
      })
      
      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.messages[0].content).toContain('Home Card')
    })

    it('should include field names in prompt', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: 'on mouseUp\nend mouseUp' }]
        })
      })

      const provider = new AnthropicProvider()
      provider.setApiKey('sk-ant-test123')
      
      await provider.generate({
        description: 'test',
        context: { fieldNames: ['score', 'status'] }
      })
      
      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.messages[0].content).toContain('score')
      expect(body.messages[0].content).toContain('status')
    })

    it('should include button labels in prompt', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: 'on mouseUp\nend mouseUp' }]
        })
      })

      const provider = new AnthropicProvider()
      provider.setApiKey('sk-ant-test123')
      
      await provider.generate({
        description: 'test',
        context: { buttonLabels: ['Next', 'Previous'] }
      })
      
      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.messages[0].content).toContain('Next')
      expect(body.messages[0].content).toContain('Previous')
    })
  })
})
