# Model: Data Structures

Core immutable data structures representing Stacks, Cards, Buttons, and Fields.

## Exports

- **Stack**, **Card**, **Button**, **Field**, **Background** — Main data types
- **Rect** — Geometry primitive (left, top, right, bottom)
- **createStack**, **createCard**, **createButton**, **createField** — Factory functions
- **serializeStack**, **deserializeStack** — JSON serialization
- **validateStack**, **validateCard** — Type validation

## Key Design

- Immutable: all updates return new objects, no mutations
- Type-safe: TypeScript strict mode throughout
- Serializable: JSON-based wire format for persistence and sharing

## Example

```typescript
import { createStack, createCard, createButton } from './stack'

const stack = createStack('stack-1', 'My Stack')
const card = createCard('card-1', 'Home')
const btn = createButton('btn-1', 'Click Me', { left: 10, top: 10, right: 100, bottom: 50 })

btn.scripts['mouseUp'] = `on mouseUp
  put "Hello" into field "Message"
end mouseUp`

card.buttons.push(btn)
stack.cards.push(card)
```

## Serialization

Stacks are serialized to JSON for storage and sharing:

```typescript
import { serializeStack, deserializeStack } from './serialization'

const json = serializeStack(stack)
const restored = deserializeStack(json)
```
