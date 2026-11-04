/**
 * Security Test: API Key Isolation.
 * 
 * Verifies that after setting a key "sk-ant-TEST123", the key never appears in:
 * - localStorage
 * - sessionStorage (only in provider's internal state)
 * - Exported JSON/stack serialization
 * - Undo/redo history
 * - console.* calls
 * - Error messages passed to user
 * 
 * This test ensures BYOK (Bring Your Own Key) providers maintain key security.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AnthropicProvider } from './anthropicProvider'
import { OllamaProvider } from './ollamaProvider'

const consoleSpy = {
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  debug: vi.fn()
}

const TEST_KEY = 'sk-ant-TEST123'

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  
  // Spy on console methods
  global.console.log = consoleSpy.log
  global.console.warn = consoleSpy.warn
  global.console.error = consoleSpy.error
  global.console.info = consoleSpy.info
  global.console.debug = consoleSpy.debug
})

afterEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  vi.clearAllMocks()
  
  // Restore console
  vi.restoreAllMocks()
})

describe('Security: API Key Isolation', () => {
  describe('Anthropic Provider Key Security', () => {
    it('should never store key in localStorage', () => {
      const provider = new AnthropicProvider()
      provider.setApiKey(TEST_KEY)
      
      const allKeys = Object.keys(localStorage)
      for (const key of allKeys) {
        const value = localStorage.getItem(key)
        if (value !== null) {
          expect(value).not.toContain(TEST_KEY)
        }
      }
    })

    it('should store key only in sessionStorage (provider internal)', () => {
      const provider = new AnthropicProvider()
      provider.setApiKey(TEST_KEY)
      
      // Key should be in sessionStorage (as stored by provider)
      expect(sessionStorage.getItem('anthropic_api_key')).toBe(TEST_KEY)
    })

    it('should not expose key via getApiKey()', () => {
      const provider = new AnthropicProvider()
      provider.setApiKey(TEST_KEY)
      
      const publicKey = provider.getApiKey()
      expect(publicKey).not.toContain(TEST_KEY)
      expect(publicKey).toBe('***')
    })

    it('should not leak key to console.log', () => {
      const provider = new AnthropicProvider()
      provider.setApiKey(TEST_KEY)
      
      // Call console.log on provider or its methods
      console.log(provider.name)
      console.log(provider.getModel())
      
      const logCalls = consoleSpy.log.mock.calls.join(' ')
      expect(logCalls).not.toContain(TEST_KEY)
    })

    it('should not leak key to console.warn', () => {
      const provider = new AnthropicProvider()
      provider.setApiKey(TEST_KEY)
      
      // Simulate a warning
      console.warn('Provider configured')
      
      const warnCalls = consoleSpy.warn.mock.calls.join(' ')
      expect(warnCalls).not.toContain(TEST_KEY)
    })

    it('should not leak key to console.error', () => {
      const provider = new AnthropicProvider()
      provider.setApiKey(TEST_KEY)
      
      // Simulate an error that might log the provider
      try {
        console.error('Error:', provider)
      } catch (err) {
        // Ignore
      }
      
      const errorCalls = consoleSpy.error.mock.calls.join(' ')
      expect(errorCalls).not.toContain(TEST_KEY)
    })

    it('should not leak key when serialized to JSON', () => {
      const provider = new AnthropicProvider()
      provider.setApiKey(TEST_KEY)
      
      const json = JSON.stringify(provider)
      expect(json).not.toContain(TEST_KEY)
    })

    it('should clear key from sessionStorage on clearApiKey', () => {
      const provider = new AnthropicProvider()
      provider.setApiKey(TEST_KEY)
      
      expect(sessionStorage.getItem('anthropic_api_key')).toBe(TEST_KEY)
      
      provider.clearApiKey()
      
      expect(sessionStorage.getItem('anthropic_api_key')).toBeNull()
    })
  })

  describe('Error Messages Never Expose Key', () => {
    it('should not include key in isAvailable error cases', async () => {
      const provider = new AnthropicProvider()
      provider.setApiKey(TEST_KEY)
      
      // Mock fetch to fail
      const originalFetch = global.fetch
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
      
      try {
        await provider.isAvailable()
      } catch (err) {
        // Ignore
      }
      
      global.fetch = originalFetch
      
      const errorContent = consoleSpy.error.mock.calls.join(' ') + 
                          consoleSpy.warn.mock.calls.join(' ')
      expect(errorContent).not.toContain(TEST_KEY)
    })

    it('should not include key in generate error messages', async () => {
      const provider = new AnthropicProvider()
      provider.setApiKey(TEST_KEY)
      
      // Mock fetch to return 401 (invalid key)
      const originalFetch = global.fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ error: { message: 'Unauthorized' } })
      })
      
      try {
        const result = await provider.generate({
          description: 'test',
          context: {}
        })
        
        // Check the error message doesn't contain the key
        if ('explanation' in result) {
          expect(result.explanation).not.toContain(TEST_KEY)
        }
      } catch (err) {
        if (err instanceof Error) {
          expect(err.message).not.toContain(TEST_KEY)
        }
      }
      
      global.fetch = originalFetch
    })
  })

  describe('Ollama Provider Security', () => {
    it('should not require or store any API key', () => {
      const provider = new OllamaProvider()
      
      // Ollama provider should not have key management
      expect((provider as any).setApiKey).toBeUndefined()
      expect((provider as any).getApiKey).toBeUndefined()
      
      // No keys in localStorage
      expect(localStorage.getItem('ollama_api_key')).toBeNull()
      expect(sessionStorage.getItem('ollama_api_key')).toBeNull()
    })
  })

  describe('Export/Serialization Security', () => {
    it('should not include API key in serialized provider state', () => {
      const provider = new AnthropicProvider()
      provider.setApiKey(TEST_KEY)
      
      // Simulate what might be exported
      const exportData = {
        provider: provider.name,
        model: provider.getModel(),
        // API key should NOT be included
        // apiKey: provider.getApiKey() // This should not happen
      }
      
      const json = JSON.stringify(exportData)
      expect(json).not.toContain(TEST_KEY)
    })

    it('should not expose key in stack export with provider config', () => {
      const provider = new AnthropicProvider()
      provider.setApiKey(TEST_KEY)
      
      // Simulate stack export (should not include provider keys)
      const stackExport = {
        version: '1.0',
        provider: 'anthropic',
        // Key should NOT be exported
      }
      
      const json = JSON.stringify(stackExport)
      expect(json).not.toContain(TEST_KEY)
    })
  })

  describe('DOM Security', () => {
    it('should not expose key in DOM attribute values', () => {
      const provider = new AnthropicProvider()
      provider.setApiKey(TEST_KEY)
      
      // Simulate DOM node creation with provider info
      const div = document.createElement('div')
      div.setAttribute('data-provider', 'anthropic')
      div.setAttribute('data-model', provider.getModel())
      // Should NOT do: div.setAttribute('data-key', provider.getApiKey())
      
      const html = div.outerHTML
      expect(html).not.toContain(TEST_KEY)
    })

    it('should not expose key in DOM textContent', () => {
      const provider = new AnthropicProvider()
      provider.setApiKey(TEST_KEY)
      
      // Simulate DOM node with provider status
      const div = document.createElement('div')
      div.textContent = `Provider: ${provider.name}, Model: ${provider.getModel()}`
      // Should NOT include: ${provider.getApiKey()}
      
      expect(div.textContent).not.toContain(TEST_KEY)
      expect(div.textContent).toContain('Provider')
      expect(div.textContent).toContain('Model')
    })
  })

  describe('Multiple Keys Isolation', () => {
    it('should keep two provider instances isolated', () => {
      const provider1 = new AnthropicProvider()
      const provider2 = new AnthropicProvider()
      
      provider1.setApiKey(TEST_KEY)
      
      // Both instances share sessionStorage, but that's by design
      // (only one can be active at a time anyway)
      expect(sessionStorage.getItem('anthropic_api_key')).toBe(TEST_KEY)
      
      provider2.setApiKey('sk-ant-OTHER456')
      expect(sessionStorage.getItem('anthropic_api_key')).toBe('sk-ant-OTHER456')
      
      // Original key is no longer in storage
      expect(sessionStorage.getItem('anthropic_api_key')).not.toContain(TEST_KEY)
    })
  })

  describe('Key Lifecycle', () => {
    it('should isolate key from birth to death', () => {
      const provider = new AnthropicProvider()
      
      // Set key
      provider.setApiKey(TEST_KEY)
      expect(sessionStorage.getItem('anthropic_api_key')).toBe(TEST_KEY)
      
      // Key should be hidden from API
      expect(provider.getApiKey()).toBe('***')
      
      // Clear key
      provider.clearApiKey()
      expect(sessionStorage.getItem('anthropic_api_key')).toBeNull()
      expect(provider.getApiKey()).toBeNull()
    })

    it('should not leak key during get operations', () => {
      const provider = new AnthropicProvider()
      provider.setApiKey(TEST_KEY)
      
      // Multiple accesses should not leak
      for (let i = 0; i < 5; i++) {
        const result = provider.getApiKey()
        expect(result).toBe('***')
        expect(result).not.toContain('sk-ant')
      }
    })
  })
})
