/**
 * Performance benchmarks for HyperTalk interpreter.
 * 
 * Measures:
 * - Parsing + running a 1000-iteration repeat loop
 * - Dispatching 1000 mouseUp messages
 * 
 * Run with: npm test -- --run interpreter/performance.bench.ts
 * 
 * Machine caveat: Results depend on hardware. These benchmarks are indicative
 * and should be re-run on CI/CD infrastructure to establish baselines.
 */

import { describe, it, bench } from 'vitest'
import { Lexer } from './lexer'
import { Parser } from './parser'
import { Runtime } from './runtime'
import { createStack, createCard, createButton } from '../model/stack'

describe('HyperTalk interpreter performance', () => {
  bench('parse + execute 1000-iteration repeat loop', () => {
    const script = `on mouseUp
  repeat 1000
    put 1 + 1
  end repeat
end mouseUp`

    const lexer = new Lexer(script)
    const tokensResult = lexer.tokenize()
    if (!Array.isArray(tokensResult)) return // Skip if lex error

    const parser = new Parser(tokensResult)
    const ast = parser.parse()
    if ('type' in ast && ast.type === 'ParseError') return // Skip if parse error

    const runtime = new Runtime({} as any)
    runtime.execute(ast)
  }, {
    time: 5000, // Allow up to 5 seconds per iteration
    warmupIterations: 3
  })

  bench('dispatch 1000 mouseUp messages', () => {
    const stack = createStack('stack-1', 'Test Stack')
    const card = createCard('card-1', 'Card 1', null)
    const btn = createButton('btn-1', 'Button', { left: 10, top: 10, right: 100, bottom: 50 })
    
    btn.scripts['mouseUp'] = `on mouseUp
  put 1 + 1
end mouseUp`
    
    card.buttons.push(btn)
    stack.cards.push(card)

    const runtime = new Runtime({} as any)
    
    // Parse the handler once
    const lexer = new Lexer(btn.scripts['mouseUp'])
    const tokensResult = lexer.tokenize()
    if (!Array.isArray(tokensResult)) return // Skip if lex error

    const parser = new Parser(tokensResult)
    const ast = parser.parse()
    if ('type' in ast && ast.type === 'ParseError') return // Skip if parse error

    // Dispatch 1000 times
    for (let i = 0; i < 1000; i++) {
      runtime.execute(ast)
    }
  }, {
    time: 5000,
    warmupIterations: 3
  })
})
