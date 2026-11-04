import { describe, it, expect } from 'vitest'
import {
  Field,
  Button,
  Background,
  Card,
  Stack,
  createField,
  createButton,
  createBackground,
  createCard,
  createStack,
  findFieldById,
  findButtonById,
  findCardById,
  findBackgroundById,
  getHandler,
  setHandler
} from './stack'

describe('Field', () => {
  it('creates a field with default values', () => {
    const field = createField('fld1', 'name', 'content')
    expect(field.id).toBe('fld1')
    expect(field.name).toBe('name')
    expect(field.content).toBe('content')
    expect(field.editable).toBe(true)
    expect(field.font).toBe('Monaco')
    expect(field.fontSize).toBe(12)
  })

  it('allows custom rect', () => {
    const rect = { left: 10, top: 20, right: 50, bottom: 60 }
    const field = createField('fld1', 'name', 'content', rect)
    expect(field.rect).toEqual(rect)
  })
})

describe('Button', () => {
  it('creates a button with default values', () => {
    const button = createButton('btn1', 'Click Me')
    expect(button.id).toBe('btn1')
    expect(button.label).toBe('Click Me')
    expect(button.style).toBe('default')
    expect(button.scripts).toEqual({})
  })
})

describe('Background', () => {
  it('creates a background with empty elements', () => {
    const bg = createBackground('bg1', 'Main Background')
    expect(bg.id).toBe('bg1')
    expect(bg.name).toBe('Main Background')
    expect(bg.buttons.length).toBe(0)
    expect(bg.fields.length).toBe(0)
    expect(bg.scripts).toEqual({})
  })

  it('can add fields and buttons', () => {
    const bg = createBackground('bg1', 'Main')
    const field = createField('fld1', 'title')
    const button = createButton('btn1', 'Next')
    bg.fields.push(field)
    bg.buttons.push(button)
    expect(bg.fields.length).toBe(1)
    expect(bg.buttons.length).toBe(1)
  })
})

describe('Card', () => {
  it('creates a card with empty elements', () => {
    const card = createCard('card1', 'Home')
    expect(card.id).toBe('card1')
    expect(card.name).toBe('Home')
    expect(card.buttons.length).toBe(0)
    expect(card.fields.length).toBe(0)
    expect(card.backgroundId).toBeNull()
    expect(card.variables.size).toBe(0)
  })

  it('can reference a background', () => {
    const card = createCard('card1', 'Home', 'bg1')
    expect(card.backgroundId).toBe('bg1')
  })

  it('supports card-scoped variables', () => {
    const card = createCard('card1', 'Home')
    card.variables.set('score', 42)
    expect(card.variables.get('score')).toBe(42)
  })
})

describe('Stack', () => {
  it('creates an empty stack', () => {
    const stack = createStack('stack1', 'My Stack')
    expect(stack.id).toBe('stack1')
    expect(stack.name).toBe('My Stack')
    expect(stack.version).toBe('1.0')
    expect(stack.backgrounds.length).toBe(0)
    expect(stack.cards.length).toBe(0)
    expect(stack.variables.size).toBe(0)
  })

  it('can add cards and backgrounds', () => {
    const stack = createStack('stack1', 'My Stack')
    const card = createCard('card1', 'Home')
    const bg = createBackground('bg1', 'Main')
    stack.cards.push(card)
    stack.backgrounds.push(bg)
    expect(stack.cards.length).toBe(1)
    expect(stack.backgrounds.length).toBe(1)
  })

  it('supports stack-scoped variables', () => {
    const stack = createStack('stack1', 'My Stack')
    stack.variables.set('globalCounter', 0)
    expect(stack.variables.get('globalCounter')).toBe(0)
  })
})

describe('Lookup functions', () => {
  it('finds field by ID', () => {
    const field = createField('fld1', 'name')
    const card = createCard('card1', 'Home')
    card.fields.push(field)
    expect(findFieldById(card, 'fld1')).toEqual(field)
    expect(findFieldById(card, 'unknown')).toBeNull()
  })

  it('finds button by ID', () => {
    const button = createButton('btn1', 'Next')
    const card = createCard('card1', 'Home')
    card.buttons.push(button)
    expect(findButtonById(card, 'btn1')).toEqual(button)
    expect(findButtonById(card, 'unknown')).toBeNull()
  })

  it('finds card by ID', () => {
    const card = createCard('card1', 'Home')
    const stack = createStack('stack1', 'My Stack')
    stack.cards.push(card)
    expect(findCardById(stack, 'card1')).toEqual(card)
    expect(findCardById(stack, 'unknown')).toBeNull()
  })

  it('finds background by ID', () => {
    const bg = createBackground('bg1', 'Main')
    const stack = createStack('stack1', 'My Stack')
    stack.backgrounds.push(bg)
    expect(findBackgroundById(stack, 'bg1')).toEqual(bg)
    expect(findBackgroundById(stack, 'unknown')).toBeNull()
  })
})

describe('Handler functions', () => {
  it('gets and sets handlers', () => {
    const button = createButton('btn1', 'Next')
    expect(getHandler(button, 'mouseUp')).toBeNull()
    setHandler(button, 'mouseUp', 'go next card')
    expect(getHandler(button, 'mouseUp')).toBe('go next card')
  })

  it('supports multiple handlers on same element', () => {
    const card = createCard('card1', 'Home')
    setHandler(card, 'openCard', 'answer "Welcome"')
    setHandler(card, 'closeCard', 'put 0 into card x')
    expect(getHandler(card, 'openCard')).toBe('answer "Welcome"')
    expect(getHandler(card, 'closeCard')).toBe('put 0 into card x')
  })
})
