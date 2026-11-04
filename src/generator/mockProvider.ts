/**
 * Task 4.8: Mock Model Provider for testing and fallback.
 * 
 * Implements ModelProvider interface with no network calls or API keys.
 * Used as a fallback when other providers are unavailable.
 */

import { ModelProvider, ScriptGenRequest, ScriptGenResponse } from './modelProvider'

export class MockModelProvider extends ModelProvider {
  name = 'Mock Provider (Local)'

  private templates: Map<string, string> = new Map([
    [
      'click',
      `on mouseUp
  answer "Button clicked!"
end mouseUp`
    ],
    [
      'alert',
      `on mouseUp
  answer "Alert message"
end mouseUp`
    ],
    [
      'update',
      `on mouseUp
  put "Updated" into field "output"
end mouseUp`
    ],
    [
      'navigate',
      `on mouseUp
  go next card
end mouseUp`
    ],
    [
      'calculate',
      `on mouseUp
  put add(2, 3) into field "result"
end mouseUp`
    ]
  ])

  async generate(request: ScriptGenRequest): Promise<ScriptGenResponse> {
    // Simple template-based generation
    const description = request.description.toLowerCase()

    // Find matching template
    for (const [key, template] of this.templates) {
      if (description.includes(key)) {
        return {
          code: template,
          explanation: `Generated using mock template for keyword: ${key}`,
          confidence: 0.7
        }
      }
    }

    // Default: generate a generic click handler
    const fieldName = request.context.fieldNames?.[0] || 'output'
    const code = `on mouseUp
  put "Executed" into field "${fieldName}"
end mouseUp`

    return {
      code,
      explanation: 'Generated default handler (mock provider)',
      confidence: 0.5
    }
  }

  async isAvailable(): Promise<boolean> {
    // Mock provider is always available (no network, no configuration)
    return true
  }
}
