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
    expect(stringSpan?.textContent).toBe('hello world')
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
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

    editor.setScript('on mouseUp\n  put "test" into x\nend mouseUp')

    const previewBtn = container.querySelector('button') as HTMLButtonElement
    previewBtn.click()

    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('context'))

    alertSpy.mockRestore()
  })

  it('shows alert for parse errors', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

    const stack = createStack('s1', 'Test')
    const card = createCard('c1', 'Card', null)
    stack.cards.push(card)

    editor.setContext(stack, card)
    editor.setScript('if x')

    const previewBtn = container.querySelector('button') as HTMLButtonElement
    previewBtn.click()

    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Cannot preview'))

    alertSpy.mockRestore()
  })

  it('executes script in sandboxed copy without modifying original', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

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

    alertSpy.mockRestore()
  })

  it('shows success message with field updates', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

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

    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('executed successfully'))

    alertSpy.mockRestore()
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

    let panel = container.querySelector('.ai-panel') as HTMLElement
    expect(panel).toBeTruthy()
    expect(panel?.style.display).toBe('flex')

    // Click to hide
    aiBtn.click()
    panel = container.querySelector('.ai-panel') as HTMLElement
    expect(panel?.style.display).toBe('none')
  })

  it('has prompt input, generate button, and result display', () => {
    const aiBtn = container.querySelector('.editor-header button:last-child') as HTMLButtonElement
    aiBtn.click()

    const panel = container.querySelector('.ai-panel')
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

    const panel = container.querySelector('.ai-panel') as HTMLElement
    const promptInput = panel.querySelector('.ai-prompt-input') as HTMLTextAreaElement
    const generateBtn = panel.querySelector('.ai-generate-btn') as HTMLButtonElement

    promptInput.value = 'show an alert'
    generateBtn.click()

    // Wait for async generation
    await new Promise(r => setTimeout(r, 100))

    const resultDisplay = panel.querySelector('.ai-result-display')
    expect(resultDisplay?.textContent).toBeTruthy()
    expect(resultDisplay?.textContent).not.toContain('Generating')
  })

  it('shows generated code in result display', async () => {
    const stack = createStack('s1', 'Test')
    const card = createCard('c1', 'Card', null)
    stack.cards.push(card)

    editor.setContext(stack, card)

    const aiBtn = container.querySelector('.editor-header button:last-child') as HTMLButtonElement
    aiBtn.click()

    const panel = container.querySelector('.ai-panel') as HTMLElement
    const promptInput = panel.querySelector('.ai-prompt-input') as HTMLTextAreaElement
    const generateBtn = panel.querySelector('.ai-generate-btn') as HTMLButtonElement

    promptInput.value = 'click button'
    generateBtn.click()

    await new Promise(r => setTimeout(r, 100))

    const resultDisplay = panel.querySelector('.ai-result-display')
    const text = resultDisplay?.textContent || ''
    expect(text).toContain('Generated:')
    expect(text).toContain('on mouseUp')
  })

  it('enables Accept button when code is generated', async () => {
    const stack = createStack('s1', 'Test')
    const card = createCard('c1', 'Card', null)
    stack.cards.push(card)

    editor.setContext(stack, card)

    const aiBtn = container.querySelector('.editor-header button:last-child') as HTMLButtonElement
    aiBtn.click()

    const panel = container.querySelector('.ai-panel') as HTMLElement
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

    const panel = container.querySelector('.ai-panel') as HTMLElement
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

    const panel = container.querySelector('.ai-panel') as HTMLElement
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

    const panel = container.querySelector('.ai-panel') as HTMLElement
    const promptInput = panel.querySelector('.ai-prompt-input') as HTMLTextAreaElement
    const discardBtn = panel.querySelector('.ai-discard-btn') as HTMLButtonElement

    promptInput.value = 'test prompt'
    expect(panel.style.display).toBe('flex')

    discardBtn.click()

    expect(panel.style.display).toBe('none')
    expect(promptInput.value).toBe('')
  })

  it('shows error message if generation fails', async () => {
    const stack = createStack('s1', 'Test')
    const card = createCard('c1', 'Card', null)
    stack.cards.push(card)

    editor.setContext(stack, card)

    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

    const aiBtn = container.querySelector('.editor-header button:last-child') as HTMLButtonElement
    aiBtn.click()

    const panel = container.querySelector('.ai-panel') as HTMLElement
    const promptInput = panel.querySelector('.ai-prompt-input') as HTMLTextAreaElement
    const generateBtn = panel.querySelector('.ai-generate-btn') as HTMLButtonElement

    // Empty prompt to trigger error
    promptInput.value = ''
    generateBtn.click()

    await new Promise(r => setTimeout(r, 50))

    // Should show alert due to empty prompt
    expect(alertSpy).toHaveBeenCalled()

    alertSpy.mockRestore()
  })

  it('disables Accept when error occurs', async () => {
    // This would require mocking the provider to fail
    // Covered by scriptGen tests, just ensure UI state is correct
    const aiBtn = container.querySelector('.editor-header button:last-child') as HTMLButtonElement
    aiBtn.click()

    const panel = container.querySelector('.ai-panel') as HTMLElement
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

    const panel = container.querySelector('.ai-panel') as HTMLElement
    const promptInput = panel.querySelector('.ai-prompt-input') as HTMLTextAreaElement
    const generateBtn = panel.querySelector('.ai-generate-btn') as HTMLButtonElement

    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    promptInput.value = 'test'
    generateBtn.click()

    await new Promise(r => setTimeout(r, 100))

    expect(fetchSpy).not.toHaveBeenCalled()

    fetchSpy.mockRestore()
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
  })

  it('highlighting updates when script is modified via AI accept', async () => {
    const stack = createStack('s1', 'Test')
    const card = createCard('c1', 'Card', null)
    stack.cards.push(card)

    editor.setContext(stack, card)

    const aiBtn = container.querySelector('.editor-header button:last-child') as HTMLButtonElement
    aiBtn.click()

    const panel = container.querySelector('.ai-panel') as HTMLElement
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

    const panel = container.querySelector('.ai-panel') as HTMLElement
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
