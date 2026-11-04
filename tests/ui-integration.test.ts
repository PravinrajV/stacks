/**
 * Task 7.13-7.14: End-to-end UI tests.
 * 
 * Tests that the app shell and components work together.
 * Uses happy-dom (configured in vitest.config) for DOM simulation.
 */

/// <reference types="vitest" />
import { describe, it, expect, beforeEach } from 'vitest'
import { App } from '../src/dom/app'
import { createStack, createCard, createButton, createField } from '../src/model/stack'
import { CardListPanel } from '../src/dom/cardList'
import { CardCanvas } from '../src/dom/cardCanvas'
import { ElementInspector } from '../src/dom/elementInspector'
import { ScriptEditor } from '../src/dom/scriptEditor'
import { saveStack, loadStack } from '../src/dom/storage'
import { serializeStack, deserializeStack } from '../src/model/serialization'

describe('Task 7.1: App and Layout Integration', () => {
  let appContainer: HTMLElement

  beforeEach(() => {
    // Clear and recreate app container
    const existing = document.getElementById('app')
    if (existing) {
      existing.remove()
    }
    appContainer = document.createElement('div')
    appContainer.id = 'app'
    document.body.appendChild(appContainer)
  })

  it('initializes with default stack and card', () => {
    const app = new App('app')
    const layout = document.getElementById('app')

    // Should have created layout structure
    expect(layout).toBeTruthy()
    expect(layout?.children.length).toBeGreaterThan(0)
  })

  it('displays card list', () => {
    const panel = new CardListPanel()
    appContainer.appendChild(panel.getElement())

    const stack = createStack('stack-1', 'Test Stack')
    stack.cards.push(createCard('c1', 'Card 1', null))
    stack.cards.push(createCard('c2', 'Card 2', null))

    panel.render(stack, 'c1')

    const cardItems = appContainer.querySelectorAll('.card-item')
    expect(cardItems.length).toBe(2)
  })

  it('renders card canvas with elements', () => {
    const canvas = new CardCanvas()
    appContainer.appendChild(canvas.getElement())

    const card = createCard('c1', 'Test Card', null)
    card.buttons.push(createButton('btn1', 'Click Me'))
    card.fields.push(createField('fld1', 'name', 'Hello World'))

    canvas.render(card, null)

    const elements = appContainer.querySelectorAll('.card-element')
    expect(elements.length).toBe(2)
  })

  it('inspector displays element properties', () => {
    const inspector = new ElementInspector()
    appContainer.appendChild(inspector.getElement())

    const button = createButton('btn1', 'Test Button')
    inspector.setElement(button)

    const sections = appContainer.querySelectorAll('.inspector-section')
    expect(sections.length).toBeGreaterThan(0)
  })

  it('script editor shows parse errors', () => {
    const editor = new ScriptEditor()
    appContainer.appendChild(editor.getElement())

    // Invalid script (missing 'end if')
    editor.setScript('if x > 5')

    const error = editor.getError()
    expect(error).toBeTruthy()
    expect(error?.message).toContain('Expected')
  })

  it('script editor validates correct scripts', () => {
    const editor = new ScriptEditor()
    appContainer.appendChild(editor.getElement())

    // Valid script
    editor.setScript(`on mouseUp
  answer "Hello"
end mouseUp`)

    const error = editor.getError()
    expect(error).toBeNull()
  })
})

describe('Task 7.6-7.7: Storage and Persistence', () => {
  beforeEach(() => {
    // Clear localStorage for each test
    localStorage.clear()
  })

  it('saves and loads stack from localStorage', () => {
    const stack = createStack('stack-1', 'Test Stack')
    stack.cards.push(createCard('c1', 'Card 1', null))

    saveStack(stack)
    const loaded = loadStack()

    expect(loaded).toBeTruthy()
    expect(loaded?.id).toBe(stack.id)
    expect(loaded?.cards.length).toBe(1)
  })

  it('round-trip stack JSON preserves all data', () => {
    const stack = createStack('stack-1', 'Test Stack')
    const card = createCard('c1', 'Card 1', null)
    card.buttons.push(createButton('btn1', 'Click Me'))
    card.fields.push(createField('fld1', 'name', 'Hello World'))
    stack.cards.push(card)

    const json1 = serializeStack(stack)
    const restored = deserializeStack(json1)
    const json2 = serializeStack(restored)

    expect(json1).toEqual(json2)
    expect(restored.cards[0].buttons.length).toBe(1)
    expect(restored.cards[0].fields.length).toBe(1)
  })
})
