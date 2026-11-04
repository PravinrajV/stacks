/**
 * Task 9.5.6: Refined AI panel component.
 * 
 * Glass card with accent header, offline badge, prompt textarea with examples,
 * Generate button with spinner, diff preview with green/red lines, Accept/Discard buttons.
 * Keep class names .ai-offline-notice and button texts Generate/Accept/Discard.
 */

import { createElement, setTextContent, setStyles, removeAllChildren, addEventListener } from '../utils/dom'

export interface AIPanelOptions {
  onGenerate?: (prompt: string) => void
  onAccept?: () => void
  onDiscard?: () => void
}

export class AIPanelComponent {
  private element: HTMLElement
  private promptInput: HTMLTextAreaElement
  private generateBtn: HTMLButtonElement
  private diffPreview: HTMLElement
  private acceptBtn: HTMLButtonElement
  private discardBtn: HTMLButtonElement
  private offlineBadge: HTMLElement
  private isGenerating: boolean = false

  constructor(options: AIPanelOptions = {}) {
    this.element = createElement('div', { className: 'ai-panel-refined' })
    setStyles(this.element, {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--spacing-md)',
      padding: 'var(--spacing-lg)',
      background: 'var(--glass-bg)',
      backdropFilter: 'var(--glass-backdrop)',
      border: 'var(--glass-border)',
      borderRadius: 'var(--glass-radius)',
      boxShadow: 'var(--glass-shadow)',
      maxHeight: '600px',
      overflowY: 'auto'
    })

    // Header with accent color
    const header = createElement('div', { className: 'ai-panel-header' })
    setStyles(header, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '2px solid var(--color-accent)',
      paddingBottom: 'var(--spacing-sm)',
      marginBottom: 'var(--spacing-sm)'
    })

    const title = createElement('h2')
    setStyles(title, {
      margin: '0',
      fontSize: '16px',
      fontWeight: 'bold',
      color: 'var(--color-text-primary)',
      fontFamily: 'var(--font-ui)'
    })
    setTextContent(title, '✨ AI Assistant')
    header.appendChild(title)

    // Offline badge
    this.offlineBadge = createElement('span', { className: 'ai-offline-notice' })
    setStyles(this.offlineBadge, {
      display: 'inline-block',
      padding: 'var(--spacing-xs) var(--spacing-sm)',
      backgroundColor: 'rgba(255, 193, 7, 0.2)',
      border: '1px solid var(--color-orange)',
      borderRadius: '4px',
      fontSize: '10px',
      fontWeight: 'bold',
      color: 'var(--color-orange)',
      fontFamily: 'var(--font-mono)',
      whiteSpace: 'nowrap'
    })
    setTextContent(this.offlineBadge, 'Offline Demo')
    header.appendChild(this.offlineBadge)
    this.element.appendChild(header)

    // Prompt input section
    const promptSection = createElement('div')
    const promptLabel = createElement('label')
    setStyles(promptLabel, {
      display: 'block',
      fontSize: '12px',
      fontWeight: 'bold',
      color: 'var(--color-text-primary)',
      marginBottom: 'var(--spacing-xs)',
      fontFamily: 'var(--font-ui)'
    })
    setTextContent(promptLabel, 'Describe what you want to build:')
    promptSection.appendChild(promptLabel)

    this.promptInput = createElement('textarea', {
      className: 'ai-prompt-textarea'
    }) as HTMLTextAreaElement
    setStyles(this.promptInput, {
      width: '100%',
      minHeight: '80px',
      padding: 'var(--spacing-sm)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--glass-radius)',
      backgroundColor: 'var(--color-bg-secondary)',
      color: 'var(--color-text-primary)',
      fontFamily: 'var(--font-mono)',
      fontSize: '12px',
      lineHeight: '1.4',
      resize: 'vertical',
      fontWeight: 'normal'
    })
    this.promptInput.placeholder =
      'Examples:\n- "Show an alert when clicked"\n- "Count button clicks"\n- "Navigate to next card"'
    promptSection.appendChild(this.promptInput)
    this.element.appendChild(promptSection)

    // Generate button with spinner state
    const buttonRow = createElement('div')
    setStyles(buttonRow, {
      display: 'flex',
      gap: 'var(--spacing-sm)'
    })

    this.generateBtn = createElement('button', {
      className: 'ai-generate-btn'
    }) as HTMLButtonElement
    setStyles(this.generateBtn, {
      flex: '1',
      padding: 'var(--spacing-sm) var(--spacing-md)',
      backgroundColor: 'var(--color-accent)',
      color: 'var(--color-text-primary)',
      border: 'none',
      borderRadius: 'var(--glass-radius)',
      fontWeight: 'bold',
      fontFamily: 'var(--font-ui)',
      fontSize: '13px',
      cursor: 'pointer',
      transition: `background-color ${300}ms ease-out`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 'var(--spacing-sm)'
    })
    setTextContent(this.generateBtn, 'Generate')

    addEventListener(this.generateBtn, 'click', () => {
      if (!this.isGenerating && options.onGenerate) {
        const prompt = this.promptInput.value.trim()
        if (prompt) {
          this.setGenerating(true)
          options.onGenerate(prompt)
        }
      }
    })

    buttonRow.appendChild(this.generateBtn)
    this.element.appendChild(buttonRow)

    // Diff preview with color-coded changes
    this.diffPreview = createElement('div', { className: 'ai-diff-preview' })
    setStyles(this.diffPreview, {
      display: 'none',
      padding: 'var(--spacing-sm)',
      backgroundColor: 'var(--color-bg-secondary)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--glass-radius)',
      fontFamily: 'var(--font-mono)',
      fontSize: '11px',
      maxHeight: '200px',
      overflowY: 'auto',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      lineHeight: '1.4'
    })
    this.element.appendChild(this.diffPreview)

    // Accept/Discard buttons (only visible after generation)
    const actionRow = createElement('div')
    setStyles(actionRow, {
      display: 'none',
      flexDirection: 'column',
      gap: 'var(--spacing-sm)'
    })

    this.acceptBtn = createElement('button', {
      className: 'ai-accept-btn'
    }) as HTMLButtonElement
    setStyles(this.acceptBtn, {
      flex: '1',
      padding: 'var(--spacing-sm) var(--spacing-md)',
      backgroundColor: 'var(--color-accent)',
      color: 'var(--color-text-primary)',
      border: 'none',
      borderRadius: 'var(--glass-radius)',
      fontWeight: 'bold',
      fontFamily: 'var(--font-ui)',
      fontSize: '13px',
      cursor: 'pointer',
      transition: `background-color ${300}ms ease-out`
    })
    setTextContent(this.acceptBtn, 'Accept')

    addEventListener(this.acceptBtn, 'click', () => {
      if (options.onAccept) {
        options.onAccept()
      }
    })

    this.discardBtn = createElement('button', {
      className: 'ai-discard-btn'
    }) as HTMLButtonElement
    setStyles(this.discardBtn, {
      flex: '1',
      padding: 'var(--spacing-sm) var(--spacing-md)',
      backgroundColor: 'var(--color-bg-tertiary)',
      color: 'var(--color-text-secondary)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--glass-radius)',
      fontWeight: 'bold',
      fontFamily: 'var(--font-ui)',
      fontSize: '13px',
      cursor: 'pointer',
      transition: `background-color ${300}ms ease-out`
    })
    setTextContent(this.discardBtn, 'Discard')

    addEventListener(this.discardBtn, 'click', () => {
      if (options.onDiscard) {
        options.onDiscard()
      }
      this.hideActionButtons()
    })

    actionRow.appendChild(this.acceptBtn)
    actionRow.appendChild(this.discardBtn)
    this.element.appendChild(actionRow)
  }

  getElement(): HTMLElement {
    return this.element
  }

  setGenerating(loading: boolean): void {
    this.isGenerating = loading
    if (loading) {
      this.generateBtn.disabled = true
      setTextContent(this.generateBtn, '⏳ Generating...')
    } else {
      this.generateBtn.disabled = false
      setTextContent(this.generateBtn, 'Generate')
    }
  }

  showDiffPreview(oldCode: string, newCode: string): void {
    removeAllChildren(this.diffPreview)

    // Simple diff: show removed lines in red, added lines in green
    const oldLines = oldCode.split('\n')
    const newLines = newCode.split('\n')

    const maxLines = Math.max(oldLines.length, newLines.length)

    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i] || ''
      const newLine = newLines[i] || ''

      if (oldLine !== newLine) {
        // Show removed line (if exists)
        if (oldLine && i < oldLines.length) {
          const removedEl = createElement('div')
          setStyles(removedEl, {
            backgroundColor: 'rgba(255, 0, 0, 0.1)',
            color: 'var(--color-text-secondary)',
            padding: '2px 4px',
            marginBottom: '2px'
          })
          setTextContent(removedEl, `- ${oldLine}`)
          this.diffPreview.appendChild(removedEl)
        }

        // Show added line (if exists)
        if (newLine && i < newLines.length) {
          const addedEl = createElement('div')
          setStyles(addedEl, {
            backgroundColor: 'rgba(0, 255, 0, 0.1)',
            color: 'var(--color-text-primary)',
            padding: '2px 4px',
            marginBottom: '2px'
          })
          setTextContent(addedEl, `+ ${newLine}`)
          this.diffPreview.appendChild(addedEl)
        }
      } else if (oldLine) {
        // Show unchanged line
        const unchangedEl = createElement('div')
        setStyles(unchangedEl, {
          color: 'var(--color-text-secondary)',
          padding: '2px 4px',
          marginBottom: '2px',
          opacity: '0.6'
        })
        setTextContent(unchangedEl, `  ${oldLine}`)
        this.diffPreview.appendChild(unchangedEl)
      }
    }

    setStyles(this.diffPreview, { display: 'block' })
    this.showActionButtons()
  }

  hideDiffPreview(): void {
    removeAllChildren(this.diffPreview)
    setStyles(this.diffPreview, { display: 'none' })
    this.hideActionButtons()
  }

  private showActionButtons(): void {
    const actionRow = this.element.querySelector('div') as HTMLElement | null
    if (actionRow) {
      setStyles(actionRow, { display: 'flex' })
    }
  }

  private hideActionButtons(): void {
    const actionRow = this.element.querySelector('div') as HTMLElement | null
    if (actionRow) {
      setStyles(actionRow, { display: 'none' })
    }
  }

  setOfflineMode(isOffline: boolean): void {
    if (isOffline) {
      setTextContent(this.offlineBadge, 'Offline Demo')
      setStyles(this.offlineBadge, { display: 'inline-block' })
    } else {
      setStyles(this.offlineBadge, { display: 'none' })
    }
  }

  clear(): void {
    this.promptInput.value = ''
    this.hideDiffPreview()
    this.setGenerating(false)
  }
}
