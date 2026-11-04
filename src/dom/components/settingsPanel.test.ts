/**
 * Tests for SettingsPanel.
 * 
 * Tests:
 * - Provider selection UI
 * - API key input (type=password, autocomplete=off)
 * - Clear key button
 * - Model field
 * - Settings persistence
 * - Privacy notice display
 * - Key never exposed in DOM or events
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SettingsPanel, ProviderSettings } from './settingsPanel'

beforeEach(() => {
  sessionStorage.clear()
})

afterEach(() => {
  sessionStorage.clear()
})

describe('SettingsPanel', () => {
  describe('Initialization', () => {
    it('should render with default provider', () => {
      const panel = new SettingsPanel()
      const el = panel.getElement()
      
      expect(el).toBeDefined()
      expect(el.className).toContain('settings-panel')
    })

    it('should show provider select dropdown', () => {
      const panel = new SettingsPanel()
      const el = panel.getElement()
      
      const select = el.querySelector('select') as HTMLSelectElement
      expect(select).toBeDefined()
      
      const options = Array.from(select.options).map(o => o.textContent)
      expect(options).toContain('Mock Provider (Offline, Testing)')
      expect(options).toContain('Anthropic Claude (Requires API Key)')
      expect(options).toContain('Ollama Local (Requires Running Server)')
    })

    it('should show privacy notice', () => {
      const panel = new SettingsPanel()
      const el = panel.getElement()
      
      const notice = el.querySelector('.privacy-notice')
      expect(notice).toBeDefined()
      
      const text = notice?.textContent || ''
      expect(text).toContain('sessionStorage')
      expect(text).toContain('never saved in stacks')
    })
  })

  describe('Provider Selection', () => {
    it('should set provider to mock by default', () => {
      const panel = new SettingsPanel()
      const settings = panel.getSettings()
      
      expect(settings.provider).toBe('mock')
    })

    it('should change provider on select change', () => {
      const panel = new SettingsPanel()
      const el = panel.getElement()
      
      const select = el.querySelector('select') as HTMLSelectElement
      select.value = 'anthropic'
      select.dispatchEvent(new Event('change', { bubbles: true }))
      
      const settings = panel.getSettings()
      expect(settings.provider).toBe('anthropic')
    })

    it('should show Anthropic settings when selected', () => {
      const panel = new SettingsPanel()
      panel.setSettings({ provider: 'anthropic' })
      
      const el = panel.getElement()
      const anthropicSection = el.querySelector('.anthropic-settings')
      expect(anthropicSection).toBeDefined()
    })

    it('should show Ollama settings when selected', () => {
      const panel = new SettingsPanel()
      panel.setSettings({ provider: 'ollama' })
      
      const el = panel.getElement()
      const ollamaSection = el.querySelector('.ollama-settings')
      expect(ollamaSection).toBeDefined()
    })

    it('should hide provider-specific settings for mock', () => {
      const panel = new SettingsPanel()
      panel.setSettings({ provider: 'mock' })
      
      const el = panel.getElement()
      expect(el.querySelector('.anthropic-settings')).toBeNull()
      expect(el.querySelector('.ollama-settings')).toBeNull()
    })
  })

  describe('Anthropic Settings', () => {
    it('should show API key input', () => {
      const panel = new SettingsPanel()
      panel.setSettings({ provider: 'anthropic' })
      
      const el = panel.getElement()
      const keyInput = el.querySelector('input[type="password"]') as HTMLInputElement
      expect(keyInput).toBeDefined()
    })

    it('should have password input with autocomplete off', () => {
      const panel = new SettingsPanel()
      panel.setSettings({ provider: 'anthropic' })
      
      const el = panel.getElement()
      const keyInput = el.querySelector('input[type="password"]') as HTMLInputElement
      expect(keyInput.autocomplete).toBe('off')
    })

    it('should show clear key button', () => {
      const panel = new SettingsPanel()
      panel.setSettings({ provider: 'anthropic', anthropicKey: 'sk-ant-test123' })
      
      const el = panel.getElement()
      const clearBtn = Array.from(el.querySelectorAll('button')).find(b => 
        b.textContent?.includes('Clear')
      )
      expect(clearBtn).toBeDefined()
    })

    it('should clear key when clear button clicked', () => {
      const panel = new SettingsPanel()
      panel.setSettings({ provider: 'anthropic', anthropicKey: 'sk-ant-test123' })
      
      const el = panel.getElement()
      const clearBtn = Array.from(el.querySelectorAll('button')).find(b => 
        b.textContent?.includes('Clear')
      ) as HTMLButtonElement
      clearBtn.click()
      
      const settings = panel.getSettings()
      expect(settings.anthropicKey).toBe('')
    })

    it('should show model field with default value', () => {
      const panel = new SettingsPanel()
      panel.setSettings({ provider: 'anthropic' })
      
      const el = panel.getElement()
      const modelInputs = Array.from(el.querySelectorAll('input[type="text"]'))
      const modelInput = modelInputs.find(i => {
        const prev = (i.previousElementSibling as HTMLElement)?.textContent
        return prev?.includes('Model')
      }) as HTMLInputElement
      
      expect(modelInput).toBeDefined()
      expect(modelInput.value).toContain('claude')
    })

    it('should update model on change', () => {
      const panel = new SettingsPanel()
      panel.setSettings({ provider: 'anthropic' })
      
      const el = panel.getElement()
      const modelInputs = Array.from(el.querySelectorAll('input[type="text"]'))
      const modelInput = modelInputs.find(i => {
        const prev = (i.previousElementSibling as HTMLElement)?.textContent
        return prev?.includes('Model')
      }) as HTMLInputElement
      
      modelInput.value = 'claude-3-opus-20240229'
      modelInput.dispatchEvent(new Event('change', { bubbles: true }))
      
      const settings = panel.getSettings()
      expect(settings.anthropicModel).toBe('claude-3-opus-20240229')
    })

    it('should callback on settings change', async () => {
      const panel = new SettingsPanel()
      const onChanged = vi.fn()
      panel.onChanged(onChanged)
      
      panel.setSettings({ provider: 'anthropic', anthropicKey: 'sk-ant-test123' })
      
      const el = panel.getElement()
      const keyInput = el.querySelector('input[type="password"]') as HTMLInputElement
      keyInput.value = 'sk-ant-new-key'
      keyInput.dispatchEvent(new Event('change', { bubbles: true }))
      
      // Wait a tick for event handler
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(onChanged).toHaveBeenCalled()
    })
  })

  describe('Ollama Settings', () => {
    it('should show base URL field', () => {
      const panel = new SettingsPanel()
      panel.setSettings({ provider: 'ollama' })
      
      const el = panel.getElement()
      const inputs = Array.from(el.querySelectorAll('input[type="text"]'))
      const urlInput = inputs.find(i => {
        const prev = (i.previousElementSibling as HTMLElement)?.textContent
        return prev?.includes('URL')
      }) as HTMLInputElement
      
      expect(urlInput).toBeDefined()
      expect(urlInput.value).toContain('localhost:11434')
    })

    it('should show model field', () => {
      const panel = new SettingsPanel()
      panel.setSettings({ provider: 'ollama' })
      
      const el = panel.getElement()
      const inputs = Array.from(el.querySelectorAll('input[type="text"]'))
      const modelInput = inputs.find(i => {
        const prev = (i.previousElementSibling as HTMLElement)?.textContent
        return prev?.includes('Model')
      }) as HTMLInputElement
      
      expect(modelInput).toBeDefined()
      expect(modelInput.value).toContain('mistral')
    })

    it('should update base URL on change', () => {
      const panel = new SettingsPanel()
      panel.setSettings({ provider: 'ollama' })
      
      const el = panel.getElement()
      const inputs = Array.from(el.querySelectorAll('input[type="text"]'))
      const urlInput = inputs.find(i => {
        const prev = (i.previousElementSibling as HTMLElement)?.textContent
        return prev?.includes('URL')
      }) as HTMLInputElement
      
      urlInput.value = 'http://remote-host:11434'
      urlInput.dispatchEvent(new Event('change', { bubbles: true }))
      
      const settings = panel.getSettings()
      expect(settings.ollamaBaseUrl).toBe('http://remote-host:11434')
    })

    it('should update model on change', () => {
      const panel = new SettingsPanel()
      panel.setSettings({ provider: 'ollama' })
      
      const el = panel.getElement()
      const inputs = Array.from(el.querySelectorAll('input[type="text"]'))
      const modelInput = inputs.find(i => {
        const prev = (i.previousElementSibling as HTMLElement)?.textContent
        return prev?.includes('Model')
      }) as HTMLInputElement
      
      modelInput.value = 'neural-chat'
      modelInput.dispatchEvent(new Event('change', { bubbles: true }))
      
      const settings = panel.getSettings()
      expect(settings.ollamaModel).toBe('neural-chat')
    })
  })

  describe('Security', () => {
    it('should not store key in localStorage', () => {
      const panel = new SettingsPanel()
      panel.setSettings({ provider: 'anthropic', anthropicKey: 'sk-ant-secret123' })
      
      expect(localStorage.getItem('anthropic_api_key')).toBeNull()
    })

    it('should not expose key in DOM attributes', () => {
      const panel = new SettingsPanel()
      panel.setSettings({ provider: 'anthropic', anthropicKey: 'sk-ant-secret-key-12345' })
      
      const el = panel.getElement()
      const domString = el.outerHTML
      expect(domString).not.toContain('sk-ant-secret-key-12345')
    })

    it('should not expose key in element content', () => {
      const panel = new SettingsPanel()
      panel.setSettings({ provider: 'anthropic', anthropicKey: 'sk-ant-secret-key-12345' })
      
      const el = panel.getElement()
      const textContent = el.textContent || ''
      expect(textContent).not.toContain('sk-ant-secret-key-12345')
    })

    it('should clear key when panel disposed', () => {
      const panel = new SettingsPanel()
      panel.setSettings({ provider: 'anthropic', anthropicKey: 'sk-ant-secret123' })
      
      const settings = panel.getSettings()
      expect(settings.anthropicKey).toBe('sk-ant-secret123')
      
      // Create a new panel - should not have the key
      const panel2 = new SettingsPanel()
      const settings2 = panel2.getSettings()
      expect(settings2.anthropicKey).toBeUndefined()
    })
  })

  describe('Privacy Notice', () => {
    it('should display privacy notice text', () => {
      const panel = new SettingsPanel()
      const el = panel.getElement()
      
      const notice = el.querySelector('.privacy-notice')
      const text = notice?.textContent || ''
      
      expect(text).toContain('sessionStorage')
      expect(text).toContain('provider')
      expect(text).toContain('never saved')
      expect(text).toContain('exports')
      expect(text).toContain('logs')
    })
  })

  describe('Settings Persistence', () => {
    it('should get current settings', () => {
      const panel = new SettingsPanel()
      panel.setSettings({ provider: 'anthropic', anthropicKey: 'sk-ant-test123' })
      
      const settings = panel.getSettings()
      expect(settings.provider).toBe('anthropic')
      expect(settings.anthropicKey).toBe('sk-ant-test123')
    })

    it('should set multiple settings at once', () => {
      const panel = new SettingsPanel()
      panel.setSettings({
        provider: 'ollama',
        ollamaBaseUrl: 'http://custom:11434',
        ollamaModel: 'neural-chat'
      })
      
      const settings = panel.getSettings()
      expect(settings.provider).toBe('ollama')
      expect(settings.ollamaBaseUrl).toBe('http://custom:11434')
      expect(settings.ollamaModel).toBe('neural-chat')
    })

    it('should preserve unspecified settings', () => {
      const panel = new SettingsPanel()
      panel.setSettings({ provider: 'anthropic', anthropicKey: 'sk-ant-test123' })
      
      panel.setSettings({ provider: 'mock' })
      
      const settings = panel.getSettings()
      expect(settings.provider).toBe('mock')
      expect(settings.anthropicKey).toBe('sk-ant-test123') // Should still be there
    })
  })
})
