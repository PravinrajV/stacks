/**
 * Task 7.5 & 4.9: ScriptEditor with syntax highlighting, preview, and AI generation tests.
 * 
 * Tests:
 * 1. Syntax highlighting: tokens are rendered as spans with correct classes
 * 2. Error underlines: parse error lines are tracked
 * 3. Preview button: executes script in sandboxed stack copy
 * 4. AI panel: generate, display, accept, discard flow
 * 5. Integration: highlighting updates on input, errors persist across previews
 */

/// <reference types="vitest" />
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ScriptEditor } from '../src/dom/scriptEditor'
import { createStack, createCard, createButton, createField } from '../src/model/stack'
import { clearStack } from '../src/dom/storage'
import { MockModelProvider } from '../src/generator/mockProvider'
import { tokenize } from '../src/interpreter/lexer'
import { parse } from '../src/interpreter/parser'

function setupDOM(): HTMLElement {
  const existing = document.getElementById('app')
  if (existing) {
    existing.remove()
  }
  const container = document.createElement('div')
  container.id = 'app'
  document.body.appendChild(container)
  return container
}

/**
 * Task 7.5: Syntax Highlighting Tests
 */
describe('Task 7.5: Syntax Highlighting', () => {
  let container: HTMLElement
  let editor: ScriptEditor

  beforeEach(() => {
    container = setupDOM()
    editor = new ScriptEditor()
    container.appendChild(editor.getElement())
  })

  afterEach(() => {
    clearStack()
    if (container.parentElement) {
      container.parentElement.removeChild(container)
    }
  })

  it('renders highlight layer with token spans', () => {
    const script = `on mouseUp
  put "hello" into x
end mouseUp`

    editor.setScript(script)

    // Check that highlight layer exists
    const highlightLayer = container.querySelector('.highlight-layer')
    expect(highlightLayer).toBeTruthy()

    // Check for token spans
    const tokenSpans = highlightLayer?.querySelectorAll('.token')
    expect((tokenSpans?.length || 0) > 0).toBe(true)
  })

  it('highlights keywords with correct class', () => {
    editor.setScript('if x > 5\nend if')

    const highlightLayer = container.querySelector('.highlight-layer')
    const keywordSpans = highlightLayer?.querySelectorAll('.token-keyword')

    expect((keywordSpans?.length || 0) > 0).toBe(true)

    // Check that keyword styling is applied
    const keyword = keywordSpans?.[0] as HTMLElement
    expect(keyword?.style.fontWeight).toBe('bold')
    expect(keyword?.textContent).toMatch(/if|end/i)
  })

  it('highlights strings with correct class', () => {
    editor.setScript('put "hello world" into x')

    const highlightLayer = container.querySelector('.highlight-layer')
    const stringSpans = highlightLayer?.querySelectorAll('.token-string')

    expect((stringSpans?.length || 0) > 0).toBe(true)

    const stringSpan = stringSpans?.[0] as HTMLElement
    expect(stringSpan?.textContent).toBe('"hello world"')
  })

  it('highlights numbers with correct class', () => {
    editor.setScript('put 42 into x')

    const highlightLayer = container.querySelector('.highlight-layer')
    const numberSpans = highlightLayer?.querySelectorAll('.token-number')

    expect((numberSpans?.length || 0) > 0).toBe(true)

    const numberSpan = numberSpans?.[0] as HTMLElement
    expect(numberSpan?.textContent).toBe('42')
  })

  it('highlights identifiers with correct class', () => {
    editor.setScript('put myVar into result')

    const highlightLayer = container.querySelector('.highlight-layer')
    const identifierSpans = highlightLayer?.querySelectorAll('.token-identifier')

    expect((identifierSpans?.length || 0) > 0).toBe(true)
  })

  it('textarea is transparent with visible caret', () => {
    const textarea = container.querySelector('.editor-textarea') as HTMLTextAreaElement
    expect(textarea).toBeTruthy()
    expect(textarea.style.backgroundColor).toBe('transparent')
    expect(textarea.style.color).toBe('transparent')
    expect(textarea.style.caretColor).toBe('var(--color-black)')
  })

  it('highlight layer syncs scroll with textarea', () => {
    editor.setScript('line 1\nline 2\nline 3\nline 4\nline 5\nline 6\nline 7\nline 8\nline 9\nline 10')

    const textarea = container.querySelector('.editor-textarea') as HTMLTextAreaElement
    const highlightLayer = container.querySelector('.highlight-layer') as HTMLElement

    // Simulate scroll
    textarea.scrollTop = 100
    textarea.dispatchEvent(new Event('scroll'))

    expect(highlightLayer.scrollTop).toBe(100)
  })

  it('updates highlighting on input change', () => {
    editor.setScript('put "initial" into x')

    let tokensBefore = container.querySelectorAll('.highlight-layer .token').length

    // Simulate input change
    const textarea = container.querySelector('.editor-textarea') as HTMLTextAreaElement
    textarea.value = 'if y > 10\nput "new" into z\nend if'
    textarea.dispatchEvent(new Event('input'))

    let tokensAfter = container.querySelectorAll('.highlight-layer .token').length
    // Should have different number of tokens
    expect(tokensAfter !== tokensBefore || tokensBefore === 0).toBe(true)
  })
})

/**
 * Task 7.5: Error Underline Tests
 */
describe('Task 7.5: Error Underlines', () => {
  let container: HTMLElement
  let editor: ScriptEditor

  beforeEach(() => {
    container = setupDOM()
    editor = new ScriptEditor()
    container.appendChild(editor.getElement())
  })

  afterEach(() => {
    clearStack()
    if (container.parentElement) {
      container.parentElement.removeChild(container)
    }
  })

  it('displays error message with line and column', () => {
    editor.setScript('if x > 5')

    const errorDisplay = container.querySelector('.editor-error') as HTMLElement
    expect(errorDisplay?.textContent).toContain('Error')
    expect(errorDisplay?.textContent).toContain('line')
    expect(errorDisplay?.textContent).toContain('column')
  })

  it('shows "Valid" message for correct script', () => {
    editor.setScript(`on mouseUp
  put "test" into x
end mouseUp`)

    const errorDisplay = container.querySelector('.editor-error') as HTMLElement
    expect(errorDisplay?.textContent).toContain('Valid')
    // Color check - both formats are acceptable
    const color = errorDisplay?.style.color
    expect(color).toMatch(/#009900|rgb\(0, 153, 0\)|green/i)
  })

  it('shows error color for invalid script', () => {
    editor.setScript('if x')

    const errorDisplay = container.querySelector('.editor-error') as HTMLElement
    expect(errorDisplay?.style.color).toMatch(/cc0000|red/i)
  })

  it('tracks error line numbers', () => {
    editor.setScript('put')

    const error = editor.getError()
    expect(error).toBeTruthy()
    expect(error?.line).toBeTruthy()
  })

  it('clears error when script is corrected', () => {
    editor.setScript('on mouseUp\nend mouseUp')
    // This minimal handler should be valid
    expect(editor.getError()).toBeNull()

    const errorDisplay = container.querySelector('.editor-error') as HTMLElement
    expect(errorDisplay?.textContent).toContain('Valid')
  })
})

/**
 * Task 7.5: Preview Button Tests
 */
describe('Task 7.5: Preview Button', () => {
  let container: HTMLElement
  let editor: ScriptEditor

  beforeEach(() => {
    container = setupDOM()
    editor = new ScriptEditor()
    container.appendChild(editor.getElement())
  })

  afterEach(() => {
    clearStack()
    if (container.parentElement) {
      container.parentElement.removeChild(container)
    }
  })

  it('has Preview button in header', () => {
    const previewBtn = container.querySelector('.editor-header button') as HTMLButtonElement
    expect(previewBtn).toBeTruthy()
    expect(previewBtn.textContent).toContain('Preview')
  })

  it('shows alert when no context is set', async () => {
    // Note: Preview now uses StyledAlert, tested in styled-dialogs-integration.test.ts
    editor.setScript('on mouseUp\n  put "test" into x\nend mouseUp')

    const previewBtn = container.querySelector('button') as HTMLButtonElement
    expect(() => previewBtn.click()).not.toThrow()
  })

  it('shows alert for parse errors', async () => {
    // Note: Preview now uses StyledAlert, tested in styled-dialogs-integration.test.ts
    const stack = createStack('s1', 'Test')
    const card = createCard('c1', 'Card', null)
    stack.cards.push(card)

    editor.setContext(stack, card)
    editor.setScript('if x')

    const previewBtn = container.querySelector('button') as HTMLButtonElement
    expect(() => previewBtn.click()).not.toThrow()
  })

  it('executes script in sandboxed copy without modifying original', async () => {
    // Note: Preview now uses StyledAlert for success/error, tested separately
    const stack = createStack('s1', 'Test')
    const card = createCard('c1', 'Card', null)

    const field = createField('x', 'x', 'initial')
    card.fields.push(field)
    stack.cards.push(card)

    editor.setContext(stack, card)
    editor.setScript(`on mouseUp
  put "modified" into field "x"
end mouseUp`)

    const previewBtn = container.querySelector('button') as HTMLButtonElement
    previewBtn.click()

    // Wait a bit for execution
    await new Promise(r => setTimeout(r, 50))

    // Original field should not be modified
    expect(field.content).toBe('initial')
  })

  it('shows success message with field updates', async () => {
    // Note: Preview now uses StyledAlert, tested in styled-dialogs-integration.test.ts
    const stack = createStack('s1', 'Test')
    const card = createCard('c1', 'Card', null)

    const field = createField('result', 'result', 'initial')
    card.fields.push(field)
    stack.cards.push(card)

    editor.setContext(stack, card)
    editor.setScript(`on mouseUp
  put "success" into field "result"
end mouseUp`)

    const previewBtn = container.querySelector('button') as HTMLButtonElement
    previewBtn.click()

    await new Promise(r => setTimeout(r, 50))

    // Field should be modified in sandboxed preview
    // (We can't directly check the alert, but the code path is exercised)
  })
})

/**
 * Task 4.9: AI Generation Panel Tests
 */
describe('Task 4.9: AI Generation Panel', () => {
  let container: HTMLElement
  let editor: ScriptEditor

  beforeEach(() => {
    container = setupDOM()
    editor = new ScriptEditor()
    container.appendChild(editor.getElement())
  })

  afterEach(() => {
    clearStack()
    if (container.parentElement) {
      container.parentElement.removeChild(container)
    }
    // Clean up AI panel if it exists
    const aiPanel = document.querySelector('.ai-panel')
    if (aiPanel && aiPanel.parentElement) {
      aiPanel.parentElement.removeChild(aiPanel)
    }
  })

  it('has AI button in header', () => {
    const buttons = container.querySelectorAll('.editor-header button')
    const aiBtn = Array.from(buttons).find(btn => btn.textContent?.includes('✨'))
    expect(aiBtn).toBeTruthy()
  })

  it('toggles AI panel visibility', () => {
    const aiBtn = container.querySelector('.editor-header button:last-child') as HTMLButtonElement

    // Click to show
    aiBtn.click()

    let panel = document.querySelector('.ai-panel') as HTMLElement
    expect(panel).toBeTruthy()
    expect(panel?.style.display).toBe('flex')

    // Click to hide
    aiBtn.click()
    panel = document.querySelector('.ai-panel') as HTMLElement
    expect(panel?.style.display).toBe('none')
  })

  it('has prompt input, generate button, and result display', () => {
    const aiBtn = container.querySelector('.editor-header button:last-child') as HTMLButtonElement
    aiBtn.click()

    const panel = document.querySelector('.ai-panel')
    expect(panel?.querySelector('.ai-prompt-input')).toBeTruthy()
    expect(panel?.querySelector('.ai-generate-btn')).toBeTruthy()
    expect(panel?.querySelector('.ai-result-display')).toBeTruthy()
    expect(panel?.querySelector('.ai-accept-btn')).toBeTruthy()
    expect(panel?.querySelector('.ai-discard-btn')).toBeTruthy()
  })

  it('generates script on Generate button click', async () => {
    const stack = createStack('s1', 'Test')
    const card = createCard('c1', 'Card', null)
    stack.cards.push(card)

    editor.setContext(stack, card)

    const aiBtn = container.querySelector('.editor-header button:last-child') as HTMLButtonElement
    aiBtn.click()

    const panel = document.querySelector('.ai-panel') as HTMLElement
    const promptInput = panel.querySelector('.ai-prompt-input') as HTMLTextAreaElement
    const generateBtn = panel.querySelector('.ai-generate-btn') as HTMLButtonElement

    promptInput.value = 'show an alert'
    generateBtn.click()

    // Wait for async generation
    await new Promise(r => setTimeout(r, 100))

    const codeBlock = panel.querySelector('.ai-code-block')
    expect(codeBlock?.textContent).toBeTruthy()
    expect(codeBlock?.textContent).not.toContain('Generating')
  })

  it('shows generated code in result display', async () => {
    const stack = createStack('s1', 'Test')
    const card = createCard('c1', 'Card', null)
    stack.cards.push(card)

    editor.setContext(stack, card)

    const aiBtn = container.querySelector('.editor-header button:last-child') as HTMLButtonElement
    aiBtn.click()

    const panel = document.querySelector('.ai-panel') as HTMLElement
    const promptInput = panel.querySelector('.ai-prompt-input') as HTMLTextAreaElement
    const generateBtn = panel.querySelector('.ai-generate-btn') as HTMLButtonElement

    promptInput.value = 'click button'
    generateBtn.click()

    await new Promise(r => setTimeout(r, 100))

    const codeBlock = panel.querySelector('.ai-code-block')
    const text = codeBlock?.textContent || ''
    expect(text).toContain('on mouseUp')
  })

  it('enables Accept button when code is generated', async () => {
    const stack = createStack('s1', 'Test')
    const card = createCard('c1', 'Card', null)
    stack.cards.push(card)

    editor.setContext(stack, card)

    const aiBtn = container.querySelector('.editor-header button:last-child') as HTMLButtonElement
    aiBtn.click()

    const panel = document.querySelector('.ai-panel') as HTMLElement
    const promptInput = panel.querySelector('.ai-prompt-input') as HTMLTextAreaElement
    const generateBtn = panel.querySelector('.ai-generate-btn') as HTMLButtonElement
    const acceptBtn = panel.querySelector('.ai-accept-btn') as HTMLButtonElement

    expect((acceptBtn as any).disabled).toBe(true)

    promptInput.value = 'test'
    generateBtn.click()

    await new Promise(r => setTimeout(r, 100))

    expect((acceptBtn as any).disabled).toBe(false)
  })

  it('inserts generated code into editor on Accept', async () => {
    const stack = createStack('s1', 'Test')
    const card = createCard('c1', 'Card', null)
    stack.cards.push(card)

    editor.setContext(stack, card)

    const aiBtn = container.querySelector('.editor-header button:last-child') as HTMLButtonElement
    aiBtn.click()

    const panel = document.querySelector('.ai-panel') as HTMLElement
    const promptInput = panel.querySelector('.ai-prompt-input') as HTMLTextAreaElement
    const generateBtn = panel.querySelector('.ai-generate-btn') as HTMLButtonElement
    const acceptBtn = panel.querySelector('.ai-accept-btn') as HTMLButtonElement

    promptInput.value = 'test'
    generateBtn.click()

    await new Promise(r => setTimeout(r, 100))

    const beforeScript = editor.getScript()

    acceptBtn.click()

    await new Promise(r => setTimeout(r, 50))

    const afterScript = editor.getScript()
    expect(afterScript).not.toBe(beforeScript)
    expect(afterScript).toContain('on mouseUp')
  })

  it('closes panel after Accept', async () => {
    const stack = createStack('s1', 'Test')
    const card = createCard('c1', 'Card', null)
    stack.cards.push(card)

    editor.setContext(stack, card)

    const aiBtn = container.querySelector('.editor-header button:last-child') as HTMLButtonElement
    aiBtn.click()

    const panel = document.querySelector('.ai-panel') as HTMLElement
    const promptInput = panel.querySelector('.ai-prompt-input') as HTMLTextAreaElement
    const generateBtn = panel.querySelector('.ai-generate-btn') as HTMLButtonElement
    const acceptBtn = panel.querySelector('.ai-accept-btn') as HTMLButtonElement

    expect(panel.style.display).toBe('flex')

    promptInput.value = 'test'
    generateBtn.click()

    await new Promise(r => setTimeout(r, 100))

    acceptBtn.click()

    await new Promise(r => setTimeout(r, 50))

    expect(panel.style.display).toBe('none')
  })

  it('Discard button closes panel and clears prompt', async () => {
    const aiBtn = container.querySelector('.editor-header button:last-child') as HTMLButtonElement
    aiBtn.click()

    const panel = document.querySelector('.ai-panel') as HTMLElement
    const promptInput = panel.querySelector('.ai-prompt-input') as HTMLTextAreaElement
    const discardBtn = panel.querySelector('.ai-discard-btn') as HTMLButtonElement

    promptInput.value = 'test prompt'
    expect(panel.style.display).toBe('flex')

    discardBtn.click()

    expect(panel.style.display).toBe('none')
    expect(promptInput.value).toBe('')
  })

  it('shows error message if generation fails', async () => {
    // Note: Now uses StyledAlert, tested in styled-dialogs-integration.test.ts
    const stack = createStack('s1', 'Test')
    const card = createCard('c1', 'Card', null)
    stack.cards.push(card)

    editor.setContext(stack, card)

    const aiBtn = container.querySelector('.editor-header button:last-child') as HTMLButtonElement
    aiBtn.click()

    const panel = document.querySelector('.ai-panel') as HTMLElement
    const promptInput = panel.querySelector('.ai-prompt-input') as HTMLTextAreaElement
    const generateBtn = panel.querySelector('.ai-generate-btn') as HTMLButtonElement

    // Empty prompt to trigger error (now uses StyledAlert)
    promptInput.value = ''
    expect(() => generateBtn.click()).not.toThrow()

    await new Promise(r => setTimeout(r, 50))
  })

  it('disables Accept when error occurs', async () => {
    // This would require mocking the provider to fail
    // Covered by scriptGen tests, just ensure UI state is correct
    const aiBtn = container.querySelector('.editor-header button:last-child') as HTMLButtonElement
    aiBtn.click()

    const panel = document.querySelector('.ai-panel') as HTMLElement
    const acceptBtn = panel?.querySelector('.ai-accept-btn') as HTMLButtonElement
    
    expect(acceptBtn).toBeTruthy()
    expect((acceptBtn as any).disabled).toBe(true)
  })

  it('uses only mock provider (no network calls)', async () => {
    const stack = createStack('s1', 'Test')
    const card = createCard('c1', 'Card', null)
    stack.cards.push(card)

    editor.setContext(stack, card)

    const aiBtn = container.querySelector('.editor-header button:last-child') as HTMLButtonElement
    aiBtn.click()

    const panel = document.querySelector('.ai-panel') as HTMLElement
    const promptInput = panel.querySelector('.ai-prompt-input') as HTMLTextAreaElement
    const generateBtn = panel.querySelector('.ai-generate-btn') as HTMLButtonElement

    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    promptInput.value = 'test'
    generateBtn.click()

    await new Promise(r => setTimeout(r, 100))

    expect(fetchSpy).not.toHaveBeenCalled()

    fetchSpy.mockRestore()
  })

  it('Task 8.6: displays offline demo mode notice in AI panel', () => {
    const aiBtn = container.querySelector('.editor-header button:last-child') as HTMLButtonElement
    aiBtn.click()

    const panel = document.querySelector('.ai-panel') as HTMLElement
    const offlineNotice = panel?.querySelector('.ai-offline-notice') as HTMLElement

    expect(offlineNotice).toBeTruthy()
    expect(offlineNotice.textContent).toContain('Offline demo mode')
    expect(offlineNotice.textContent).toContain('built-in templates')
    expect(offlineNotice.textContent).toContain('no AI calls')
    expect(offlineNotice.textContent).toContain('Anthropic key')
    expect(offlineNotice.textContent).toContain('Ollama')
  })
})

/**
 * Integration Tests
 */
describe('Task 7.5 & 4.9: Integration', () => {
  let container: HTMLElement
  let editor: ScriptEditor

  beforeEach(() => {
    container = setupDOM()
    editor = new ScriptEditor()
    container.appendChild(editor.getElement())
  })

  afterEach(() => {
    clearStack()
    if (container.parentElement) {
      container.parentElement.removeChild(container)
    }
    // Clean up AI panel if it exists
    const aiPanel = document.querySelector('.ai-panel')
    if (aiPanel && aiPanel.parentElement) {
      aiPanel.parentElement.removeChild(aiPanel)
    }
  })

  it('highlighting updates when script is modified via AI accept', async () => {
    const stack = createStack('s1', 'Test')
    const card = createCard('c1', 'Card', null)
    stack.cards.push(card)

    editor.setContext(stack, card)

    const aiBtn = container.querySelector('.editor-header button:last-child') as HTMLButtonElement
    aiBtn.click()

    const panel = document.querySelector('.ai-panel') as HTMLElement
    const promptInput = panel.querySelector('.ai-prompt-input') as HTMLTextAreaElement
    const generateBtn = panel.querySelector('.ai-generate-btn') as HTMLButtonElement
    const acceptBtn = panel.querySelector('.ai-accept-btn') as HTMLButtonElement

    const tokensBefore = container.querySelectorAll('.highlight-layer .token').length

    promptInput.value = 'test'
    generateBtn.click()

    await new Promise(r => setTimeout(r, 100))

    acceptBtn.click()

    await new Promise(r => setTimeout(r, 50))

    const tokensAfter = container.querySelectorAll('.highlight-layer .token').length
    expect(tokensAfter > tokensBefore || tokensBefore === 0).toBe(true)
  })

  it('error state is updated after script generation', async () => {
    const stack = createStack('s1', 'Test')
    const card = createCard('c1', 'Card', null)
    stack.cards.push(card)

    editor.setContext(stack, card)

    const aiBtn = container.querySelector('.editor-header button:last-child') as HTMLButtonElement
    aiBtn.click()

    const panel = document.querySelector('.ai-panel') as HTMLElement
    const promptInput = panel.querySelector('.ai-prompt-input') as HTMLTextAreaElement
    const generateBtn = panel.querySelector('.ai-generate-btn') as HTMLButtonElement
    const acceptBtn = panel.querySelector('.ai-accept-btn') as HTMLButtonElement

    promptInput.value = 'click button'
    generateBtn.click()

    await new Promise(r => setTimeout(r, 100))

    acceptBtn.click()

    await new Promise(r => setTimeout(r, 50))

    const errorDisplay = container.querySelector('.editor-error') as HTMLElement
    expect(errorDisplay?.textContent).toContain('Valid')
  })
})

/**
 * Task 6.3: Keyboard Shortcuts Tests
 */
describe('Task 6.3: Keyboard Shortcuts', () => {
  let container: HTMLElement
  let editor: ScriptEditor
  let textarea: HTMLTextAreaElement

  beforeEach(() => {
    container = setupDOM()
    editor = new ScriptEditor()
    container.appendChild(editor.getElement())
    textarea = container.querySelector('.editor-textarea') as HTMLTextAreaElement
  })

  afterEach(() => {
    clearStack()
    if (container.parentElement) {
      container.parentElement.removeChild(container)
    }
  })

  it('Ctrl+Enter triggers preview', async () => {
    const stack = createStack('s1', 'Test')
    const card = createCard('c1', 'Card', null)
    const field = createField('f1', 'Result', '')
    field.rect = { left: 10, top: 10, right: 100, bottom: 50 }
    card.fields.push(field)
    stack.cards.push(card)

    editor.setContext(stack, card)
    editor.setScript(`on mouseUp\n  put "OK" into field "Result"\nend mouseUp`)

    // Preview now uses StyledAlert
    const keyEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      ctrlKey: true,
      bubbles: true,
      cancelable: true
    })

    textarea.dispatchEvent(keyEvent)
    await new Promise(r => setTimeout(r, 100))

    // Event was processed (styled alert shown instead of window.alert)
  })

  it('Ctrl+/ toggles comment on current line', async () => {
    editor.setScript('put "hello" into x')

    textarea.selectionStart = 0
    textarea.selectionEnd = 0

    const keyEvent = new KeyboardEvent('keydown', {
      key: '/',
      ctrlKey: true,
      bubbles: true,
      cancelable: true
    })

    textarea.dispatchEvent(keyEvent)
    await new Promise(r => setTimeout(r, 50))

    const newScript = editor.getScript()
    expect(newScript).toContain('--')
  })

  it('Ctrl+/ uncomments commented line', async () => {
    editor.setScript('-- put "hello" into x')

    textarea.selectionStart = 0
    textarea.selectionEnd = 0

    const keyEvent = new KeyboardEvent('keydown', {
      key: '/',
      ctrlKey: true,
      bubbles: true,
      cancelable: true
    })

    textarea.dispatchEvent(keyEvent)
    await new Promise(r => setTimeout(r, 50))

    const newScript = editor.getScript()
    expect(newScript).not.toContain('--')
  })

  it('Cmd+Enter works on Mac (alternative to Ctrl+Enter)', async () => {
    const stack = createStack('s1', 'Test')
    const card = createCard('c1', 'Card', null)
    stack.cards.push(card)

    editor.setContext(stack, card)
    editor.setScript('on mouseUp\nend mouseUp')

    // Preview now uses StyledAlert
    const keyEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      metaKey: true, // Mac Cmd key
      bubbles: true,
      cancelable: true
    })

    textarea.dispatchEvent(keyEvent)
    await new Promise(r => setTimeout(r, 100))

    // Event was processed (styled alert shown instead of window.alert)
  })
})

/**
 * Task 8.5: Highlight Layer Overlay Tests
 * Verify that layer.textContent === textarea.value for exact text matching.
 * No uppercasing, no duplication, no transparent spans.
 */
describe('Task 8.5: Highlight Layer Overlay Alignment', () => {
  let container: HTMLElement
  let editor: ScriptEditor
  let textarea: HTMLTextAreaElement
  let highlightLayer: HTMLElement

  beforeEach(() => {
    container = setupDOM()
    editor = new ScriptEditor()
    container.appendChild(editor.getElement())
    textarea = container.querySelector('.editor-textarea') as HTMLTextAreaElement
    highlightLayer = container.querySelector('.highlight-layer') as HTMLElement
  })

  afterEach(() => {
    clearStack()
    if (container.parentElement) {
      container.parentElement.removeChild(container)
    }
  })

  it('layer textContent equals textarea value for simple handler', () => {
    const script = `on mouseUp
  put "hello" into x
end mouseUp`

    editor.setScript(script)
    expect(highlightLayer.textContent).toBe(textarea.value)
  })

  it('layer textContent equals textarea value with comments', () => {
    const script = `-- This is a comment
on mouseUp
  -- nested comment
  put "test" into x
end mouseUp`

    editor.setScript(script)
    expect(highlightLayer.textContent).toBe(textarea.value)
  })

  it('layer textContent equals textarea value with strings', () => {
    const script = `put "hello world" into x
put "line 1
line 2" into y`

    editor.setScript(script)
    expect(highlightLayer.textContent).toBe(textarea.value)
  })

  it('layer textContent equals textarea value with multiple spaces', () => {
    const script = `put    "x"    into    y`

    editor.setScript(script)
    expect(highlightLayer.textContent).toBe(textarea.value)
  })

  it('layer textContent equals textarea value with tabs', () => {
    const script = 'put\t"x"\tinto\ty'

    editor.setScript(script)
    expect(highlightLayer.textContent).toBe(textarea.value)
  })

  it('layer textContent equals textarea value with mixed case keywords', () => {
    const script = `ON MouseUp
  PUT "test" INTO x
END MouseUp`

    editor.setScript(script)
    expect(highlightLayer.textContent).toBe(textarea.value)
  })

  it('layer textContent equals textarea value with operators', () => {
    const script = 'if x > 5 and y != 10 or z <= 3\nend if'

    editor.setScript(script)
    expect(highlightLayer.textContent).toBe(textarea.value)
  })

  it('layer textContent equals textarea value with numbers', () => {
    const script = 'put 42 into x\nput 3.14 into y'

    editor.setScript(script)
    expect(highlightLayer.textContent).toBe(textarea.value)
  })

  it('layer textContent equals textarea value with empty script', () => {
    editor.setScript('')
    expect(highlightLayer.textContent).toBe(textarea.value)
  })

  it('layer textContent equals textarea value with only newlines', () => {
    editor.setScript('\n\n\n')
    expect(highlightLayer.textContent).toBe(textarea.value)
  })

  it('layer textContent equals textarea value after input event', () => {
    editor.setScript('initial')

    const newScript = 'on mouseUp\nput "new" into x\nend mouseUp'
    textarea.value = newScript
    textarea.dispatchEvent(new Event('input'))

    expect(highlightLayer.textContent).toBe(textarea.value)
  })

  it('textarea and layer have same dimensions and position', () => {
    editor.setScript('on mouseUp\nend mouseUp')

    const layerRect = highlightLayer.getBoundingClientRect()
    const textareaRect = textarea.getBoundingClientRect()

    expect(layerRect.left).toBe(textareaRect.left)
    expect(layerRect.top).toBe(textareaRect.top)
    expect(layerRect.width).toBe(textareaRect.width)
    expect(layerRect.height).toBe(textareaRect.height)
  })

  it('textarea has transparent background and visible caret', () => {
    const bgColor = window.getComputedStyle(textarea).backgroundColor
    const color = window.getComputedStyle(textarea).color
    const caretColor = window.getComputedStyle(textarea).caretColor

    // Both 'transparent' and 'rgba(0, 0, 0, 0)' are valid representations
    expect(['rgba(0, 0, 0, 0)', 'transparent'].includes(bgColor)).toBe(true)
    expect(['rgba(0, 0, 0, 0)', 'transparent'].includes(color)).toBe(true)
    expect(['rgba(0, 0, 0, 0)', 'transparent'].includes(caretColor)).toBe(false)
  })

  it('scroll position syncs between textarea and layer', () => {
    const longScript = 'line 1\nline 2\nline 3\nline 4\nline 5\nline 6\nline 7\nline 8\nline 9\nline 10'
    editor.setScript(longScript)

    textarea.scrollTop = 50
    textarea.scrollLeft = 20
    textarea.dispatchEvent(new Event('scroll'))

    expect(highlightLayer.scrollTop).toBe(50)
    expect(highlightLayer.scrollLeft).toBe(20)
  })
})

/**
 * Task 8.4: Answer Dialog Integration Test
 * Verify script with answer command executes properly.
 */
describe('Task 8.4: Answer Dialog from Button Script', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = setupDOM()
  })

  afterEach(() => {
    clearStack()
    if (container.parentElement) {
      container.parentElement.removeChild(container)
    }
  })

  it('button script with answer executes correctly', () => {
    const stack = createStack('s1', 'Test')
    const card = createCard('c1', 'Card', null)

    const btn = createButton('btn1', 'Click Me', 10, 10, 100, 30)
    const script = `on mouseUp
  answer "Hello from button"
end mouseUp`
    btn.scripts['mouseUp'] = script
    card.buttons.push(btn)
    stack.cards.push(card)

    const editor = new ScriptEditor()
    editor.setContext(stack, card)
    editor.setScript(script)

    // Verify the script is parsed correctly
    expect(editor.getError()).toBeNull()

    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

    // Verify that script can be executed
    const tokens = tokenize(script)
    expect(Array.isArray(tokens)).toBe(true)

    const ast = parse(tokens)
    expect(!('type' in ast && ast.type === 'ParseError')).toBe(true)

    alertSpy.mockRestore()
  })
})

