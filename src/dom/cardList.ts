/**
 * Task 7.2: CardListPanel UI component.
 * 
 * Displays list of cards with +/- buttons.
 */

import { createElement, setTextContent, removeAllChildren, addEventListener } from './utils/dom'
import type { Stack, Card } from '../model/stack'
import { ButtonComponent } from './components/button'

export class CardListPanel {
  private element: HTMLElement
  private cardList: HTMLElement
  private onSelectCard: ((cardId: string) => void) | null = null
  private onAddCard: (() => void) | null = null
  private onDeleteCard: ((cardId: string) => void) | null = null

  constructor() {
    this.element = createElement('div', {
      className: 'card-list-panel'
    })
    this.element.setAttribute('aria-label', 'Card list')
    this.element.setAttribute('role', 'region')

    const title = createElement('div')
    title.setAttribute('role', 'heading')
    title.setAttribute('aria-level', '2')
    setTextContent(title, 'Cards')
    title.style.fontWeight = 'bold'
    this.element.appendChild(title)

    this.cardList = createElement('div', {
      className: 'card-list'
    })
    this.cardList.setAttribute('role', 'list')
    this.element.appendChild(this.cardList)

    const addBtn = new ButtonComponent('+ Add Card')
    addBtn.onClick(() => this.onAddCard?.())
    addBtn.getElement().setAttribute('aria-label', 'Add new card')
    this.element.appendChild(addBtn.getElement())
  }

  getElement(): HTMLElement {
    return this.element
  }

  render(stack: Stack, currentCardId: string): void {
    removeAllChildren(this.cardList)

    for (const card of stack.cards) {
      const classes = ['card-item']
      if (card.id === currentCardId) {
        classes.push('selected')
      }
      const item = createElement('div', {
        className: classes
      })
      item.setAttribute('data-card-id', card.id)
      item.setAttribute('role', 'listitem')
      item.setAttribute('aria-label', `${card.name || `Card ${card.id}`}${card.id === currentCardId ? ' (current)' : ''}`)
      item.setAttribute('tabindex', '0')

      const label = createElement('div', {
        className: 'card-item-label'
      })
      setTextContent(label, card.name || `Card ${card.id}`)
      item.appendChild(label)

      const deleteBtn = createElement('button', {
        className: 'card-item-delete'
      })
      deleteBtn.setAttribute('aria-label', `Delete ${card.name || `Card ${card.id}`}`)
      setTextContent(deleteBtn, '−')
      addEventListener(deleteBtn, 'click', (e) => {
        e.stopPropagation()
        this.onDeleteCard?.(card.id)
      })
      item.appendChild(deleteBtn)

      addEventListener(item, 'click', () => {
        this.onSelectCard?.(card.id)
      })
      
      // Allow keyboard activation (Enter/Space)
      addEventListener(item, 'keydown', (e) => {
        const keyEvent = e as KeyboardEvent
        if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
          keyEvent.preventDefault()
          this.onSelectCard?.(card.id)
        }
      })

      this.cardList.appendChild(item)
    }
  }

  onSelectCardChanged(handler: (cardId: string) => void): void {
    this.onSelectCard = handler
  }

  onAddCardClicked(handler: () => void): void {
    this.onAddCard = handler
  }

  onDeleteCardClicked(handler: (cardId: string) => void): void {
    this.onDeleteCard = handler
  }
}
