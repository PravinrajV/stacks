import {
  Stack,
  Card,
  Background,
  Button,
  Field,
  createStack,
  createCard,
  createBackground,
  createButton,
  createField
} from './stack'
import { Rect } from './types'

/**
 * JSON representation of a Stack for serialization.
 */
interface StackJSON {
  version: string
  stack: {
    id: string
    name: string
    backgrounds: BackgroundJSON[]
    cards: CardJSON[]
    variables?: { [key: string]: any }
  }
}

interface BackgroundJSON {
  id: string
  name: string
  buttons: ButtonJSON[]
  fields: FieldJSON[]
  scripts: { [handlerName: string]: string }
}

interface CardJSON {
  id: string
  backgroundId: string | null
  name: string
  buttons: ButtonJSON[]
  fields: FieldJSON[]
  scripts: { [handlerName: string]: string }
  variables?: { [key: string]: any }
}

interface ButtonJSON {
  id: string
  label: string
  rect: Rect
  style: 'default' | 'transparent' | 'popup'
  scripts: { [handlerName: string]: string }
}

interface FieldJSON {
  id: string
  name: string
  content: string
  rect: Rect
  font: string
  fontSize: number
  textStyle: {
    bold: boolean
    italic: boolean
    underline: boolean
  }
  editable: boolean
  scripts: { [handlerName: string]: string }
}

/**
 * Serialize a Stack to JSON format.
 */
export function serializeStack(stack: Stack): string {
  const json: StackJSON = {
    version: '1.0',
    stack: {
      id: stack.id,
      name: stack.name,
      backgrounds: stack.backgrounds.map(serializeBackground),
      cards: stack.cards.map(serializeCard),
      variables: mapToObject(stack.variables)
    }
  }
  return JSON.stringify(json, null, 2)
}

/**
 * Deserialize a Stack from JSON string.
 */
export function deserializeStack(json: string): Stack {
  let parsed: StackJSON
  try {
    parsed = JSON.parse(json)
  } catch (err) {
    throw new Error(`Invalid JSON: ${err instanceof Error ? err.message : String(err)}`)
  }

  if (parsed.version !== '1.0') {
    throw new Error(`Unsupported stack version: ${parsed.version}`)
  }

  const stack = createStack(parsed.stack.id, parsed.stack.name)
  
  // Restore variables
  if (parsed.stack.variables) {
    Object.entries(parsed.stack.variables).forEach(([key, value]) => {
      stack.variables.set(key, value)
    })
  }

  // Restore backgrounds
  stack.backgrounds = parsed.stack.backgrounds.map(deserializeBackground)

  // Restore cards
  stack.cards = parsed.stack.cards.map(deserializeCard)

  return stack
}

function serializeBackground(bg: Background): BackgroundJSON {
  return {
    id: bg.id,
    name: bg.name,
    buttons: bg.buttons.map(serializeButton),
    fields: bg.fields.map(serializeField),
    scripts: { ...bg.scripts }
  }
}

function deserializeBackground(json: BackgroundJSON): Background {
  const bg = createBackground(json.id, json.name)
  bg.buttons = json.buttons.map(deserializeButton)
  bg.fields = json.fields.map(deserializeField)
  bg.scripts = { ...json.scripts }
  return bg
}

function serializeCard(card: Card): CardJSON {
  return {
    id: card.id,
    backgroundId: card.backgroundId,
    name: card.name,
    buttons: card.buttons.map(serializeButton),
    fields: card.fields.map(serializeField),
    scripts: { ...card.scripts },
    variables: mapToObject(card.variables)
  }
}

function deserializeCard(json: CardJSON): Card {
  const card = createCard(json.id, json.name, json.backgroundId)
  card.buttons = json.buttons.map(deserializeButton)
  card.fields = json.fields.map(deserializeField)
  card.scripts = { ...json.scripts }
  if (json.variables) {
    Object.entries(json.variables).forEach(([key, value]) => {
      card.variables.set(key, value)
    })
  }
  return card
}

function serializeButton(button: Button): ButtonJSON {
  return {
    id: button.id,
    label: button.label,
    rect: { ...button.rect },
    style: button.style,
    scripts: { ...button.scripts }
  }
}

function deserializeButton(json: ButtonJSON): Button {
  const button = createButton(json.id, json.label, { ...json.rect })
  button.style = json.style
  button.scripts = { ...json.scripts }
  return button
}

function serializeField(field: Field): FieldJSON {
  return {
    id: field.id,
    name: field.name,
    content: field.content,
    rect: { ...field.rect },
    font: field.font,
    fontSize: field.fontSize,
    textStyle: { ...field.textStyle },
    editable: field.editable,
    scripts: { ...field.scripts }
  }
}

function deserializeField(json: FieldJSON): Field {
  const field = createField(json.id, json.name, json.content, { ...json.rect })
  field.font = json.font
  field.fontSize = json.fontSize
  field.textStyle = { ...json.textStyle }
  field.editable = json.editable
  field.scripts = { ...json.scripts }
  return field
}

/**
 * Convert a Map to a plain object for JSON serialization.
 */
function mapToObject(map: Map<string, any>): { [key: string]: any } {
  const obj: { [key: string]: any } = {}
  map.forEach((value, key) => {
    obj[key] = value
  })
  return obj
}

/**
 * Get the raw JSON object without conversion (for inspection).
 */
export function parseStackJSON(json: string): StackJSON {
  return JSON.parse(json)
}
