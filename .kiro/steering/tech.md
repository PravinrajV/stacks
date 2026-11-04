# Stacks: Technical Architecture

## Stack & Tooling

- **Language**: TypeScript (strict mode).
- **Build & Dev**: Vite (fast HMR, minimal config).
- **UI**: Vanilla DOM (no React, Vue, Svelte). Direct element manipulation.
- **Testing**: Vitest with property-based tests (fast-check). Aim for fast, property-focused unit tests over snapshot tests.
- **Deployment**: Cloudflare Pages (static hosting) + Cloudflare Workers (serverless script execution, optional AI gateway).

## Core Modules

1. **Stack/Card/Field Model**: Immutable data structures. Card ↔ DOM sync via simple diffing.
2. **HyperTalk Interpreter**: 
   - Custom lexer/parser (no `eval`). 
   - Restricted namespace: only safe builtins (math, string, array ops).
   - Sandbox: no `fetch`, `require`, `window.location` changes.
   - Variable scoping: local, card-level, stack-level.
3. **Script Editor**: Syntax highlighting. Error reporting with line numbers. Live preview.
4. **AI Feature** (Optional Local Model):
   - Text-to-script: "When the user clicks, show an alert with the card's title."
   - Uses Claude API or local LLM (e.g., Ollama, Llama 2).
   - Output validation: generated code must parse and type-check before executing.
5. **Serialization**: JSON-based stack format. Canonical, human-readable.
6. **Rendering Engine**: CSS grid for card layout. Pixel art–friendly fonts. 1-bit dithering for images (optional).

## Constraints

- No external DOM libraries (Tailwind, Material-UI, etc.). Pure CSS.
- No runtime eval. Parser-based execution only.
- Keep bundle size <500KB gzipped for initial load.
- Property-based tests for parsing, field validation, script execution.

## Optional: Local Model Integration

If time permits: bundle a quantized model (GGML format) for offline script generation via Cloudflare Workers or Wasm runtime.
