# Generator: AI Script Writer

Text-to-code generation for HyperTalk scripts using language models.

## Providers (BYOK: Bring Your Own Key)

### 1. Mock Provider (Default)
Works offline with no configuration. Perfect for testing and development.

### 2. Anthropic Claude (BYOK)
Browser-direct fetch to Anthropic API. Requires your own API key.

**Setup:**
1. Get an API key from [console.anthropic.com](https://console.anthropic.com)
2. Open Settings in the app
3. Select "Anthropic Claude" provider
4. Enter your API key (starts with `sk-ant-`)
5. Optionally set model (default: `claude-3-5-sonnet-20241022`)

**Security:**
- API key stays in this browser tab (sessionStorage only)
- Never saved to localStorage, exports, or logs
- Sent only to Anthropic API
- Password input with autocomplete=off
- Clear button to remove key anytime

### 3. Ollama (Local, BYOK)
Run language models locally on your machine. No API key needed.

**Setup:**
1. Install [Ollama](https://ollama.ai)
2. Start Ollama: `ollama serve`
3. Pull a model: `ollama pull mistral` (or `neural-chat`, `llama2`, etc.)
4. Open Settings in the app
5. Select "Ollama" provider
6. Set base URL (default: `http://localhost:11434`)
7. Set model name (default: `mistral`)

**Privacy:**
- All processing happens on your local machine
- No data sent to any external server
- Works completely offline

## Architecture

- **ProviderRegistry** — Plugin system with fallback chain
  - Priority order: Configured providers → Mock
  - Automatic fallback if provider unavailable
  - Support for registering custom providers
- **ModelProvider** — Abstract base interface
- **AnthropicProvider** — Browser-direct BYOK for Claude
- **OllamaProvider** — Local LLM support
- **MockProvider** — Offline testing provider
- **ScriptGen** — Main entry point for text-to-code generation

## Example: Using Anthropic Provider

```typescript
import { providerRegistry } from './providerRegistry'

const anthropic = providerRegistry.getAnthropicProvider()
anthropic.setApiKey('sk-ant-...')
anthropic.setModel('claude-3-5-sonnet-20241022')

const result = await providerRegistry.generate({
  description: 'When clicked, update the score field by adding 1',
  context: {
    cardName: 'Game Board',
    fieldNames: ['score', 'level'],
    buttonLabels: ['Score Button']
  }
})

console.log(result.code)
```

## Example: Using Ollama Provider

```typescript
import { providerRegistry } from './providerRegistry'

const ollama = providerRegistry.getOllamaProvider()
ollama.setBaseUrl('http://localhost:11434')
ollama.setModel('mistral')

const result = await providerRegistry.generate({
  description: 'Show alert with current score',
  context: {
    fieldNames: ['score']
  }
})

console.log(result.code)
```

## Validation

Generated scripts are validated before execution:

1. Lexer/Parser must succeed (syntax check)
2. Type checking against known fields/buttons
3. No dangerous operations (no fetch, window access, etc.)

## Security & Privacy

### Key Storage
- **In memory**: Current key during session
- **SessionStorage only**: Persists key across page refreshes (same tab)
- **Never localStorage**: Would persist across tabs
- **Never exported**: Not included in stack exports
- **Never logged**: Redacted in error messages and console

### Network
- **Anthropic**: Fetch goes directly to `api.anthropic.com/v1/messages`
- **Ollama**: Fetch goes to your local `localhost:11434`
- Both use header: `content-type: application/json`

### Timeout
- Anthropic: 30 seconds timeout per request
- Ollama: 60 seconds timeout per request (local can be slower)
- Uses AbortController for cancellation

## Notes

- Outputs are suggestions; users can edit before executing
- Generated code must be human-readable HyperTalk
- All output is validated before inserting into the DOM
- Provider selection stored in app settings
- API keys NOT stored between sessions (sessionStorage clears on browser close)
