import { describe, it, expect } from 'vitest'
import { deserializeStack } from '../src/model/serialization'
import { readFileSync } from 'fs'
import { join } from 'path'
import { Lexer } from '../src/interpreter/lexer'
import { Parser } from '../src/interpreter/parser'

const CARD_WIDTH = 512
const CARD_HEIGHT = 342

function loadHouse() {
  const filePath = join(process.cwd(), 'examples', 'haunted-house.json')
  return deserializeStack(readFileSync(filePath, 'utf-8'))
}

describe('Examples', () => {
  describe('haunted-house.json', () => {
    it('loads the five-card haunted house', () => {
      const stack = loadHouse()

      expect(stack.id).toBe('stack-haunted-house')
      expect(stack.name).toBe('Haunted House')
      expect(stack.cards.map((card) => card.name)).toEqual([
        'Porch',
        'Hall',
        'Library',
        'Crypt',
        'Dawn'
      ])
      expect(stack.variables.get('key')).toBe('')

      const porch = stack.cards[0]
      expect(porch.fields.find((field) => field.name === 'Status')?.content).toBe(
        'Nobody has knocked yet.'
      )
      expect(porch.fields.find((field) => field.name === 'Count')?.content).toBe('0')
      expect(porch.buttons.map((button) => button.label)).toEqual(['Knock', 'Enter'])

      const library = stack.cards[2]
      const book = library.fields.find((field) => field.name === 'Story')
      expect(book?.content).toContain('Ravenwood')
      expect(library.fields.find((field) => field.name === 'Answer')?.editable).toBe(true)
      expect(library.buttons.map((button) => button.label)).toEqual(['Speak', 'Hall'])
    })

    it('keeps every part inside the 512×342 card and gives each card a real text block', () => {
      const stack = loadHouse()

      for (const card of stack.cards) {
        const parts = [...card.fields, ...card.buttons]
        expect(parts.length).toBeGreaterThan(2)
        const story = card.fields.find((field) => field.name === 'Story')
        expect(story).toBeTruthy()
        expect(story!.rect.right - story!.rect.left).toBeGreaterThanOrEqual(400)
        expect(story!.rect.bottom - story!.rect.top).toBeGreaterThanOrEqual(80)

        for (const part of parts) {
          expect(part.rect.left).toBeGreaterThanOrEqual(0)
          expect(part.rect.top).toBeGreaterThanOrEqual(0)
          expect(part.rect.right).toBeLessThanOrEqual(CARD_WIDTH)
          expect(part.rect.bottom).toBeLessThanOrEqual(CARD_HEIGHT)
          expect(part.rect.right).toBeGreaterThan(part.rect.left)
          expect(part.rect.bottom).toBeGreaterThan(part.rect.top)
        }
      }
    })

    it('parses every button and card script', () => {
      const stack = loadHouse()
      const scripts: string[] = []
      for (const card of stack.cards) {
        scripts.push(...Object.values(card.scripts))
        for (const button of card.buttons) scripts.push(...Object.values(button.scripts))
        for (const field of card.fields) scripts.push(...Object.values(field.scripts))
      }

      expect(scripts.length).toBeGreaterThan(0)
      for (const source of scripts) {
        expect(source).not.toMatch(/\b(ask|hide|show|play|visual)\b/i)
        const tokens = new Lexer(source).tokenize()
        expect(Array.isArray(tokens)).toBe(true)
        const ast = new Parser(tokens as any).parse()
        expect(ast).not.toMatchObject({ type: 'ParseError' })
      }
    })
  })
})
