/**
 * Task 4.8: Provider Registry and Fallback System.
 * 
 * Manages multiple model providers with automatic fallback.
 * If primary provider fails or is unavailable, tries fallback chain.
 * Always falls back to mock provider as last resort.
 */

import { ModelProvider, ScriptGenRequest, ScriptGenResponse } from './modelProvider'
import { MockModelProvider } from './mockProvider'

export class ProviderRegistry {
  private providers: ModelProvider[] = []
  private mockProvider = new MockModelProvider()

  /**
   * Register a provider. First registered has highest priority.
   */
  register(provider: ModelProvider): void {
    this.providers.unshift(provider) // Prepend for priority
  }

  /**
   * Get the first available provider (or mock if all fail).
   */
  private async getAvailableProvider(): Promise<ModelProvider> {
    for (const provider of this.providers) {
      try {
        const available = await provider.isAvailable()
        if (available) {
          return provider
        }
      } catch (err) {
        // Provider check failed, try next
        continue
      }
    }

    // No registered providers available, use mock
    return this.mockProvider
  }

  /**
   * Generate script, trying providers in order until one succeeds.
   * Falls back to mock provider if all fail.
   */
  async generate(
    request: ScriptGenRequest
  ): Promise<{ code: string; explanation?: string; confidence?: number } | { error: string }> {
    // Try registered providers in priority order
    for (const provider of this.providers) {
      try {
        const available = await provider.isAvailable()
        if (!available) {
          continue
        }

        const response = await provider.generate(request)
        return response
      } catch (err) {
        // Log error but continue to next provider
        console.warn(`Provider ${provider.name} failed:`, err instanceof Error ? err.message : String(err))
        continue
      }
    }

    // All registered providers failed or unavailable, use mock as fallback
    try {
      const mockResponse = await this.mockProvider.generate(request)
      return mockResponse
    } catch (err) {
      return {
        error: `All providers failed. Mock provider error: ${err instanceof Error ? err.message : String(err)}`
      }
    }
  }

  /**
   * Get list of registered providers with availability status.
   */
  async getProvidersStatus(): Promise<
    Array<{ name: string; available: boolean }>
  > {
    const status: Array<{ name: string; available: boolean }> = []

    for (const provider of this.providers) {
      try {
        const available = await provider.isAvailable()
        status.push({ name: provider.name, available })
      } catch (err) {
        status.push({ name: provider.name, available: false })
      }
    }

    // Always include mock as fallback
    status.push({ name: this.mockProvider.name, available: true })

    return status
  }

  /**
   * Clear all registered providers (useful for testing).
   */
  clear(): void {
    this.providers = []
  }
}

// Global singleton instance
export const defaultRegistry = new ProviderRegistry()
