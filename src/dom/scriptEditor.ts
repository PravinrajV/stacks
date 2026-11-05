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
import { StyledAlert } from './components/styledDialogs'
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
  private aiGenerateBtn: HTMLButtonElement | null = null
  private aiLoading: boolean = false
  private aiCodeBlock: HTMLElement | null = null
  private aiDiffPreview: HTMLElement | null = null
  private aiAcceptBtn: HTMLButtonElement | null = null
  private aiDiscardBtn: HTMLButtonElement | null = null
  private generatedCode: string = ''

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
      const alert = new StyledAlert()
      alert.show('No card context available for preview', 'Cannot Preview')
      return
    }

    if (this.error) {
      const alert = new StyledAlert()
      alert.show(`Cannot preview: ${this.error.message}`, 'Preview Error')
      return
    }

    const script = this.textarea.value
    if (!script.trim()) {
      const alert = new StyledAlert()
      alert.show('No script to preview', 'Empty Script')
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
      const alert = new StyledAlert()
      alert.show('Card not found in stack copy', 'Preview Error')
      return
    }

    try {
      // Parse script as handler
      const source = script
      const tokensResult = tokenize(source)
      if (!Array.isArray(tokensResult)) {
        const alert = new StyledAlert()
        alert.show(`Tokenization error: ${tokensResult.message}`, 'Preview Error')
        return
      }

      const parseResult = parse(tokensResult)
      if ('type' in parseResult && parseResult.type === 'ParseError') {
        const alert = new StyledAlert()
        alert.show(`Parse error: ${parseResult.message}`, 'Preview Error')
        return
      }

      // Execute in runtime
      const context = createExecutionContext(stackCopy, cardCopy)
      const runtime = new Runtime(context)

      const execResult = runtime.execute(parseResult)
      if (!execResult.success) {
        const error = execResult.error as any
        const alert = new StyledAlert()
        alert.show(`Execution error: ${error?.message || 'Unknown error'}`, 'Preview Error')
        return
      }

      // Try to find the handler in the AST and execute it
      const ast = parseResult as any
      if (ast.handlers && ast.handlers.length > 0) {
        const firstHandler = ast.handlers[0]
        const handlerResult = runtime.executeHandlerBody(firstHandler.name)
        if (!handlerResult.success) {
          const error = handlerResult.error as any
          const alert = new StyledAlert()
          alert.show(`Handler execution error: ${error?.message || 'Unknown error'}`, 'Preview Error')
          return
        }
      }

      // Show success message with field updates
      const fieldUpdates = cardCopy.fields
        .map((f: any) => `${f.name}: "${f.content}"`)
        .join('\n')

      const message = `Preview executed successfully!\n\nField updates:\n${fieldUpdates || '(no fields updated)'}`
      const alert = new StyledAlert()
      alert.show(message, 'Preview Result')
    } catch (err) {
      const alert = new StyledAlert()
      alert.show(`Preview error: ${err instanceof Error ? err.message : 'Unknown error'}`, 'Preview Error')
    }
  }

  /**
   * Task 4.9: Toggle AI generation panel visibility.
   * Phase 11.1: Toggle body.ai-drawer-open class for responsive docking.
   */
  private toggleAIPanel(): void {
    if (!this.aiPanel) {
      this.createAIPanel()
    }

    const isVisible = this.aiPanel?.style.display !== 'none'
    if (this.aiPanel) {
      this.aiPanel.style.display = isVisible ? 'none' : 'flex'
      
      // Phase 11.1: Toggle body class and trigger canvas re-fit
      if (isVisible) {
        document.body.classList.remove('ai-drawer-open')
      } else {
        document.body.classList.add('ai-drawer-open')
      }
      
      // Trigger canvas re-fit: use requestAnimationFrame to ensure layout is updated
      // before ResizeObserver sees it, then dispatch resize
      requestAnimationFrame(() => {
        window.dispatchEvent(new Event('resize'))
      })
    }
  }

  /**
   * Task 4.9: Create AI generation panel as fixed right-side drawer.
   */
  private createAIPanel(): void {
    this.aiPanel = createElement('div', {
      className: 'ai-panel ai-panel-drawer'
    })
    this.aiPanel.style.display = 'none'

    // Header with title and close button
    const header = createElement('div', { className: 'ai-panel-header' })
    const title = createElement('h2', { className: 'ai-panel-header-title' })
    title.style.margin = '0'
    setTextContent(title, 'AI Assistant')
    header.appendChild(title)

    const closeBtn = createElement('button', { className: 'ai-panel-close-btn' })
    setTextContent(closeBtn, '×')
    addEventListener(closeBtn, 'click', () => this.toggleAIPanel())
    
    // Handle Escape key to close drawer
    const handleEscape = (e: Event) => {
      if ((e as KeyboardEvent).key === 'Escape' && this.aiPanel?.style.display !== 'none') {
        this.toggleAIPanel()
      }
    }
    document.addEventListener('keydown', handleEscape as EventListener)
    header.appendChild(closeBtn)
    this.aiPanel.appendChild(header)

    // Task 8.6: Offline demo mode notice
    const offlineNotice = createElement('div', { className: 'ai-offline-notice' })
    setTextContent(
      offlineNotice,
      'Offline demo mode: built-in templates, no AI calls. For real AI, add your own Anthropic key or a local Ollama in AI Settings.'
    )
    this.aiPanel.appendChild(offlineNotice)

    // Prompt section
    const promptSection = createElement('div', { className: 'ai-prompt-section' })
    const promptLabel = createElement('label', { className: 'ai-prompt-label' })
    setTextContent(promptLabel, 'Describe what you want:')
    promptSection.appendChild(promptLabel)

    this.aiPromptInput = createElement('textarea', {
      className: 'ai-prompt-textarea ai-prompt-input'
    }) as HTMLTextAreaElement
    this.aiPromptInput.placeholder = 'e.g., "Show a button click alert"'
    promptSection.appendChild(this.aiPromptInput)
    this.aiPanel.appendChild(promptSection)

    // Generate button
    this.aiGenerateBtn = createElement('button', {
      className: 'ai-generate-btn'
    }) as HTMLButtonElement
    setTextContent(this.aiGenerateBtn, 'Generate')
    addEventListener(this.aiGenerateBtn, 'click', () => this.generateScript())
    this.aiPanel.appendChild(this.aiGenerateBtn)

    // Code block display
    this.aiCodeBlock = createElement('div', {
      className: 'ai-code-block'
    })
    this.aiCodeBlock.style.display = 'none'
    this.aiPanel.appendChild(this.aiCodeBlock)

    // Diff preview
    this.aiDiffPreview = createElement('div', {
      className: 'ai-diff-preview'
    })
    this.aiDiffPreview.style.display = 'none'
    this.aiPanel.appendChild(this.aiDiffPreview)

    // Result display (compatibility wrapper for tests)
    const resultDisplay = createElement('div', { className: 'ai-result-display' })
    resultDisplay.style.display = 'none'
    this.aiPanel.appendChild(resultDisplay)

    // Button group (Accept/Discard) at bottom
    const buttonGroup = createElement('div', { className: 'ai-button-group' })
    buttonGroup.style.display = 'none'

    this.aiAcceptBtn = createElement('button', {
      className: 'ai-accept-btn'
    }) as HTMLButtonElement
    ;(this.aiAcceptBtn as HTMLButtonElement).disabled = true
    setTextContent(this.aiAcceptBtn, 'Accept')
    addEventListener(this.aiAcceptBtn, 'click', () => this.acceptGeneratedScript())
    buttonGroup.appendChild(this.aiAcceptBtn)

    this.aiDiscardBtn = createElement('button', {
      className: 'ai-discard-btn'
    }) as HTMLButtonElement
    setTextContent(this.aiDiscardBtn, 'Discard')
    addEventListener(this.aiDiscardBtn, 'click', () => this.discardGeneratedScript())
    buttonGroup.appendChild(this.aiDiscardBtn)

    this.aiPanel.appendChild(buttonGroup)

    // Add panel to script editor element (will be cleaned up with app)
    this.element.appendChild(this.aiPanel)
  }

  /**
   * Task 4.9: Generate script using selected provider from registry with fallback.
   */
  private async generateScript(): Promise<void> {
    if (!this.aiPromptInput || !this.aiCodeBlock || !this.aiGenerateBtn || !this.aiAcceptBtn || !this.aiDiffPreview) {
      return
    }

    const prompt = this.aiPromptInput.value.trim()
    if (!prompt) {
      const alert = new StyledAlert()
      alert.show('Please enter a description', 'Empty Prompt')
      return
    }

    this.aiLoading = true
    ;(this.aiGenerateBtn as HTMLButtonElement).disabled = true
    ;(this.aiAcceptBtn as HTMLButtonElement).disabled = true
    setTextContent(this.aiCodeBlock, 'Generating...')
    this.aiCodeBlock.style.display = 'block'
    this.aiDiffPreview.style.display = 'none'

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
        const errorMessage = result.error
        
        // Show the error message in the code block
        removeAllChildren(this.aiCodeBlock)
        const errorDiv = createElement('div', { className: 'ai-error-message' })
        setTextContent(errorDiv, `Error: ${errorMessage}`)
        this.aiCodeBlock.appendChild(errorDiv)
        
        // Try fallback to mock if not already using it
        if (this.selectedProvider !== 'mock') {
          const mockProvider = new MockModelProvider()
          const mockResult = await generateScript(mockProvider, prompt, context, this.getScript())
          
          if (!('error' in mockResult)) {
            // Show fallback notice AFTER the error message
            const fallbackNotice = createElement('div', { className: 'ai-fallback-notice' })
            setTextContent(fallbackNotice, `Fallback: ${this.selectedProvider} not available, using built-in templates`)
            this.aiCodeBlock.appendChild(fallbackNotice)
            
            // Add the generated code
            const codeEl = createElement('div', { className: 'ai-generated-code' })
            setTextContent(codeEl, mockResult.code)
            this.aiCodeBlock.appendChild(codeEl)
            
            // Show diff
            removeAllChildren(this.aiDiffPreview)
            for (const line of mockResult.diff) {
              const lineEl = createElement('div', { className: `ai-diff-line ${line.type}` })
              const prefix = line.type === 'add' ? '+ ' : line.type === 'remove' ? '- ' : '  '
              setTextContent(lineEl, prefix + line.content)
              this.aiDiffPreview.appendChild(lineEl)
            }
            this.aiDiffPreview.style.display = 'block'
            
            // Show Accept/Discard buttons
            const buttonGroup = this.aiPanel?.querySelector('.ai-button-group') as HTMLElement | null
            if (buttonGroup) {
              buttonGroup.style.display = 'flex'
            }
            
            this.generatedCode = mockResult.code
            ;(this.aiAcceptBtn as HTMLButtonElement).disabled = false
            return
          }
        }
        
        ;(this.aiAcceptBtn as HTMLButtonElement).disabled = true
      } else {
        this.displayGeneratedCode(result.code, result.diff)
        ;(this.aiAcceptBtn as HTMLButtonElement).disabled = false
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      removeAllChildren(this.aiCodeBlock)
      const errorDiv = createElement('div', { className: 'ai-error-message' })
      setTextContent(errorDiv, `Error: ${errorMsg}`)
      this.aiCodeBlock.appendChild(errorDiv)
      ;(this.aiAcceptBtn as HTMLButtonElement).disabled = true
      
      // Try fallback to mock on exception
      if (this.selectedProvider !== 'mock') {
        try {
          const mockProvider = new MockModelProvider()
          const context = {
            cardName: this.currentCard?.name,
            fieldNames: this.currentCard?.fields.map(f => f.name),
            buttonLabels: this.currentCard?.buttons.map(b => b.label)
          }
          const mockResult = await generateScript(mockProvider, prompt, context, this.getScript())
          
          if (!('error' in mockResult)) {
            // Show fallback notice AFTER the error message
            const fallbackNotice = createElement('div', { className: 'ai-fallback-notice' })
            setTextContent(fallbackNotice, `Fallback: ${this.selectedProvider} not available, using built-in templates`)
            this.aiCodeBlock.appendChild(fallbackNotice)
            
            // Add the generated code
            const codeEl = createElement('div', { className: 'ai-generated-code' })
            setTextContent(codeEl, mockResult.code)
            this.aiCodeBlock.appendChild(codeEl)
            
            // Show diff
            removeAllChildren(this.aiDiffPreview)
            for (const line of mockResult.diff) {
              const lineEl = createElement('div', { className: `ai-diff-line ${line.type}` })
              const prefix = line.type === 'add' ? '+ ' : line.type === 'remove' ? '- ' : '  '
              setTextContent(lineEl, prefix + line.content)
              this.aiDiffPreview.appendChild(lineEl)
            }
            this.aiDiffPreview.style.display = 'block'
            
            // Show Accept/Discard buttons
            const buttonGroup = this.aiPanel?.querySelector('.ai-button-group') as HTMLElement | null
            if (buttonGroup) {
              buttonGroup.style.display = 'flex'
            }
            
            this.generatedCode = mockResult.code
            ;(this.aiAcceptBtn as HTMLButtonElement).disabled = false
          }
        } catch (fallbackErr) {
          // Fallback also failed, keep the error message
        }
      }
    } finally {
      this.aiLoading = false
      ;(this.aiGenerateBtn as HTMLButtonElement).disabled = false
    }
  }

  /**
   * Display generated code and diff in result area.
   */
  private displayGeneratedCode(code: string, diff: DiffLine[]): void {
    if (!this.aiCodeBlock || !this.aiDiffPreview) return

    this.generatedCode = code

    // Display code block
    removeAllChildren(this.aiCodeBlock)
    const codeEl = createElement('div', { className: 'ai-generated-code' })
    setTextContent(codeEl, code)
    this.aiCodeBlock.appendChild(codeEl)
    this.aiCodeBlock.style.display = 'block'

    // Display diff with color-coded lines
    removeAllChildren(this.aiDiffPreview)
    for (const line of diff) {
      const lineEl = createElement('div', { className: `ai-diff-line ${line.type}` })
      const prefix = line.type === 'add' ? '+ ' : line.type === 'remove' ? '- ' : '  '
      setTextContent(lineEl, prefix + line.content)
      this.aiDiffPreview.appendChild(lineEl)
    }
    this.aiDiffPreview.style.display = 'block'

    // Show Accept/Discard buttons
    const buttonGroup = this.aiPanel?.querySelector('.ai-button-group') as HTMLElement | null
    if (buttonGroup) {
      buttonGroup.style.display = 'flex'
    }
  }

  /**
   * Task 4.9: Accept generated script and insert into editor.
   */
  private acceptGeneratedScript(): void {
    if (!this.generatedCode) {
      return
    }

    // Insert into editor
    this.setScript(this.generatedCode)
    this.onScriptChange?.(this.generatedCode)

    // Close panel
    if (this.aiPanel) {
      this.aiPanel.style.display = 'none'
    }

    // Clear result
    this.resetAIPanel()
  }

  /**
   * Task 6.3: Discard generated script and close panel.
   */
  private discardGeneratedScript(): void {
    if (this.aiPanel) {
      this.aiPanel.style.display = 'none'
    }

    this.resetAIPanel()
  }

  /**
   * Reset AI panel to initial state.
   */
  private resetAIPanel(): void {
    if (this.aiPromptInput) {
      this.aiPromptInput.value = ''
    }

    if (this.aiCodeBlock) {
      removeAllChildren(this.aiCodeBlock)
      this.aiCodeBlock.style.display = 'none'
    }

    if (this.aiDiffPreview) {
      removeAllChildren(this.aiDiffPreview)
      this.aiDiffPreview.style.display = 'none'
    }

    if (this.aiAcceptBtn) {
      ;(this.aiAcceptBtn as HTMLButtonElement).disabled = true
    }

    const buttonGroup = this.aiPanel?.querySelector('.ai-button-group') as HTMLElement | null
    if (buttonGroup) {
      buttonGroup.style.display = 'none'
    }

    this.generatedCode = ''
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
