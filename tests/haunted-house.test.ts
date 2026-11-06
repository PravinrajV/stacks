/**
 * Play the bundled Haunted House through the same dispatcher Run mode uses.
 * Each click gets a fresh local scope. Stack variables and fields persist.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { deserializeStack } from '../src/model/serialization'
import { send } from '../src/interpreter/dispatcher'
import { createExecutionContext } from '../src/interpreter/runtime'
import { WelcomeScreen } from '../src/dom/welcomeScreen'
import type { Card, Stack, Button } from '../src/model/stack'

const DOOR = "The door won't budge."
const LOCKED = "The crypt is locked. The librarian's word opens it."
const KEY_DIALOG = 'A brass key falls from the shelf.'
const WRONG = "The shelves stay silent. That is not the house's name."

function loadHouse(): Stack {
  const filePath = join(process.cwd(), 'examples', 'haunted-house.json')
  return deserializeStack(readFileSync(filePath, 'utf-8'))
}

function fieldText(card: Card, name: string): string {
  const field = card.fields.find((item) => item.name === name)
  if (!field) throw new Error(`${card.name} has no field ${name}`)
  return field.content
}

function findButton(card: Card, label: string): Button {
  const button = card.buttons.find((item) => item.label === label)
  if (!button) throw new Error(`${card.name} has no button ${label}`)
  return button
}

describe('Haunted House playthrough', () => {
  let stack: Stack
  let card: Card

  beforeEach(() => {
    stack = loadHouse()
    card = stack.cards[0]
  })

  async function press(label: string): Promise<string[]> {
    const button = findButton(card, label)
    const context = createExecutionContext(stack, card)
    const answers: string[] = []
    const result = await send('mouseUp', button, context, {
      showAnswer: async (message: string) => {
        answers.push(message)
        return 0
      }
    })
    expect(result.success, JSON.stringify(result.error)).toBe(true)

    const moved = context.currentCard.id !== card.id
    card = context.currentCard
    if (moved && card.scripts.openCard) {
      const openContext = createExecutionContext(stack, card)
      const opened = await send('openCard', card, openContext, {
        showAnswer: async () => 0
      })
      expect(opened.success, JSON.stringify(opened.error)).toBe(true)
    }
    return answers
  }

  it('walks the locked door, the library, the key, the crypt, and dawn', async () => {
    expect(await press('Enter')).toEqual([DOOR])
    expect(card.name).toBe('Porch')
    expect(fieldText(card, 'Count')).toBe('0')

    expect(await press('Knock')).toEqual([])
    expect(fieldText(card, 'Count')).toBe('1')
    expect(fieldText(card, 'Status')).toBe('Someone knocked 1 times')

    expect(await press('Knock')).toEqual([])
    expect(fieldText(card, 'Count')).toBe('2')
    expect(await press('Enter')).toEqual([DOOR])
    expect(card.name).toBe('Porch')

    expect(await press('Knock')).toEqual([])
    expect(fieldText(card, 'Count')).toBe('3')
    expect(fieldText(card, 'Status')).toBe('Someone knocked 3 times')
    expect(await press('Enter')).toEqual([])
    expect(card.name).toBe('Hall')
    expect(fieldText(card, 'Inventory')).toBe('You carry nothing.')

    expect(await press('Crypt')).toEqual([LOCKED])
    expect(card.name).toBe('Hall')
    expect(stack.variables.get('key')).toBe('')

    expect(await press('Library')).toEqual([])
    expect(card.name).toBe('Library')
    expect(fieldText(card, 'Story')).toContain('Ravenwood')

    const answer = card.fields.find((item) => item.name === 'Answer')
    expect(answer).toBeTruthy()
    answer!.content = 'library'
    expect(await press('Speak')).toEqual([WRONG])
    expect(stack.variables.get('key')).toBe('')
    expect(fieldText(card, 'Inventory')).toBe('You carry nothing.')
    expect(card.name).toBe('Library')

    expect(await press('Hall')).toEqual([])
    expect(await press('Crypt')).toEqual([LOCKED])
    expect(card.name).toBe('Hall')

    expect(await press('Library')).toEqual([])
    card.fields.find((item) => item.name === 'Answer')!.content = 'Ravenwood'
    expect(await press('Speak')).toEqual([KEY_DIALOG])
    expect(stack.variables.get('key')).toBe('brass')
    expect(fieldText(card, 'Inventory')).toBe('You carry a brass key.')

    expect(await press('Hall')).toEqual([])
    expect(card.name).toBe('Hall')
    expect(fieldText(card, 'Inventory')).toBe('You carry a brass key.')

    expect(await press('Crypt')).toEqual([])
    expect(card.name).toBe('Crypt')
    expect(fieldText(card, 'Story')).toContain('family ledger')
    expect(fieldText(card, 'Story')).toContain('haunting lifts')

    expect(await press('Carry the ledger')).toEqual([])
    expect(card.name).toBe('Dawn')
    expect(fieldText(card, 'Story')).toContain('ledger')
    expect(fieldText(card, 'Story')).toContain('morning')
    expect(fieldText(card, 'Story')).toContain('house is still')
  })

  it('accepts the house name with different case and surrounding spaces', async () => {
    await press('Knock')
    await press('Knock')
    await press('Knock')
    await press('Enter')
    await press('Library')

    card.fields.find((item) => item.name === 'Answer')!.content = '  rAvEnWoOd  '
    expect(await press('Speak')).toEqual([KEY_DIALOG])
    expect(stack.variables.get('key')).toBe('brass')
  })
})

describe('Welcome screen starter action', () => {
  it('offers the Haunted House and still offers a blank stack', () => {
    const screen = new WelcomeScreen()
    const text = screen.getElement().textContent || ''
    expect(text).toContain('Open the Haunted House')
    expect(text).toContain('Start blank stack')
    expect(text).not.toContain('Haunted Counter')
    screen.close()
    screen.getElement().remove()
  })
})
