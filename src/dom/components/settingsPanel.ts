/**
 * Settings Panel for Model Provider Configuration.
 * 
 * UI for selecting provider, entering API keys, and configuring models.
 * Supports Anthropic (BYOK), Ollama (local), and Mock (default).
 * 
 * Security:
 * - API key input has type="password" and autocomplete="off"
 * - Privacy notice displayed to user
 * - Clear button to remove stored key
 * - Keys never logged or exposed in DOM
 */

import { createElement, setTextContent, removeAllChildren, addEventListener } from '../utils/dom'
import { ButtonComponent } from './button'
import { TextInputComponent } from './textInput'

export interface ProviderSettings {
  provider: 'mock' | 'anthropic' | 'ollama'
  anthropicKey?: string
  anthropicModel?: string
  ollamaBaseUrl?: string
  ollamaModel?: string
}

export class SettingsPanel {
  private element: HTMLElement
  private onSettingsChanged: ((settings: ProviderSettings) => void) | null = null
  private currentSettings: ProviderSettings = {
    provider: 'mock',
    anthropicModel: 'claude-3-5-sonnet-20241022',
    ollamaBaseUrl: 'http://localhost:11434',
    ollamaModel: 'mistral'
  }
  
  constructor() {
    this.element = createElement('div', {
      className: 'settings-panel'
    })
    
    this.element.style.padding = '12px'
    this.element.style.borderTop = '1px solid #ccc'
    this.element.style.backgroundColor = '#f9f9f9'
    this.element.style.fontSize = '12px'
    this.element.style.lineHeight = '1.5'
    
    this.render()
  }
  
  private render(): void {
    removeAllChildren(this.element)
    
    // Title
    const title = createElement('div', { className: 'settings-title' })
    title.style.fontWeight = 'bold'
    title.style.marginBottom = '8px'
    setTextContent(title, 'Model Provider Settings')
    this.element.appendChild(title)
    
    // Provider selection
    const providerSection = createElement('div', { className: 'provider-section' })
    providerSection.style.marginBottom = '12px'
    
    const providerLabel = createElement('label')
    providerLabel.style.display = 'block'
    providerLabel.style.marginBottom = '4px'
    setTextContent(providerLabel, 'Provider:')
    providerSection.appendChild(providerLabel)
    
    const providerSelect = createElement('select') as HTMLSelectElement
    providerSelect.style.width = '100%'
    providerSelect.style.padding = '4px'
    providerSelect.style.fontSize = '12px'
    providerSelect.style.border = '1px solid #999'
    
    const providers: Array<{ value: 'mock' | 'anthropic' | 'ollama'; label: string }> = [
      { value: 'mock', label: 'Mock Provider (Offline, Testing)' },
      { value: 'anthropic', label: 'Anthropic Claude (Requires API Key)' },
      { value: 'ollama', label: 'Ollama Local (Requires Running Server)' }
    ]
    
    for (const { value, label } of providers) {
      const option = createElement('option') as HTMLOptionElement
      option.value = value
      setTextContent(option, label)
      if (value === this.currentSettings.provider) {
        option.selected = true
      }
      providerSelect.appendChild(option)
    }
    
    addEventListener(providerSelect, 'change', () => {
      this.currentSettings.provider = providerSelect.value as 'mock' | 'anthropic' | 'ollama'
      this.render()
      this.notifyChanged()
    })
    
    providerSection.appendChild(providerSelect)
    this.element.appendChild(providerSection)
    
    // Anthropic settings
    if (this.currentSettings.provider === 'anthropic') {
      this.renderAnthropicSettings()
    }
    
    // Ollama settings
    if (this.currentSettings.provider === 'ollama') {
      this.renderOllamaSettings()
    }
    
    // Privacy notice
    this.renderPrivacyNotice()
  }
  
  private renderAnthropicSettings(): void {
    const section = createElement('div', { className: 'anthropic-settings' })
    section.style.backgroundColor = '#ffffff'
    section.style.border = '1px solid #ddd'
    section.style.borderRadius = '4px'
    section.style.padding = '8px'
    section.style.marginBottom = '12px'
    
    // API Key input
    const keyLabel = createElement('label')
    keyLabel.style.display = 'block'
    keyLabel.style.marginBottom = '4px'
    keyLabel.style.fontWeight = 'bold'
    setTextContent(keyLabel, 'API Key:')
    section.appendChild(keyLabel)
    
    const keyInput = createElement('input') as HTMLInputElement
    keyInput.type = 'password'
    keyInput.autocomplete = 'off'
    keyInput.style.width = '100%'
    keyInput.style.padding = '6px'
    keyInput.style.fontSize = '12px'
    keyInput.style.border = '1px solid #999'
    keyInput.style.boxSizing = 'border-box'
    keyInput.style.marginBottom = '8px'
    keyInput.placeholder = 'sk-ant-... (starts with sk-ant-)'
    
    if (this.currentSettings.anthropicKey) {
      keyInput.value = this.currentSettings.anthropicKey
    }
    
    addEventListener(keyInput, 'change', () => {
      this.currentSettings.anthropicKey = keyInput.value
      this.notifyChanged()
    })
    
    section.appendChild(keyInput)
    
    // Clear button
    const clearBtn = new ButtonComponent('Clear Key', () => {
      keyInput.value = ''
      this.currentSettings.anthropicKey = ''
      this.notifyChanged()
    })
    clearBtn.getElement().style.marginBottom = '8px'
    clearBtn.getElement().style.width = '100px'
    section.appendChild(clearBtn.getElement())
    
    const clearNote = createElement('div')
    clearNote.style.fontSize = '11px'
    clearNote.style.color = '#666'
    clearNote.style.marginBottom = '8px'
    setTextContent(clearNote, 'Clears the key from this browser tab and sessionStorage.')
    section.appendChild(clearNote)
    
    // Model input
    const modelLabel = createElement('label')
    modelLabel.style.display = 'block'
    modelLabel.style.marginBottom = '4px'
    modelLabel.style.fontWeight = 'bold'
    setTextContent(modelLabel, 'Model:')
    section.appendChild(modelLabel)
    
    const modelInput = createElement('input') as HTMLInputElement
    modelInput.type = 'text'
    modelInput.style.width = '100%'
    modelInput.style.padding = '6px'
    modelInput.style.fontSize = '12px'
    modelInput.style.border = '1px solid #999'
    modelInput.style.boxSizing = 'border-box'
    modelInput.value = this.currentSettings.anthropicModel || 'claude-3-5-sonnet-20241022'
    
    addEventListener(modelInput, 'change', () => {
      this.currentSettings.anthropicModel = modelInput.value
      this.notifyChanged()
    })
    
    section.appendChild(modelInput)
    
    this.element.appendChild(section)
  }
  
  private renderOllamaSettings(): void {
    const section = createElement('div', { className: 'ollama-settings' })
    section.style.backgroundColor = '#ffffff'
    section.style.border = '1px solid #ddd'
    section.style.borderRadius = '4px'
    section.style.padding = '8px'
    section.style.marginBottom = '12px'
    
    // Base URL input
    const urlLabel = createElement('label')
    urlLabel.style.display = 'block'
    urlLabel.style.marginBottom = '4px'
    urlLabel.style.fontWeight = 'bold'
    setTextContent(urlLabel, 'Base URL:')
    section.appendChild(urlLabel)
    
    const urlInput = createElement('input') as HTMLInputElement
    urlInput.type = 'text'
    urlInput.style.width = '100%'
    urlInput.style.padding = '6px'
    urlInput.style.fontSize = '12px'
    urlInput.style.border = '1px solid #999'
    urlInput.style.boxSizing = 'border-box'
    urlInput.style.marginBottom = '8px'
    urlInput.placeholder = 'http://localhost:11434'
    urlInput.value = this.currentSettings.ollamaBaseUrl || 'http://localhost:11434'
    
    addEventListener(urlInput, 'change', () => {
      this.currentSettings.ollamaBaseUrl = urlInput.value
      this.notifyChanged()
    })
    
    section.appendChild(urlInput)
    
    // Model input
    const modelLabel = createElement('label')
    modelLabel.style.display = 'block'
    modelLabel.style.marginBottom = '4px'
    modelLabel.style.fontWeight = 'bold'
    setTextContent(modelLabel, 'Model:')
    section.appendChild(modelLabel)
    
    const modelInput = createElement('input') as HTMLInputElement
    modelInput.type = 'text'
    modelInput.style.width = '100%'
    modelInput.style.padding = '6px'
    modelInput.style.fontSize = '12px'
    modelInput.style.border = '1px solid #999'
    modelInput.style.boxSizing = 'border-box'
    modelInput.value = this.currentSettings.ollamaModel || 'mistral'
    
    addEventListener(modelInput, 'change', () => {
      this.currentSettings.ollamaModel = modelInput.value
      this.notifyChanged()
    })
    
    section.appendChild(modelInput)
    
    const note = createElement('div')
    note.style.fontSize = '11px'
    note.style.color = '#666'
    note.style.marginTop = '4px'
    setTextContent(note, 'Run Ollama locally: ollama serve, then pull a model: ollama pull mistral')
    section.appendChild(note)
    
    this.element.appendChild(section)
  }
  
  private renderPrivacyNotice(): void {
    const notice = createElement('div', { className: 'privacy-notice' })
    notice.style.backgroundColor = '#fffbea'
    notice.style.border = '1px solid #f0e0c0'
    notice.style.borderRadius = '4px'
    notice.style.padding = '8px'
    notice.style.fontSize = '11px'
    notice.style.color = '#333'
    notice.style.lineHeight = '1.4'
    
    setTextContent(
      notice,
      'Your API key stays in this browser tab (sessionStorage) and is sent only to the provider you chose. It is never saved in stacks, exports, logs, or undo history.'
    )
    
    this.element.appendChild(notice)
  }
  
  private notifyChanged(): void {
    if (this.onSettingsChanged) {
      this.onSettingsChanged(this.currentSettings)
    }
  }
  
  getElement(): HTMLElement {
    return this.element
  }
  
  getSettings(): ProviderSettings {
    return { ...this.currentSettings }
  }
  
  setSettings(settings: Partial<ProviderSettings>): void {
    this.currentSettings = {
      ...this.currentSettings,
      ...settings
    }
    this.render()
  }
  
  onChanged(callback: (settings: ProviderSettings) => void): void {
    this.onSettingsChanged = callback
  }
}
