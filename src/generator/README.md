# Generator: AI Script Writer

Text-to-code generation for HyperTalk scripts using language models.

## Current Status

**MockProvider only** — The generator currently uses a mock provider for testing.
To enable real AI code generation:

1. Implement a `ModelProvider` for Claude API or local LLM
2. Register it via `providerRegistry.register()`
3. Update `scriptGen.ts` to use the real provider

## Architecture

- **ProviderRegistry** — Plugin system for model providers (Claude API, local LLM, etc.)
- **MockProvider** — Test implementation that returns fixed outputs
- **ModelProvider** — Interface for language model backends
- **ScriptGen** — Main entry point for text-to-code generation

## Example

```typescript
import { generateScript } from './scriptGen'

const userRequest = "When the user clicks, show an alert with the card's title"
const generatedCode = await generateScript(userRequest, {
  cardName: 'Home',
  selectedElement: 'button-1'
})

console.log(generatedCode)
// on mouseUp
//   answer "Home"
// end mouseUp
```

## Validation

Generated scripts are validated before execution:

1. Lexer/Parser must succeed (syntax check)
2. Type checking against known fields/buttons
3. No dangerous operations (no fetch, window access, etc.)

## Providers

To add a real provider:

```typescript
import { providerRegistry } from './providerRegistry'

class ClaudeProvider implements ModelProvider {
  async generate(prompt: string): Promise<string> {
    // Call Claude API
  }
}

providerRegistry.register('claude', new ClaudeProvider())
```

## Notes

- Outputs are suggestions; users can edit before executing
- Generated code must be human-readable HyperTalk
- All output is validated before inserting into the DOM
