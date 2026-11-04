import { describe, it, expect } from 'vitest'
import { deserializeStack } from '../src/model/serialization'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('Examples', () => {
  describe('haunted-counter.json', () => {
    it('should load and deserialize correctly', () => {
      const filePath = join(process.cwd(), 'examples', 'haunted-counter.json')
      const fileContent = readFileSync(filePath, 'utf-8')

      // deserializeStack expects the full JSON string with version
      const stack = deserializeStack(fileContent)

      // Validate stack structure
      expect(stack.id).toBe('stack-demo')
      expect(stack.name).toBe('Haunted Counter')
      expect(stack.cards.length).toBe(2)

      // Validate first card
      const card1 = stack.cards[0]
      expect(card1.name).toBe('Welcome')
      expect(card1.fields.length).toBe(2)
      expect(card1.buttons.length).toBe(2)

      // Validate button labels
      const knockBtn = card1.buttons.find(b => b.label === 'Knock')
      expect(knockBtn).toBeDefined()
      expect(knockBtn?.scripts.mouseUp).toContain('field "Count"')

      const openBtn = card1.buttons.find(b => b.label === 'Open the door')
      expect(openBtn).toBeDefined()

      // Validate second card
      const card2 = stack.cards[1]
      expect(card2.name).toBe('Inside')
      expect(card2.fields.length).toBe(1)
      expect(card2.buttons.length).toBe(2)

      const helloBtn = card2.buttons.find(b => b.label === 'Say hello')
      expect(helloBtn).toBeDefined()
      expect(helloBtn?.scripts.mouseUp).toContain('Welcome back, HyperCard')
    })

    it('should preserve field content and properties', () => {
      const filePath = join(process.cwd(), 'examples', 'haunted-counter.json')
      const fileContent = readFileSync(filePath, 'utf-8')

      const stack = deserializeStack(fileContent)
      const card1 = stack.cards[0]

      // Check field values
      const statusField = card1.fields.find(f => f.name === 'Status')
      expect(statusField?.content).toBe('Nobody has knocked yet.')

      const countField = card1.fields.find(f => f.name === 'Count')
      expect(countField?.content).toBe('0')
    })
  })
})
