/**
 * Tests for ModelProvider interface.
 * Tests that implementations can be created and used correctly.
 */

import { describe, it, expect } from 'vitest'
import { ModelProvider, ScriptGenRequest, ScriptGenResponse } from './modelProvider'

/**
 * Concrete implementation for testing.
 */
class TestModelProvider extends ModelProvider {
  name = 'TestProvider'

  async generate(request: ScriptGenRequest): Promise<ScriptGenResponse> {
    // Mock implementation: echo back a simple script
    return {
      code: `on mouseUp
  answer "${request.description}"
end mouseUp`,
      explanation: 'Test explanation',
      confidence: 0.95
    }
  }

  async isAvailable(): Promise<boolean> {
    return true
  }
}

describe('Task 4.1: ModelProvider Interface', () => {
  it('should have name property', () => {
    const provider = new TestModelProvider()
    expect(provider.name).toBe('TestProvider')
  })

  it('should implement generate method', async () => {
    const provider = new TestModelProvider()
    const request: ScriptGenRequest = {
      description: 'test request',
      context: {
        cardName: 'Test'
      }
    }
    const response = await provider.generate(request)
    expect(response.code).toBeDefined()
    expect(response.code).toContain('on mouseUp')
  })

  it('should implement isAvailable method', async () => {
    const provider = new TestModelProvider()
    const available = await provider.isAvailable()
    expect(typeof available).toBe('boolean')
  })

  it('should support optional explanation in response', async () => {
    const provider = new TestModelProvider()
    const response = await provider.generate({
      description: 'test',
      context: {}
    })
    expect(response).toHaveProperty('code')
    if (response.explanation) {
      expect(typeof response.explanation).toBe('string')
    }
  })

  it('should support optional confidence in response', async () => {
    const provider = new TestModelProvider()
    const response = await provider.generate({
      description: 'test',
      context: {}
    })
    if (response.confidence !== undefined) {
      expect(typeof response.confidence).toBe('number')
      expect(response.confidence).toBeGreaterThanOrEqual(0)
      expect(response.confidence).toBeLessThanOrEqual(1)
    }
  })

  it('should accept context with cardName', async () => {
    const provider = new TestModelProvider()
    const response = await provider.generate({
      description: 'test',
      context: {
        cardName: 'MyCard'
      }
    })
    expect(response.code).toBeDefined()
  })

  it('should accept context with fieldNames', async () => {
    const provider = new TestModelProvider()
    const response = await provider.generate({
      description: 'test',
      context: {
        fieldNames: ['field1', 'field2']
      }
    })
    expect(response.code).toBeDefined()
  })

  it('should accept context with buttonLabels', async () => {
    const provider = new TestModelProvider()
    const response = await provider.generate({
      description: 'test',
      context: {
        buttonLabels: ['OK', 'Cancel']
      }
    })
    expect(response.code).toBeDefined()
  })

  it('should support style parameter', async () => {
    const provider = new TestModelProvider()
    const response = await provider.generate({
      description: 'test',
      context: {},
      style: 'verbose'
    })
    expect(response.code).toBeDefined()
  })

  it('should handle all style options', async () => {
    const provider = new TestModelProvider()
    const styles: Array<'terse' | 'verbose' | 'commented'> = ['terse', 'verbose', 'commented']

    for (const style of styles) {
      const response = await provider.generate({
        description: 'test',
        context: {},
        style
      })
      expect(response.code).toBeDefined()
    }
  })

  it('should implement generate with all context fields', async () => {
    const provider = new TestModelProvider()
    const response = await provider.generate({
      description: 'Complex request',
      context: {
        cardName: 'Game',
        fieldNames: ['score', 'level'],
        buttonLabels: ['Next', 'Quit']
      },
      style: 'verbose'
    })
    expect(response.code).toBeDefined()
    expect(response).toHaveProperty('code')
  })

  it('should be abstract base class', () => {
    // ModelProvider is designed as abstract base for implementations
    const provider = new TestModelProvider()
    expect(provider).toBeInstanceOf(ModelProvider)
  })

  it('should be extendable for different providers', () => {
    class AlternativeProvider extends ModelProvider {
      name = 'Alternative'
      async generate(): Promise<ScriptGenResponse> {
        return { code: 'test' }
      }
      async isAvailable(): Promise<boolean> {
        return true
      }
    }

    const provider = new AlternativeProvider()
    expect(provider.name).toBe('Alternative')
  })
})
