/**
 * Script generation: prompt building, response parsing, validation via parser.
 * REQ-SG-001, REQ-SG-003
 *
 * Pipeline:
 * 1. Build prompt from user description and card context.
 * 2. Call model provider to generate code.
 * 3. Parse response to extract HyperTalk code.
 * 4. Validate extracted code using the existing parser.
 * 5. Generate diff showing what will be added/changed.
 */

import { ModelProvider, ScriptGenRequest, ScriptGenResponse } from './modelProvider'
import { parse } from '../interpreter/parser'
import { tokenize } from '../interpreter/lexer'
import type { ParseError } from '../interpreter/parser'

/**
 * Task 4.4: Build prompt and context for script generation.
 */
export function buildPrompt(
  description: string,
  context: {
    cardName?: string
    fieldNames?: string[]
    buttonLabels?: string[]
  }
): string {
  const fieldList = context.fieldNames?.length ? `Fields: ${context.fieldNames.join(', ')}` : ''
  const buttonList = context.buttonLabels?.length ? `Buttons: ${context.buttonLabels.join(', ')}` : ''
  const cardRef = context.cardName ? `Card: ${context.cardName}` : ''

  const contextStr = [cardRef, fieldList, buttonList].filter(Boolean).join('\n')

  return `Generate HyperTalk code for the following request:

${description}

${contextStr ? `Context:\n${contextStr}` : ''}

Output ONLY valid HyperTalk code. No explanations, no code blocks, just the handler definition.
Example format:
on mouseUp
  answer "Hello world"
end mouseUp`
}

/**
 * Task 4.5: Parse response to extract HyperTalk code.
 */
export function parseResponse(response: string): string {
  // Try to extract code from markdown-style code block first
  const codeBlockMatch = response.match(
    /```(?:hyperscript|hypertalk|ht)?\n?([\s\S]*?)\n?```/i
  )
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim()
  }

  // Try to extract from indented code block
  const indentedMatch = response.match(/^(?:    |\t)+(.*?)(?:\n(?:    |\t)+|$)/m)
  if (indentedMatch) {
    return response
      .split('\n')
      .filter(line => line.match(/^(?:    |\t)+/))
      .map(line => line.replace(/^(?:    |\t)+/, ''))
      .join('\n')
      .trim()
  }

  // If no code block found, return the entire response (assume it's already code)
  return response.trim()
}

export type ValidationResult = 
  | { valid: true }
  | { valid: false; error: ParseError }

/**
 * Task 4.6: Validate generated code using the existing parser.
 */
export function validateGenerated(code: string): ValidationResult {
  try {
    const tokensResult = tokenize(code)
    
    // Check if tokenize returned an error
    if (!Array.isArray(tokensResult)) {
      return {
        valid: false,
        error: {
          type: 'ParseError',
          message: tokensResult.message,
          line: 0,
          column: 0
        }
      }
    }
    
    const result = parse(tokensResult)
    
    // Check if parser returned an error
    if ('type' in result && result.type === 'ParseError') {
      return {
        valid: false,
        error: result
      }
    }
    
    return { valid: true }
  } catch (err) {
    return {
      valid: false,
      error: {
        type: 'ParseError',
        message: err instanceof Error ? err.message : 'Unknown error',
        line: 0,
        column: 0
      }
    }
  }
}

/**
 * Task 4.7: Generate diff showing what will be added/changed.
 */
export interface DiffLine {
  type: 'add' | 'remove' | 'context'
  content: string
  lineNumber?: number
}

export function generateDiff(oldCode: string, newCode: string): DiffLine[] {
  const oldLines = oldCode.split('\n')
  const newLines = newCode.split('\n')

  const diff: DiffLine[] = []

  // Simple line-by-line diff (not a full diff algorithm, but sufficient for our use case)
  const maxLen = Math.max(oldLines.length, newLines.length)

  for (let i = 0; i < maxLen; i++) {
    const oldLine = oldLines[i]
    const newLine = newLines[i]

    if (oldLine === undefined) {
      // New lines in newCode
      diff.push({
        type: 'add',
        content: newLine,
        lineNumber: i + 1
      })
    } else if (newLine === undefined) {
      // Removed lines
      diff.push({
        type: 'remove',
        content: oldLine,
        lineNumber: i + 1
      })
    } else if (oldLine !== newLine) {
      // Changed line
      diff.push({
        type: 'remove',
        content: oldLine,
        lineNumber: i + 1
      })
      diff.push({
        type: 'add',
        content: newLine,
        lineNumber: i + 1
      })
    } else {
      // Unchanged line
      diff.push({
        type: 'context',
        content: oldLine,
        lineNumber: i + 1
      })
    }
  }

  return diff
}

/**
 * Main script generation function: orchestrates the full pipeline.
 */
export async function generateScript(
  provider: ModelProvider,
  description: string,
  context: {
    cardName?: string
    fieldNames?: string[]
    buttonLabels?: string[]
  },
  currentScript?: string
): Promise<{
  code: string
  diff: DiffLine[]
  explanation?: string
} | {
  error: string
}> {
  try {
    // Check provider availability
    const available = await provider.isAvailable()
    if (!available) {
      return { error: `Model provider "${provider.name}" is not available` }
    }

    // Step 1: Build prompt (Task 4.4)
    const prompt = buildPrompt(description, context)

    // Step 2: Call model provider
    const response = await provider.generate({
      description: prompt,
      context,
      style: 'verbose'
    })

    // Step 3: Parse response (Task 4.5)
    const extractedCode = parseResponse(response.code)

    // Step 4: Validate (Task 4.6)
    const validation = validateGenerated(extractedCode)
    if (!validation.valid) {
      return { error: `Generated code is invalid: ${validation.error.message}` }
    }

    // Step 5: Generate diff (Task 4.7)
    const diff = generateDiff(currentScript || '', extractedCode)

    return {
      code: extractedCode,
      diff,
      explanation: response.explanation
    }
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Unknown error during generation'
    }
  }
}
