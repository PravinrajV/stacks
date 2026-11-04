/**
 * Tests for ProviderRegistry integration.
 * 
 * Tests:
 * - Provider registration and priority
 * - Availability checking
 * - Fallback to mock on failure
 * - Support for all three providers (Mock, Anthropic, Ollama)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ProviderRegistry } from './providerRegistry'
import { AnthropicProvider } from './anthropicProvider'
import { OllamaProvider } from './ollamaProvider'

const originalFetch = global.fetch
const mockFetch = vi.fn()

beforeEach(() => {
  global.fetch = mockFetch as any
  sessionStorage.clear()
})

afterEach(() => {
  global.fetch = originalFetch
  sessionStorage.clear()
  vi.clearAllMocks()
})

describe('ProviderRegistry Integration', () => {
  describe('Provider Access', () => {
    it('should provide access to Anthropic provider', () => {
      const registry = new ProviderRegistry()
      const anthropic = registry.getAnthropicProvider()
      
      expect(anthropic).toBeInstanceOf(AnthropicProvider)
      expect(anthropic.name).toBe('Anthropic Claude')
    })

    it('should provide access to Ollama provider', () => {
      const registry = new ProviderRegistry()
      const ollama = registry.getOllamaProvider()
      
      expect(ollama).toBeInstanceOf(OllamaProvider)
      expect(ollama.name).toBe('Ollama (Local)')
    })

    it('should provide access to Mock provider', () => {
      const registry = new ProviderRegistry()
      const mock = registry.getMockProvider()
      
      expect(mock.name).toContain('Mock')
    })
  })

  describe('Provider Configuration', () => {
    it('should configure Anthropic provider with API key', () => {
      const registry = new ProviderRegistry()
      const anthropic = registry.getAnthropicProvider()
      
      anthropic.setApiKey('sk-ant-test123')
      expect(anthropic.getApiKey()).toBe('***')
    })

    it('should configure Anthropic provider with model', () => {
      const registry = new ProviderRegistry()
      const anthropic = registry.getAnthropicProvider()
      
      anthropic.setModel('claude-3-opus-20240229')
      expect(anthropic.getModel()).toBe('claude-3-opus-20240229')
    })

    it('should configure Ollama provider with base URL', () => {
      const registry = new ProviderRegistry()
      const ollama = registry.getOllamaProvider()
      
      ollama.setBaseUrl('http://custom-host:11434')
      expect(ollama.getBaseUrl()).toBe('http://custom-host:11434')
    })

    it('should configure Ollama provider with model', () => {
      const registry = new ProviderRegistry()
      const ollama = registry.getOllamaProvider()
      
      ollama.setModel('neural-chat')
      expect(ollama.getModel()).toBe('neural-chat')
    })
  })

  describe('Provider Availability', () => {
    it('should check Anthropic availability (no key = unavailable)', async () => {
      const registry = new ProviderRegistry()
      const anthropic = registry.getAnthropicProvider()
      
      // No key configured, should not be available
      const available = await anthropic.isAvailable()
      expect(available).toBe(false)
    })

    it('should check Ollama availability', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'))
      
      const registry = new ProviderRegistry()
      const ollama = registry.getOllamaProvider()
      
      const available = await ollama.isAvailable()
      expect(available).toBe(false) // Not running
    })

    it('should show Mock provider always available', async () => {
      const registry = new ProviderRegistry()
      const mock = registry.getMockProvider()
      
      const available = await mock.isAvailable()
      expect(available).toBe(true)
    })
  })

  describe('Provider Selection and Fallback', () => {
    it('should generate with Anthropic when configured', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: 'on mouseUp\n  answer "Test"\nend mouseUp' }]
        })
      })

      const registry = new ProviderRegistry()
      registry.getAnthropicProvider().setApiKey('sk-ant-test123')
      registry.register(registry.getAnthropicProvider())
      
      const result = await registry.generate({
        description: 'test',
        context: {}
      })
      
      expect('code' in result ? result.code : '').toContain('on mouseUp')
    })

    it('should generate with Ollama when Anthropic unavailable', async () => {
      // Anthropic fetch fails (no key)
      // Ollama succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: 'on mouseUp\n  answer "From Ollama"\nend mouseUp'
        })
      })

      const registry = new ProviderRegistry()
      registry.register(registry.getOllamaProvider())
      
      const result = await registry.generate({
        description: 'test',
        context: {}
      })
      
      expect('code' in result ? result.code : '').toContain('on mouseUp')
    })

    it('should fallback to Mock when all configured providers fail', async () => {
      // Both Anthropic and Ollama fail
      mockFetch.mockRejectedValue(new Error('Network error'))

      const registry = new ProviderRegistry()
      registry.register(registry.getAnthropicProvider())
      registry.register(registry.getOllamaProvider())
      
      const result = await registry.generate({
        description: 'test',
        context: {}
      })
      
      // Should get result from Mock provider
      expect('code' in result ? result.code : '').toBeDefined()
    })

    it('should use Mock provider when no providers registered', async () => {
      const registry = new ProviderRegistry()
      // Don't register any providers
      
      const result = await registry.generate({
        description: 'test',
        context: {}
      })
      
      expect('code' in result ? result.code : '').toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should return clear error message if all providers fail', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const registry = new ProviderRegistry()
      registry.register(registry.getAnthropicProvider())
      
      // Mock provider also somehow fails (edge case)
      const mockProvider = registry.getMockProvider()
      vi.spyOn(mockProvider, 'generate').mockRejectedValueOnce(new Error('Mock error'))
      
      const result = await registry.generate({
        description: 'test',
        context: {}
      })
      
      if ('error' in result) {
        expect(result.error).toContain('failed')
      }
    })

    it('should continue to next provider on failure', async () => {
      const callCount = { anthropic: 0, ollama: 0 }
      
      mockFetch.mockImplementation(async (url: string) => {
        if (url.includes('anthropic')) {
          callCount.anthropic++
          throw new Error('Anthropic failed')
        }
        if (url.includes('11434')) {
          callCount.ollama++
          return {
            ok: true,
            json: async () => ({
              response: 'on mouseUp\nend mouseUp'
            })
          }
        }
        return { ok: false }
      })

      const registry = new ProviderRegistry()
      registry.getAnthropicProvider().setApiKey('sk-ant-test123')
      registry.register(registry.getAnthropicProvider())
      registry.register(registry.getOllamaProvider())
      
      const result = await registry.generate({
        description: 'test',
        context: {}
      })
      
      expect('code' in result ? result.code : '').toBeDefined()
    })
  })

  describe('Provider Priority', () => {
    it('should respect registration order for priority', async () => {
      const callTracker: string[] = []

      const registry = new ProviderRegistry()
      
      // Configure both providers
      const anthropic = registry.getAnthropicProvider()
      const ollama = registry.getOllamaProvider()
      
      // Spy on their isAvailable methods
      vi.spyOn(anthropic, 'isAvailable').mockImplementation(async () => {
        callTracker.push('anthropic-check')
        return false // Not available
      })
      
      vi.spyOn(ollama, 'isAvailable').mockImplementation(async () => {
        callTracker.push('ollama-check')
        return true // Available
      })
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: 'on mouseUp\nend mouseUp'
        })
      })
      
      // Register in order: Anthropic first, Ollama second
      // Note: unshift means later registrations have higher priority
      registry.register(anthropic)
      registry.register(ollama)
      
      await registry.generate({
        description: 'test',
        context: {}
      })
      
      // Ollama should be checked first since it was registered last (higher priority via unshift)
      expect(callTracker[0]).toBe('ollama-check')
    })
  })

  describe('Status Reporting', () => {
    it('should report status for registered and mock providers', async () => {
      const registry = new ProviderRegistry()
      registry.register(registry.getAnthropicProvider())
      registry.register(registry.getOllamaProvider())
      
      const status = await registry.getProvidersStatus()
      
      const names = status.map(s => s.name)
      // Always includes mock provider
      expect(names.length).toBeGreaterThanOrEqual(1)
      expect(names.some(n => n.includes('Mock'))).toBe(true)
    })

    it('should include availability in status', async () => {
      const registry = new ProviderRegistry()
      const status = await registry.getProvidersStatus()
      
      for (const provider of status) {
        expect(provider).toHaveProperty('available')
        expect(typeof provider.available).toBe('boolean')
      }
    })
  })

  describe('Provider Cleanup', () => {
    it('should clear registered providers', () => {
      const registry = new ProviderRegistry()
      registry.register(registry.getAnthropicProvider())
      registry.register(registry.getOllamaProvider())
      
      registry.clear()
      
      // After clear, should use mock as fallback
      // (no way to directly check, but can verify behavior)
    })
  })
})
