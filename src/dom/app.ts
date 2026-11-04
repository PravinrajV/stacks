/**
 * Task 7.1: App class with state management and layout.
 * 
 * Main application controller that manages UI state and wires components.
 */

import { createElement, removeAllChildren, addEventListener } from './utils/dom'
import { CardListPanel } from './cardList'
import { CardCanvas } from './cardCanvas'
import { ElementInspector } from './elementInspector'
import { ScriptEditor } from './scriptEditor'
import { RunModeViewer } from './runMode'
import { ButtonComponent } from './components/button'
import { saveStack, loadStack, loadUndoRedo, saveUndoRedo, exportJSON, importJSON, readJSONFile } from './storage'
import { Stack, Card, createCard, createStack, Button, Field } from '../model/stack'
import type { Rect } from '../model/types'

export interface AppState {
  stack: Stack
  currentCardId: string
  selectedElementId: string | null
  mode: 'edit' | 'run'
  undoStack: Stack[]
  redoStack: Stack[]
  isDirty: boolean
}

export class App {
  private container: HTMLElement
  private appState: AppState
  private cardListPanel: CardListPanel
  private cardCanvas: CardCanvas
  private elementInspector: ElementInspector
  private scriptEditor: ScriptEditor
  private runModeViewer: RunModeViewer | null = null

  constructor(containerId: string) {
    this.container = document.getElementById(containerId) || document.body

    // Initialize state
    const loaded = loadStack()
    const { undo, redo } = loadUndoRedo()

    const stackId = `stack-${Date.now()}`
    const stack = loaded || createStack(stackId, 'My Stack')
    
    // Ensure stack has at least one card
    if (stack.cards.length === 0) {
      stack.cards.push(createCard(`card-${Date.now()}`, 'Card 1', null))
    }
    
    const currentCardId = stack.cards[0]?.id || ''

    this.appState = {
      stack,
      currentCardId,
      selectedElementId: null,
      mode: 'edit',
      undoStack: undo,
      redoStack: redo,
      isDirty: false
    }

    // Create components
    this.cardListPanel = new CardListPanel()
    this.cardCanvas = new CardCanvas()
    this.elementInspector = new ElementInspector()
    this.scriptEditor = new ScriptEditor()

    this.setupEventHandlers()
    this.render()
  }

  private setupEventHandlers(): void {
    // Card list
    this.cardListPanel.onSelectCardChanged((cardId) => this.selectCard(cardId))
    this.cardListPanel.onAddCardClicked(() => this.addCard())
    this.cardListPanel.onDeleteCardClicked((cardId) => this.deleteCard(cardId))

    // Canvas - need to add element click handler
    // This will be wired via delegated events in render()

    // Inspector
    this.elementInspector.onPropertyChanged((element) => {
      this.appState.isDirty = true
      this.render()
    })

    // Script editor
    this.scriptEditor.onScriptChanged((script) => {
      if (this.appState.selectedElementId) {
        const card = this.appState.stack.cards.find((c) => c.id === this.appState.currentCardId)
        if (!card) return

        const button = card.buttons.find((b) => b.id === this.appState.selectedElementId)
        if (button) {
          button.scripts['mouseUp'] = script
          this.appState.isDirty = true
        }
      }
    })

    // Keyboard shortcuts
    addEventListener(document.documentElement, 'keydown', (e: Event) => {
      const keyEvent = e as KeyboardEvent
      if ((keyEvent.ctrlKey || keyEvent.metaKey) && keyEvent.key === 's') {
        keyEvent.preventDefault()
        this.save()
      }
      if ((keyEvent.ctrlKey || keyEvent.metaKey) && keyEvent.key === 'z') {
        keyEvent.preventDefault()
        if (keyEvent.shiftKey) {
          this.redo()
        } else {
          this.undo()
        }
      }
    })
  }

  private selectCard(cardId: string): void {
    this.appState.currentCardId = cardId
    this.appState.selectedElementId = null
    this.render()
  }

  private selectElement(elementId: string): void {
    this.appState.selectedElementId = elementId
    this.render()
  }

  private addCard(): void {
    const newCard = createCard(`card-${Date.now()}`, 'New Card', null)
    this.appState.stack.cards.push(newCard)
    this.appState.currentCardId = newCard.id
    this.appState.isDirty = true
    this.saveToUndoStack()
    this.render()
  }

  private deleteCard(cardId: string): void {
    const index = this.appState.stack.cards.findIndex((c) => c.id === cardId)
    if (index !== -1) {
      this.appState.stack.cards.splice(index, 1)
      this.appState.currentCardId = this.appState.stack.cards[0]?.id || ''
      this.appState.isDirty = true
      this.saveToUndoStack()
      this.render()
    }
  }

  private moveElement(elementId: string, rect: Rect): void {
    const card = this.appState.stack.cards.find((c) => c.id === this.appState.currentCardId)
    if (!card) return

    const button = card.buttons.find((b) => b.id === elementId)
    if (button) {
      button.rect = rect
    } else {
      const field = card.fields.find((f) => f.id === elementId)
      if (field) {
        field.rect = rect
      }
    }

    this.appState.isDirty = true
  }

  private resizeElement(elementId: string, rect: Rect): void {
    const card = this.appState.stack.cards.find((c) => c.id === this.appState.currentCardId)
    if (!card) return

    const button = card.buttons.find((b) => b.id === elementId)
    if (button) {
      button.rect = rect
    } else {
      const field = card.fields.find((f) => f.id === elementId)
      if (field) {
        field.rect = rect
      }
    }

    this.appState.isDirty = true
  }

  private undo(): void {
    if (this.appState.undoStack.length === 0) return

    this.appState.redoStack.unshift(this.appState.stack)
    this.appState.stack = this.appState.undoStack.shift()!
    saveUndoRedo(this.appState.undoStack, this.appState.redoStack)
    this.render()
  }

  private redo(): void {
    if (this.appState.redoStack.length === 0) return

    this.appState.undoStack.unshift(this.appState.stack)
    this.appState.stack = this.appState.redoStack.shift()!
    saveUndoRedo(this.appState.undoStack, this.appState.redoStack)
    this.render()
  }

  private save(): void {
    saveStack(this.appState.stack)
    saveUndoRedo(this.appState.undoStack, this.appState.redoStack)
    this.appState.isDirty = false
    console.log('Stack saved')
  }

  private saveToUndoStack(): void {
    // Clone current state using serialization to handle Maps properly
    const json = JSON.stringify(this.appState.stack, (key, value) => {
      if (value instanceof Map) {
        return Object.fromEntries(value)
      }
      return value
    })
    const cloned = JSON.parse(json, (key, value) => {
      if (key === 'variables') {
        const map = new Map()
        if (typeof value === 'object' && value !== null) {
          Object.entries(value).forEach(([k, v]) => map.set(k, v))
        }
        return map
      }
      return value
    })
    this.appState.undoStack.unshift(cloned)
    this.appState.redoStack = []
    saveUndoRedo(this.appState.undoStack, this.appState.redoStack)
  }

  private render(): void {
    removeAllChildren(this.container)

    // Create main layout
    const app = createElement('div', {
      id: 'app'
    })

    // Header
    const header = createElement('div', { className: 'app-header' })
    const title = createElement('div')
    title.textContent = 'Stacks'
    title.style.fontWeight = 'bold'
    header.appendChild(title)

    const exportBtn = new ButtonComponent('Export', () => {
      exportJSON(this.appState.stack, 'my-stack.json')
    })
    header.appendChild(exportBtn.getElement())

    const importBtn = new ButtonComponent('Import', () => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json'
      input.addEventListener('change', async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (file) {
          const json = await readJSONFile(file)
          const result = importJSON(json)
          if ('error' in result) {
            alert(`Import failed: ${result.error}`)
          } else {
            this.appState.stack = result.stack
            this.appState.currentCardId = this.appState.stack.cards[0]?.id || ''
            this.appState.isDirty = true
            this.saveToUndoStack()
            this.render()
          }
        }
      })
      input.click()
    })
    header.appendChild(importBtn.getElement())

    const saveBtn = new ButtonComponent('Save', () => this.save())
    header.appendChild(saveBtn.getElement())

    app.appendChild(header)

    // Main content
    const main = createElement('div', { className: 'app-main' })
    app.appendChild(main)

    main.appendChild(this.cardListPanel.getElement())
    main.appendChild(this.cardCanvas.getElement())
    main.appendChild(this.elementInspector.getElement())
    main.appendChild(this.scriptEditor.getElement())

    this.container.appendChild(app)

    // Set up delegated event listener for element selection in canvas
    const canvasElement = app.querySelector('.card-canvas') as HTMLElement | null
    if (canvasElement) {
      addEventListener(canvasElement, 'mousedown', (e: Event) => {
        const target = (e as MouseEvent).target as HTMLElement
        const element = target.closest('.card-element') as HTMLElement | null
        if (element) {
          const elementId = element.getAttribute('data-element-id')
          if (elementId) {
            this.selectElement(elementId)
          }
        }
      })
    }

    // Render current state
    const card = this.appState.stack.cards.find((c) => c.id === this.appState.currentCardId)
    if (card) {
      this.cardListPanel.render(this.appState.stack, this.appState.currentCardId)
      this.cardCanvas.render(card, null)

      // Select first element by default for inspector
      if (this.appState.selectedElementId === null && card.buttons.length > 0) {
        this.appState.selectedElementId = card.buttons[0].id
      }

      if (this.appState.selectedElementId) {
        const button = card.buttons.find((b) => b.id === this.appState.selectedElementId)
        if (button) {
          this.cardCanvas.selectElement(button.id)
          this.elementInspector.setElement(button)
          this.scriptEditor.setScript(button.scripts['mouseUp'] || '')
        } else {
          const field = card.fields.find((f) => f.id === this.appState.selectedElementId)
          if (field) {
            this.cardCanvas.selectElement(field.id)
            this.elementInspector.setElement(field)
          }
        }
      }
    }
  }
}

export function initApp(): void {
  new App('app')
}
