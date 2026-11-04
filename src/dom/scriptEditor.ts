/**
 * Task 7.5: ScriptEditor with syntax highlighting.
 * 
 * Text editor for HyperTalk scripts with parse error display.
 */

import { createElement, setTextContent, removeAllChildren, addEventListener } from './utils/dom'
import { tokenize } from '../interpreter/lexer'
import { parse } from '../interpreter/parser'
import type { ParseError } from '../interpreter/parser'
import { ButtonComponent } from './components/button'
import { TextInputComponent } from './components/textInput'

export class ScriptEditor {
  private element: HTMLElement
  private editorContainer: HTMLElement
  private textarea: HTMLTextAreaElement
  private errorDisplay: HTMLElement
  private script: string = ''
  private error: ParseError | null = null
  private onScriptChange: ((script: string) => void) | null = null

  constructor() {
    this.element = createElement('div', {
      className: 'script-editor'
    })

    const header = createElement('div', { className: 'editor-header' })
    const title = createElement('div', { className: 'editor-title' })
    setTextContent(title, 'Script Editor')
    header.appendChild(title)

    const runBtn = new ButtonComponent('Run', () => {
      // Run preview
    })
    header.appendChild(runBtn.getElement())
    this.element.appendChild(header)

    this.editorContainer = createElement('div')
    this.element.appendChild(this.editorContainer)

    this.textarea = createElement('textarea', {
      className: 'editor-textarea'
    }) as HTMLTextAreaElement

    addEventListener(this.textarea, 'input', () => {
      this.script = this.textarea.value
      this.updateError()
      this.onScriptChange?.(this.script)
    })

    this.editorContainer.appendChild(this.textarea)

    this.errorDisplay = createElement('div', { className: 'editor-error' })
    this.element.appendChild(this.errorDisplay)
  }

  getElement(): HTMLElement {
    return this.element
  }

  setScript(script: string): void {
    this.script = script
    this.textarea.value = script
    this.updateError()
  }

  getScript(): string {
    return this.textarea.value
  }

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

    this.renderError()
  }

  private renderError(): void {
    removeAllChildren(this.errorDisplay)

    if (this.error) {
      const msg = `Error at line ${this.error.line}, column ${this.error.column}: ${this.error.message}`
      setTextContent(this.errorDisplay, msg)
    }
  }

  getError(): ParseError | null {
    return this.error
  }

  onScriptChanged(handler: (script: string) => void): void {
    this.onScriptChange = handler
  }
}
