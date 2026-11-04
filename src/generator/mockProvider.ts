/**
 * Task 4.8 & Task 8.6: Mock Model Provider for testing and offline demo mode.
 * 
 * Implements ModelProvider interface with no network calls or API keys.
 * Used as a fallback when other providers are unavailable.
 * 
 * Task 8.6: Template-based generation matching common keywords:
 * - click/press/tap → on mouseUp handler
 * - alert/say/show/message → answer with quoted text
 * - count/increment/counter → put field value + 1
 * - go/next/previous/navigate → go to next/previous card
 * - hide/show → (placeholder: put empty into field)
 * - beep/sound → (placeholder: answer with beep notice)
 * - default → on mouseUp with answer echoing request
 */

import { ModelProvider, ScriptGenRequest, ScriptGenResponse } from './modelProvider'

export class MockModelProvider extends ModelProvider {
  name = 'Mock Provider (Offline Demo)'

  /**
   * Extract quoted text from request description if present.
   */
  private extractQuotedText(description: string): string | null {
    const match = description.match(/"([^"]*)"|'([^']*)'/);
    return match ? (match[1] || match[2]) : null
  }

  /**
   * Generate HyperTalk code based on keywords in the request description.
   * Task 8.6: Match common patterns to sensible templates.
   * Pattern order matters: more specific patterns checked first.
   */
  async generate(request: ScriptGenRequest): Promise<ScriptGenResponse> {
    const description = request.description.toLowerCase().trim()
    
    // Extract field name for target of put statements
    const fieldName = request.context.fieldNames?.[0] || 'output'
    
    // Extract any quoted text from the description
    const quotedText = this.extractQuotedText(request.description)

    // Pattern 1: Click/press/tap handlers
    if (/\b(click|press|tap)\b/.test(description)) {
      const message = quotedText || 'Button clicked!'
      return {
        code: `on mouseUp
  answer "${message}"
end mouseUp`,
        explanation: 'Generated click handler matching "click/press/tap" pattern',
        confidence: 0.8
      }
    }

    // Pattern 2: Beep/sound handlers (checked before alert/say, which might have "beep" in description)
    if (/\b(beep|sound|ding|ring|bell)\b/.test(description)) {
      return {
        code: `on mouseUp
  answer "Beep!"
end mouseUp`,
        explanation: 'Generated sound handler matching "beep/sound" pattern',
        confidence: 0.8
      }
    }

    // Pattern 3: Hide handler (checked before general show/display patterns)
    if (/\bhide\b/.test(description)) {
      return {
        code: `on mouseUp
  put "" into field "${fieldName}"
end mouseUp`,
        explanation: 'Generated hide handler matching "hide" pattern (clear field)',
        confidence: 0.7
      }
    }

    // Pattern 4: Show handler (checked before alert/say which include "show" in the regex)
    if (/\bshow\b/.test(description)) {
      const message = quotedText || 'Visible'
      return {
        code: `on mouseUp
  put "${message}" into field "${fieldName}"
end mouseUp`,
        explanation: 'Generated show handler matching "show" pattern',
        confidence: 0.7
      }
    }

    // Pattern 5: Alert/say/message handlers (checked after show/hide/beep)
    if (/\b(alert|say|message|hello|display|popup)\b/.test(description)) {
      const message = quotedText || 'Hello from HyperCard'
      return {
        code: `on mouseUp
  answer "${message}"
end mouseUp`,
        explanation: 'Generated alert handler matching "alert/say/message" pattern',
        confidence: 0.8
      }
    }

    // Pattern 6: Counter/increment/count handlers
    if (/\b(count|increment|counter|increase|add one)\b/.test(description)) {
      return {
        code: `on mouseUp
  get field "${fieldName}"
  put it + 1 into field "${fieldName}"
end mouseUp`,
        explanation: 'Generated counter handler matching "count/increment" pattern',
        confidence: 0.8
      }
    }

    // Pattern 7: Navigation handlers (next/go/navigate/previous)
    if (/\b(next|previous|navigate|forward|back)\b/.test(description)) {
      const goCmd = /\bprevious\b/.test(description) ? 'go previous card' : 'go next card'
      return {
        code: `on mouseUp
  ${goCmd}
end mouseUp`,
        explanation: 'Generated navigation handler matching "go/next/previous" pattern',
        confidence: 0.8
      }
    }

    // Pattern 8: Field text update (put/set/update/text/write/enter)
    if (/\b(put|set|update|text|write|enter)\b/.test(description)) {
      const text = quotedText || 'Updated'
      return {
        code: `on mouseUp
  put "${text}" into field "${fieldName}"
end mouseUp`,
        explanation: 'Generated text update handler matching "put/set/update" pattern',
        confidence: 0.8
      }
    }

    // Default: echo the request in an answer dialog
    const echoText = quotedText || description.substring(0, 50)
    return {
      code: `on mouseUp
  answer "${echoText}"
end mouseUp`,
      explanation: 'Generated default click handler with request echo (mock provider)',
      confidence: 0.5
    }
  }

  async isAvailable(): Promise<boolean> {
    // Mock provider is always available (no network, no configuration)
    return true
  }
}
