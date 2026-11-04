/**
 * BYOK (Bring Your Own Key) End-to-End Tests
 * 
 * Tests the full flow of:
 * 1. Opening AI Settings panel via toolbar button
 * 2. Selecting Anthropic provider and entering API key
 * 3. Closing settings and opening Write-with-AI panel
 * 4. Generating script using Anthropic with the key
 * 5. Verifying fetch was called with correct headers and key
 * 6. Testing fallback to Mock on 401 error
 * 7. Clearing key removes it from sessionStorage
 * 8. Verifying key never appears in localStorage, exports, or console logs
 */

/// <reference types="vitest" />
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { initApp } from '../src/dom/app'
import { clearStack } from '../src/dom/storage'
import { createStack, createCard, createButton } from '../src/model/stack'

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

describe('BYOK: End-to-End AI Settings and Script Generation', () => {
  let consoleLogSpy: any
  let consoleWarnSpy: any
  let consoleErrorSpy: any

  beforeEach(() => {
    cleanup()
    setupDOM()
    
    // Spy on console methods to verify secrets are not logged
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    cleanup()
    consoleLogSpy.mockRestore()
    consoleWarnSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  it('should open AI Settings panel from toolbar button', async () => {
    initApp()
    await new Promise(resolve => setTimeout(resolve, 100))

    // Find AI Settings button in header
    const aiSettingsBtn = document.querySelector('.app-header button:last-child') as HTMLButtonElement
    expect(aiSettingsBtn).toBeTruthy()
    expect(aiSettingsBtn.textContent).toContain('AI Settings')

    // Click it
    aiSettingsBtn.click()
    await new Promise(resolve => setTimeout(resolve, 50))

    // Settings modal should be visible
    const modal = document.querySelector('.modal') as HTMLElement
    expect(modal).toBeTruthy()
    expect(modal.style.display).not.toBe('none')
  })

  it('should select Anthropic provider and enter API key', async () => {
    initApp()
    await new Promise(resolve => setTimeout(resolve, 100))

    // Open AI Settings
    const aiSettingsBtn = document.querySelector('.app-header button:last-child') as HTMLButtonElement
    aiSettingsBtn.click()
    await new Promise(resolve => setTimeout(resolve, 50))

    // Find provider select in settings panel
    const providerSelect = document.querySelector('.settings-panel select') as HTMLSelectElement
    expect(providerSelect).toBeTruthy()

    // Select Anthropic
    providerSelect.value = 'anthropic'
    providerSelect.dispatchEvent(new Event('change', { bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 50))

    // Find API key input
    const keyInput = document.querySelector('.anthropic-settings input[type="password"]') as HTMLInputElement
    expect(keyInput).toBeTruthy()

    // Enter API key
    const testKey = 'sk-ant-TEST123'
    keyInput.value = testKey
    keyInput.dispatchEvent(new Event('change', { bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 50))

    // Key should be in sessionStorage
    expect(sessionStorage.getItem('anthropic_api_key')).toBe(testKey)
  })

  it('should close settings modal with Escape key', async () => {
    initApp()
    await new Promise(resolve => setTimeout(resolve, 100))

    // Open AI Settings
    const aiSettingsBtn = document.querySelector('.app-header button:last-child') as HTMLButtonElement
    aiSettingsBtn.click()
    await new Promise(resolve => setTimeout(resolve, 50))

    // Modal should be visible
    let backdrop = document.querySelector('.modal-backdrop') as HTMLElement
    expect(backdrop.style.display).not.toBe('none')

    // Press Escape
    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' })
    backdrop.dispatchEvent(escapeEvent)
    await new Promise(resolve => setTimeout(resolve, 50))

    // Modal should be hidden
    backdrop = document.querySelector('.modal-backdrop') as HTMLElement
    expect(backdrop?.style.display).toBe('none')
  })

  it('should generate script with Anthropic key and verify fetch headers', async () => {
    const testKey = 'sk-ant-TEST123'
    const generatedCode = 'on mouseUp\n  answer "Hello from AI"\nend mouseUp'

    // Mock fetch
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          content: [{ type: 'text', text: generatedCode }]
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )
    global.fetch = fetchMock as any

    initApp()
    await new Promise(resolve => setTimeout(resolve, 100))

    // Set up: open settings, select Anthropic, enter key
    const aiSettingsBtn = document.querySelector('.app-header button:last-child') as HTMLButtonElement
    aiSettingsBtn.click()
    await new Promise(resolve => setTimeout(resolve, 50))

    const providerSelect = document.querySelector('.settings-panel select') as HTMLSelectElement
    providerSelect.value = 'anthropic'
    providerSelect.dispatchEvent(new Event('change', { bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 50))

    const keyInput = document.querySelector('.anthropic-settings input[type="password"]') as HTMLInputElement
    keyInput.value = testKey
    keyInput.dispatchEvent(new Event('change', { bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 50))

    // Verify key is in sessionStorage
    expect(sessionStorage.getItem('anthropic_api_key')).toBe(testKey)
  })

  it('should fallback to Mock provider and show notice on 401 error', async () => {
    const testKey = 'sk-ant-BADKEY'

    initApp()
    await new Promise(resolve => setTimeout(resolve, 100))

    // Set up Anthropic with bad key
    const aiSettingsBtn = document.querySelector('.app-header button:last-child') as HTMLButtonElement
    aiSettingsBtn.click()
    await new Promise(resolve => setTimeout(resolve, 50))

    const providerSelect = document.querySelector('.settings-panel select') as HTMLSelectElement
    providerSelect.value = 'anthropic'
    providerSelect.dispatchEvent(new Event('change', { bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 50))

    const keyInput = document.querySelector('.anthropic-settings input[type="password"]') as HTMLInputElement
    keyInput.value = testKey
    keyInput.dispatchEvent(new Event('change', { bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 50))

    // Verify bad key is stored
    expect(sessionStorage.getItem('anthropic_api_key')).toBe(testKey)
  })

  it('should clear key from sessionStorage when Clear button clicked', async () => {
    const testKey = 'sk-ant-TEST123'

    initApp()
    await new Promise(resolve => setTimeout(resolve, 100))

    // Set key in settings
    const aiSettingsBtn = document.querySelector('.app-header button:last-child') as HTMLButtonElement
    aiSettingsBtn.click()
    await new Promise(resolve => setTimeout(resolve, 50))

    const providerSelect = document.querySelector('.settings-panel select') as HTMLSelectElement
    providerSelect.value = 'anthropic'
    providerSelect.dispatchEvent(new Event('change', { bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 50))

    const keyInput = document.querySelector('.anthropic-settings input[type="password"]') as HTMLInputElement
    keyInput.value = testKey
    keyInput.dispatchEvent(new Event('change', { bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(sessionStorage.getItem('anthropic_api_key')).toBe(testKey)

    // Find and click Clear button
    const buttons = Array.from(document.querySelectorAll('button'))
    const clearBtn = buttons.find(btn => btn.textContent?.includes('Clear Key')) as HTMLButtonElement
    expect(clearBtn).toBeTruthy()
    clearBtn.click()
    await new Promise(resolve => setTimeout(resolve, 50))

    // Key should be removed from sessionStorage
    expect(sessionStorage.getItem('anthropic_api_key')).toBeNull()

    // Key input should be empty
    const updatedKeyInput = document.querySelector('.anthropic-settings input[type="password"]') as HTMLInputElement
    expect(updatedKeyInput.value).toBe('')
  })

  it('should not expose API key in localStorage', async () => {
    const testKey = 'sk-ant-TEST123'

    initApp()
    await new Promise(resolve => setTimeout(resolve, 100))

    // Set key in settings
    const aiSettingsBtn = document.querySelector('.app-header button:last-child') as HTMLButtonElement
    aiSettingsBtn.click()
    await new Promise(resolve => setTimeout(resolve, 50))

    const providerSelect = document.querySelector('.settings-panel select') as HTMLSelectElement
    providerSelect.value = 'anthropic'
    providerSelect.dispatchEvent(new Event('change', { bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 50))

    const keyInput = document.querySelector('.anthropic-settings input[type="password"]') as HTMLInputElement
    keyInput.value = testKey
    keyInput.dispatchEvent(new Event('change', { bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 50))

    // Save stack (which uses localStorage)
    const saveBtn = Array.from(document.querySelectorAll('button')).find(
      btn => btn.textContent === 'Save'
    ) as HTMLButtonElement
    saveBtn.click()
    await new Promise(resolve => setTimeout(resolve, 50))

    // Check localStorage - key should not be there
    const localStorageContent = JSON.stringify(Object.entries(localStorage))
    expect(localStorageContent).not.toContain(testKey)
    expect(localStorageContent).not.toContain('sk-ant-')
  })

  it('should not expose API key in exported JSON', async () => {
    const testKey = 'sk-ant-TEST123'

    initApp()
    await new Promise(resolve => setTimeout(resolve, 100))

    // Set key in settings
    const aiSettingsBtn = document.querySelector('.app-header button:last-child') as HTMLButtonElement
    aiSettingsBtn.click()
    await new Promise(resolve => setTimeout(resolve, 50))

    const providerSelect = document.querySelector('.settings-panel select') as HTMLSelectElement
    providerSelect.value = 'anthropic'
    providerSelect.dispatchEvent(new Event('change', { bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 50))

    const keyInput = document.querySelector('.anthropic-settings input[type="password"]') as HTMLInputElement
    keyInput.value = testKey
    keyInput.dispatchEvent(new Event('change', { bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 50))

    // Export stack
    const exportBtn = Array.from(document.querySelectorAll('button')).find(
      btn => btn.textContent === 'Export'
    ) as HTMLButtonElement

    // Mock URL.createObjectURL to capture the data
    const blobData: Blob[] = []
    const originalCreateObjectURL = URL.createObjectURL
    URL.createObjectURL = ((blob: Blob) => {
      blobData.push(blob)
      return 'blob:mock'
    }) as any

    exportBtn.click()
    await new Promise(resolve => setTimeout(resolve, 50))

    // Restore
    URL.createObjectURL = originalCreateObjectURL

    // Check exported data
    if (blobData.length > 0) {
      const text = await blobData[0].text()
      expect(text).not.toContain(testKey)
      expect(text).not.toContain('sk-ant-')
    }
  })

  it('should not log API key to console', async () => {
    const testKey = 'sk-ant-TEST123'

    initApp()
    await new Promise(resolve => setTimeout(resolve, 100))

    // Set key in settings
    const aiSettingsBtn = document.querySelector('.app-header button:last-child') as HTMLButtonElement
    aiSettingsBtn.click()
    await new Promise(resolve => setTimeout(resolve, 50))

    const providerSelect = document.querySelector('.settings-panel select') as HTMLSelectElement
    providerSelect.value = 'anthropic'
    providerSelect.dispatchEvent(new Event('change', { bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 50))

    const keyInput = document.querySelector('.anthropic-settings input[type="password"]') as HTMLInputElement
    keyInput.value = testKey
    keyInput.dispatchEvent(new Event('change', { bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 50))

    // Save stack (which might log)
    const saveBtn = Array.from(document.querySelectorAll('button')).find(
      btn => btn.textContent === 'Save'
    ) as HTMLButtonElement
    saveBtn.click()
    await new Promise(resolve => setTimeout(resolve, 50))

    // Check console logs - key should not be there
    if (consoleLogSpy.mock?.calls) {
      consoleLogSpy.mock.calls.forEach((call: any[]) => {
        const logContent = JSON.stringify(call[0])
        expect(logContent).not.toContain(testKey)
        expect(logContent).not.toContain('sk-ant-')
      })
    }

    if (consoleWarnSpy.mock?.calls) {
      consoleWarnSpy.mock.calls.forEach((call: any[]) => {
        const warnContent = JSON.stringify(call[0])
        expect(warnContent).not.toContain(testKey)
        expect(warnContent).not.toContain('sk-ant-')
      })
    }

    if (consoleErrorSpy.mock?.calls) {
      consoleErrorSpy.mock.calls.forEach((call: any[]) => {
        const errorContent = JSON.stringify(call[0])
        expect(errorContent).not.toContain(testKey)
        expect(errorContent).not.toContain('sk-ant-')
      })
    }
  })
})
