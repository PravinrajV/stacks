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
import { ModalComponent } from './components/modal'
import { SettingsPanel, type ProviderSettings } from './components/settingsPanel'
import { saveStack, loadStack, loadUndoRedo, saveUndoRedo, exportJSON, importJSON, readJSONFile } from './storage'
import { Stack, Card, createCard, createStack, createButton, createField, Button, Field } from '../model/stack'
import type { Rect } from '../model/types'
import { send } from '../interpreter/dispatcher'
import { createExecutionContext } from '../interpreter/runtime'
import { defaultRegistry } from '../generator/providerRegistry'
import { deserializeStack } from '../model/serialization'
import { createSunIcon, createMoonIcon, createGhostIcon, createPlayIcon, createPlusIcon } from './icons'
import { WelcomeScreen } from './welcomeScreen'
import { StyledAlert, StyledConfirm, StyledPrompt } from './components/styledDialogs'
import { animateModeSwitchIn, animateModeSwitchOut, prefersReducedMotion } from './utils/animations'

// Import haunted-counter.json as a string at build time
declare const HAUNTED_COUNTER_STACK: string | undefined

// Function to get haunted counter stack (allows for testing)
function getHauntedCounterStack(): Stack | null {
  try {
    if (typeof HAUNTED_COUNTER_STACK === 'string') {
      return deserializeStack(HAUNTED_COUNTER_STACK)
    }
  } catch (err) {
    console.warn('Failed to deserialize starter stack:', err)
  }
  return null
}

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
  private isFirstRender: boolean = true
  private settingsPanel: SettingsPanel | null = null
  private settingsModal: ModalComponent | null = null
  private currentTheme: 'haunted' | 'classic' = 'haunted'
  private welcomeScreen: WelcomeScreen | null = null

  constructor(containerId: string) {
    this.container = document.getElementById(containerId) || document.body

    // Load theme from localStorage
    const savedTheme = localStorage.getItem('stacks-theme') as 'haunted' | 'classic' | null
    this.currentTheme = savedTheme || 'haunted'
    this.applyTheme(this.currentTheme)

    // Check if welcomed (Task 9.5.1)
    const hasWelcomed = localStorage.getItem('stacks-welcomed') === 'true'

    // Initialize state
    const loaded = loadStack()
    const { undo, redo } = loadUndoRedo()

    let stack: Stack
    if (loaded) {
      stack = loaded
    } else {
      // On first visit, try to load the starter stack from haunted-counter.json
      const starterStack = getHauntedCounterStack()
      if (starterStack) {
        stack = starterStack
      } else {
        // Fallback to empty stack if starter not available
        const stackId = `stack-${Date.now()}`
        stack = createStack(stackId, 'My Stack')
      }
    }
    
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

    // Show welcome screen on first visit if no stack was previously saved
    if (!hasWelcomed && !loaded) {
      this.showWelcomeScreen()
    }
  }

  getCardCanvas(): CardCanvas {
    return this.cardCanvas
  }

  getScriptEditor(): ScriptEditor {
    return this.scriptEditor
  }

  private applyTheme(theme: 'haunted' | 'classic'): void {
    this.currentTheme = theme
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('stacks-theme', theme)
  }

  private toggleTheme(): void {
    const newTheme = this.currentTheme === 'haunted' ? 'classic' : 'haunted'
    this.applyTheme(newTheme)
    this.render()
  }

  private showWelcomeScreen(): void {
    if (this.welcomeScreen) return

    this.welcomeScreen = new WelcomeScreen()
    
    // Handle "Start blank stack" - just close and keep current empty stack
    this.welcomeScreen.onCreateNewClicked(() => {
      localStorage.setItem('stacks-welcomed', 'true')
      this.welcomeScreen?.close()
      this.welcomeScreen = null
    })

    // Handle "Open the Haunted Counter" - load example stack
    this.welcomeScreen.onLoadExampleClicked(() => {
      const exampleStack = getHauntedCounterStack()
      if (exampleStack) {
        this.appState.stack = exampleStack
        this.appState.currentCardId = exampleStack.cards[0]?.id || ''
        this.appState.selectedElementId = null
        this.appState.undoStack = []
        this.appState.redoStack = []
        saveStack(this.appState.stack)
        localStorage.setItem('stacks-welcomed', 'true')
        this.welcomeScreen?.close()
        this.welcomeScreen = null
        this.render()
      }
    })

    this.welcomeScreen.show()
  }

  private setupEventHandlers(): void {
    // Card list
    this.cardListPanel.onSelectCardChanged((cardId) => this.selectCard(cardId))
    this.cardListPanel.onAddCardClicked(() => this.addCard())
    this.cardListPanel.onDeleteCardClicked((cardId) => this.deleteCard(cardId))
    this.cardListPanel.onRenameCardClicked((cardId) => this.renameCard(cardId))

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
      
      // Cmd/Ctrl+S: Save
      if ((keyEvent.ctrlKey || keyEvent.metaKey) && keyEvent.key === 's') {
        keyEvent.preventDefault()
        this.save()
      }
      
      // Cmd/Ctrl+Z: Undo
      // Cmd/Ctrl+Shift+Z: Redo
      if ((keyEvent.ctrlKey || keyEvent.metaKey) && keyEvent.key === 'z') {
        keyEvent.preventDefault()
        if (keyEvent.shiftKey) {
          this.redo()
        } else {
          this.undo()
        }
      }
      
      // Delete: Remove selected element (only in edit mode)
      if (keyEvent.key === 'Delete' && this.appState.mode === 'edit' && this.appState.selectedElementId) {
        keyEvent.preventDefault()
        this.removeSelectedElement()
      }
      
      // Escape: Deselect element or close panels
      if (keyEvent.key === 'Escape' && this.appState.mode === 'edit') {
        keyEvent.preventDefault()
        
        // Try to close modal if visible
        const modalBackdrop = document.querySelector('.modal-backdrop') as HTMLElement
        if (modalBackdrop && modalBackdrop.style.display !== 'none') {
          const closeEvent = new MouseEvent('click', { bubbles: true })
          Object.defineProperty(closeEvent, 'target', { value: modalBackdrop, enumerable: true })
          modalBackdrop.dispatchEvent(closeEvent)
          return
        }
        
        // Try to close AI panel if visible
        const aiPanel = document.querySelector('.ai-panel') as HTMLElement
        if (aiPanel && aiPanel.style.display !== 'none') {
          aiPanel.style.display = 'none'
          return
        }
        
        // Deselect element
        this.appState.selectedElementId = null
        this.cardCanvas.deselectElement()
        this.render()
      }
      
      // Tab: Navigate to next element (cycle through card elements)
      if (keyEvent.key === 'Tab' && this.appState.mode === 'edit') {
        const card = this.appState.stack.cards.find((c) => c.id === this.appState.currentCardId)
        if (card) {
          const allElements = [...card.buttons, ...card.fields]
          if (allElements.length === 0) return
          
          const currentIndex = this.appState.selectedElementId
            ? allElements.findIndex((el) => el.id === this.appState.selectedElementId)
            : -1
          
          let nextIndex = currentIndex + 1
          if (keyEvent.shiftKey) {
            nextIndex = currentIndex - 1
          }
          
          // Wrap around
          nextIndex = (nextIndex + allElements.length) % allElements.length
          
          if (allElements[nextIndex]) {
            keyEvent.preventDefault()
            this.selectElement(allElements[nextIndex].id)
          }
        }
      }
    })
  }

  private selectCard(cardId: string): void {
    this.appState.currentCardId = cardId
    this.appState.selectedElementId = null
    this.render()
  }

  private toggleMode(): void {
    if (this.appState.mode === 'edit') {
      this.appState.mode = 'run'
    } else {
      this.appState.mode = 'edit'
    }
    this.render()
  }

  private selectElement(elementId: string): void {
    this.appState.selectedElementId = elementId
    this.render()
  }

  private removeSelectedElement(): void {
    if (!this.appState.selectedElementId) return

    const card = this.appState.stack.cards.find((c) => c.id === this.appState.currentCardId)
    if (!card) return

    const buttonIndex = card.buttons.findIndex((b) => b.id === this.appState.selectedElementId)
    if (buttonIndex !== -1) {
      card.buttons.splice(buttonIndex, 1)
      this.appState.selectedElementId = null
      this.appState.isDirty = true
      this.saveToUndoStack()
      this.render()
      return
    }

    const fieldIndex = card.fields.findIndex((f) => f.id === this.appState.selectedElementId)
    if (fieldIndex !== -1) {
      card.fields.splice(fieldIndex, 1)
      this.appState.selectedElementId = null
      this.appState.isDirty = true
      this.saveToUndoStack()
      this.render()
    }
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
    // Don't allow deletion of the last card
    if (this.appState.stack.cards.length <= 1) {
      const alert = new StyledAlert()
      alert.show('Cannot delete the last card in the stack.', 'Cannot Delete')
      return
    }

    const confirm = new StyledConfirm()
    confirm.show('Delete this card? This action cannot be undone.', 'Delete Card', true)
      .then((confirmed) => {
        if (!confirmed) return

        const index = this.appState.stack.cards.findIndex((c) => c.id === cardId)
        if (index !== -1) {
          this.appState.stack.cards.splice(index, 1)
          this.appState.currentCardId = this.appState.stack.cards[0]?.id || ''
          this.appState.isDirty = true
          this.saveToUndoStack()
          this.render()
        }
      })
  }

  private addButton(): void {
    const card = this.appState.stack.cards.find((c) => c.id === this.appState.currentCardId)
    if (!card) return

    // Default position and size: centered on card at (100, 100) with size 100x30
    const newButton = createButton(`btn-${Date.now()}`, 'Button', {
      left: 100,
      top: 100,
      right: 200,
      bottom: 130
    })
    card.buttons.push(newButton)
    this.appState.selectedElementId = newButton.id
    this.appState.isDirty = true
    this.saveToUndoStack()
    this.render()
  }

  private addField(): void {
    const card = this.appState.stack.cards.find((c) => c.id === this.appState.currentCardId)
    if (!card) return

    // Default position and size: below button at (100, 150) with size 300x60
    const newField = createField(`fld-${Date.now()}`, `field_${card.fields.length + 1}`, '', {
      left: 100,
      top: 150,
      right: 400,
      bottom: 210
    })
    card.fields.push(newField)
    this.appState.selectedElementId = newField.id
    this.appState.isDirty = true
    this.saveToUndoStack()
    this.render()
  }

  private renameCard(cardId: string): void {
    const card = this.appState.stack.cards.find((c) => c.id === cardId)
    if (!card) return

    const prompt = new StyledPrompt()
    prompt.show('Enter new card name:', card.name || 'Card', 'Rename Card')
      .then((newName) => {
        if (newName && newName.trim()) {
          card.name = newName.trim()
          this.appState.isDirty = true
          this.saveToUndoStack()
          this.render()
        }
      })
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

    // Update body class for CSS mode-aware styling
    document.body.classList.remove('edit-mode', 'run-mode')
    document.body.classList.add(this.appState.mode === 'edit' ? 'edit-mode' : 'run-mode')
    const app = createElement('div', {
      id: 'app'
    })

    // Header
    const header = createElement('div', { className: 'app-header' })
    
    // Title with ghost icon and gradient text
    const titleContainer = createElement('div', { className: 'app-header-title' })
    const ghostIcon = createGhostIcon()
    ghostIcon.classList.add('app-header-title-icon')
    titleContainer.appendChild(ghostIcon)
    const titleText = createElement('span', { className: 'app-header-title-text' })
    titleText.textContent = 'Stacks'
    titleContainer.appendChild(titleText)
    header.appendChild(titleContainer)

    // Edit/Run toggle button
    const modeToggleBtn = createElement('button', {
      className: ['button', 'mode-toggle']
    })
    modeToggleBtn.setAttribute('aria-pressed', this.appState.mode === 'run' ? 'true' : 'false')
    modeToggleBtn.setAttribute('title', this.appState.mode === 'edit' ? 'Switch to Run Mode (Ctrl/Cmd+R)' : 'Switch to Edit Mode (Ctrl/Cmd+E)')
    modeToggleBtn.setAttribute('aria-label', this.appState.mode === 'edit' ? 'Switch to Run Mode' : 'Switch to Edit Mode')
    
    if (this.appState.mode === 'edit') {
      const playIcon = createPlayIcon()
      playIcon.setAttribute('width', '16')
      playIcon.setAttribute('height', '16')
      modeToggleBtn.appendChild(playIcon)
    }
    
    const modeLabel = document.createElement('span')
    modeLabel.textContent = this.appState.mode === 'edit' ? 'Run' : 'Edit'
    modeToggleBtn.appendChild(modeLabel)
    
    addEventListener(modeToggleBtn, 'click', () => {
      this.toggleMode()
    })
    
    // Allow Space/Enter to toggle when focused
    addEventListener(modeToggleBtn, 'keydown', (e: Event) => {
      const keyEvent = e as KeyboardEvent
      if (keyEvent.code === 'Space' || keyEvent.code === 'Enter') {
        keyEvent.preventDefault()
        this.toggleMode()
      }
    })
    
    header.appendChild(modeToggleBtn)

    // Add Button and Add Field buttons (edit mode only)
    if (this.appState.mode === 'edit') {
      const addButtonBtn = new ButtonComponent('Button', () => this.addButton(), createPlusIcon())
      addButtonBtn.getElement().setAttribute('aria-label', 'Add new button to current card')
      addButtonBtn.getElement().setAttribute('title', 'Add new button to current card')
      header.appendChild(addButtonBtn.getElement())

      const addFieldBtn = new ButtonComponent('Field', () => this.addField(), createPlusIcon())
      addFieldBtn.getElement().setAttribute('aria-label', 'Add new field to current card')
      addFieldBtn.getElement().setAttribute('title', 'Add new field to current card')
      header.appendChild(addFieldBtn.getElement())
    }

    const exportBtn = new ButtonComponent('Export', () => {
      exportJSON(this.appState.stack, 'my-stack.json')
    })
    exportBtn.getElement().setAttribute('aria-label', 'Export stack as JSON file')
    exportBtn.getElement().setAttribute('title', 'Export stack as JSON file (Ctrl/Cmd+E to export)')
    header.appendChild(exportBtn.getElement())

    const importBtn = new ButtonComponent('Import', () => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json'
      input.setAttribute('aria-label', 'Import stack from JSON file')
      input.addEventListener('change', async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (file) {
          const json = await readJSONFile(file)
          const result = importJSON(json)
          if ('error' in result) {
            const alertDialog = new StyledAlert()
            alertDialog.show(`Import failed: ${result.error}`, 'Import Error')
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
    importBtn.getElement().setAttribute('aria-label', 'Import stack from JSON file')
    importBtn.getElement().setAttribute('title', 'Import stack from JSON file')
    header.appendChild(importBtn.getElement())

    const saveBtn = new ButtonComponent('Save', () => this.save())
    saveBtn.getElement().setAttribute('aria-label', 'Save current stack (Ctrl/Cmd+S)')
    saveBtn.getElement().setAttribute('title', 'Save current stack (Ctrl/Cmd+S)')
    header.appendChild(saveBtn.getElement())

    const aiSettingsBtn = new ButtonComponent('⚙ AI Settings', () => this.openAISettings())
    aiSettingsBtn.getElement().setAttribute('aria-label', 'Open AI model provider settings')
    aiSettingsBtn.getElement().setAttribute('title', 'Configure API key and model provider')
    header.appendChild(aiSettingsBtn.getElement())

    const themeToggleBtn = createElement('button', { className: 'theme-toggle button' })
    themeToggleBtn.setAttribute('title', `Switch to ${this.currentTheme === 'haunted' ? 'Classic' : 'Haunted'} theme`)
    themeToggleBtn.setAttribute('aria-label', `Switch to ${this.currentTheme === 'haunted' ? 'Classic' : 'Haunted'} theme`)
    const themeIcon = this.currentTheme === 'haunted' ? createSunIcon() : createMoonIcon()
    themeToggleBtn.appendChild(themeIcon)
    addEventListener(themeToggleBtn, 'click', () => this.toggleTheme())
    header.appendChild(themeToggleBtn)

    app.appendChild(header)

    // Main content
    const main = createElement('div', { className: 'app-main' })
    app.appendChild(main)

    // Render current state
    const card = this.appState.stack.cards.find((c) => c.id === this.appState.currentCardId)
    
    if (this.appState.mode === 'run' && card) {
      // Run mode: render RunModeViewer
      if (!this.runModeViewer) {
        this.runModeViewer = new RunModeViewer()
        
        // Wire up navigation
        this.runModeViewer.onNavigateCard((cardId) => {
          this.handleRunModeNavigation(cardId)
        })
        
        // Wire up exit
        this.runModeViewer.onExitRunMode(() => {
          this.appState.mode = 'edit'
          this.render()
        })
      }
      
      this.runModeViewer.render(this.appState.stack, card, null)
      main.appendChild(this.runModeViewer.getElement())
    } else {
      // Edit mode: render normal editor UI
      main.appendChild(this.cardListPanel.getElement())
      main.appendChild(this.cardCanvas.getElement())
      main.appendChild(this.elementInspector.getElement())
      main.appendChild(this.scriptEditor.getElement())

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

      if (card) {
        this.cardListPanel.render(this.appState.stack, this.appState.currentCardId)
        this.cardCanvas.render(card, null)

        // Select first element by default for inspector on first render only
        if (this.isFirstRender && this.appState.selectedElementId === null && card.buttons.length > 0) {
          this.appState.selectedElementId = card.buttons[0].id
        }
        
        this.isFirstRender = false

        if (this.appState.selectedElementId) {
          const button = card.buttons.find((b) => b.id === this.appState.selectedElementId)
          if (button) {
            this.cardCanvas.selectElement(button.id)
            this.elementInspector.setElement(button)
            this.scriptEditor.setScript(button.scripts['mouseUp'] || '')
            this.scriptEditor.setContext(this.appState.stack, card)
          } else {
            const field = card.fields.find((f) => f.id === this.appState.selectedElementId)
            if (field) {
              this.cardCanvas.selectElement(field.id)
              this.elementInspector.setElement(field)
              this.scriptEditor.setContext(this.appState.stack, card)
            }
          }
        }
      }
    }

    this.container.appendChild(app)
  }

  private handleRunModeNavigation(cardId: string): void {
    // Find old card to send closeCard
    const oldCard = this.appState.stack.cards.find(c => c.id === this.appState.currentCardId)
    
    // Update current card
    this.appState.currentCardId = cardId
    
    // Find new card to send openCard
    const newCard = this.appState.stack.cards.find(c => c.id === cardId)
    
    if (oldCard && newCard && this.runModeViewer) {
      // Send closeCard to old card
      send('closeCard', oldCard, createExecutionContext(this.appState.stack, oldCard), this.runModeViewer)
        .then(() => {
          // Send openCard to new card
          return send('openCard', newCard, createExecutionContext(this.appState.stack, newCard), this.runModeViewer)
        })
        .then(() => {
          // Re-render new card
          this.runModeViewer?.render(this.appState.stack, newCard, null)
        })
        .catch((err) => {
          console.error('Error during card navigation:', err)
        })
    }
  }

  private openAISettings(): void {
    if (!this.settingsPanel) {
      this.settingsPanel = new SettingsPanel()
      
      // Load current settings from registry
      const anthropic = defaultRegistry.getAnthropicProvider()
      const ollama = defaultRegistry.getOllamaProvider()
      
      // Show "key set" indicator without exposing the key
      const anthropicKeyStatus = anthropic.getApiKey() ? '✓ key set' : ''
      
      this.settingsPanel.setSettings({
        provider: 'mock',
        anthropicModel: anthropic.getModel(),
        anthropicKey: anthropicKeyStatus,
        ollamaBaseUrl: ollama.getBaseUrl(),
        ollamaModel: ollama.getModel()
      })
      
      // Notify registry when settings change
      this.settingsPanel.onChanged((settings) => {
        this.applyProviderSettings(settings)
      })
    }

    // Create modal if not exists
    if (!this.settingsModal) {
      this.settingsModal = new ModalComponent('AI Settings', this.settingsPanel.getElement())
    }

    this.settingsModal.show()
  }

  private applyProviderSettings(settings: ProviderSettings): void {
    const anthropic = defaultRegistry.getAnthropicProvider()
    const ollama = defaultRegistry.getOllamaProvider()

    if (settings.provider === 'anthropic') {
      if (settings.anthropicKey && settings.anthropicKey.length > 0) {
        anthropic.setApiKey(settings.anthropicKey)
      } else {
        // Clear key if empty
        anthropic.clearApiKey()
      }
      if (settings.anthropicModel) {
        anthropic.setModel(settings.anthropicModel)
      }
    }

    if (settings.provider === 'ollama') {
      if (settings.ollamaBaseUrl) {
        ollama.setBaseUrl(settings.ollamaBaseUrl)
      }
      if (settings.ollamaModel) {
        ollama.setModel(settings.ollamaModel)
      }
    }

    // Notify script editor of provider change
    this.scriptEditor.setSelectedProvider(settings.provider)
  }
}

let appInstance: App | null = null

export function initApp(): void {
  appInstance = new App('app')
  // Expose for testing
  ;(window as any).__appState = {
    cardCanvas: appInstance.getCardCanvas(),
    app: appInstance
  }
}
