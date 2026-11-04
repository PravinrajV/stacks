/**
 * Task 7.4: ElementInspector properties panel.
 */

import { createElement, setTextContent, removeAllChildren } from './utils/dom'
import type { Button, Field } from '../model/stack'
import { TextInputComponent } from './components/textInput'

export class ElementInspector {
  private element: HTMLElement
  private currentElement: Button | Field | null = null
  private changeCallback: ((element: Button | Field) => void) | null = null

  constructor() {
    this.element = createElement('div', {
      className: 'element-inspector'
    })
    this.element.setAttribute('aria-label', 'Element properties inspector')
    this.element.setAttribute('role', 'region')
  }

  getElement(): HTMLElement {
    return this.element
  }

  setElement(element: Button | Field): void {
    this.currentElement = element
    this.renderElement()
  }

  private renderElement(): void {
    removeAllChildren(this.element)

    if (!this.currentElement) {
      const emptyMsg = createElement('div')
      setTextContent(emptyMsg, 'Select an element to edit')
      this.element.appendChild(emptyMsg)
      return
    }

    const el = this.currentElement

    // Title
    const type = 'label' in el ? 'Button' : 'Field'
    const title = createElement('div')
    title.setAttribute('role', 'heading')
    title.setAttribute('aria-level', '2')
    title.style.fontWeight = 'bold'
    setTextContent(title, `${type} Properties`)
    this.element.appendChild(title)

    // Common properties
    if ('label' in el) {
      // Button
      this.addTextInput('Label:', el.label, (value) => {
        el.label = value
        this.changeCallback?.(el)
      })
    } else {
      // Field
      this.addTextInput('Name:', el.name, (value) => {
        el.name = value
        this.changeCallback?.(el)
      })

      this.addTextInput('Content:', el.content, (value) => {
        el.content = value
        this.changeCallback?.(el)
      })

      this.addTextInput('Font:', el.font, (value) => {
        el.font = value
        this.changeCallback?.(el)
      })

      this.addNumberInput('Font Size:', el.fontSize, (value) => {
        el.fontSize = value
        this.changeCallback?.(el)
      })

      this.addCheckbox('Editable:', el.editable, (value) => {
        el.editable = value
        this.changeCallback?.(el)
      })
    }

    // Position and size
    this.addNumberInput('Left:', el.rect.left, (value) => {
      el.rect.left = value
      this.changeCallback?.(el)
    })

    this.addNumberInput('Top:', el.rect.top, (value) => {
      el.rect.top = value
      this.changeCallback?.(el)
    })

    this.addNumberInput('Width:', el.rect.right - el.rect.left, (value) => {
      el.rect.right = el.rect.left + value
      this.changeCallback?.(el)
    })

    this.addNumberInput('Height:', el.rect.bottom - el.rect.top, (value) => {
      el.rect.bottom = el.rect.top + value
      this.changeCallback?.(el)
    })
  }

  private addTextInput(label: string, value: string, onChange: (value: string) => void): void {
    const section = createElement('div', { className: 'inspector-section' })

    const labelId = `label-${Math.random().toString(36).substr(2, 9)}`
    const labelEl = createElement('label', { className: 'inspector-label' })
    labelEl.setAttribute('for', labelId)
    setTextContent(labelEl, label)
    section.appendChild(labelEl)

    const input = new TextInputComponent('input', { value })
    input.getElement().setAttribute('id', labelId)
    input.getElement().setAttribute('aria-labelledby', labelId)
    input.onChange((val) => {
      onChange(val)
    })
    section.appendChild(input.getElement())

    this.element.appendChild(section)
  }

  private addNumberInput(label: string, value: number, onChange: (value: number) => void): void {
    const section = createElement('div', { className: 'inspector-section' })

    const labelId = `label-${Math.random().toString(36).substr(2, 9)}`
    const labelEl = createElement('label', { className: 'inspector-label' })
    labelEl.setAttribute('for', labelId)
    setTextContent(labelEl, label)
    section.appendChild(labelEl)

    const input = new TextInputComponent('input', { value: String(value) })
    input.getElement().setAttribute('id', labelId)
    input.getElement().setAttribute('aria-labelledby', labelId)
    input.onChange((val) => {
      const num = parseInt(val, 10)
      if (!isNaN(num)) {
        onChange(num)
      }
    })
    section.appendChild(input.getElement())

    this.element.appendChild(section)
  }

  private addCheckbox(label: string, value: boolean, onChange: (value: boolean) => void): void {
    const section = createElement('div', { className: 'inspector-section' })

    const labelId = `label-${Math.random().toString(36).substr(2, 9)}`
    const labelEl = createElement('label', { className: 'inspector-label' })
    labelEl.setAttribute('for', labelId)
    setTextContent(labelEl, label)
    section.appendChild(labelEl)

    const checkbox = createElement('input', {
      attributes: {
        type: 'checkbox',
        id: labelId
      }
    }) as HTMLInputElement
    checkbox.setAttribute('aria-labelledby', labelId)
    checkbox.checked = value
    checkbox.addEventListener('change', () => onChange(checkbox.checked))
    section.appendChild(checkbox)

    this.element.appendChild(section)
  }

  onPropertyChanged(handler: (element: Button | Field) => void): void {
    this.changeCallback = handler
  }
}
