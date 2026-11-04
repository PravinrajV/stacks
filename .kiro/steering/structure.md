# Stacks: Project Structure

```
stacks/
├── .kiro/
│   └── steering/           # This file and product/tech visions
├── src/
│   ├── main.ts             # App entry point
│   ├── dom/
│   │   ├── renderer.ts     # Card → DOM rendering
│   │   ├── editor.ts       # Script editor UI
│   │   └── styles.css      # 1-bit aesthetic (black/white/gray only)
│   ├── model/
│   │   ├── stack.ts        # Stack, Card, Field, Button data structures
│   │   └── serialization.ts # JSON ↔ object
│   ├── interpreter/
│   │   ├── lexer.ts        # HyperTalk tokenization
│   │   ├── parser.ts       # AST generation
│   │   ├── runtime.ts      # Script execution in sandbox
│   │   └── builtins.ts     # Safe built-in functions
│   ├── ai/
│   │   └── scriptGen.ts    # Text-to-script via API/local model
│   ├── storage/
│   │   └── cloudflare.ts   # KV storage for stack persistence
│   └── utils/
│       ├── validation.ts   # Input sanitization
│       └── logging.ts      # Debug/error logging
├── tests/
│   ├── model.test.ts
│   ├── interpreter.test.ts # Property-based tests for parsing
│   ├── renderer.test.ts
│   └── scriptGen.test.ts
├── vite.config.ts
├── vitest.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Key Design Decisions

- **Flat interpreter module**: Lexer → Parser → Runtime. No intermediate IR.
- **Data-model-first**: Stack/Card/Field are pure data. Renderer consumes and syncs to DOM.
- **Tests colocated**: `*.test.ts` next to implementation files for fast feedback.
- **No monorepo complexity**: Single Vite app for Kiroween scope.
