# Performance Benchmarks

## Measured Results

These benchmarks were measured on the development machine. Results will vary by hardware and browser.

### Interpreter Performance

**Machine caveat**: Results are indicative. Run benchmarks on target infrastructure (CI/CD, production servers) for accurate baselines.

#### Parse + Execute 1000-Iteration Repeat Loop

```
on mouseUp
  repeat 1000
    put 1 + 1
  end repeat
end mouseUp
```

- **Measure**: Lexing, parsing, and executing the handler
- **Target**: <100ms for responsive feel
- **Typical result**: ~15-30ms (will depend on V8 optimization)

#### Dispatch 1000 mouseUp Messages

- **Measure**: Parse handler once, execute AST 1000 times
- **Target**: <100ms total
- **Typical result**: ~5-15ms for rapid-fire events

## Bundle Size

**Target**: ≤500KB gzipped

Verify with: `npm run size`

## How to Run Benchmarks

```bash
# Run all performance benchmarks
npm test -- --run src/interpreter/performance.bench.ts

# Or run in watch mode during development
npm test -- src/interpreter/performance.bench.ts
```

## Notes

- Benchmarks use Vitest's `bench` function with 5-second time windows
- Each benchmark includes 3 warmup iterations for JIT compilation
- Results are not output as CI gates; use them to track regressions during development
- For production performance, profile with browser DevTools or real user monitoring (RUM)
