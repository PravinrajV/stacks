import { Rect } from './types'

/**
 * Field interface represents an editable or display text field on a card or background.
 */
export interface Field {
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
 * Button interface represents a clickable button on a card or background.
 */
export interface Button {
  id: string
  label: string
  rect: Rect
  style: 'default' | 'transparent' | 'popup'
  scripts: { [handlerName: string]: string }
}

/**
 * Background interface represents a reusable background with shared elements.
 */
export interface Background {
  id: string
  name: string
  buttons: Button[]
  fields: Field[]
  scripts: { [handlerName: string]: string }
}

/**
 * Card interface represents a single card in the stack.
 */
export interface Card {
  id: string
  backgroundId: string | null
  name: string
  buttons: Button[]
  fields: Field[]
  scripts: { [handlerName: string]: string }
  variables: Map<string, any>
}

/**
 * Stack interface represents a complete stack with cards and backgrounds.
 */
export interface Stack {
  id: string
  name: string
  version: string
  backgrounds: Background[]
  cards: Card[]
  variables: Map<string, any>
}

/**
 * Create a new Field with default values.
 */
export function createField(
  id: string,
  name: string,
  content: string = '',
  rect: Rect = { left: 0, top: 0, right: 100, bottom: 30 }
): Field {
  return {
    id,
    name,
    content,
    rect,
    font: 'Monaco',
    fontSize: 12,
    textStyle: { bold: false, italic: false, underline: false },
    editable: true,
    scripts: {}
  }
}

/**
 * Create a new Button with default values.
 */
export function createButton(
  id: string,
  label: string,
  rect: Rect = { left: 0, top: 0, right: 60, bottom: 30 }
): Button {
  return {
    id,
    label,
    rect,
    style: 'default',
    scripts: {}
  }
}

/**
 * Create a new Background with default values.
 */
export function createBackground(id: string, name: string): Background {
  return {
    id,
    name,
    buttons: [],
    fields: [],
    scripts: {}
  }
}

/**
 * Create a new Card with default values.
 */
export function createCard(
  id: string,
  name: string,
  backgroundId: string | null = null
): Card {
  return {
    id,
    backgroundId,
    name,
    buttons: [],
    fields: [],
    scripts: {},
    variables: new Map()
  }
}

/**
 * Create a new Stack with default values.
 */
export function createStack(id: string, name: string): Stack {
  return {
    id,
    name,
    version: '1.0',
    backgrounds: [],
    cards: [],
    variables: new Map()
  }
}

/**
 * Find a field by ID in a card or background.
 */
export function findFieldById(
  container: Card | Background,
  fieldId: string
): Field | null {
  return container.fields.find((f) => f.id === fieldId) || null
}

/**
 * Find a button by ID in a card or background.
 */
export function findButtonById(
  container: Card | Background,
  buttonId: string
): Button | null {
  return container.buttons.find((b) => b.id === buttonId) || null
}

/**
 * Find a card by ID in a stack.
 */
export function findCardById(stack: Stack, cardId: string): Card | null {
  return stack.cards.find((c) => c.id === cardId) || null
}

/**
 * Find a background by ID in a stack.
 */
export function findBackgroundById(stack: Stack, bgId: string): Background | null {
  return stack.backgrounds.find((b) => b.id === bgId) || null
}

/**
 * Get handler script by name.
 */
export function getHandler(
  container: Card | Background | Button | Field,
  handlerName: string
): string | null {
  return container.scripts[handlerName] || null
}

/**
 * Set handler script by name.
 */
export function setHandler(
  container: Card | Background | Button | Field,
  handlerName: string,
  script: string
): void {
  container.scripts[handlerName] = script
}
