# Stacks: Project Structure

```
stacks/
├── .kiro/
│   ├── steering/           # Architecture & language conventions docs
│   ├── hooks/              # Automation on file save, test execution
│   ├── specs/
│   └── agents/
├── src/
│   ├── main.ts             # App entry point
│   ├── dom/
│   │   ├── app.ts          # Main coordinator, state management
│   │   ├── cardCanvas.ts   # Drag/resize/pan/zoom editor
│   │   ├── cardList.ts     # Navigation sidebar
│   │   ├── scriptEditor.ts # Script editor with syntax highlighting
│   │   ├── runMode.ts      # Run-mode event dispatch
│   │   ├── elementInspector.ts # Property inspector
│   │   ├── storage.ts      # localStorage persistence
│   │   ├── components/     # Button, TextInput, Modal components
│   │   ├── utils/          # DOM helpers, geometry utilities
│   │   └── styles.css      # 1-bit aesthetic (black/white/gray only)
│   ├── model/
│   │   ├── stack.ts        # Stack, Card, Field, Button data structures
│   │   ├── types.ts        # Rect and type definitions
│   │   └── serialization.ts # JSON ↔ object, validation
│   ├── interpreter/
│   │   ├── lexer.ts        # HyperTalk tokenization
│   │   ├── parser.ts       # AST generation
│   │   ├── runtime.ts      # Script execution in sandbox (no eval)
│   │   ├── dispatcher.ts   # Message routing to handlers
│   │   └── performance.bench.ts # Vitest benchmarks
│   ├── generator/
│   │   ├── scriptGen.ts    # Text-to-code entry point
│   │   ├── modelProvider.ts # Provider interface
│   │   ├── mockProvider.ts # Mock provider (current default)
│   │   └── providerRegistry.ts # Plugin registry with fallback chain
│   ├── storage/
│   │   ├── compression.ts  # Gzip utility for stack export
│   │   └── encoding.ts     # Base64 encoding for URLs
│   └── utils/
│       └── validation.ts   # Input sanitization
├── tests/
│   ├── keyboard-and-scrolling.test.ts # Real DOM tests via happy-dom
│   ├── run-mode-click.test.ts
│   ├── script-editor-features.test.ts
│   └── ui-integration.test.ts
├── docs/
│   ├── PERFORMANCE.md      # Benchmark results with machine caveat
│   └── BROWSER_SUPPORT.md
├── vite.config.ts
├── vitest.config.ts
├── package.json
├── tsconfig.json
├── README.md
└── index.html
```

## Key Design Decisions

- **Interpreter**: Lexer → Parser → Runtime. No eval, no innerHTML. Fully sandboxed.
- **DOM Layer**: Real happy-dom for testing; vanilla TS + CSS (no React/Vue/Svelte).
- **Testing**: Real DOM events (MouseEvent, KeyboardEvent, WheelEvent) dispatched in tests.
- **Data-model-first**: Stack/Card/Field are immutable. DOM syncs via event handlers.
- **Generator**: Mock provider only; real providers can be plugged in via registry.
- **Tests colocated**: `*.test.ts` next to source files for fast feedback.
- **No external DOM libraries**: Tailwind, Material Design, etc. Pure CSS only.


