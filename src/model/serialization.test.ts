import { describe, it, expect } from 'vitest'
import { serializeStack, deserializeStack } from './serialization'
import {
  createStack,
  createCard,
  createField,
  createButton,
  createBackground
} from './stack'

describe('Serialization', () => {
  it('serializes empty stack', () => {
    const stack = createStack('stack1', 'My Stack')
    const json = serializeStack(stack)
    const parsed = JSON.parse(json)
    expect(parsed.version).toBe('1.0')
    expect(parsed.stack.id).toBe('stack1')
    expect(parsed.stack.name).toBe('My Stack')
    expect(parsed.stack.cards).toEqual([])
    expect(parsed.stack.backgrounds).toEqual([])
  })

  it('serializes stack with card and field', () => {
    const stack = createStack('stack1', 'My Stack')
    const card = createCard('card1', 'Home')
    const field = createField('fld1', 'title', 'Welcome')
    card.fields.push(field)
    stack.cards.push(card)

    const json = serializeStack(stack)
    const parsed = JSON.parse(json)
    expect(parsed.stack.cards[0].id).toBe('card1')
    expect(parsed.stack.cards[0].fields[0].name).toBe('title')
    expect(parsed.stack.cards[0].fields[0].content).toBe('Welcome')
  })

  it('serializes stack with button', () => {
    const stack = createStack('stack1', 'My Stack')
    const card = createCard('card1', 'Home')
    const button = createButton('btn1', 'Next')
    card.buttons.push(button)
    stack.cards.push(card)

    const json = serializeStack(stack)
    const parsed = JSON.parse(json)
    expect(parsed.stack.cards[0].buttons[0].label).toBe('Next')
  })

  it('serializes stack with background', () => {
    const stack = createStack('stack1', 'My Stack')
    const bg = createBackground('bg1', 'Main')
    const button = createButton('btn1', 'Home')
    bg.buttons.push(button)
    stack.backgrounds.push(bg)

    const json = serializeStack(stack)
    const parsed = JSON.parse(json)
    expect(parsed.stack.backgrounds[0].id).toBe('bg1')
    expect(parsed.stack.backgrounds[0].buttons[0].label).toBe('Home')
  })

  it('preserves scripts on handlers', () => {
    const stack = createStack('stack1', 'My Stack')
    const card = createCard('card1', 'Home')
    const button = createButton('btn1', 'Click')
    button.scripts['mouseUp'] = 'answer "Hello"'
    card.buttons.push(button)
    stack.cards.push(card)

    const json = serializeStack(stack)
    const parsed = JSON.parse(json)
    expect(parsed.stack.cards[0].buttons[0].scripts['mouseUp']).toBe('answer "Hello"')
  })

  it('preserves variables', () => {
    const stack = createStack('stack1', 'My Stack')
    const card = createCard('card1', 'Home')
    card.variables.set('score', 42)
    card.variables.set('name', 'Player')
    stack.cards.push(card)
    stack.variables.set('globalCounter', 0)

    const json = serializeStack(stack)
    const parsed = JSON.parse(json)
    expect(parsed.stack.variables.globalCounter).toBe(0)
    expect(parsed.stack.cards[0].variables.score).toBe(42)
    expect(parsed.stack.cards[0].variables.name).toBe('Player')
  })
})

describe('Deserialization', () => {
  it('deserializes empty stack', () => {
    const stack = createStack('stack1', 'My Stack')
    const json = serializeStack(stack)
    const restored = deserializeStack(json)
    expect(restored.id).toBe('stack1')
    expect(restored.name).toBe('My Stack')
    expect(restored.cards.length).toBe(0)
    expect(restored.backgrounds.length).toBe(0)
  })

  it('deserializes stack with cards and fields', () => {
    const stack = createStack('stack1', 'My Stack')
    const card = createCard('card1', 'Home')
    const field = createField('fld1', 'title', 'Welcome')
    card.fields.push(field)
    stack.cards.push(card)

    const json = serializeStack(stack)
    const restored = deserializeStack(json)
    expect(restored.cards.length).toBe(1)
    expect(restored.cards[0].id).toBe('card1')
    expect(restored.cards[0].fields[0].name).toBe('title')
    expect(restored.cards[0].fields[0].content).toBe('Welcome')
  })

  it('deserializes and preserves field properties', () => {
    const stack = createStack('stack1', 'My Stack')
    const card = createCard('card1', 'Home')
    const field = createField('fld1', 'title', 'Welcome')
    field.font = 'Chicago'
    field.fontSize = 14
    field.textStyle.bold = true
    field.editable = false
    card.fields.push(field)
    stack.cards.push(card)

    const json = serializeStack(stack)
    const restored = deserializeStack(json)
    const restoredField = restored.cards[0].fields[0]
    expect(restoredField.font).toBe('Chicago')
    expect(restoredField.fontSize).toBe(14)
    expect(restoredField.textStyle.bold).toBe(true)
    expect(restoredField.editable).toBe(false)
  })

  it('deserializes stack with handlers', () => {
    const stack = createStack('stack1', 'My Stack')
    const card = createCard('card1', 'Home')
    const button = createButton('btn1', 'Click')
    button.scripts['mouseUp'] = 'answer "Hello"'
    card.buttons.push(button)
    stack.cards.push(card)

    const json = serializeStack(stack)
    const restored = deserializeStack(json)
    expect(restored.cards[0].buttons[0].scripts['mouseUp']).toBe('answer "Hello"')
  })

  it('deserializes variables correctly', () => {
    const stack = createStack('stack1', 'My Stack')
    const card = createCard('card1', 'Home')
    card.variables.set('score', 42)
    stack.variables.set('counter', 100)
    stack.cards.push(card)

    const json = serializeStack(stack)
    const restored = deserializeStack(json)
    expect(restored.variables.get('counter')).toBe(100)
    expect(restored.cards[0].variables.get('score')).toBe(42)
  })

  it('round-trip serialization preserves all data', () => {
    const stack = createStack('stack1', 'My Stack')
    stack.variables.set('globalVar', 'test')

    const card = createCard('card1', 'Home', 'bg1')
    card.variables.set('cardVar', 123)

    const field = createField('fld1', 'title', 'Welcome')
    field.font = 'Chicago'
    field.fontSize = 16
    field.textStyle.italic = true
    card.fields.push(field)

    const button = createButton('btn1', 'Click Me')
    button.scripts['mouseUp'] = 'put "clicked" into field "status"'
    card.buttons.push(button)

    stack.cards.push(card)

    const bg = createBackground('bg1', 'Main')
    bg.scripts['openCard'] = 'answer "Opened"'
    stack.backgrounds.push(bg)

    const json1 = serializeStack(stack)
    const restored = deserializeStack(json1)
    const json2 = serializeStack(restored)

    expect(json1).toBe(json2)
  })

  it('rejects invalid JSON', () => {
    expect(() => deserializeStack('not valid json')).toThrow()
  })

  it('rejects unsupported version', () => {
    const json = JSON.stringify({
      version: '2.0',
      stack: { id: 'test', name: 'test', backgrounds: [], cards: [] }
    })
    expect(() => deserializeStack(json)).toThrow('Unsupported stack version')
  })
})
