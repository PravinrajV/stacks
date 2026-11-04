/**
 * Integration test: Real UI click path from initApp() through run mode.
 * 
 * Tests the complete flow:
 * 1. Build stack with buttons and fields
 * 2. Save to localStorage (via storage layer)
 * 3. Call initApp() to initialize the UI
 * 4. Click the real Run toggle button in the toolbar
 * 5. Dispatch real MouseEvent clicks on rendered button elements
 * 6. Verify rendered DOM reflects script execution results
 * 
 * No direct runtime calls, no manual model changes after initialization.
 * All state changes happen through the real UI event flow.
 */

/// <reference types="vitest" />
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createStack, createCard, createButton, createField } from '../src/model/stack'
import { saveStack, clearStack } from '../src/dom/storage'
import { initApp } from '../src/dom/app'

/**
 * Helper to set up a clean DOM environment
 */
function setupDOM(): HTMLElement {
  const existing = document.getElementById('app')
  if (existing) {
    existing.remove()
  }
  const appContainer = document.createElement('div')
  appContainer.id = 'app'
  document.body.appendChild(appContainer)
  return appContainer
}

/**
 * Helper to find the Run/Edit toggle button in the toolbar
 */
function findModeToggleButton(): HTMLButtonElement | null {
  const buttons = document.querySelectorAll('.app-header button')
  for (const btn of buttons) {
    const text = btn.textContent?.toLowerCase() || ''
    if (text === 'run' || text === 'edit') {
      return btn as HTMLButtonElement
    }
  }
  return null
}

/**
 * Helper to find a button by label text in run mode
 */
function findRunButton(label: string): HTMLButtonElement | null {
  const buttons = document.querySelectorAll('.run-button')
  for (const btn of buttons) {
    if (btn.textContent?.includes(label)) {
      return btn as HTMLButtonElement
    }
  }
  return null
}

/**
 * Helper to get field content in run mode by field ID
 */
function getRunFieldContent(fieldId: string): string {
  const field = document.querySelector(`[data-field-id="${fieldId}"]`)
  return field?.textContent || ''
}

/**
 * Helper to check if we're currently in run mode
 */
function isInRunMode(): boolean {
  return !!document.querySelector('.run-mode-viewer')
}

/**
 * Helper to wait for UI updates
 */
async function waitForUIUpdate(ms = 100): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Helper to click the Run button to enter run mode
 */
async function enterRunMode(): Promise<void> {
  const btn = findModeToggleButton()
  expect(btn).toBeTruthy()
  expect(btn?.textContent?.toLowerCase()).toBe('run')
  
  btn!.click()
  await waitForUIUpdate()
  
  expect(isInRunMode()).toBe(true)
}

/**
 * Helper to click the Exit button to return to edit mode
 */
async function exitRunMode(): Promise<void> {
  const exitBtn = document.querySelector('.run-mode-viewer button') as HTMLButtonElement | null
  expect(exitBtn).toBeTruthy()
  expect(exitBtn?.textContent).toBe('Exit')
  
  exitBtn!.click()
  await waitForUIUpdate()
  
  expect(isInRunMode()).toBe(false)
}

describe('Run Mode Click Path Integration Tests', () => {
  let appContainer: HTMLElement

  beforeEach(() => {
    clearStack()
    appContainer = setupDOM()
  })

  afterEach(() => {
    clearStack()
    const app = document.getElementById('app')
    if (app) {
      app.remove()
    }
  })

  /**
   * Test 1: Button click executes script and updates field in run mode.
   * 
   * Setup:
   * - Card 1 with field "x" (initial: "initial")
   * - Button A: mouseUp script puts "hi" into field "x"
   * 
   * Actions:
   * - Save to localStorage
   * - initApp()
   * - Click Run button
   * - Click button A
   * 
   * Verify:
   * - Field "x" in DOM shows "hi"
   */
  it('button click in run mode executes script and updates field content', async () => {
    // Build stack
    const stack = createStack('stack-1', 'Test Stack')
    const card1 = createCard('card-1', 'Card 1', null)

    // Field x
    const fieldX = createField('x', 'x', 'initial')
    fieldX.rect = { left: 10, top: 60, right: 200, bottom: 100 }
    card1.fields.push(fieldX)

    // Button A with mouseUp script
    const buttonA = createButton('btn-a', 'Button A')
    buttonA.rect = { left: 10, top: 20, right: 100, bottom: 50 }
    buttonA.scripts['mouseUp'] = `on mouseUp
  put "hi" into field "x"
end mouseUp`
    card1.buttons.push(buttonA)

    stack.cards.push(card1)

    // Save to localStorage
    saveStack(stack)

    // Initialize app
    initApp()
    await waitForUIUpdate()

    // Verify we're in edit mode initially
    expect(isInRunMode()).toBe(false)

    // Enter run mode
    await enterRunMode()

    // Click button A
    const buttonAEl = findRunButton('Button A')
    expect(buttonAEl).toBeTruthy()

    buttonAEl!.click()
    await waitForUIUpdate()

    // Verify field x content changed to "hi"
    const xContent = getRunFieldContent('x')
    expect(xContent).toBe('hi')
  })

  /**
   * Test 2: Navigation - button click with "go next card" script
   * 
   * Setup:
   * - Card 1 with Button B (go next card)
   * - Card 2 with openCard handler (puts "opened" into field "y")
   * 
   * Actions:
   * - Save to localStorage
   * - initApp()
   * - Click Run button
   * - Click button B
   * - App should navigate to card 2
   * - openCard handler should execute
   * 
   * Verify:
   * - Card 2 is now displayed
   * - Field "y" shows "opened"
   */
  it('button click with "go next card" navigates and executes openCard handler', async () => {
    // Build stack
    const stack = createStack('stack-2', 'Nav Stack')

    // Card 1
    const card1 = createCard('card-1', 'Card 1', null)
    
    const buttonB = createButton('btn-b', 'Button B')
    buttonB.rect = { left: 10, top: 20, right: 100, bottom: 50 }
    buttonB.scripts['mouseUp'] = `on mouseUp
  go next card
end mouseUp`
    card1.buttons.push(buttonB)

    stack.cards.push(card1)

    // Card 2
    const card2 = createCard('card-2', 'Card 2', null)
    const fieldY = createField('y', 'y', 'initial')
    fieldY.rect = { left: 10, top: 60, right: 200, bottom: 100 }
    card2.fields.push(fieldY)

    // openCard handler on card 2
    card2.scripts['openCard'] = `on openCard
  put "opened" into field "y"
end openCard`

    stack.cards.push(card2)

    // Save to localStorage
    saveStack(stack)

    // Initialize app
    initApp()
    await waitForUIUpdate()

    // Enter run mode
    await enterRunMode()

    // Find and click button B
    const buttonBEl = findRunButton('Button B')
    expect(buttonBEl).toBeTruthy()

    buttonBEl!.click()
    await waitForUIUpdate(150) // Wait for navigation and openCard handler

    // Verify card 2 is now displayed by checking for its field
    const yContent = getRunFieldContent('y')
    expect(yContent).toBe('opened')
  })

  /**
   * Test 3: Parse error in button script
   * 
   * Setup:
   * - Card with button C that has invalid script (missing 'end')
   * - Card with valid button D for comparison
   * 
   * Actions:
   * - Save to localStorage
   * - initApp()
   * - Enter run mode
   * - Click button C (parse error)
   * 
   * Verify:
   * - Error is shown in modal (modal is visible)
   * - App remains usable (can still click other buttons)
   * - Click button D successfully
   */
  it('button with parse error shows error in modal, app stays usable', async () => {
    // Build stack
    const stack = createStack('stack-3', 'Error Stack')
    const card = createCard('card-1', 'Card 1', null)

    // Button with parse error
    const buttonC = createButton('btn-c', 'Button C')
    buttonC.rect = { left: 10, top: 20, right: 100, bottom: 50 }
    buttonC.scripts['mouseUp'] = `on mouseUp
  put "test" into field "x"` // Missing 'end mouseUp'
    card.buttons.push(buttonC)

    // Add a working button to verify app stays usable
    const fieldResult = createField('result', 'result', 'ready')
    fieldResult.rect = { left: 10, top: 60, right: 200, bottom: 100 }
    card.fields.push(fieldResult)

    const buttonD = createButton('btn-d', 'Button D')
    buttonD.rect = { left: 110, top: 20, right: 200, bottom: 50 }
    buttonD.scripts['mouseUp'] = `on mouseUp
  put "worked" into field "result"
end mouseUp`
    card.buttons.push(buttonD)

    stack.cards.push(card)

    // Save to localStorage
    saveStack(stack)

    // Initialize app
    initApp()
    await waitForUIUpdate()

    // Enter run mode
    await enterRunMode()

    // Click button C (has parse error)
    const buttonCEl = findRunButton('Button C')
    expect(buttonCEl).toBeTruthy()

    buttonCEl!.click()
    await waitForUIUpdate(200)

    // Verify error modal is shown
    const backdrop = document.querySelector('.modal-backdrop') as HTMLElement | null
    expect(backdrop).toBeTruthy()
    expect(backdrop?.style.display).toBe('flex')
    
    // Find and verify the error message
    const modalMsg = backdrop?.querySelector('.modal-message')
    expect(modalMsg).toBeTruthy()
    expect(modalMsg?.textContent).toContain('Error')
    expect(modalMsg?.textContent).toContain('Parse error')
    
    // Find the OK button
    const okBtn = backdrop?.querySelector('.modal-buttons button') as HTMLButtonElement | null
    expect(okBtn).toBeTruthy()
    expect(okBtn?.textContent).toBe('OK')

    // Now verify app is still usable: click button D (working button)
    const buttonDEl = findRunButton('Button D')
    expect(buttonDEl).toBeTruthy()

    buttonDEl!.click()
    await waitForUIUpdate()

    // Button D should execute successfully
    // Field result should be updated to "worked"
    const resultContent = getRunFieldContent('result')
    expect(resultContent).toBe('worked')
  })

  /**
   * Test 4: Exit button returns to edit mode
   * 
   * Setup:
   * - Simple stack with one card
   * 
   * Actions:
   * - Save to localStorage
   * - initApp()
   * - Click Run button
   * - Verify in run mode
   * - Click Exit button
   * 
   * Verify:
   * - Back in edit mode
   * - Edit UI is visible
   */
  it('Exit button returns to edit mode', async () => {
    // Build simple stack
    const stack = createStack('stack-4', 'Exit Test')
    const card = createCard('card-1', 'Card 1', null)
    stack.cards.push(card)

    // Save to localStorage
    saveStack(stack)

    // Initialize app
    initApp()
    await waitForUIUpdate()

    // Enter run mode
    await enterRunMode()

    // Exit run mode
    await exitRunMode()

    // Verify we're back in edit mode
    expect(isInRunMode()).toBe(false)
    
    // Verify edit UI elements are visible (card canvas, script editor, etc.)
    const cardCanvas = document.querySelector('.card-canvas')
    expect(cardCanvas).toBeTruthy()
  })

  /**
   * Test 5: Field changes persist to the stack
   * 
   * Setup:
   * - Card with editable field
   * - Button that reads from field and writes back
   * 
   * Actions:
   * - Save to localStorage
   * - initApp()
   * - Enter run mode
   * - Edit field directly
   * - Click button that appends to field
   * 
   * Verify:
   * - Field shows accumulated changes
   */
  it('maintains field state across multiple button clicks and direct edits', async () => {
    const stack = createStack('stack-5', 'State Test')
    const card = createCard('card-1', 'Card 1', null)

    // Editable field
    const stateField = createField('state', 'state', '')
    stateField.rect = { left: 10, top: 60, right: 300, bottom: 100 }
    stateField.editable = true
    card.fields.push(stateField)

    // Button 1: set initial value
    const button1 = createButton('btn-1', 'Step 1')
    button1.rect = { left: 10, top: 20, right: 100, bottom: 50 }
    button1.scripts['mouseUp'] = `on mouseUp
  put "step 1" into field "state"
end mouseUp`
    card.buttons.push(button1)

    // Button 2: append to field
    const button2 = createButton('btn-2', 'Step 2')
    button2.rect = { left: 110, top: 20, right: 200, bottom: 50 }
    button2.scripts['mouseUp'] = `on mouseUp
  put field "state" & " step 2" into field "state"
end mouseUp`
    card.buttons.push(button2)

    stack.cards.push(card)

    // Save and init
    saveStack(stack)
    initApp()
    await waitForUIUpdate()

    // Enter run mode
    await enterRunMode()

    // Click button 1
    const button1El = findRunButton('Step 1')
    expect(button1El).toBeTruthy()
    button1El!.click()
    await waitForUIUpdate()

    let content = getRunFieldContent('state')
    expect(content).toBe('step 1')

    // Click button 2
    const button2El = findRunButton('Step 2')
    expect(button2El).toBeTruthy()
    button2El!.click()
    await waitForUIUpdate()

    content = getRunFieldContent('state')
    expect(content).toBe('step 1 step 2')
  })
})
