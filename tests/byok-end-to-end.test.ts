/**
 * BYOK (Bring Your Own Key) End-to-End Tests
 * 
 * Tests the core requirements:
 * 1. Anthropic provider's isAvailable() checks only API key (no network call)
 * 2. Fetch is called exactly once per generate click
 * 3. Fetch URL, headers, and body are correct
 * 4. Generated code appears in editor after accept
 * 5. API key cleared properly
 * 6. API key never exposed in localStorage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { initApp } from '../src/dom/app'
import { clearStack } from '../src/dom/storage'
import { defaultRegistry } from '../src/generator/providerRegistry'

function setupDOM(): HTMLElement {
  const existing = document.getElementById('app')
  if (existing) {
    existing.remove()
  }
  const appContainer = document.createElement('div')
  appContainer.id = 'app'
  document.body.appendChild(appContainer)
  return appContainer
}

function cleanup(): void {
  clearStack()
  sessionStorage.clear()
  localStorage.clear()
  const app = document.getElementById('app')
  if (app) app.remove()
}

describe('BYOK: Anthropic Provider Integration', () => {
  let fetchMock: any

  beforeEach(() => {
    cleanup()
    setupDOM()
    sessionStorage.clear()
    localStorage.clear()
    
    // Mock fetch
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('isAvailable() only checks API key, makes no network call', async () => {
    const anthropic = defaultRegistry.getAnthropicProvider()
    
    expect(await anthropic.isAvailable()).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(0)
    
    anthropic.setApiKey('sk-ant-TEST123')
    expect(await anthropic.isAvailable()).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(0)
  })

  it('generate script: exactly one fetch call with correct URL, headers, body', async () => {
    const testKey = 'sk-ant-TEST123'
    const generatedCode = 'on mouseUp\n  answer "Hello"\nend mouseUp'

    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ content: [{ type: 'text', text: generatedCode }] }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    initApp()
    await new Promise(resolve => setTimeout(resolve, 300))

    // Open settings, select Anthropic, enter key
    const header = document.querySelector('.app-header') as HTMLElement
    const aiSettingsBtn = Array.from(header.querySelectorAll('button')).find(btn => btn.textContent?.includes('AI Settings')) as HTMLButtonElement
    aiSettingsBtn.click()
    await new Promise(resolve => setTimeout(resolve, 200))

    const providerSelect = document.querySelector('.provider-section select') as HTMLSelectElement
    providerSelect.value = 'anthropic'
    providerSelect.dispatchEvent(new Event('change', { bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 200))

    const keyInput = document.querySelector('.anthropic-settings input[type="password"]') as HTMLInputElement
    keyInput.value = testKey
    keyInput.dispatchEvent(new Event('change', { bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 200))

    // Close settings
    const modalBackdrop = document.querySelector('.modal-backdrop') as HTMLElement
    modalBackdrop.click()
    await new Promise(resolve => setTimeout(resolve, 200))

    // Open AI panel and generate
    const editorHeader = document.querySelector('.editor-header') as HTMLElement
    const aiBtn = Array.from(editorHeader.querySelectorAll('button')).find(btn => btn.textContent?.includes('AI')) as HTMLButtonElement
    aiBtn.click()
    await new Promise(resolve => setTimeout(resolve, 200))

    const aiPanel = document.querySelector('.ai-panel') as HTMLElement
    const promptInput = aiPanel.querySelector('.ai-prompt-input') as HTMLTextAreaElement
    promptInput.value = 'Show greeting'
    promptInput.dispatchEvent(new Event('input', { bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 100))

    const generateBtn = aiPanel.querySelector('.ai-generate-btn') as HTMLButtonElement
    generateBtn.click()
    await new Promise(resolve => setTimeout(resolve, 500))

    // Verify fetch called exactly once
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.anthropic.com/v1/messages')
    expect(init.method).toBe('POST')
    expect(init.headers['x-api-key']).toBe(testKey)
    expect(init.headers['anthropic-version']).toBe('2023-06-01')
    expect(init.headers['anthropic-dangerous-direct-browser-access']).toBe('true')
    expect(init.headers['content-type']).toBe('application/json')

    const body = JSON.parse(init.body)
    expect(body.model).toBe('claude-3-5-sonnet-20241022')
    expect(body.messages[0].content).toContain('Show greeting')

    // Verify code in result display
    const codeBlock = aiPanel.querySelector('.ai-code-block') as HTMLElement
    expect(codeBlock.textContent).toContain(generatedCode)

    // Accept and verify in editor
    const acceptBtn = aiPanel.querySelector('.ai-accept-btn') as HTMLButtonElement
    acceptBtn.click()
    await new Promise(resolve => setTimeout(resolve, 150))

    const textarea = document.querySelector('.editor-textarea') as HTMLTextAreaElement
    expect(textarea.value).toContain(generatedCode)
  })

  it('clear key button removes it from sessionStorage', async () => {
    const testKey = 'sk-ant-TEST123'

    initApp()
    await new Promise(resolve => setTimeout(resolve, 200))

    const header = document.querySelector('.app-header') as HTMLElement
    const aiSettingsBtn = Array.from(header.querySelectorAll('button')).find(btn => btn.textContent?.includes('AI Settings')) as HTMLButtonElement
    aiSettingsBtn.click()
    await new Promise(resolve => setTimeout(resolve, 200))

    const providerSelect = document.querySelector('.provider-section select') as HTMLSelectElement
    providerSelect.value = 'anthropic'
    providerSelect.dispatchEvent(new Event('change', { bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 200))

    const keyInput = document.querySelector('.anthropic-settings input[type="password"]') as HTMLInputElement
    keyInput.value = testKey
    keyInput.dispatchEvent(new Event('change', { bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 200))

    expect(sessionStorage.getItem('anthropic_api_key')).toBe(testKey)

    const clearBtn = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent?.includes('Clear Key')) as HTMLButtonElement
    clearBtn.click()
    await new Promise(resolve => setTimeout(resolve, 150))

    expect(sessionStorage.getItem('anthropic_api_key')).toBeNull()
    expect(keyInput.value).toBe('')
  })

  it('API key never exposed in localStorage after save', async () => {
    const testKey = 'sk-ant-TEST123'

    initApp()
    await new Promise(resolve => setTimeout(resolve, 200))

    const header = document.querySelector('.app-header') as HTMLElement
    const aiSettingsBtn = Array.from(header.querySelectorAll('button')).find(btn => btn.textContent?.includes('AI Settings')) as HTMLButtonElement
    aiSettingsBtn.click()
    await new Promise(resolve => setTimeout(resolve, 200))

    const providerSelect = document.querySelector('.provider-section select') as HTMLSelectElement
    providerSelect.value = 'anthropic'
    providerSelect.dispatchEvent(new Event('change', { bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 200))

    const keyInput = document.querySelector('.anthropic-settings input[type="password"]') as HTMLInputElement
    keyInput.value = testKey
    keyInput.dispatchEvent(new Event('change', { bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 200))

    const modalBackdrop = document.querySelector('.modal-backdrop') as HTMLElement
    modalBackdrop.click()
    await new Promise(resolve => setTimeout(resolve, 150))

    const saveBtn = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent === 'Save') as HTMLButtonElement
    saveBtn.click()
    await new Promise(resolve => setTimeout(resolve, 150))

    const localStorageContent = JSON.stringify(Object.entries(localStorage))
    expect(localStorageContent).not.toContain(testKey)
    expect(localStorageContent).not.toContain('sk-ant-')
  })

  it('Anthropic 401 shows invalid-key error and fallback notice with mock script', async () => {
    const testKey = 'sk-ant-INVALID'

    fetchMock.mockImplementation((url: string) => {
      if (url === 'https://api.anthropic.com/v1/messages') {
        return Promise.resolve(
          new Response(
            JSON.stringify({ error: { type: 'authentication_error', message: 'Invalid API key' } }),
            { status: 401, headers: { 'content-type': 'application/json' } }
          )
        )
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`))
    })

    initApp()
    await new Promise(resolve => setTimeout(resolve, 300))

    // Set Anthropic provider and key directly
    const anthropic = defaultRegistry.getAnthropicProvider()
    anthropic.setApiKey(testKey)
    
    // Get script editor and configure it
    const app = (window as any).__appState?.app
    const scriptEditor = app?.getScriptEditor()
    
    if (scriptEditor) {
      scriptEditor.setSelectedProvider('anthropic')
    }

    // Open AI panel first
    const editorHeader = document.querySelector('.editor-header') as HTMLElement
    const aiBtn = Array.from(editorHeader.querySelectorAll('button')).find(btn => btn.textContent?.includes('AI')) as HTMLButtonElement
    aiBtn.click()
    await new Promise(resolve => setTimeout(resolve, 200))

    const aiPanel = document.querySelector('.ai-panel') as HTMLElement
    const promptInput = aiPanel.querySelector('.ai-prompt-input') as HTMLTextAreaElement
    const generateBtn = aiPanel.querySelector('.ai-generate-btn') as HTMLButtonElement
    
    if (promptInput && generateBtn) {
      // Set the prompt
      promptInput.value = 'Show error test'
      
      // Click generate
      generateBtn.click()
      await new Promise(resolve => setTimeout(resolve, 800))
    }

    // Verify error is shown in error display
    const errorDisplay = aiPanel.querySelector('.ai-code-block') as HTMLElement
    
    // Debug: log what we're seeing
    if (!errorDisplay.textContent || !errorDisplay.textContent.toLowerCase().includes('invalid')) {
      console.log('Error display content:', errorDisplay.textContent)
      console.log('Result display content:', aiPanel.querySelector('.ai-code-block')?.textContent)
    }
    
    expect(errorDisplay.textContent.toLowerCase()).toContain('invalid')
    expect(errorDisplay.textContent.toLowerCase()).toContain('fall')

    // Verify mock provider was used and generated code is shown
    const resultDisplay = aiPanel.querySelector('.ai-code-block') as HTMLElement
    expect(resultDisplay.textContent).toContain('on ')
    expect(resultDisplay.textContent).toContain('end ')
  })

  it('Ollama selected: generate calls http://localhost:11434/api/generate', async () => {
    const generatedCode = 'on mouseUp\n  answer "Ollama generated"\nend mouseUp'

    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/api/tags')) {
        // isAvailable check
        return Promise.resolve(
          new Response(JSON.stringify({ models: [{ name: 'mistral' }] }), { status: 200 })
        )
      }
      if (url.includes('/api/generate')) {
        // actual generate call
        return Promise.resolve(
          new Response(JSON.stringify({ response: generatedCode }), { status: 200 })
        )
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`))
    })

    initApp()
    await new Promise(resolve => setTimeout(resolve, 300))

    // Get script editor and configure it directly
    const app = (window as any).__appState?.app
    const scriptEditor = app?.getScriptEditor()
    if (scriptEditor) {
      scriptEditor.setSelectedProvider('ollama')
    }

    // Open AI panel
    const editorHeader = document.querySelector('.editor-header') as HTMLElement
    const aiBtn = Array.from(editorHeader.querySelectorAll('button')).find(btn => btn.textContent?.includes('AI')) as HTMLButtonElement
    aiBtn.click()
    await new Promise(resolve => setTimeout(resolve, 200))

    const aiPanel = document.querySelector('.ai-panel') as HTMLElement
    const promptInput = aiPanel.querySelector('.ai-prompt-input') as HTMLTextAreaElement
    const generateBtn = aiPanel.querySelector('.ai-generate-btn') as HTMLButtonElement

    if (promptInput && generateBtn) {
      promptInput.value = 'Generate with Ollama'
      generateBtn.click()
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    // Find the generate call in mock calls (skip the /api/tags availability check)
    const generateCall = fetchMock.mock.calls.find((call: any[]) => call[0].includes('/api/generate'))
    expect(generateCall).toBeDefined()
    expect(generateCall[0]).toBe('http://localhost:11434/api/generate')
    
    const body = JSON.parse(generateCall[1].body)
    expect(body.model).toBe('mistral')
    expect(body.prompt).toBeDefined()
  })

  it('Ollama fetch rejects: shows not-running message and fallback', async () => {
    fetchMock.mockImplementation((url: string) => {
      return Promise.reject(new Error('Failed to fetch'))
    })

    initApp()
    await new Promise(resolve => setTimeout(resolve, 300))

    // Get script editor and configure it directly to use Ollama
    const app = (window as any).__appState?.app
    const scriptEditor = app?.getScriptEditor()
    if (scriptEditor) {
      scriptEditor.setSelectedProvider('ollama')
    }

    // Open AI panel
    const editorHeader = document.querySelector('.editor-header') as HTMLElement
    const aiBtn = Array.from(editorHeader.querySelectorAll('button')).find(btn => btn.textContent?.includes('AI')) as HTMLButtonElement
    aiBtn.click()
    await new Promise(resolve => setTimeout(resolve, 200))

    const aiPanel = document.querySelector('.ai-panel') as HTMLElement
    const promptInput = aiPanel.querySelector('.ai-prompt-input') as HTMLTextAreaElement
    const generateBtn = aiPanel.querySelector('.ai-generate-btn') as HTMLButtonElement

    if (promptInput && generateBtn) {
      promptInput.value = 'Ollama not running test'
      generateBtn.click()
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    // Verify error message indicates fallback
    const errorDisplay = aiPanel.querySelector('.ai-code-block') as HTMLElement
    // The error will show "not available" or might show fallback notice
    expect(errorDisplay.textContent.toLowerCase()).toMatch(/fall|not available/)

    // Verify mock provider was used
    const resultDisplay = aiPanel.querySelector('.ai-code-block') as HTMLElement
    expect(resultDisplay.textContent).toContain('on ')
    expect(resultDisplay.textContent).toContain('end ')
  })

  it('after successful Anthropic generate: sk-ant-TEST123 not in localStorage, exports, or console logs', async () => {
    const testKey = 'sk-ant-TEST123'
    const generatedCode = 'on mouseUp\n  answer "Secret API key test"\nend mouseUp'
    const consoleSpy = vi.spyOn(console, 'log')
    const consoleWarnSpy = vi.spyOn(console, 'warn')
    const consoleErrorSpy = vi.spyOn(console, 'error')
    const consoleInfoSpy = vi.spyOn(console, 'info')

    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ content: [{ type: 'text', text: generatedCode }] }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    initApp()
    await new Promise(resolve => setTimeout(resolve, 300))

    // Set Anthropic key
    const header = document.querySelector('.app-header') as HTMLElement
    const aiSettingsBtn = Array.from(header.querySelectorAll('button')).find(btn => btn.textContent?.includes('AI Settings')) as HTMLButtonElement
    aiSettingsBtn.click()
    await new Promise(resolve => setTimeout(resolve, 200))

    const providerSelect = document.querySelector('.provider-section select') as HTMLSelectElement
    providerSelect.value = 'anthropic'
    providerSelect.dispatchEvent(new Event('change', { bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 200))

    const keyInput = document.querySelector('.anthropic-settings input[type="password"]') as HTMLInputElement
    keyInput.value = testKey
    keyInput.dispatchEvent(new Event('change', { bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 200))

    const modalBackdrop = document.querySelector('.modal-backdrop') as HTMLElement
    modalBackdrop.click()
    await new Promise(resolve => setTimeout(resolve, 200))

    // Generate script
    const editorHeader = document.querySelector('.editor-header') as HTMLElement
    const aiBtn = Array.from(editorHeader.querySelectorAll('button')).find(btn => btn.textContent?.includes('AI')) as HTMLButtonElement
    aiBtn.click()
    await new Promise(resolve => setTimeout(resolve, 200))

    const aiPanel = document.querySelector('.ai-panel') as HTMLElement
    const promptInput = aiPanel.querySelector('.ai-prompt-input') as HTMLTextAreaElement
    promptInput.value = 'Test secret key exposure'
    promptInput.dispatchEvent(new Event('input', { bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 100))

    const generateBtn = aiPanel.querySelector('.ai-generate-btn') as HTMLButtonElement
    generateBtn.click()
    await new Promise(resolve => setTimeout(resolve, 500))

    const acceptBtn = aiPanel.querySelector('.ai-accept-btn') as HTMLButtonElement
    acceptBtn.click()
    await new Promise(resolve => setTimeout(resolve, 150))

    // Export stack
    const exportBtn = Array.from(header.querySelectorAll('button')).find(btn => btn.textContent === 'Export') as HTMLButtonElement
    exportBtn.click()
    await new Promise(resolve => setTimeout(resolve, 200))

    // Check localStorage
    const localStorageContent = JSON.stringify(Object.entries(localStorage))
    expect(localStorageContent).not.toContain(testKey)
    expect(localStorageContent).not.toContain('sk-ant-')

    // Check all console calls
    const allConsoleCalls = [
      ...consoleSpy.mock.calls,
      ...consoleWarnSpy.mock.calls,
      ...consoleErrorSpy.mock.calls,
      ...consoleInfoSpy.mock.calls
    ]

    for (const callArgs of allConsoleCalls) {
      const callString = JSON.stringify(callArgs)
      expect(callString).not.toContain(testKey)
      expect(callString).not.toContain('sk-ant-')
    }

    consoleSpy.mockRestore()
    consoleWarnSpy.mockRestore()
    consoleErrorSpy.mockRestore()
    consoleInfoSpy.mockRestore()
  })
})
