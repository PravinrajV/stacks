/**
 * Task 4.2: AnthropicProvider for Claude API.
 * 
 * Implements BYOK (Bring Your Own Key) for Claude API.
 * Browser-direct fetch to https://api.anthropic.com/v1/messages
 * 
 * Security:
 * - API key stored in memory + sessionStorage only (never localStorage, never exported)
 * - Key never logged or passed to console.*
 * - Explicit privacy notice shown to user
 * - AbortController timeout on all requests
 * - Key excluded from JSON serialization
 */

import { ModelProvider, ScriptGenRequest, ScriptGenResponse } from './modelProvider'

export class AnthropicProvider extends ModelProvider {
  name = 'Anthropic Claude'
  
  private apiKey: string = ''
  private model: string = 'claude-3-5-sonnet-20241022'
  private apiVersion: string = '2023-06-01'
  private apiBaseUrl: string = 'https://api.anthropic.com/v1/messages'
  private timeout: number = 30000 // 30 seconds
  
  constructor() {
    super()
    // Load key from sessionStorage if available
    const stored = sessionStorage.getItem('anthropic_api_key')
    if (stored) {
      this.apiKey = stored
    }
  }
  
  /**
   * Set the API key. Stored in memory + sessionStorage only.
   */
  setApiKey(key: string): void {
    this.apiKey = key
    sessionStorage.setItem('anthropic_api_key', key)
  }
  
  /**
   * Get the current API key (returns redacted version for safety).
   */
  getApiKey(): string | null {
    return this.apiKey ? '***' : null
  }
  
  /**
   * Clear the API key.
   */
  clearApiKey(): void {
    this.apiKey = ''
    sessionStorage.removeItem('anthropic_api_key')
  }
  
  /**
   * Set the model name (e.g., 'claude-3-5-sonnet-20241022').
   */
  setModel(model: string): void {
    this.model = model
  }
  
  getModel(): string {
    return this.model
  }
  
  /**
   * Set the API base URL (default: https://api.anthropic.com/v1/messages).
   */
  setApiBaseUrl(url: string): void {
    this.apiBaseUrl = url
  }
  
  getApiBaseUrl(): string {
    return this.apiBaseUrl
  }
  
  /**
   * Custom JSON serialization: exclude apiKey for security.
   */
  toJSON(): any {
    return {
      name: this.name,
      model: this.model,
      apiVersion: this.apiVersion,
      apiBaseUrl: this.apiBaseUrl
      // apiKey deliberately excluded
    }
  }
  
  async isAvailable(): Promise<boolean> {
    // Check if API key is configured
    if (!this.apiKey) {
      return false
    }
    
    // Test connectivity with a minimal request
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5s timeout for availability check
      
      const response = await fetch(this.apiBaseUrl, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': this.apiVersion,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 10,
          messages: [{ role: 'user', content: 'ping' }]
        }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      // Any response that isn't a network error means the service is reachable
      return response.status !== 0
    } catch (err) {
      // Network error, timeout, or invalid key
      return false
    }
  }
  
  async generate(request: ScriptGenRequest): Promise<ScriptGenResponse> {
    if (!this.apiKey) {
      throw new Error('Anthropic API key not configured. Please set your API key in settings.')
    }
    
    // Build system prompt
    const systemPrompt = `You are a HyperTalk code generator. Generate ONLY valid HyperTalk code in response to user requests.
    
Your response must be:
1. ONLY the handler definition (no explanations, no markdown, no code blocks)
2. Valid HyperTalk syntax
3. Wrapped in "on HANDLER_NAME ... end HANDLER_NAME" format

Example format:
on mouseUp
  answer "Hello world"
end mouseUp

Never include explanations or anything except the code.`
    
    // Build user message from request
    const userMessage = this.buildUserMessage(request)
    
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)
      
      const response = await fetch(this.apiBaseUrl, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': this.apiVersion,
          'anthropic-dangerous-direct-browser-access': 'true',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }]
        }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        const errorBody = await response.text()
        return this.mapErrorResponse(response.status, errorBody)
      }
      
      const data = await response.json() as { content?: Array<{ type?: string; text?: string }> }
      
      // Extract text content from response
      const textContent = data.content?.[0]?.text || ''
      if (!textContent) {
        throw new Error('No text content in Anthropic response')
      }
      
      return {
        code: textContent.trim(),
        explanation: 'Generated by Claude API',
        confidence: 0.85
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Request timeout: Anthropic API took too long to respond')
      }
      if (err instanceof Error && err.message.includes('Failed to fetch')) {
        throw new Error('Network error: Unable to reach Anthropic API. Check your internet connection.')
      }
      throw err
    }
  }
  
  private buildUserMessage(request: ScriptGenRequest): string {
    const parts: string[] = [request.description]
    
    if (request.context.cardName) {
      parts.push(`Card: ${request.context.cardName}`)
    }
    if (request.context.fieldNames && request.context.fieldNames.length > 0) {
      parts.push(`Available fields: ${request.context.fieldNames.join(', ')}`)
    }
    if (request.context.buttonLabels && request.context.buttonLabels.length > 0) {
      parts.push(`Available buttons: ${request.context.buttonLabels.join(', ')}`)
    }
    
    return parts.join('\n')
  }
  
  private mapErrorResponse(status: number, body: string): ScriptGenResponse {
    // Map HTTP errors to user-friendly messages
    if (status === 401) {
      return {
        code: '',
        explanation: 'API key is invalid or expired. Please check your Anthropic API key in settings.'
      }
    }
    if (status === 429) {
      return {
        code: '',
        explanation: 'Rate limited. Too many requests to Anthropic API. Please wait and try again.'
      }
    }
    if (status >= 500) {
      return {
        code: '',
        explanation: 'Anthropic API server error. Please try again later.'
      }
    }
    
    // Default error message
    try {
      const errorData = JSON.parse(body) as { error?: { message?: string } }
      const message = errorData.error?.message || 'Unknown error'
      return {
        code: '',
        explanation: `API error: ${message}`
      }
    } catch {
      return {
        code: '',
        explanation: `API error: HTTP ${status}`
      }
    }
  }
}
