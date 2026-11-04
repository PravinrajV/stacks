/**
 * Task 7.7: Storage management (localStorage + JSON import/export).
 */

import { Stack } from '../model/stack'
import { serializeStack, deserializeStack } from '../model/serialization'

const STORAGE_KEY = 'stacks_current'
const UNDO_KEY = 'stacks_undo'
const REDO_KEY = 'stacks_redo'

/**
 * Save stack to localStorage.
 */
export function saveStack(stack: Stack): void {
  try {
    const json = serializeStack(stack)
    localStorage.setItem(STORAGE_KEY, json)
  } catch (err) {
    console.error('Failed to save stack:', err)
  }
}

/**
 * Load stack from localStorage.
 */
export function loadStack(): Stack | null {
  try {
    const json = localStorage.getItem(STORAGE_KEY)
    if (!json) {
      return null
    }
    return deserializeStack(json)
  } catch (err) {
    console.error('Failed to load stack:', err)
    return null
  }
}

/**
 * Clear localStorage.
 */
export function clearStack(): void {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(UNDO_KEY)
  localStorage.removeItem(REDO_KEY)
}

/**
 * Save undo/redo history.
 */
export function saveUndoRedo(undo: Stack[], redo: Stack[]): void {
  try {
    localStorage.setItem(UNDO_KEY, JSON.stringify(undo.map(s => serializeStack(s))))
    localStorage.setItem(REDO_KEY, JSON.stringify(redo.map(s => serializeStack(s))))
  } catch (err) {
    console.error('Failed to save undo/redo:', err)
  }
}

/**
 * Load undo/redo history.
 */
export function loadUndoRedo(): { undo: Stack[]; redo: Stack[] } {
  try {
    const undoJson = localStorage.getItem(UNDO_KEY)
    const redoJson = localStorage.getItem(REDO_KEY)

    const undo = undoJson ? JSON.parse(undoJson).map((j: string) => deserializeStack(j)) : []
    const redo = redoJson ? JSON.parse(redoJson).map((j: string) => deserializeStack(j)) : []

    return { undo, redo }
  } catch (err) {
    console.error('Failed to load undo/redo:', err)
    return { undo: [], redo: [] }
  }
}

/**
 * Export stack as JSON file download.
 */
export function exportJSON(stack: Stack, filename: string = 'stack.json'): void {
  try {
    const json = serializeStack(stack)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error('Failed to export stack:', err)
  }
}

/**
 * Import stack from JSON.
 */
export function importJSON(json: string): { stack: Stack } | { error: string } {
  try {
    const stack = deserializeStack(json)
    return { stack }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { error: `Failed to import stack: ${msg}` }
  }
}

/**
 * Read JSON file from user input.
 */
export function readJSONFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result
      if (typeof content === 'string') {
        resolve(content)
      } else {
        reject(new Error('Failed to read file'))
      }
    }
    reader.onerror = () => reject(new Error('FileReader error'))
    reader.readAsText(file)
  })
}
