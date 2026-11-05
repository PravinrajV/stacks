/**
 * Task 9.5.1: Welcome screen component for empty state.
 * 
 * Displays a welcome overlay on first visit with:
 * - localStorage 'stacks-welcomed' flag
 * - Glass card centered with ghost SVG
 * - Title, bullet tips, two buttons
 * - Escape closes, role=dialog aria-modal, focus trapped
 */

import { createElement, setTextContent, removeAllChildren, addEventListener } from './utils/dom'
import { createBrandMark } from './icons'

export class WelcomeScreen {
  private backdrop: HTMLElement
  private modal: HTMLElement
  private onCreateNewCallback: (() => void) = () => {}
  private onLoadExampleCallback: (() => void) = () => {}
  private previousFocusedElement: HTMLElement | null = null

  constructor() {
    this.backdrop = createElement('div', {
      className: 'modal-backdrop'
    })
    this.backdrop.setAttribute('aria-hidden', 'true')
    this.backdrop.style.display = 'none'

    this.modal = createElement('div', {
      className: 'welcome-modal'
    })
    this.modal.setAttribute('role', 'dialog')
    this.modal.setAttribute('aria-modal', 'true')
    this.modal.setAttribute('aria-labelledby', 'welcome-title')

    // Brand mark icon
    const iconContainer = createElement('div', { className: 'welcome-icon' })
    const brandMark = createBrandMark()
    brandMark.setAttribute('width', '64')
    brandMark.setAttribute('height', '64')
    iconContainer.appendChild(brandMark)
    this.modal.appendChild(iconContainer)

    // Title
    const title = createElement('h1', { className: 'welcome-title' })
    title.setAttribute('id', 'welcome-title')
    setTextContent(title, 'Stacks — HyperCard, resurrected')
    this.modal.appendChild(title)

    // Description
    const description = createElement('p', { className: 'welcome-description' })
    setTextContent(description, 'Create interactive card-based experiences with visual editing and HyperTalk scripting.')
    this.modal.appendChild(description)

    // Tips list
    const tipsList = createElement('ul', { className: 'welcome-tips' })
    const tips = [
      'Edit cards with drag-and-drop buttons and fields',
      'Write HyperTalk scripts in plain English syntax',
      'Press Run to test your stack interactively'
    ]
    for (const tip of tips) {
      const li = createElement('li')
      setTextContent(li, tip)
      tipsList.appendChild(li)
    }
    this.modal.appendChild(tipsList)

    // Buttons container
    const buttonsContainer = createElement('div', {
      className: 'welcome-buttons'
    })

    // Create New Stack button (primary)
    const newStackBtn = createElement('button', {
      className: 'welcome-btn welcome-btn-primary'
    })
    setTextContent(newStackBtn, 'Start blank stack')
    addEventListener(newStackBtn, 'click', (evt: Event) => {
      this.handleCreateNew()
    })
    addEventListener(newStackBtn, 'keydown', (evt: Event) => {
      const keyEvent = evt as KeyboardEvent
      if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
        keyEvent.preventDefault()
        this.handleCreateNew()
      }
    })
    buttonsContainer.appendChild(newStackBtn)

    // Load Example button (secondary)
    const exampleBtn = createElement('button', {
      className: 'welcome-btn welcome-btn-secondary'
    })
    setTextContent(exampleBtn, 'Open the Haunted Counter')
    addEventListener(exampleBtn, 'click', (evt: Event) => {
      this.handleLoadExample()
    })
    addEventListener(exampleBtn, 'keydown', (evt: Event) => {
      const keyEvent = evt as KeyboardEvent
      if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
        keyEvent.preventDefault()
        this.handleLoadExample()
      }
    })
    buttonsContainer.appendChild(exampleBtn)

    this.modal.appendChild(buttonsContainer)
    this.backdrop.appendChild(this.modal)

    // Escape to close
    addEventListener(this.backdrop, 'keydown', (evt: Event) => {
      const keyEvent = evt as KeyboardEvent
      if (keyEvent.key === 'Escape') {
        keyEvent.preventDefault()
        this.close()
      }
      // Tab focus trap
      if (keyEvent.key === 'Tab') {
        this.handleTabKey(keyEvent)
      }
    })

    // Prevent clicking on modal itself from closing
    addEventListener(this.modal, 'click', (evt: Event) => {
      evt.stopPropagation()
    })

    // Close on backdrop click
    addEventListener(this.backdrop, 'click', (evt: Event) => {
      if (evt.target === this.backdrop) {
        this.close()
      }
    })

    document.body.appendChild(this.backdrop)
  }

  private handleTabKey(evt: KeyboardEvent): void {
    const buttons = this.modal.querySelectorAll('button')
    if (buttons.length === 0) return

    const currentIndex = Array.from(buttons).indexOf(document.activeElement as HTMLButtonElement)
    let nextIndex = currentIndex

    if (evt.shiftKey) {
      nextIndex = currentIndex <= 0 ? buttons.length - 1 : currentIndex - 1
    } else {
      nextIndex = currentIndex >= buttons.length - 1 ? 0 : currentIndex + 1
    }

    evt.preventDefault()
    evt.stopPropagation()
    const btn = buttons[nextIndex] as HTMLButtonElement
    btn.focus()
  }

  private handleCreateNew(): void {
    this.close()
    this.onCreateNewCallback()
  }

  private handleLoadExample(): void {
    this.close()
    this.onLoadExampleCallback()
  }

  show(): void {
    this.previousFocusedElement = document.activeElement as HTMLElement
    this.backdrop.style.display = 'flex'
    this.backdrop.setAttribute('aria-hidden', 'false')
    this.backdrop.classList.add('welcome-fade-in')

    // Focus first button
    const buttons = this.modal.querySelectorAll('button')
    if (buttons.length > 0) {
      (buttons[0] as HTMLButtonElement).focus()
    }
  }

  close(): void {
    this.backdrop.style.display = 'none'
    this.backdrop.setAttribute('aria-hidden', 'true')
    this.backdrop.classList.remove('welcome-fade-in')

    if (this.previousFocusedElement && document.body.contains(this.previousFocusedElement)) {
      this.previousFocusedElement.focus()
    }
  }

  onCreateNewClicked(callback: () => void): void {
    this.onCreateNewCallback = callback
  }

  onLoadExampleClicked(callback: () => void): void {
    this.onLoadExampleCallback = callback
  }

  getElement(): HTMLElement {
    return this.backdrop
  }
}
