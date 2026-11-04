/**
 * Task 7.5: ScriptEditor with syntax highlighting, error underlines, and preview.
 * Task 4.9: AI-assisted script generation with mock provider.
 * 
 * Text editor for HyperTalk scripts with:
 * - Token-based syntax highlighting (transparent textarea over highlight layer)
 * - Parse error line underlines
 * - Preview button to test script in sandboxed stack copy
 * - Generate panel for AI-assisted script writing (mock provider only)
 */

import { createElement, setTextContent, removeAllChildren, addEventListener } from './utils/dom'
import { tokenize, type Token } from '../interpreter/lexer'
import { parse } from '../interpreter/parser'
import type { ParseError } from '../interpreter/parser'
import { ButtonComponent } from './components/button'
import { TextInputComponent } from './components/textInput'
import { ModalComponent } from './components/modal'
import type { Stack, Card } from '../model/stack'
import { createExecutionContext, Runtime } from '../interpreter/runtime'
import { generateScript } from '../generator/scriptGen'
import { MockModelProvider } from '../generator/mockProvider'
import { defaultRegistry } from '../generator/providerRegistry'
import type { ModelProvider } from '../generator/modelProvider'
import type { DiffLine } from '../generator/scriptGen'

export class ScriptEditor {
  private element: HTMLElement
  private editorContainer: HTMLElement
  private highlightLayer: HTMLElement
  private textarea: HTMLTextAreaElement
  private errorDisplay: HTMLElement
  private errorLineNumbers: Set<number> = new Set()
  private script: string = ''
  private error: ParseError | null = null
  private onScriptChange: ((script: string) => void) | null = null
  private currentStack: Stack | null = null
  private currentCard: Card | null = null
  private selectedProvider: 'mock' | 'anthropic' | 'ollama' = 'mock'

  // AI generation panel
  private aiPanel: HTMLElement | null = null
  private aiPromptInput: HTMLTextAreaElement | null = null
  private aiGenerateBtn: HTMLElement | null = null
  private aiLoading: boolean = false
  private aiResultDisplay: HTMLElement | null = null
  private aiAcceptBtn: HTMLElement | null = null
  private aiDiscardBtn: HTMLElement | null = null
  private aiErrorDisplay: HTMLElement | null = null

  constructor() {
    this.element = createElement('div', {
      className: 'script-editor'
    })

    const header = createElement('div', { className: 'editor-header' })
    
    // File-like tab showing element name
    const tab = createElement('div', { className: 'editor-tab' })
    const fileIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    fileIcon.setAttribute('class', 'editor-tab-icon')
    fileIcon.setAttribute('viewBox', '0 0 24 24')
    fileIcon.setAttribute('fill', 'currentColor')
    fileIcon.innerHTML = '<path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-8-6z"/>'
    tab.appendChild(fileIcon)
    const tabName = createElement('div')
    tabName.style.color = 'var(--color-text-secondary)'
    setTextContent(tabName, 'handler')
    tab.appendChild(tabName)
    header.appendChild(tab)

    const previewBtn = new ButtonComponent('Preview', () => this.showPreview())
    header.appendChild(previewBtn.getElement())

    const aiBtn = new ButtonComponent('✨ AI', () => this.toggleAIPanel())
    header.appendChild(aiBtn.getElement())

    this.element.appendChild(header)

    // Main editor container with highlight layer
    this.editorContainer = createElement('div', {
      className: 'editor-container'
    })
    this.editorContainer.style.position = 'relative'
    this.editorContainer.style.width = '100%'
    this.editorContainer.style.minHeight = '160px'
    this.editorContainer.style.overflow = 'hidden'
    this.editorContainer.style.display = 'flex'

    // Line numbers gutter
    const lineNumbersGutter = createElement('div', {
      className: 'editor-line-numbers'
    })
    this.editorContainer.appendChild(lineNumbersGutter)

    // Editor wrapper (contains highlight layer and textarea)
    const editorWrapper = createElement('div')
    editorWrapper.style.position = 'relative'
    editorWrapper.style.flex = '1'
    editorWrapper.style.overflow = 'hidden'
    editorWrapper.style.display = 'flex'
    editorWrapper.style.flexDirection = 'column'

    // Highlight layer (read-only, behind textarea)
    // REQ-P8-005: Perfectly aligned overlay with identical CSS
    this.highlightLayer = createElement('div', {
      className: 'highlight-layer'
    })
    
    // REQ-P8-005: Apply identical CSS to ensure perfect alignment
    const sharedStyles = {
      position: 'absolute' as const,
      inset: '0',
      padding: 'var(--spacing-sm)',
      margin: '0',
      border: '1px solid var(--border-color)',
      overflow: 'auto' as const,
      pointerEvents: 'none' as const,
      whiteSpace: 'pre' as const,
      fontFamily: 'var(--font-mono)',
      fontSize: '12px',
      lineHeight: '1.4',
      tabSize: '4' as any,
      boxSizing: 'border-box' as const,
      width: '100%',
      height: '100%'
    }

    // Apply styles to highlight layer
    Object.entries(sharedStyles).forEach(([key, value]) => {
      (this.highlightLayer.style as any)[key] = value
    })
    this.highlightLayer.style.backgroundColor = 'transparent'
    this.highlightLayer.style.color = 'transparent'

    // Textarea (transparent background, over highlight layer)
    this.textarea = createElement('textarea', {
      className: 'editor-textarea'
    }) as HTMLTextAreaElement
    
    // REQ-P8-005: Apply identical CSS to textarea
    Object.entries(sharedStyles).forEach(([key, value]) => {
      (this.textarea.style as any)[key] = value
    })
    this.textarea.style.backgroundColor = 'transparent'
    this.textarea.style.color = 'transparent'
    this.textarea.style.caretColor = 'var(--color-black)'
    this.textarea.style.zIndex = '1'
    this.textarea.style.pointerEvents = 'auto'

    addEventListener(this.textarea, 'input', () => {
      this.script = this.textarea.value
      this.updateHighlighting()
      this.updateError()
      this.onScriptChange?.(this.script)
    })

    addEventListener(this.textarea, 'scroll', () => {
      // Sync scroll position of highlight layer with textarea
      this.highlightLayer.scrollLeft = this.textarea.scrollLeft
      this.highlightLayer.scrollTop = this.textarea.scrollTop
      // Also sync line numbers
      lineNumbersGutter.scrollTop = this.textarea.scrollTop
    })

    addEventListener(this.textarea, 'keydown', (e) => {
      const keyEvent = e as KeyboardEvent
      // Ctrl+Enter: Show preview
      if ((keyEvent.ctrlKey || keyEvent.metaKey) && keyEvent.key === 'Enter') {
        keyEvent.preventDefault()
        this.showPreview()
      }
      // Ctrl+/: Toggle comment on current line
      if ((keyEvent.ctrlKey || keyEvent.metaKey) && keyEvent.key === '/') {
        keyEvent.preventDefault()
        this.toggleLineComment()
      }
    })

    editorWrapper.appendChild(this.highlightLayer)
    editorWrapper.appendChild(this.textarea)
    this.editorContainer.appendChild(editorWrapper)
    this.element.appendChild(this.editorContainer)

    this.errorDisplay = createElement('div', { className: 'editor-error' })
    this.element.appendChild(this.errorDisplay)

    // Update line numbers whenever script changes
    const updateLineNumbers = () => {
      const lines = this.textarea.value.split('\n').length
      const lineNumbersText = Array.from({ length: lines }, (_, i) => i + 1).join('\n')
      lineNumbersGutter.textContent = lineNumbersText
    }
    addEventListener(this.textarea, 'input', () => updateLineNumbers())
    updateLineNumbers()
  }

  getElement(): HTMLElement {
    return this.element
  }

  setScript(script: string): void {
    this.script = script
    this.textarea.value = script
    this.updateHighlighting()
    this.updateError()
  }

  getScript(): string {
    return this.textarea.value
  }

  /**
   * Set stack and card context for preview execution.
   */
  setContext(stack: Stack, card: Card): void {
    this.currentStack = stack
    this.currentCard = card
  }

  /**
   * Set the selected provider for script generation (mock, anthropic, ollama).
   */
  setSelectedProvider(provider: 'mock' | 'anthropic' | 'ollama'): void {
    this.selectedProvider = provider
  }

  /**
   * Task 7.5 & REQ-P8-005: Update syntax highlighting based on tokens.
   * Iterate original source by token offsets; emit exact source slices.
   * No line divs, no case changes, gaps preserved as plain text.
   * Layer textContent must equal textarea.value exactly.
   */
  private updateHighlighting(): void {
    const source = this.textarea.value

    if (!source) {
      removeAllChildren(this.highlightLayer)
      return
    }

    const tokensResult = tokenize(source)
    const tokens = Array.isArray(tokensResult) ? tokensResult : []

    removeAllChildren(this.highlightLayer)

    let pos = 0

    for (const token of tokens) {
      if (token.type === 'eof') {
        break
      }

      const start = token.start ?? 0
      const end = token.end ?? start + token.value.length

      // Emit gap (spaces, newlines, comments) from current pos to token start
      if (pos < start) {
        const gap = source.substring(pos, start)
        const textNode = document.createTextNode(gap)
        this.highlightLayer.appendChild(textNode)
      }

      // Emit token as span with class
      const span = createElement('span', {
        className: `token token-${token.type}`
      })

      // Apply styling based on token type
      if (token.type === 'keyword') {
        span.style.fontWeight = 'bold'
        span.style.color = 'var(--color-black)'
      } else if (token.type === 'string') {
        span.style.color = 'var(--color-medium-gray)'
      } else if (token.type === 'number') {
        span.style.color = 'var(--color-dark-gray)'
      } else if (token.type === 'identifier') {
        span.style.color = 'var(--color-dark-gray)'
      } else {
        span.style.color = 'var(--color-black)'
      }

      // Get exact source slice for this token (preserves original case and formatting)
      const tokenSource = source.substring(start, end)
      setTextContent(span, tokenSource)
      this.highlightLayer.appendChild(span)

      pos = end
    }

    // Emit any trailing text (spaces, newlines)
    if (pos < source.length) {
      const trailing = source.substring(pos)
      const textNode = document.createTextNode(trailing)
      this.highlightLayer.appendChild(textNode)
    }
  }

  /**
   * Task 7.5: Update error state and underline error lines.
   */
  private updateError(): void {
    const source = this.textarea.value

    try {
      const tokensResult = tokenize(source)

      if (!Array.isArray(tokensResult)) {
        this.error = {
          type: 'ParseError',
          message: tokensResult.message,
          line: 0,
          column: 0
        }
      } else {
        const result = parse(tokensResult)

        if ('type' in result && result.type === 'ParseError') {
          this.error = result as ParseError
        } else {
          this.error = null
        }
      }
    } catch (err) {
      this.error = {
        type: 'ParseError',
        message: err instanceof Error ? err.message : 'Unknown error',
        line: 0,
        column: 0
      }
    }

    this.errorLineNumbers.clear()
    if (this.error) {
      this.errorLineNumbers.add(this.error.line)
    }

    this.renderError()
    this.updateHighlighting()
  }

  /**
   * Render error message with line and column info.
   */
  private renderError(): void {
    removeAllChildren(this.errorDisplay)

    if (this.error) {
      const msg = `Error at line ${this.error.line}, column ${this.error.column}: ${this.error.message}`
      setTextContent(this.errorDisplay, msg)
      this.errorDisplay.style.color = '#cc0000'
    } else {
      this.errorDisplay.style.color = '#009900'
      setTextContent(this.errorDisplay, '✓ Valid')
    }
  }

  getError(): ParseError | null {
    return this.error
  }

  onScriptChanged(handler: (script: string) => void): void {
    this.onScriptChange = handler
  }

  /**
   * Task 7.5: Show preview modal that executes script in a sandboxed stack copy.
   */
  private showPreview(): void {
    if (!this.currentStack || !this.currentCard) {
      alert('No card context available for preview')
      return
    }

    if (this.error) {
      alert(`Cannot preview: ${this.error.message}`)
      return
    }

    const script = this.textarea.value
    if (!script.trim()) {
      alert('No script to preview')
      return
    }

    // Create a deep copy of stack for sandboxed execution
    const stackCopy = JSON.parse(JSON.stringify(this.currentStack), (key, value) => {
      if (key === 'variables') {
        const map = new Map()
        if (typeof value === 'object' && value !== null) {
          Object.entries(value).forEach(([k, v]) => map.set(k, v))
        }
        return map
      }
      return value
    })

    // Find corresponding card in copy
    const cardCopy = stackCopy.cards.find((c: any) => c.id === this.currentCard!.id)
    if (!cardCopy) {
      alert('Card not found in stack copy')
      return
    }

    try {
      // Parse script as handler
      const source = script
      const tokensResult = tokenize(source)
      if (!Array.isArray(tokensResult)) {
        alert(`Tokenization error: ${tokensResult.message}`)
        return
      }

      const parseResult = parse(tokensResult)
      if ('type' in parseResult && parseResult.type === 'ParseError') {
        alert(`Parse error: ${parseResult.message}`)
        return
      }

      // Execute in runtime
      const context = createExecutionContext(stackCopy, cardCopy)
      const runtime = new Runtime(context)

      const execResult = runtime.execute(parseResult)
      if (!execResult.success) {
        const error = execResult.error as any
        alert(`Execution error: ${error?.message || 'Unknown error'}`)
        return
      }

      // Try to find the handler in the AST and execute it
      const ast = parseResult as any
      if (ast.handlers && ast.handlers.length > 0) {
        const firstHandler = ast.handlers[0]
        const handlerResult = runtime.executeHandlerBody(firstHandler.name)
        if (!handlerResult.success) {
          const error = handlerResult.error as any
          alert(`Handler execution error: ${error?.message || 'Unknown error'}`)
          return
        }
      }

      // Show success message with field updates
      const fieldUpdates = cardCopy.fields
        .map((f: any) => `${f.name}: "${f.content}"`)
        .join('\n')

      const message = `Preview executed successfully!\n\nField updates:\n${fieldUpdates || '(no fields updated)'}`
      alert(message)
    } catch (err) {
      alert(`Preview error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  /**
   * Task 4.9: Toggle AI generation panel visibility.
   */
  private toggleAIPanel(): void {
    if (!this.aiPanel) {
      this.createAIPanel()
    }

    const isVisible = this.aiPanel?.style.display !== 'none'
    if (this.aiPanel) {
      this.aiPanel.style.display = isVisible ? 'none' : 'flex'
    }
  }

  /**
   * Task 4.9: Create AI generation panel with input, generate, result, accept/discard.
   */
  private createAIPanel(): void {
    this.aiPanel = createElement('div', {
      className: 'ai-panel'
    })
    this.aiPanel.style.display = 'none'
    this.aiPanel.style.position = 'absolute'
    this.aiPanel.style.right = '0'
    this.aiPanel.style.bottom = '0'
    this.aiPanel.style.width = '300px'
    this.aiPanel.style.maxHeight = '400px'
    this.aiPanel.style.backgroundColor = 'var(--color-light-gray)'
    this.aiPanel.style.border = '2px solid var(--color-black)'
    this.aiPanel.style.padding = 'var(--spacing-md)'
    this.aiPanel.style.flexDirection = 'column'
    this.aiPanel.style.gap = 'var(--spacing-sm)'
    this.aiPanel.style.zIndex = '10'
    this.aiPanel.style.overflowY = 'auto'

    // Header
    const header = createElement('div')
    header.style.fontWeight = 'bold'
    setTextContent(header, 'Generate with AI')
    this.aiPanel.appendChild(header)

    // Task 8.6: Offline demo mode notice (visible when mock provider is active)
    const offlineNotice = createElement('div', {
      className: 'ai-offline-notice'
    })
    offlineNotice.style.backgroundColor = '#ffffcc'
    offlineNotice.style.border = '1px solid #cccc00'
    offlineNotice.style.padding = 'var(--spacing-xs)'
    offlineNotice.style.fontSize = '9px'
    offlineNotice.style.lineHeight = '1.3'
    offlineNotice.style.color = 'var(--color-black)'
    offlineNotice.style.fontFamily = 'var(--font-mono)'
    setTextContent(
      offlineNotice,
      'Offline demo mode: built-in templates, no AI calls. For real AI, add your own Anthropic key or a local Ollama in AI Settings.'
    )
    this.aiPanel.appendChild(offlineNotice)

    // Prompt input
    const promptLabel = createElement('div')
    promptLabel.style.fontSize = '11px'
    promptLabel.style.fontWeight = 'bold'
    setTextContent(promptLabel, 'Describe what you want:')
    this.aiPanel.appendChild(promptLabel)

    this.aiPromptInput = createElement('textarea', {
      className: 'ai-prompt-input'
    }) as HTMLTextAreaElement
    this.aiPromptInput.style.width = '100%'
    this.aiPromptInput.style.height = '60px'
    this.aiPromptInput.style.padding = 'var(--spacing-xs)'
    this.aiPromptInput.style.border = '1px solid var(--color-black)'
    this.aiPromptInput.style.fontFamily = 'var(--font-mono)'
    this.aiPromptInput.style.fontSize = '11px'
    this.aiPromptInput.style.resize = 'none'
    this.aiPromptInput.placeholder = 'e.g., "Show a button click alert"'
    this.aiPanel.appendChild(this.aiPromptInput)

    // Generate button
    this.aiGenerateBtn = createElement('button', {
      className: 'ai-generate-btn'
    }) as HTMLButtonElement
    this.aiGenerateBtn.style.padding = 'var(--spacing-xs) var(--spacing-sm)'
    this.aiGenerateBtn.style.backgroundColor = 'var(--color-light-gray)'
    this.aiGenerateBtn.style.border = '2px solid var(--color-black)'
    this.aiGenerateBtn.style.cursor = 'pointer'
    this.aiGenerateBtn.style.fontFamily = 'var(--font-mono)'
    this.aiGenerateBtn.style.fontSize = '11px'
    this.aiGenerateBtn.style.fontWeight = 'bold'
    setTextContent(this.aiGenerateBtn, 'Generate')
    addEventListener(this.aiGenerateBtn, 'click', () => this.generateScript())
    this.aiPanel.appendChild(this.aiGenerateBtn)

    // Error display
    this.aiErrorDisplay = createElement('div', {
      className: 'ai-error-display'
    })
    this.aiErrorDisplay.style.minHeight = '20px'
    this.aiErrorDisplay.style.padding = 'var(--spacing-xs)'
    this.aiErrorDisplay.style.fontSize = '10px'
    this.aiErrorDisplay.style.color = '#cc0000'
    this.aiErrorDisplay.style.fontFamily = 'var(--font-mono)'
    this.aiPanel.appendChild(this.aiErrorDisplay)

    // Result display
    this.aiResultDisplay = createElement('div', {
      className: 'ai-result-display'
    })
    this.aiResultDisplay.style.minHeight = '100px'
    this.aiResultDisplay.style.padding = 'var(--spacing-xs)'
    this.aiResultDisplay.style.border = '1px solid var(--color-medium-gray)'
    this.aiResultDisplay.style.backgroundColor = 'var(--color-white)'
    this.aiResultDisplay.style.fontSize = '10px'
    this.aiResultDisplay.style.fontFamily = 'var(--font-mono)'
    this.aiResultDisplay.style.maxHeight = '120px'
    this.aiResultDisplay.style.overflowY = 'auto'
    this.aiPanel.appendChild(this.aiResultDisplay)

    // Accept/Discard buttons
    const buttonGroup = createElement('div')
    buttonGroup.style.display = 'flex'
    buttonGroup.style.gap = 'var(--spacing-sm)'

    this.aiAcceptBtn = createElement('button', {
      className: 'ai-accept-btn'
    }) as HTMLButtonElement
    this.aiAcceptBtn.style.flex = '1'
    this.aiAcceptBtn.style.padding = 'var(--spacing-xs) var(--spacing-sm)'
    this.aiAcceptBtn.style.backgroundColor = 'var(--color-light-gray)'
    this.aiAcceptBtn.style.border = '2px solid var(--color-black)'
    this.aiAcceptBtn.style.cursor = 'pointer'
    this.aiAcceptBtn.style.fontFamily = 'var(--font-mono)'
    this.aiAcceptBtn.style.fontSize = '11px'
    this.aiAcceptBtn.style.fontWeight = 'bold'
    ;(this.aiAcceptBtn as HTMLButtonElement).disabled = true
    setTextContent(this.aiAcceptBtn, 'Accept')
    addEventListener(this.aiAcceptBtn, 'click', () => this.acceptGeneratedScript())
    buttonGroup.appendChild(this.aiAcceptBtn)

    this.aiDiscardBtn = createElement('button', {
      className: 'ai-discard-btn'
    }) as HTMLButtonElement
    this.aiDiscardBtn.style.flex = '1'
    this.aiDiscardBtn.style.padding = 'var(--spacing-xs) var(--spacing-sm)'
    this.aiDiscardBtn.style.backgroundColor = 'var(--color-light-gray)'
    this.aiDiscardBtn.style.border = '2px solid var(--color-black)'
    this.aiDiscardBtn.style.cursor = 'pointer'
    this.aiDiscardBtn.style.fontFamily = 'var(--font-mono)'
    this.aiDiscardBtn.style.fontSize = '11px'
    this.aiDiscardBtn.style.fontWeight = 'bold'
    setTextContent(this.aiDiscardBtn, 'Discard')
    addEventListener(this.aiDiscardBtn, 'click', () => this.discardGeneratedScript())
    buttonGroup.appendChild(this.aiDiscardBtn)

    this.aiPanel.appendChild(buttonGroup)

    // Add panel to editor element
    this.element.appendChild(this.aiPanel)
  }

  /**
   * Task 4.9: Generate script using selected provider from registry with fallback.
   */
  private async generateScript(): Promise<void> {
    if (!this.aiPromptInput || !this.aiResultDisplay || !this.aiGenerateBtn || !this.aiAcceptBtn || !this.aiErrorDisplay) {
      return
    }

    const prompt = this.aiPromptInput.value.trim()
    if (!prompt) {
      alert('Please enter a description')
      return
    }

    this.aiLoading = true
    ;(this.aiGenerateBtn as HTMLButtonElement).disabled = true
    ;(this.aiAcceptBtn as HTMLButtonElement).disabled = true
    removeAllChildren(this.aiErrorDisplay)
    setTextContent(this.aiResultDisplay, 'Generating...')

    try {
      // Get the appropriate provider based on selection
      let provider: ModelProvider
      
      if (this.selectedProvider === 'anthropic') {
        provider = defaultRegistry.getAnthropicProvider()
      } else if (this.selectedProvider === 'ollama') {
        provider = defaultRegistry.getOllamaProvider()
      } else {
        provider = new MockModelProvider()
      }

      // Build context from current state
      const context = {
        cardName: this.currentCard?.name,
        fieldNames: this.currentCard?.fields.map(f => f.name),
        buttonLabels: this.currentCard?.buttons.map(b => b.label)
      }

      const result = await generateScript(
        provider,
        prompt,
        context,
        this.getScript()
      )

      if ('error' in result) {
        setTextContent(this.aiErrorDisplay, result.error)
        
        // Try fallback to mock if not already using it
        if (this.selectedProvider !== 'mock') {
          const mockProvider = new MockModelProvider()
          const mockResult = await generateScript(mockProvider, prompt, context, this.getScript())
          
          if (!('error' in mockResult)) {
            // Append fallback notice
            const noticeEl = createElement('div')
            noticeEl.style.marginTop = '4px'
            setTextContent(noticeEl, 'Falling back to Mock provider.')
            this.aiErrorDisplay.appendChild(noticeEl)
            this.displayGeneratedCode(mockResult.code, mockResult.diff)
            ;(this.aiAcceptBtn as HTMLButtonElement).disabled = false
            return
          }
        }
        
        ;(this.aiAcceptBtn as HTMLButtonElement).disabled = true
      } else {
        removeAllChildren(this.aiErrorDisplay)
        this.displayGeneratedCode(result.code, result.diff)
        ;(this.aiAcceptBtn as HTMLButtonElement).disabled = false
      }
    } catch (err) {
      setTextContent(this.aiErrorDisplay, `Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
      ;(this.aiAcceptBtn as HTMLButtonElement).disabled = true
    } finally {
      this.aiLoading = false
      ;(this.aiGenerateBtn as HTMLButtonElement).disabled = false
    }
  }

  /**
   * Display generated code and diff in result area.
   */
  private displayGeneratedCode(code: string, diff: DiffLine[]): void {
    if (!this.aiResultDisplay) return

    const diffLines = diff
      .map(line => {
        if (line.type === 'add') return `+ ${line.content}`
        if (line.type === 'remove') return `- ${line.content}`
        return `  ${line.content}`
      })
      .join('\n')

    removeAllChildren(this.aiResultDisplay)
    const codeDiv = createElement('div')
    codeDiv.style.whiteSpace = 'pre-wrap'
    codeDiv.style.wordWrap = 'break-word'
    codeDiv.style.color = 'var(--color-dark-gray)'
    setTextContent(codeDiv, `Generated:\n\n${code}\n\nDiff:\n${diffLines}`)
    this.aiResultDisplay.appendChild(codeDiv)

    // Store generated code for accept
    ;(this.aiResultDisplay as any).__generatedCode = code
  }

  /**
   * Task 4.9: Accept generated script and insert into editor.
   */
  private acceptGeneratedScript(): void {
    const generatedCode = (this.aiResultDisplay as any)?.__generatedCode
    if (!generatedCode) {
      return
    }

    // Insert into editor
    this.setScript(generatedCode)
    this.onScriptChange?.(generatedCode)

    // Close panel
    if (this.aiPanel) {
      this.aiPanel.style.display = 'none'
    }

    // Clear result
    if (this.aiResultDisplay) {
      removeAllChildren(this.aiResultDisplay)
    }

    if (this.aiAcceptBtn) {
      ;(this.aiAcceptBtn as HTMLButtonElement).disabled = true
    }
  }

  /**
   * Task 6.3: Discard generated script and close panel.
   */
  private discardGeneratedScript(): void {
    if (this.aiPanel) {
      this.aiPanel.style.display = 'none'
    }

    if (this.aiResultDisplay) {
      removeAllChildren(this.aiResultDisplay)
    }

    if (this.aiPromptInput) {
      this.aiPromptInput.value = ''
    }

    if (this.aiAcceptBtn) {
      ;(this.aiAcceptBtn as HTMLButtonElement).disabled = true
    }
  }

  /**
   * Task 6.3: Toggle comment (--) on current line(s) with Ctrl+/
   */
  private toggleLineComment(): void {
    const textarea = this.textarea
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value

    // Find the start and end of the line(s)
    let lineStart = text.lastIndexOf('\n', start - 1) + 1
    let lineEnd = text.indexOf('\n', end)
    if (lineEnd === -1) lineEnd = text.length

    const selectedText = text.substring(lineStart, lineEnd)
    const lines = selectedText.split('\n')

    // Check if first line is commented
    const trimmed = lines[0].trim()
    const isCommented = trimmed.startsWith('--')

    // Toggle comment on all selected lines
    const newLines = lines.map(line => {
      const trimmedLine = line.trim()
      if (trimmedLine.length === 0) return line
      if (isCommented) {
        // Remove comment
        return line.replace(/^\s*--\s?/, '')
      } else {
        // Add comment
        return line.replace(/^(\s*)/, '$1-- ')
      }
    })

    const newText = text.substring(0, lineStart) + newLines.join('\n') + text.substring(lineEnd)
    textarea.value = newText

    // Update script and highlighting
    this.script = newText
    this.updateHighlighting()
    this.updateError()
    this.onScriptChange?.(this.script)

    // Restore selection
    textarea.selectionStart = start
    textarea.selectionEnd = end
  }
}
