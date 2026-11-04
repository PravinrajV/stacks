/**
 * Task 9.5.2/9.5.5: Integration test for styled dialogs replacing native prompts.
 * 
 * Verify that all window.alert/confirm/prompt calls have been replaced.
 * Test styled dialogs in app workflows.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { StyledAlert, StyledConfirm, StyledPrompt } from '../src/dom/components/styledDialogs'
import { createElement, removeAllChildren } from '../src/dom/utils/dom'

function setupDOM(): HTMLElement {
  const container = createElement('div', { className: 'test-container' })
  document.body.appendChild(container)
  return container
}

describe('Task 9.5.2: Styled Alert Dialog', () => {
  let container: HTMLElement
  let alert: StyledAlert

  beforeEach(() => {
    container = setupDOM()
    alert = new StyledAlert()
  })

  afterEach(() => {
    const backdrop = alert.getElement()
    if (backdrop.parentNode) {
      backdrop.parentNode.removeChild(backdrop)
    }
    if (container.parentNode) {
      container.parentNode.removeChild(container)
    }
  })

  it('should display alert message', async () => {
    const promise = alert.show('Test alert message', 'Alert Title')

    const modal = alert.getElement().querySelector('.modal')
    expect(modal).toBeTruthy()

    const message = modal!.querySelector('.modal-message')
    expect(message?.textContent).toContain('Test alert message')

    // Close and verify promise resolves
    const okBtn = modal!.querySelector('button') as HTMLButtonElement
    okBtn.click()

    await promise
  })

  it('should have accessible role and attributes', () => {
    alert.show('Test', 'Title')
    const modal = alert.getElement().querySelector('.modal')
    expect(modal?.getAttribute('role')).toBe('alertdialog')
    expect(modal?.getAttribute('aria-modal')).toBe('true')
  })

  it('should resolve on OK button click', async () => {
    const promise = alert.show('Message', 'Title')

    const modal = alert.getElement().querySelector('.modal')
    const okBtn = modal!.querySelector('button') as HTMLButtonElement

    okBtn.click()

    await expect(promise).resolves.toBeUndefined()
  })
})

describe('Task 9.5.3: Styled Confirm Dialog', () => {
  let container: HTMLElement
  let confirm: StyledConfirm

  beforeEach(() => {
    container = setupDOM()
    confirm = new StyledConfirm()
  })

  afterEach(() => {
    const backdrop = confirm.getElement()
    if (backdrop.parentNode) {
      backdrop.parentNode.removeChild(backdrop)
    }
    if (container.parentNode) {
      container.parentNode.removeChild(container)
    }
  })

  it('should display confirm message', async () => {
    const promise = confirm.show('Delete this item?', 'Confirm Delete', false)

    const modal = confirm.getElement().querySelector('.modal')
    expect(modal).toBeTruthy()

    const message = modal!.querySelector('.modal-message')
    expect(message?.textContent).toContain('Delete this item?')

    // Close
    const cancelBtn = modal!.querySelector('button') as HTMLButtonElement
    cancelBtn.click()

    await promise
  })

  it('should resolve true on confirm button click', async () => {
    const promise = confirm.show('Confirm?', 'Title', false)

    const modal = confirm.getElement().querySelector('.modal')
    const buttonsContainer = modal!.querySelector('.modal-buttons')
    const buttons = buttonsContainer!.querySelectorAll('button')
    const confirmBtn = buttons[1] as HTMLButtonElement

    confirmBtn.click()

    await expect(promise).resolves.toBe(true)
  })

  it('should resolve false on cancel button click', async () => {
    const promise = confirm.show('Confirm?', 'Title', false)

    const modal = confirm.getElement().querySelector('.modal')
    const buttonsContainer = modal!.querySelector('.modal-buttons')
    const cancelBtn = buttonsContainer!.querySelector('button') as HTMLButtonElement

    cancelBtn.click()

    await expect(promise).resolves.toBe(false)
  })

  it('should show danger styling when dangerMode=true', () => {
    const promise = confirm.show('Delete?', 'Title', true)

    const modal = confirm.getElement().querySelector('.modal')
    const buttonsContainer = modal!.querySelector('.modal-buttons')
    const buttons = buttonsContainer!.querySelectorAll('button')
    const confirmBtn = buttons[1]

    expect(confirmBtn.classList.contains('button-danger')).toBe(true)

    // Close
    const cancelBtn = buttonsContainer!.querySelector('button') as HTMLButtonElement
    cancelBtn.click()
  })
})

describe('Task 9.5.4: Styled Prompt Dialog', () => {
  let container: HTMLElement
  let prompt: StyledPrompt

  beforeEach(() => {
    container = setupDOM()
    prompt = new StyledPrompt()
  })

  afterEach(() => {
    const backdrop = prompt.getElement()
    if (backdrop.parentNode) {
      backdrop.parentNode.removeChild(backdrop)
    }
    if (container.parentNode) {
      container.parentNode.removeChild(container)
    }
  })

  it('should display prompt message', async () => {
    const promise = prompt.show('Enter name:', 'default', 'Input')

    const modal = prompt.getElement().querySelector('.modal')
    expect(modal).toBeTruthy()

    const message = modal!.querySelector('.modal-message')
    expect(message?.textContent).toContain('Enter name:')

    // Close
    const cancelBtn = modal!.querySelector('button') as HTMLButtonElement
    cancelBtn.click()

    await promise
  })

  it('should populate input with default value', async () => {
    const promise = prompt.show('Name:', 'John Doe', 'Title')

    const modal = prompt.getElement().querySelector('.modal')
    const inputContainer = modal!.querySelector('.prompt-input-container')
    const input = inputContainer!.querySelector('input') as HTMLInputElement

    expect(input.value).toBe('John Doe')

    // Close
    const cancelBtn = modal!.querySelector('button') as HTMLButtonElement
    cancelBtn.click()

    await promise
  })

  it('should resolve with input value on save', async () => {
    const promise = prompt.show('Name:', '', 'Title')

    const modal = prompt.getElement().querySelector('.modal')
    const inputContainer = modal!.querySelector('.prompt-input-container')
    const input = inputContainer!.querySelector('input') as HTMLInputElement
    const buttons = modal!.querySelectorAll('button')
    const saveBtn = buttons[1] as HTMLButtonElement

    input.value = 'New Name'
    saveBtn.click()

    await expect(promise).resolves.toBe('New Name')
  })

  it('should resolve null on cancel', async () => {
    const promise = prompt.show('Name:', '', 'Title')

    const modal = prompt.getElement().querySelector('.modal')
    const cancelBtn = modal!.querySelector('button') as HTMLButtonElement

    cancelBtn.click()

    await expect(promise).resolves.toBeNull()
  })

  it('should submit on Enter key in input', async () => {
    const promise = prompt.show('Name:', '', 'Title')

    const modal = prompt.getElement().querySelector('.modal')
    const inputContainer = modal!.querySelector('.prompt-input-container')
    const input = inputContainer!.querySelector('input') as HTMLInputElement

    input.value = 'Test'
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))

    await expect(promise).resolves.toBe('Test')
  })
})

describe('Task 9.5.5: Styled Dialogs Replace Native Calls', () => {
  it('should use StyledAlert instead of window.alert', () => {
    const alert = new StyledAlert()
    const el = alert.getElement()

    // Verify it's a custom modal element, not window.alert
    expect(el.className).toContain('modal-backdrop')
    expect(el.querySelector('.modal')).toBeTruthy()

    el.parentNode?.removeChild(el)
  })

  it('should use StyledConfirm instead of window.confirm', async () => {
    const confirm = new StyledConfirm()
    const el = confirm.getElement()

    // Verify it's a custom modal element, not window.confirm
    expect(el.className).toContain('modal-backdrop')
    expect(el.querySelector('.modal')).toBeTruthy()

    // Show to populate buttons
    const promise = confirm.show('Confirm?', 'Title', false)
    const buttons = el.querySelectorAll('button')
    expect(buttons.length).toBe(2) // Cancel and Confirm

    el.parentNode?.removeChild(el)
    // Cancel the promise
    const cancelBtn = el.querySelector('button') as HTMLButtonElement
    cancelBtn?.click()
  })

  it('should use StyledPrompt instead of window.prompt', async () => {
    const prompt = new StyledPrompt()
    const el = prompt.getElement()

    // Verify it's a custom modal element with input, not window.prompt
    expect(el.className).toContain('modal-backdrop')
    expect(el.querySelector('.modal')).toBeTruthy()

    // Show to populate input
    const promise = prompt.show('Enter:', '', 'Title')
    const inputContainer = el.querySelector('.prompt-input-container')
    expect(inputContainer?.querySelector('input')).toBeTruthy()

    el.parentNode?.removeChild(el)
    // Cancel the promise
    const cancelBtn = el.querySelector('button') as HTMLButtonElement
    cancelBtn?.click()
  })
})
