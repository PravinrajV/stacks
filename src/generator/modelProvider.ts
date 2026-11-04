/**
 * Abstract base interface for AI model providers.
 * REQ-SG-002
 *
 * Implementations can target Claude, Ollama, or other backends.
 * All network operations are mocked in tests; no real keys or API calls in this implementation.
 */

export interface ScriptGenRequest {
  description: string
  context: {
    cardName?: string
    fieldNames?: string[]
    buttonLabels?: string[]
  }
  style?: 'terse' | 'verbose' | 'commented'
}

export interface ScriptGenResponse {
  code: string
  explanation?: string
  confidence?: number
}

export abstract class ModelProvider {
  abstract name: string

  /**
   * Generate HyperTalk script from a user description.
   */
  abstract generate(request: ScriptGenRequest): Promise<ScriptGenResponse>

  /**
   * Check if this provider is available (e.g., API key configured, service reachable).
   */
  abstract isAvailable(): Promise<boolean>
}
