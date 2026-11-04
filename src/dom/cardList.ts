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

    const title = createElement('div')
    setTextContent(title, 'Cards')
    title.style.fontWeight = 'bold'
    this.element.appendChild(title)

    this.cardList = createElement('div', {
      className: 'card-list'
    })
    this.element.appendChild(this.cardList)

    const addBtn = new ButtonComponent('+ Add Card')
    addBtn.onClick(() => this.onAddCard?.())
    this.element.appendChild(addBtn.getElement())
  }

  getElement(): HTMLElement {
    return this.element
  }

  render(stack: Stack, currentCardId: string): void {
    removeAllChildren(this.cardList)

    for (const card of stack.cards) {
      const item = createElement('div', {
        className: 'card-item' + (card.id === currentCardId ? ' selected' : '')
      })
      item.setAttribute('data-card-id', card.id)

      const label = createElement('div', {
        className: 'card-item-label'
      })
      setTextContent(label, card.name || `Card ${card.id}`)
      item.appendChild(label)

      const deleteBtn = createElement('button', {
        className: 'card-item-delete'
      })
      setTextContent(deleteBtn, '−')
      addEventListener(deleteBtn, 'click', (e) => {
        e.stopPropagation()
        this.onDeleteCard?.(card.id)
      })
      item.appendChild(deleteBtn)

      addEventListener(item, 'click', () => {
        this.onSelectCard?.(card.id)
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
