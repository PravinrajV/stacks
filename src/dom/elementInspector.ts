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
    const type = 'label' in el ? 'Button' : 'Field'

    // Identity section
    const identitySection = this.createSection('Identity')
    if ('label' in el) {
      // Button
      this.addTextInputToSection(identitySection, 'Label:', el.label, (value) => {
        el.label = value
        this.changeCallback?.(el)
      })
    } else {
      // Field
      this.addTextInputToSection(identitySection, 'Name:', el.name, (value) => {
        el.name = value
        this.changeCallback?.(el)
      })
    }
    this.element.appendChild(identitySection)

    // Content section (fields only)
    if (!('label' in el)) {
      const contentSection = this.createSection('Content')
      this.addTextInputToSection(contentSection, 'Content:', el.content, (value) => {
        el.content = value
        this.changeCallback?.(el)
      })
      this.element.appendChild(contentSection)
    }

    // Typography section (fields only)
    if (!('label' in el)) {
      const typographySection = this.createSection('Typography')
      this.addTextInputToSection(typographySection, 'Font:', el.font, (value) => {
        el.font = value
        this.changeCallback?.(el)
      })
      this.addNumberInputToSection(typographySection, 'Font Size:', el.fontSize, (value) => {
        el.fontSize = value
        this.changeCallback?.(el)
      })
      this.element.appendChild(typographySection)
    }

    // Position & Size section (two-column grid layout)
    const positionSection = this.createSection('Position & Size')
    
    // Left and Top on one row (two-column)
    const row1 = createElement('div', { className: 'inspector-row' })
    const col1 = createElement('div', { className: 'inspector-col' })
    this.addNumberInputToSection(col1, 'Left:', el.rect.left, (value) => {
      el.rect.left = value
      this.changeCallback?.(el)
    })
    row1.appendChild(col1)
    
    const col2 = createElement('div', { className: 'inspector-col' })
    this.addNumberInputToSection(col2, 'Top:', el.rect.top, (value) => {
      el.rect.top = value
      this.changeCallback?.(el)
    })
    row1.appendChild(col2)
    positionSection.appendChild(row1)
    
    // Width and Height on one row (two-column)
    const row2 = createElement('div', { className: 'inspector-row' })
    const col3 = createElement('div', { className: 'inspector-col' })
    this.addNumberInputToSection(col3, 'Width:', el.rect.right - el.rect.left, (value) => {
      el.rect.right = el.rect.left + value
      this.changeCallback?.(el)
    })
    row2.appendChild(col3)
    
    const col4 = createElement('div', { className: 'inspector-col' })
    this.addNumberInputToSection(col4, 'Height:', el.rect.bottom - el.rect.top, (value) => {
      el.rect.bottom = el.rect.top + value
      this.changeCallback?.(el)
    })
    row2.appendChild(col4)
    positionSection.appendChild(row2)
    
    this.element.appendChild(positionSection)

    // Editable checkbox (fields only) 
    if (!('label' in el)) {
      const editableSection = this.createSection('Options')
      this.addCheckboxToSection(editableSection, 'Editable:', el.editable, (value) => {
        el.editable = value
        this.changeCallback?.(el)
      })
      this.element.appendChild(editableSection)
    }
  }

  private createSection(title: string): HTMLElement {
    const section = createElement('div', { className: 'inspector-group' })
    const sectionTitle = createElement('div', { className: 'inspector-group-title' })
    setTextContent(sectionTitle, title)
    section.appendChild(sectionTitle)
    return section
  }

  private addTextInputToSection(section: HTMLElement, label: string, value: string, onChange: (value: string) => void): void {
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
  }

  private addNumberInputToSection(section: HTMLElement, label: string, value: number, onChange: (value: number) => void): void {
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
  }

  private addCheckboxToSection(section: HTMLElement, label: string, value: boolean, onChange: (value: boolean) => void): void {
    const labelId = `label-${Math.random().toString(36).substr(2, 9)}`
    const checkboxContainer = createElement('div', { className: 'inspector-checkbox-row' })
    
    const labelEl = createElement('label', { className: 'inspector-label' })
    labelEl.setAttribute('for', labelId)
    setTextContent(labelEl, label)
    checkboxContainer.appendChild(labelEl)

    const checkbox = createElement('input', {
      attributes: {
        type: 'checkbox',
        id: labelId
      }
    }) as HTMLInputElement
    checkbox.setAttribute('aria-labelledby', labelId)
    checkbox.classList.add('inspector-switch')
    checkbox.checked = value
    checkbox.addEventListener('change', () => onChange(checkbox.checked))
    checkboxContainer.appendChild(checkbox)

    section.appendChild(checkboxContainer)
  }

  onPropertyChanged(handler: (element: Button | Field) => void): void {
    this.changeCallback = handler
  }
}
